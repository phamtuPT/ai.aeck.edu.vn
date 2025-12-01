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

    if (req.method !== 'GET') {
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

        const { conversationId } = req.query;
        const query: any = { userId: session.userId };

        if (conversationId) {
            query.conversationId = conversationId;
        }

        const history = await historyCollection
            .find(query)
            .sort({ createdAt: 1 })
            // .limit(50) // Removed limit to load full conversation
            .toArray();

        return res.status(200).json({ history });

    } catch (error) {
        console.error('History error:', error);
        return res.status(500).json({ error: 'Failed to fetch history' });
    }
}
