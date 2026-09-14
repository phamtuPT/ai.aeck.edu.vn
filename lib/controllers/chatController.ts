import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
    saveUserMessage,
    saveAIResponse,
    ensureConversation,
    generateTitle,
    getSmartHistory,
    ConversationAccessError,
    type AIContext,
} from '@/lib/services/chatService';
import { getContext } from '@/lib/services/ragService';
import { generateStream } from '@/lib/services/aiService';
import { parseFile } from '@/lib/utils/fileParser';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';
import { DEFAULT_MODEL_ID, getModel } from '@/lib/ai/models';
import { describeAIError } from '@/lib/ai';
import { parseDataUrl, type ChatImage } from '@/lib/ai/types';

const chatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(100_000),
    attachments: z.array(z.object({
        name: z.string(),
        type: z.string(),
        url: z.string()
    })).max(10).optional(),
    conversationId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional().nullable(),
    mode: z.enum(['general', 'math', 'reading', 'science']).optional(),
    model: z.string().optional()
});

function headerValue(req: NextApiRequest, name: string): string | null {
    const value = req.headers[name];
    const str = Array.isArray(value) ? value[0] : value;
    return str?.trim() || null;
}

export async function handleChatRequest(req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        // Nếu method nhận được là GET thì thường do redirect (www/https/dấu "/") đã đổi POST thành GET.
        console.warn(`[Chat Request] 405: received ${req.method} ${req.url}`);
        return res.status(405).json({ error: `Method not allowed. Received: ${req.method}, Expected: POST` });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
    }

    const { message, attachments, conversationId, mode, model: modelId } = validation.data;

    const model = getModel(modelId || DEFAULT_MODEL_ID);
    if (!model) {
        return res.status(400).json({ error: `Mô hình không được hỗ trợ: ${modelId}` });
    }

    const apiKey = headerValue(req, 'x-user-api-key');
    if (!apiKey) {
        return res.status(401).json({ error: 'API Key is missing', provider: model.provider });
    }
    // Key Gemini (nếu có) chỉ dùng để tạo embedding cho tìm kiếm tài liệu.
    const geminiApiKey = model.provider === 'gemini' ? apiKey : headerValue(req, 'x-gemini-api-key');

    try {
        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const dbMain = clientChatbot.db('aeckdb'); // Main DB for exams
        const sessionsCollection = dbChatbot.collection('user_sessions');
        const historyCollection = dbChatbot.collection('chat_history');
        const examsCollection = dbMain.collection('exams');
        const conversationsCollection = dbChatbot.collection('conversations');

        // 1. Validate Session
        const session = await sessionsCollection.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const userId = session.userId;

        if (!rateLimit(`chat:${String(userId)}`, 20, 60 * 1000)) {
            return res.status(429).json({ error: 'Bạn gửi quá nhiều tin nhắn. Vui lòng đợi một chút.' });
        }

        // 2. Conversation ownership
        const finalConversationId = conversationId || new ObjectId().toString();
        let isNew: boolean;
        try {
            ({ isNew } = await ensureConversation(conversationsCollection, historyCollection, finalConversationId, userId));
        } catch (e) {
            if (e instanceof ConversationAccessError) {
                return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
            }
            throw e;
        }

        // 3. Extract file content
        let fileContext = '';
        const images: ChatImage[] = [];
        if (attachments && attachments.length > 0) {
            const fileContents = await Promise.all(attachments.map(async (file) => {
                if (file.type.startsWith('image/')) {
                    const img = parseDataUrl(file.url);
                    if (img) images.push(img);
                    return '';
                }
                try {
                    const base64Data = file.url.split(',')[1];
                    if (!base64Data) throw new Error('Invalid base64 data');

                    const buffer = Buffer.from(base64Data, 'base64');
                    const content = await parseFile(buffer, file.type, file.name);
                    return `\n\n[SYSTEM: The user has attached a file named "${file.name}". Use the following content to answer. The extraction might be imperfect.]\n--- BEGIN FILE CONTENT: ${file.name} ---\n${content}\n--- END FILE CONTENT ---\n`;
                } catch (e) {
                    console.error(`Failed to parse file ${file.name}:`, (e as Error).message);
                    return '';
                }
            }));
            fileContext = fileContents.join('');
        }

        const ai: AIContext = { provider: model.provider, apiKey };

        // 4. History (trước khi lưu tin nhắn hiện tại) + RAG context
        const [history, contextItems] = await Promise.all([
            getSmartHistory(historyCollection, conversationsCollection, finalConversationId, userId, ai),
            getContext(message, geminiApiKey, examsCollection),
        ]);

        // Hủy việc sinh câu trả lời khi người dùng bấm Dừng hoặc đóng tab.
        const abortController = new AbortController();
        res.on('close', () => {
            if (!res.writableFinished) abortController.abort();
        });

        const stream = generateStream({
            apiKey,
            model,
            message: message + fileContext,
            history,
            images,
            context: contextItems,
            mode,
            signal: abortController.signal,
        });
        const iterator = stream[Symbol.asyncIterator]();

        // 5. Chờ chunk đầu tiên để lỗi key/quota được trả về với status code rõ ràng.
        let first: IteratorResult<string>;
        try {
            first = await iterator.next();
        } catch (e) {
            console.error(`[Chat] ${model.id} failed before streaming:`, e);
            if (isNew) {
                await conversationsCollection.deleteOne({ _id: finalConversationId as any, userId });
            }
            const { status, message: errorMessage } = describeAIError(e);
            return res.status(status).json({ error: errorMessage });
        }

        const titlePromise = isNew ? generateTitle(ai, message) : Promise.resolve(null);

        const userMsgId = await saveUserMessage(
            historyCollection,
            userId,
            finalConversationId,
            message,
            attachments || [],
            fileContext
        );

        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-transform',
            'X-Conversation-Id': finalConversationId,
            'X-Model-Id': model.id
        });

        let aiResponse = '';
        const write = (text: string) => {
            aiResponse += text;
            if (!res.writableEnded && !res.destroyed) res.write(text);
        };

        try {
            if (!first.done) write(first.value);
            while (true) {
                const next = await iterator.next();
                if (next.done) break;
                write(next.value);
            }
        } catch (e) {
            if (!abortController.signal.aborted) {
                console.error(`[Chat] ${model.id} failed mid-stream:`, (e as Error).message);
                write(`\n\n⚠️ Lỗi: ${describeAIError(e).message}`);
            }
        }

        // 6. Save AI Response (kể cả khi bị dừng giữa chừng)
        if (aiResponse) {
            await saveAIResponse(historyCollection, userId, finalConversationId, aiResponse, userMsgId, model.id);
        }

        // 7. Metadata — làm trước res.end() vì Vercel có thể dừng function ngay sau khi phản hồi kết thúc.
        const title = await titlePromise;
        await conversationsCollection.updateOne(
            { _id: finalConversationId as any, userId },
            { $set: { updatedAt: new Date(), lastModel: model.id, ...(title ? { title } : {}) } }
        );

        res.end();
    } catch (error: any) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate response' });
        } else {
            res.end();
        }
    }
}
