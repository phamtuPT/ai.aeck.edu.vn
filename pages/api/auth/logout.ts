import type { NextApiRequest, NextApiResponse } from 'next';
import { clientChatbotPromise } from '@/lib/mongodb';
import { getBearerToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = getBearerToken(req);
    if (!token) {
        // Không có token thì coi như đã đăng xuất.
        return res.status(200).json({ success: true });
    }

    try {
        const client = await clientChatbotPromise;
        await client.db('aeckdb_chatbot').collection('user_sessions').deleteOne({ token });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Logout error:', (error as Error).message);
        return res.status(500).json({ error: 'Đăng xuất thất bại' });
    }
}
