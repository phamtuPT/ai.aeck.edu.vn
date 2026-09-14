import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { clientChatbotPromise } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
// Tin nhắn cũ lưu cả nội dung file đính kèm đã trích xuất; phần này không hiển thị cho người dùng.
const FILE_CONTEXT_MARKER = '\n\n[SYSTEM: The user has attached a file named';

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

    const { conversationId, before, limit } = req.query;
    if (typeof conversationId !== 'string' || !conversationId) {
        return res.status(400).json({ error: 'Missing conversationId' });
    }
    if (before !== undefined && (typeof before !== 'string' || !ObjectId.isValid(before))) {
        return res.status(400).json({ error: 'Invalid cursor' });
    }
    const pageSize = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    try {
        const session = await getSession(req);
        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const clientChatbot = await clientChatbotPromise;
        const historyCollection = clientChatbot.db('aeckdb_chatbot').collection('chat_history');

        const query: Record<string, unknown> = { userId: session.userId, conversationId };

        if (typeof before === 'string') {
            const cursorDoc = await historyCollection.findOne(
                { _id: new ObjectId(before), userId: session.userId, conversationId },
                { projection: { createdAt: 1 } }
            );
            if (!cursorDoc) {
                return res.status(400).json({ error: 'Invalid cursor' });
            }
            query.$or = [
                { createdAt: { $lt: cursorDoc.createdAt } },
                { createdAt: cursorDoc.createdAt, _id: { $lt: cursorDoc._id } }
            ];
        }

        // Lấy thêm 1 bản ghi để biết còn tin nhắn cũ hơn hay không.
        const docs = await historyCollection
            .find(query, { projection: { fileContext: 0, replyTo: 0 } })
            .sort({ createdAt: -1, _id: -1 })
            .limit(pageSize + 1)
            .toArray();

        const hasMore = docs.length > pageSize;
        const page = docs.slice(0, pageSize).reverse();

        const history = page.map(doc => {
            const content = typeof doc.content === 'string' ? doc.content : '';
            const markerIndex = doc.role === 'user' ? content.indexOf(FILE_CONTEXT_MARKER) : -1;
            return {
                ...doc,
                content: markerIndex >= 0 ? content.slice(0, markerIndex) : content
            };
        });

        return res.status(200).json({
            history,
            hasMore,
            nextCursor: hasMore && page.length > 0 ? String(page[0]._id) : null
        });

    } catch (error) {
        console.error('History error:', (error as Error).message);
        return res.status(500).json({ error: 'Failed to fetch history' });
    }
}
