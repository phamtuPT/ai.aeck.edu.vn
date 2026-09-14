import { Collection, ObjectId } from 'mongodb';
import { TITLE_GENERATION_PROMPT } from '@/lib/prompts';
import { getProvider } from '@/lib/ai';
import { PROVIDERS, type ProviderId } from '@/lib/ai/models';
import { parseDataUrl, type ChatTurn } from '@/lib/ai/types';

export const DEFAULT_TITLE = 'Cuộc trò chuyện mới';

export interface AIContext {
    provider: ProviderId;
    apiKey: string;
}

export class ConversationAccessError extends Error { }

export async function saveUserMessage(
    historyCollection: Collection,
    userId: string,
    conversationId: string,
    message: string,
    attachments: any[],
    fileContext = ''
) {
    const userMsgId = new ObjectId();
    await historyCollection.insertOne({
        _id: userMsgId,
        userId,
        conversationId,
        role: 'user',
        content: message,
        // Nội dung trích từ file đính kèm: gửi cho AI nhưng không hiển thị trong khung chat.
        ...(fileContext ? { fileContext } : {}),
        attachments: attachments || [],
        createdAt: new Date()
    });
    return userMsgId;
}

export async function saveAIResponse(
    historyCollection: Collection,
    userId: string,
    conversationId: string,
    aiResponse: string,
    replyToId: ObjectId,
    model: string
) {
    await historyCollection.insertOne({
        userId,
        conversationId,
        role: 'ai',
        content: aiResponse,
        model,
        createdAt: new Date(),
        replyTo: replyToId
    });
}

/**
 * Đảm bảo cuộc trò chuyện thuộc về người dùng hiện tại (tạo mới nếu chưa có).
 * Ném ConversationAccessError nếu id đã thuộc về người khác.
 */
export async function ensureConversation(
    conversationsCollection: Collection,
    historyCollection: Collection,
    conversationId: string,
    userId: string
): Promise<{ isNew: boolean }> {
    const existing = await conversationsCollection.findOne({ _id: conversationId as any });
    if (existing) {
        if (String(existing.userId) !== String(userId)) throw new ConversationAccessError();
        return { isNew: false };
    }

    // Dữ liệu cũ có thể có lịch sử mà chưa có bản ghi conversation.
    const foreignMessage = await historyCollection.findOne({ conversationId, userId: { $ne: userId } });
    if (foreignMessage) throw new ConversationAccessError();

    const hasOwnHistory = await historyCollection.findOne({ conversationId, userId });
    await conversationsCollection.insertOne({
        _id: conversationId as any,
        userId,
        title: DEFAULT_TITLE,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { isNew: !hasOwnHistory };
}

export async function generateTitle(ai: AIContext, message: string): Promise<string | null> {
    try {
        const title = await getProvider(ai.provider).generateText({
            apiKey: ai.apiKey,
            model: PROVIDERS[ai.provider].utilityModel,
            prompt: TITLE_GENERATION_PROMPT(message),
            maxOutputTokens: 1024,
        });
        const cleaned = title.replace(/^["'“”]+|["'“”]+$/g, '').trim();
        return cleaned ? cleaned.slice(0, 100) : null;
    } catch (e) {
        console.error('Title generation failed:', (e as Error).message);
        return null;
    }
}

// Giữ nguyên văn tối đa ngần này tin nhắn gần nhất; phần cũ hơn được tóm tắt một lần rồi lưu lại.
const MAX_VERBATIM = 20;
const KEEP_AFTER_SUMMARY = 10;
// Chỉ gửi lại ảnh của vài tin nhắn gần nhất để tiết kiệm token.
const IMAGE_HISTORY_WINDOW = 4;

function toTurn(msg: any, includeImages: boolean): ChatTurn {
    const urls: string[] = [];
    if (includeImages) {
        if (Array.isArray(msg.attachments)) {
            msg.attachments.forEach((att: any) => {
                if (att?.type?.startsWith('image/') && typeof att.url === 'string') urls.push(att.url);
            });
        } else if (Array.isArray(msg.images)) {
            urls.push(...msg.images);
        }
    }
    return {
        role: msg.role === 'ai' ? 'assistant' : 'user',
        text: (msg.content || '') + (msg.fileContext || ''),
        images: urls.map(parseDataUrl).filter((img): img is NonNullable<typeof img> => img !== null),
    };
}

/** Lịch sử (chưa gồm tin nhắn hiện tại) của một cuộc trò chuyện thuộc userId. */
export async function getSmartHistory(
    historyCollection: Collection,
    conversationsCollection: Collection,
    conversationId: string,
    userId: string,
    ai: AIContext
): Promise<ChatTurn[]> {
    const conversation = await conversationsCollection.findOne({ _id: conversationId as any, userId });
    let summary: string = conversation?.summary || '';
    let summaryCount: number = conversation?.summaryCount || 0;

    let messages = await historyCollection
        .find({ conversationId, userId })
        .sort({ createdAt: 1, _id: 1 })
        .skip(summaryCount)
        .toArray();

    if (messages.length > MAX_VERBATIM) {
        const toSummarize = messages.slice(0, messages.length - KEEP_AFTER_SUMMARY);
        const transcript = toSummarize.map(m => `${m.role === 'ai' ? 'Trợ giảng' : 'Học sinh'}: ${m.content}`).join('\n');
        try {
            const newSummary = await getProvider(ai.provider).generateText({
                apiKey: ai.apiKey,
                model: PROVIDERS[ai.provider].utilityModel,
                prompt: `Tóm tắt ngắn gọn cuộc trò chuyện sau, giữ lại các dữ kiện, công thức và kết luận quan trọng.\n\n${summary ? `Tóm tắt trước đó:\n${summary}\n\n` : ''}Nội dung mới:\n${transcript}`,
                maxOutputTokens: 2048,
            });
            if (newSummary) {
                summary = newSummary;
                summaryCount += toSummarize.length;
                messages = messages.slice(toSummarize.length);
                await conversationsCollection.updateOne(
                    { _id: conversationId as any, userId },
                    { $set: { summary, summaryCount } }
                );
            }
        } catch (e) {
            console.error('Summarization failed:', (e as Error).message);
        }
        // Nếu tóm tắt lỗi, vẫn giới hạn số tin nhắn gửi đi.
        messages = messages.slice(-MAX_VERBATIM);
    }

    const turns = messages.map((m, i) => toTurn(m, i >= messages.length - IMAGE_HISTORY_WINDOW));
    if (!summary) {
        // Một số hãng (Claude) yêu cầu tin nhắn đầu tiên phải là của user.
        while (turns.length > 0 && turns[0].role === 'assistant') turns.shift();
        return turns;
    }

    return [
        { role: 'user', text: `Tóm tắt phần trước của cuộc trò chuyện:\n${summary}` },
        { role: 'assistant', text: 'Đã hiểu, tôi sẽ dùng tóm tắt này làm ngữ cảnh.' },
        ...turns,
    ];
}
