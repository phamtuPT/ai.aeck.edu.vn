import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const sessionsCollection = dbChatbot.collection('user_sessions');
        const historyCollection = dbChatbot.collection('chat_history');

        const session = await sessionsCollection.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        if (req.method === 'GET') {
            const conversationsCollection = dbChatbot.collection('conversations');
            const conversations = await conversationsCollection
                .find({ userId: session.userId })
                .sort({ updatedAt: -1 })
                .toArray();

            return res.status(200).json({ conversations });
        }

        if (req.method === 'DELETE') {
            const { conversationId } = req.query;
            if (!conversationId) {
                return res.status(400).json({ error: 'Missing conversationId' });
            }

            const conversationsCollection = dbChatbot.collection('conversations');
            await conversationsCollection.deleteOne({
                _id: conversationId as any, // Cast to any to bypass type check since we store string _id
                userId: session.userId
            });

            await historyCollection.deleteMany({
                userId: session.userId,
                conversationId: conversationId
            });

            return res.status(200).json({ success: true });
        }

        if (req.method === 'PATCH') {
            const { conversationId, title, isPinned, isArchived } = req.body;
            if (!conversationId) {
                return res.status(400).json({ error: 'Missing conversationId' });
            }

            const updateFields: any = { updatedAt: new Date() };
            if (title !== undefined) updateFields.title = title;
            if (isPinned !== undefined) updateFields.isPinned = isPinned;
            if (isArchived !== undefined) updateFields.isArchived = isArchived;

            const conversationsCollection = dbChatbot.collection('conversations');
            await conversationsCollection.updateOne(
                { _id: conversationId, userId: session.userId },
                { $set: updateFields }
            );

            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error('Conversations error:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
}
