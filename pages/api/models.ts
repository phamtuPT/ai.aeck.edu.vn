import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getProvider, describeAIError } from '@/lib/ai';
import { MODELS } from '@/lib/ai/models';
import { rateLimit } from '@/lib/rateLimit';

const bodySchema = z.object({
    provider: z.enum(['gemini', 'openai', 'anthropic'])
});

/**
 * Kiểm tra API key của người dùng và trả về các mô hình mà key truy cập được.
 * Key chỉ được nhận qua header (không qua URL) và không bao giờ được lưu hay ghi log.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const validation = bodySchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Provider không hợp lệ' });
    }
    const { provider } = validation.data;

    const header = req.headers['x-user-api-key'];
    const apiKey = (Array.isArray(header) ? header[0] : header)?.trim();
    if (!apiKey) {
        return res.status(400).json({ error: 'API Key is missing' });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(`models:${ip}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    try {
        const available = await getProvider(provider).listModels(apiKey);
        // Một số hãng trả về id có hậu tố ngày (vd: claude-haiku-4-5-20251001) cho alias.
        const isAvailable = (id: string) => available.some(a => a === id || a.startsWith(`${id}-20`));
        const supported = MODELS
            .filter(m => m.provider === provider)
            .map(m => ({ id: m.id, label: m.label, available: isAvailable(m.id) }));
        return res.status(200).json({ models: available, supported });
    } catch (error) {
        const { status, message } = describeAIError(error);
        return res.status(status).json({ error: message });
    }
}
