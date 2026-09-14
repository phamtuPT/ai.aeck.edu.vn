import { GoogleGenAI } from '@google/genai';

// text-embedding-004 (mô hình cũ dùng để tạo vector cho bảng exams) đã bị Google tắt từ 14/01/2026.
// Vector search chỉ bật khi đã tạo lại embedding cho aeckdb.exams bằng mô hình mới
// và khai báo mô hình đó qua biến môi trường GEMINI_EMBEDDING_MODEL (vd: gemini-embedding-2).
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || '';
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || undefined;

export const getEmbedding = async (text: string, apiKey: string) => {
    if (!EMBEDDING_MODEL) return null;
    try {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: [{ parts: [{ text }] }],
            config: EMBEDDING_DIMENSIONS ? { outputDimensionality: EMBEDDING_DIMENSIONS } : undefined,
        });
        return result.embeddings?.[0]?.values;
    } catch (error) {
        console.error('Error generating embedding:', (error as Error).message);
        return null;
    }
};
