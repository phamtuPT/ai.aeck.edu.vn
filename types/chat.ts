export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    images?: string[];
}

export interface Conversation {
    _id: string;
    title?: string;
    lastMessage?: string;
    createdAt: string;
    updatedAt: string;
}
