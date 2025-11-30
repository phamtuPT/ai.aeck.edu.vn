import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
import { clientChatbotPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { SYSTEM_INSTRUCTION } from '@/lib/prompts';
import { getContext } from '@/lib/services/ragService';
import { saveUserMessage, saveAIResponse, manageConversationMetadata } from '@/lib/services/chatService';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, history, images, conversationId } = req.body;

    try {
        // 1. Validate Session
        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const dbMain = clientChatbot.db('aeckdb'); // Main DB for exams
        const sessionsCollection = dbChatbot.collection('user_sessions');
        const historyCollection = dbChatbot.collection('chat_history');
        const examsCollection = dbMain.collection('exams');
        const conversationsCollection = dbChatbot.collection('conversations');

        const session = await sessionsCollection.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const userId = session.userId;
        const finalConversationId = conversationId || new ObjectId().toString();

        // 2. Save User Message
        const userMsgId = await saveUserMessage(
            historyCollection,
            userId,
            finalConversationId,
            message,
            images
        );

        // 3. RAG: Search for Context
        const apiKey = req.headers['x-user-api-key'] as string;
        const contextText = await getContext(message, apiKey, examsCollection);

        // 4. Call AI
        if (!apiKey) {
            return res.status(401).json({ error: 'API Key is missing' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Construct contents for Gemini
        const contents: any[] = [];

        // Add history
        if (history && Array.isArray(history)) {
            history.forEach((msg: any) => {
                const parts: any[] = [{ text: msg.content }];
                if (msg.images && Array.isArray(msg.images)) {
                    msg.images.forEach((img: string) => {
                        const match = img.match(/^data:(.*?);base64,(.*)$/);
                        if (match) {
                            parts.push({
                                inlineData: {
                                    mimeType: match[1],
                                    data: match[2]
                                }
                            });
                        }
                    });
                }
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: parts
                });
            });
        }

        // Add current message
        const currentParts: any[] = [{ text: message + contextText }]; // Inject context
        if (images && Array.isArray(images)) {
            images.forEach((img: string) => {
                const match = img.match(/^data:(.*?);base64,(.*)$/);
                if (match) {
                    currentParts.push({
                        inlineData: {
                            mimeType: match[1],
                            data: match[2]
                        }
                    });
                }
            });
        }
        contents.push({
            role: 'user',
            parts: currentParts
        });

        const result = await ai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: contents,
            config: {
                systemInstruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                maxOutputTokens: 2000,
            }
        });

        // 5. Stream Response & Accumulate
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-transform',
            'X-Conversation-Id': finalConversationId
        });

        let aiResponse = '';

        for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
                res.write(chunkText);
                aiResponse += chunkText;
            }
        }

        // 6. Save AI Response
        await saveAIResponse(
            historyCollection,
            userId,
            finalConversationId,
            aiResponse,
            userMsgId
        );

        // 7. Manage Conversation Metadata (Title & Timestamp)
        await manageConversationMetadata(
            conversationsCollection,
            finalConversationId,
            userId,
            message,
            !conversationId,
            ai
        );

        res.end();

    } catch (error: any) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate response' });
        } else {
            res.end();
        }
    }
}
