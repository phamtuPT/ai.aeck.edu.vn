import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Missing query' });
    }

    try {
        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const sessionsCollection = dbChatbot.collection('user_sessions');
        const conversationsCollection = dbChatbot.collection('conversations');
        const historyCollection = dbChatbot.collection('chat_history');

        const session = await sessionsCollection.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // Search in titles
        const matchedConversations = await conversationsCollection
            .find({
                userId: session.userId,
                title: { $regex: q, $options: 'i' }
            })
            .project({ _id: 1, title: 1, updatedAt: 1 })
            .limit(5)
            .toArray();

        // Search in messages
        const matchedMessages = await historyCollection
            .find({
                userId: session.userId,
                content: { $regex: q, $options: 'i' }
            })
            .project({ conversationId: 1, content: 1, createdAt: 1 })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        // Get conversation details for matched messages
        const messageConversationIds = [...new Set(matchedMessages.map(m => m.conversationId))];
        const messageConversations = await conversationsCollection
            .find({
                userId: session.userId,
                _id: { $in: messageConversationIds }
            })
            .project({ _id: 1, title: 1 })
            .toArray();

        const conversationMap = new Map(messageConversations.map(c => [c._id, c]));

        const results = [
            ...matchedConversations.map(c => ({
                type: 'conversation',
                id: c._id,
                title: c.title,
                date: c.updatedAt
            })),
            ...matchedMessages.map(m => ({
                type: 'message',
                id: m.conversationId,
                title: conversationMap.get(m.conversationId)?.title || 'Unknown Conversation',
                match: m.content.substring(0, 100) + '...',
                date: m.createdAt
            }))
        ];

        return res.status(200).json({ results });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
}
