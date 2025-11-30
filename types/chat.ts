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

export interface ContextItem {
    id: string;
    content: string;
    explanation?: string;
    examId?: string;
    score?: number;
}
