import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChatMessage, Conversation } from '../types/chat';

export function useChat() {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const isSendingRef = useRef(false);
    const [user, setUser] = useState<any>(null);
    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const fetchConversations = (token: string) => {
        fetch('/api/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.conversations) {
                    setConversations(data.conversations);
                }
            })
            .catch(err => console.error(err));
    };

    const deleteConversation = async (id: string) => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;

        try {
            const res = await fetch(`/api/conversations?conversationId=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setConversations(prev => prev.filter(c => c._id !== id));
                if (conversationId === id) {
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleRename = async (id: string, newTitle: string) => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;

        try {
            const res = await fetch('/api/conversations', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ conversationId: id, title: newTitle })
            });

            if (res.ok) {
                setConversations(prev => prev.map(c => c._id === id ? { ...c, title: newTitle } : c));
            }
        } catch (error) {
            console.error('Failed to rename conversation:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('chatbot_token');
        const userData = localStorage.getItem('chatbot_user');
        if (!token) {
            router.push('/');
            return;
        }
        if (userData) {
            setUser(JSON.parse(userData));
        }

        const storedKey = localStorage.getItem('user_gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        } else {
            setShowSettings(true);
        }

        fetchConversations(token);

        if (router.query.id) {
            setConversationId(router.query.id as string);
        }
    }, [router.isReady, router.query.id]);

    useEffect(() => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;

        if (isSendingRef.current) return;

        setLoading(true);
        const url = conversationId
            ? `/api/history?conversationId=${conversationId}`
            : '/api/history';

        if (!conversationId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('chatbot_token');
                    router.push('/');
                    throw new Error('Unauthorized');
                }
                return res.json();
            })
            .then(data => {
                if (data.history) {
                    setMessages(data.history.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content,
                        images: msg.images
                    })));
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [conversationId]);

    useEffect(() => {
        if (isAtBottomRef.current && scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, loading]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAtBottomRef.current = isAtBottom;
    };

    const formatAIResponse = (text: string) => {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        if (formatted.match(/(?:^|\n)[-*] /)) {
            formatted = formatted.replace(/(?:^|\n)[-*] (.*?)(?=\n|$)/g, '<li>$1</li>');
        }
        if (!formatted.includes('<br') && !formatted.includes('<p>')) {
            formatted = formatted.replace(/\n/g, '<br>');
        }
        return formatted;
    };

    const saveApiKey = (key: string) => {
        localStorage.setItem('user_gemini_api_key', key);
        setApiKey(key);
        setShowSettings(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setSelectedImages(prev => [...prev, event.target?.result as string]);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const handleNewChat = () => {
        setConversationId(null);
        setMessages([]);
        setInput('');
        setSelectedImages([]);
        router.push('/chat', undefined, { shallow: true });
    };

    const selectConversation = (id: string) => {
        setConversationId(id);
        router.push(`/chat?id=${id}`, undefined, { shallow: true });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && selectedImages.length === 0) return;

        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        const promptToSend = input.trim();
        const imagesToSend = [...selectedImages];

        setInput('');
        setSelectedImages([]);

        setMessages(prev => [...prev, { role: 'user', content: promptToSend, images: imagesToSend }]);
        setLoading(true);
        isAtBottomRef.current = true;
        isSendingRef.current = true;

        const token = localStorage.getItem('chatbot_token');

        try {
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-user-api-key': apiKey
                },
                body: JSON.stringify({
                    message: promptToSend,
                    images: imagesToSend,
                    conversationId: conversationId,
                    history: messages.slice(-10)
                })
            });

            fetchConversations(token!);

            if (response.status === 401) {
                const data = await response.json();
                if (data.error === 'API Key is missing') {
                    setShowSettings(true);
                    throw new Error('API Key missing or invalid');
                }
            }

            if (!response.ok) throw new Error('Failed to send message');
            if (!response.body) throw new Error('No response body');

            const newConversationId = response.headers.get('X-Conversation-Id');
            if (newConversationId && !conversationId) {
                setConversationId(newConversationId);
                router.push(`/chat?id=${newConversationId}`, undefined, { shallow: true });
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'ai') {
                        lastMsg.content = formatAIResponse(aiResponse);
                    } else {
                        newMessages.push({ role: 'ai', content: formatAIResponse(aiResponse) });
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === 'ai' && !lastMsg.content) {
                    lastMsg.content = 'Xin lỗi, có lỗi xảy ra. Vui lòng kiểm tra API Key.';
                }
                return newMessages;
            });
        } finally {
            setLoading(false);
            isSendingRef.current = false;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('chatbot_token');
        localStorage.removeItem('chatbot_user');
        router.push('/');
    };

    return {
        messages,
        input,
        setInput,
        loading,
        selectedImages,
        messagesEndRef,
        fileInputRef,
        scrollContainerRef,
        handleScroll,
        user,
        apiKey,
        setApiKey,
        showSettings,
        setShowSettings,
        conversations,
        conversationId,
        handleSendMessage,
        handleNewChat,
        selectConversation,
        handleFileSelect,
        removeImage,
        handlePaste,
        saveApiKey,
        deleteConversation,
        handleRename,
        handleLogout
    };
}
