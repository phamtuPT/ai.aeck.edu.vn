import type { NextApiRequest, NextApiResponse } from 'next';
import { handleChatRequest } from '@/lib/controllers/chatController';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await handleChatRequest(req, res);
}

