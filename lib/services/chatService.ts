import { Collection, ObjectId } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { TITLE_GENERATION_PROMPT } from '@/lib/prompts';

export async function saveUserMessage(
    historyCollection: Collection,
    userId: string,
    conversationId: string,
    message: string,
    attachments: any[]
) {
    const userMsgId = new ObjectId();
    await historyCollection.insertOne({
        _id: userMsgId,
        userId,
        conversationId,
        role: 'user',
        content: message,
        attachments: attachments || [],
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

export async function getSmartHistory(
    historyCollection: Collection,
    conversationId: string,
    aiClient: GoogleGenAI
): Promise<any[]> {
    // Fetch last 20 messages
    const messages = await historyCollection.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    const sortedMessages = messages.reverse();

    const formatMessage = (msg: any) => {
        const parts: any[] = [{ text: msg.content || '' }]; // Ensure text is not undefined

        // Handle new attachments structure
        if (msg.attachments && Array.isArray(msg.attachments)) {
            msg.attachments.forEach((att: any) => {
                if (att.type.startsWith('image/')) {
                    const match = att.url.match(/^data:([^;]+);(?:charset=[^;]+;)?base64,(.*)$/);
                    if (match) {
                        parts.push({
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        });
                    }
                }
            });
        }
        // Handle legacy images structure
        else if (msg.images && Array.isArray(msg.images)) {
            msg.images.forEach((img: string) => {
                const match = img.match(/^data:([^;]+);(?:charset=[^;]+;)?base64,(.*)$/);
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

        return {
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: parts
        };
    };

    if (sortedMessages.length <= 10) {
        return sortedMessages.map(formatMessage);
    }

    // Split into older and recent
    const olderMessages = sortedMessages.slice(0, sortedMessages.length - 10);
    const recentMessages = sortedMessages.slice(sortedMessages.length - 10);

    // Summarize older messages
    const textToSummarize = olderMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    let summary = "Previous conversation summary: ";
    try {
        const summaryGen = await aiClient.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: `Summarize this conversation concisely:\n${textToSummarize}` }] }]
        });
        summary += summaryGen.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
    } catch (e) {
        console.error('Summarization failed', e);
        summary += "Content unavailable.";
    }

    const history = [
        { role: 'user', parts: [{ text: summary }] },
        { role: 'model', parts: [{ text: "Understood. I will use this summary as context." }] },
        ...recentMessages.map(formatMessage)
    ];

    return history;
}
