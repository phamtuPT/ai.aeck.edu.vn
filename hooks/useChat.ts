import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChatMessage, Conversation, User, ConversationsResponse, Attachment } from '../types/chat';
import { toast } from 'sonner';


export function useChat() {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const isSendingRef = useRef(false);
    const [user, setUser] = useState<User | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'general' | 'math' | 'reading' | 'science'>('general');

    const fetchConversations = (token: string) => {
        fetch('/api/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then((data: ConversationsResponse) => {
                if (data.conversations) {
                    setConversations(data.conversations);
                }
            })
            .catch(err => {
                console.error(err);
                toast.error('Không thể tải danh sách cuộc trò chuyện');
            });
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
                toast.success('Đã xóa cuộc trò chuyện');
            } else {
                toast.error('Xóa cuộc trò chuyện thất bại');
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            toast.error('Có lỗi xảy ra khi xóa cuộc trò chuyện');
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
                toast.success('Đã đổi tên cuộc trò chuyện');
            } else {
                toast.error('Đổi tên thất bại');
            }
        } catch (error) {
            console.error('Failed to rename conversation:', error);
            toast.error('Có lỗi xảy ra khi đổi tên');
        }
    };

    const togglePin = async (id: string, isPinned: boolean) => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;
        try {
            const res = await fetch('/api/conversations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ conversationId: id, isPinned })
            });
            if (res.ok) {
                setConversations(prev => prev.map(c => c._id === id ? { ...c, isPinned } : c));
                toast.success(isPinned ? 'Đã ghim cuộc trò chuyện' : 'Đã bỏ ghim');
            }
        } catch (error) {
            toast.error('Lỗi khi cập nhật trạng thái ghim');
        }
    };

    const toggleArchive = async (id: string, isArchived: boolean) => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;
        try {
            const res = await fetch('/api/conversations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ conversationId: id, isArchived })
            });
            if (res.ok) {
                setConversations(prev => prev.map(c => c._id === id ? { ...c, isArchived } : c));
                toast.success(isArchived ? 'Đã lưu trữ cuộc trò chuyện' : 'Đã bỏ lưu trữ');
            }
        } catch (error) {
            toast.error('Lỗi khi cập nhật trạng thái lưu trữ');
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
            toast.info('Vui lòng nhập API Key để bắt đầu');
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
                        attachments: msg.attachments || (msg.images ? msg.images.map((img: string) => ({ type: 'image/png', url: img, name: 'Image' })) : [])
                    })));
                }
            })
            .catch(err => {
                console.error(err);
                toast.error('Không thể tải lịch sử trò chuyện');
            })
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAttachments(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        url: reader.result as string
                    }]);
                };
                reader.readAsDataURL(file);
            });
            // Reset input value to allow selecting the same file again
            e.target.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        console.log('Paste event detected, items:', items.length);

        for (let i = 0; i < items.length; i++) {
            console.log(`Item ${i} type:`, items[i].type);
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); // Prevent default paste behavior for images
                const blob = items[i].getAsFile();
                const fileType = items[i].type; // Capture type synchronously
                if (blob) {
                    console.log('Processing pasted image');
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setAttachments(prev => [...prev, {
                            name: 'Pasted Image',
                            type: fileType,
                            url: event.target?.result as string
                        }]);
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
        setAttachments([]);
        router.push('/chat', undefined, { shallow: true });
    };

    const selectConversation = (id: string) => {
        setConversationId(id);
        router.push(`/chat?id=${id}`, undefined, { shallow: true });
    };

    const abortControllerRef = useRef<AbortController | null>(null);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoading(false);
            isSendingRef.current = false;
            toast.info('Đã dừng tạo câu trả lời');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && attachments.length === 0) return;

        // Check for API key again just in case
        const currentApiKey = localStorage.getItem('user_gemini_api_key');
        if (!currentApiKey) {
            toast.error('Vui lòng nhập API Key để tiếp tục', {
                action: {
                    label: 'Cài đặt',
                    onClick: () => router.push('/settings')
                }
            });
            return;
        }
        if (currentApiKey !== apiKey) setApiKey(currentApiKey);


        const promptToSend = input.trim();
        const attachmentsToSend = [...attachments];

        setInput('');
        setAttachments([]);

        setMessages(prev => [...prev, { role: 'user', content: promptToSend, attachments: attachmentsToSend }]);
        setLoading(true);
        setIsThinking(true);
        isAtBottomRef.current = true;
        isSendingRef.current = true;

        const token = localStorage.getItem('chatbot_token');

        // Create new AbortController
        abortControllerRef.current = new AbortController();

        try {
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);

            console.log('Sending request with API Key:', currentApiKey ? 'Present' : 'Missing');

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-user-api-key': currentApiKey.trim()
                },
                body: JSON.stringify({
                    message: promptToSend,
                    attachments: attachmentsToSend,
                    conversationId: conversationId,
                    history: messages.slice(-10),
                    mode: selectedMode
                }),
                signal: abortControllerRef.current.signal
            });

            fetchConversations(token!);

            if (!response.ok) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // Not JSON
                }

                if (data) {
                    if (response.status === 401 && data.error === 'API Key is missing') {
                        router.push('/settings');
                        throw new Error('API Key missing or invalid');
                    }
                    throw new Error(data.error || text || `Error ${response.status}`);
                } else {
                    throw new Error(text || `Error ${response.status}: ${response.statusText}`);
                }
            }
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

                if (isThinking) setIsThinking(false);

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'ai') {
                        lastMsg.content = aiResponse;
                    } else {
                        newMessages.push({ role: 'ai', content: aiResponse });
                    }
                    return newMessages;
                });
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
            } else {
                console.error(error);
                toast.error(`Lỗi: ${error.message || 'Có lỗi xảy ra. Vui lòng kiểm tra API Key.'}`);
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'ai' && !lastMsg.content) {
                        lastMsg.content = `Lỗi: ${error.message || 'Có lỗi xảy ra. Vui lòng kiểm tra API Key.'}`;
                    }
                    return newMessages;
                });
            }
        } finally {
            setLoading(false);
            setIsThinking(false);
            isSendingRef.current = false;
            abortControllerRef.current = null;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('chatbot_token');
        localStorage.removeItem('chatbot_user');
        router.push('/');
        toast.success('Đã đăng xuất');
    };

    return {
        messages,
        input,
        setInput,
        loading,
        isThinking,
        attachments,
        messagesEndRef,
        fileInputRef,
        scrollContainerRef,
        handleScroll,
        user,
        apiKey,
        setApiKey,
        conversations,
        conversationId,
        handleSendMessage,
        handleNewChat,
        selectConversation,
        handleFileSelect,
        removeAttachment,
        handlePaste,
        deleteConversation,
        handleRename,
        togglePin,
        toggleArchive,
        handleLogout,
        stopGeneration,
        selectedMode,
        setSelectedMode
    };
}
