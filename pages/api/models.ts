import type { NextApiRequest, NextApiResponse } from 'next';

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

    // Prioritize key from query param (client-side check), then header, then env
    const apiKey = (req.query.key as string) || req.headers['x-user-api-key'] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(400).json({ error: 'API Key is missing' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch models');
        }

        res.status(200).json(data);
    } catch (error: any) {
        console.error('List Models Error:', error);
        res.status(500).json({
            error: 'Failed to list models',
            details: error.message || error.toString()
        });
    }
}
