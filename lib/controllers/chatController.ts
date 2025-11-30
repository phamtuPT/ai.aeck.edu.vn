import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { saveUserMessage, saveAIResponse, manageConversationMetadata } from '@/lib/services/chatService';
import { getContext } from '@/lib/services/ragService';
import { generateStream } from '@/lib/services/aiService';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';

const chatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    history: z.array(z.any()).optional(), // Refine this type if possible
    images: z.array(z.string()).optional(),
    conversationId: z.string().optional().nullable()
});

export async function handleChatRequest(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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

    // Input Validation
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid input', details: validation.error.format() });
    }

    const { message, history, images, conversationId } = validation.data;

    try {
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
        const userMsgId = await saveUserMessage(
            historyCollection,
            userId,
            finalConversationId,
            message,
            images || []
        );

        // 3. RAG: Search for Context
        const apiKey = req.headers['x-user-api-key'] as string;
        if (!apiKey) {
            return res.status(401).json({ error: 'API Key is missing' });
        }

        const contextItems = await getContext(message, apiKey, examsCollection);

        // 4. Call AI
        const { result, aiClient } = await generateStream({
            apiKey,
            message,
            history: history || [],
            images: images || [],
            context: contextItems
        });

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
