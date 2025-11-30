import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { saveUserMessage, saveAIResponse, manageConversationMetadata, getSmartHistory } from '@/lib/services/chatService';
import { getContext } from '@/lib/services/ragService';
import { generateStream } from '@/lib/services/aiService';
import { parseFile } from '@/lib/utils/fileParser';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';

const chatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    history: z.array(z.any()).optional(), // Refine this type if possible
    attachments: z.array(z.object({
        name: z.string(),
        type: z.string(),
        url: z.string()
    })).optional(),
    conversationId: z.string().optional().nullable(),
    mode: z.enum(['general', 'math', 'reading', 'science']).optional()
});

export async function handleChatRequest(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method not allowed. Received: ${req.method}, Expected: POST` });
    }

    // Rate Limiting (IP-based)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const isAllowed = rateLimit(String(ip), 20, 60 * 1000); // 20 requests per minute
    if (!isAllowed) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Headers:', JSON.stringify(req.headers));
    const apiKeyHeader = req.headers['x-user-api-key'];
    console.log('Received x-user-api-key:', apiKeyHeader ? 'Present' : 'Missing');

    // Input Validation
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
    }

    const { message, history, attachments, conversationId, mode } = validation.data;

    try {
        // Extract file content
        let fullMessage = message;
        if (attachments && attachments.length > 0) {
            console.log(`Processing ${attachments.length} attachments`);
            const fileContents = await Promise.all(attachments.map(async (file) => {
                console.log(`Processing file: ${file.name}, Type: ${file.type}`);
                if (file.type.startsWith('image/')) return '';
                try {
                    const base64Data = file.url.split(',')[1];
                    if (!base64Data) throw new Error('Invalid base64 data');

                    const buffer = Buffer.from(base64Data, 'base64');
                    const content = await parseFile(buffer, file.type, file.name);
                    console.log(`Successfully parsed ${file.name}, length: ${content.length}`);
                    return `\n\n[SYSTEM: The user has attached a file named "${file.name}". Use the following content to answer. The extraction might be imperfect.]\n--- BEGIN FILE CONTENT: ${file.name} ---\n${content}\n--- END FILE CONTENT ---\n`;
                } catch (e) {
                    console.error(`Failed to parse file ${file.name}:`, e);
                    return '';
                }
            }));
            fullMessage += fileContents.join('');
        }
        // 1. Validate Session
        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const dbMain = clientChatbot.db('aeckdb'); // Main DB for exams
        const sessionsCollection = dbChatbot.collection('user_sessions');
        const historyCollection = dbChatbot.collection('chat_history');
        const examsCollection = dbMain.collection('exams');
        const conversationsCollection = dbChatbot.collection('conversations');

        const session = await sessionsCollection.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const userId = session.userId;
        const finalConversationId = conversationId || new ObjectId().toString();

        // 2. Save User Message
        console.log('Saving user message...');
        const userMsgId = await saveUserMessage(
            historyCollection,
            userId,
            finalConversationId,
            fullMessage,
            attachments || []
        );
        console.log('User message saved:', userMsgId);

        // 3. RAG: Search for Context
        const apiKey = req.headers['x-user-api-key'] as string;
        if (!apiKey) {
            return res.status(401).json({ error: 'API Key is missing' });
        }

        console.log('Fetching context...');
        const contextItems = await getContext(message, apiKey, examsCollection);
        console.log('Context fetched, items:', contextItems.length);

        // 4. Call AI
        const { GoogleGenAI } = require('@google/genai');
        const aiClient = new GoogleGenAI({ apiKey });

        // Fetch smart history (summarized if needed)
        console.log('Fetching smart history...');
        const smartHistory = await getSmartHistory(historyCollection, finalConversationId, aiClient);
        console.log('Smart history fetched');

        console.log('Calling generateStream...');
        const { result } = await generateStream({
            apiKey,
            message: fullMessage,
            history: smartHistory,
            images: attachments?.filter(a => a.type.startsWith('image/')).map(a => a.url) || [],
            context: contextItems,
            mode: mode as any
        });
        console.log('generateStream started');

        // 5. Stream Response & Accumulate
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-transform',
            'X-Conversation-Id': finalConversationId
        });

        let aiResponse = '';

        for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
                res.write(chunkText);
                aiResponse += chunkText;
            }
        }

        // 6. Save AI Response
        await saveAIResponse(
            historyCollection,
            userId,
            finalConversationId,
            aiResponse,
            userMsgId
        );

        // End the response here so the user doesn't wait for metadata operations
        res.end();

        // 7. Manage Conversation Metadata (Title & Timestamp)
        // Note: In a serverless environment (like Vercel), this might be terminated early.
        // Ideally use context.waitUntil() if available or a background queue.
        await manageConversationMetadata(
            conversationsCollection,
            finalConversationId,
            userId,
            message,
            !conversationId,
            aiClient
        );

    } catch (error: any) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate response' });
        } else {
            res.end();
        }
    }
}
