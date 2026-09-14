import type { NextApiRequest } from 'next';
import type { Document, WithId } from 'mongodb';
import { clientChatbotPromise } from '@/lib/mongodb';

export function getBearerToken(req: NextApiRequest): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token || null;
}

/** Trả về session còn hạn ứng với Bearer token của request, hoặc null. */
export async function getSession(req: NextApiRequest): Promise<WithId<Document> | null> {
    const token = getBearerToken(req);
    if (!token) return null;

    const client = await clientChatbotPromise;
    return client.db('aeckdb_chatbot').collection('user_sessions').findOne({
        token,
        expiresAt: { $gt: new Date() }
    });
}
