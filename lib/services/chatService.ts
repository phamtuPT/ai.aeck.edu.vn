import { Collection, ObjectId } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { TITLE_GENERATION_PROMPT } from '@/lib/prompts';

export async function saveUserMessage(
    historyCollection: Collection,
    userId: string,
    conversationId: string,
    message: string,
    images: string[]
) {
    const userMsgId = new ObjectId();
    await historyCollection.insertOne({
        _id: userMsgId,
        userId,
        conversationId,
        role: 'user',
        content: message,
        images: images || [],
        createdAt: new Date()
    });
    return userMsgId;
}

export async function saveAIResponse(
    historyCollection: Collection,
    userId: string,
    conversationId: string,
    aiResponse: string,
    replyToId: ObjectId
) {
    await historyCollection.insertOne({
        userId,
        conversationId,
        role: 'ai',
        content: aiResponse,
        createdAt: new Date(),
        replyTo: replyToId
    });
}

export async function manageConversationMetadata(
    conversationsCollection: Collection,
    conversationId: string,
    userId: string,
    message: string,
    isNewConversation: boolean,
    aiClient: GoogleGenAI
) {
    if (isNewConversation) {
        // New conversation: Generate Title
        let title = 'Cuộc trò chuyện mới';
        try {
            const titleGen = await aiClient.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: TITLE_GENERATION_PROMPT(message) }] }],
                config: { maxOutputTokens: 20 }
            });
            title = titleGen.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Cuộc trò chuyện mới';
        } catch (e) {
            console.error('Title generation failed:', e);
        }

        await conversationsCollection.insertOne({
            _id: conversationId as any,
            userId,
            title,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    } else {
        // Existing conversation: Update timestamp
        await conversationsCollection.updateOne(
            { _id: conversationId as any },
            { $set: { updatedAt: new Date() } },
            { upsert: true }
        );
    }
}
