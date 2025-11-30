import { GoogleGenAI } from '@google/genai';

export const getEmbedding = async (text: string, apiKey: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: [
                {
                    parts: [{ text }]
                }
            ]
        });
        return result.embeddings?.[0]?.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
};
