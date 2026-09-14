import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ChatMessage, Conversation, User, ConversationsResponse, Attachment } from '../types/chat';
import { toast } from 'sonner';
import { API_KEY_STORAGE, DEFAULT_MODEL_ID, PROVIDERS, SELECTED_MODEL_STORAGE, getModel, type ProviderId } from '@/lib/ai/models';

function readApiKeys(): Record<ProviderId, string> {
    return {
        gemini: localStorage.getItem(API_KEY_STORAGE.gemini) || '',
        openai: localStorage.getItem(API_KEY_STORAGE.openai) || '',
        anthropic: localStorage.getItem(API_KEY_STORAGE.anthropic) || '',
    };
}

const HISTORY_PAGE_SIZE = 30;

interface HistoryDoc {
    _id?: string;
    role: ChatMessage['role'];
    content: string;
    attachments?: Attachment[];
    images?: string[];
}

function toChatMessage(msg: HistoryDoc): ChatMessage {
    return {
        id: msg._id ? String(msg._id) : undefined,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || (msg.images ? msg.images.map((img: string) => ({ type: 'image/png', url: img, name: 'Image' })) : [])
    };
}

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
    const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({ gemini: '', openai: '', anthropic: '' });
    const [selectedModel, setSelectedModelState] = useState<string>(DEFAULT_MODEL_ID);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'general' | 'math' | 'reading' | 'science'>('general');
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const historyCursorRef = useRef<string | null>(null);
    const loadingOlderRef = useRef(false);
    const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const instantScrollRef = useRef(false);
    conversationIdRef.current = conversationId;

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

        const keys = readApiKeys();
        setApiKeys(keys);
        const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE);
        const model = getModel(storedModel) || getModel(DEFAULT_MODEL_ID)!;
        setSelectedModelState(model.id);
        if (!keys.gemini && !keys.openai && !keys.anthropic) {
            toast.info('Vui lòng nhập API Key để bắt đầu');
        }

        fetchConversations(token);

        if (router.query.id) {
            setConversationId(router.query.id as string);
        }
    }, [router.isReady, router.query.id]);

    const fetchHistoryPage = async (id: string, before?: string | null) => {
        const token = localStorage.getItem('chatbot_token');
        const params = new URLSearchParams({ conversationId: id, limit: String(HISTORY_PAGE_SIZE) });
        if (before) params.set('before', before);

        const res = await fetch(`/api/history?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('chatbot_token');
            router.push('/');
            throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error(`History error ${res.status}`);

        const data = await res.json();
        return {
            messages: (data.history || []).map(toChatMessage) as ChatMessage[],
            hasMore: Boolean(data.hasMore),
            nextCursor: (data.nextCursor as string | null) ?? null
        };
    };

    useEffect(() => {
        const token = localStorage.getItem('chatbot_token');
        if (!token) return;

        if (isSendingRef.current) return;

        historyCursorRef.current = null;
        setHasMoreHistory(false);

        if (!conversationId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        isAtBottomRef.current = true;
        let cancelled = false;

        fetchHistoryPage(conversationId)
            .then(page => {
                if (cancelled) return;
                // Mở cuộc trò chuyện: nhảy thẳng xuống cuối, không cuộn mượt từ đầu
                // (cuộn qua vùng đầu trang sẽ kích hoạt tải tin nhắn cũ).
                instantScrollRef.current = true;
                setMessages(page.messages);
                setHasMoreHistory(page.hasMore);
                historyCursorRef.current = page.nextCursor;
            })
            .catch(err => {
                if (cancelled || err.message === 'Unauthorized') return;
                console.error(err);
                toast.error('Không thể tải lịch sử trò chuyện');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    const loadOlderMessages = async () => {
        const id = conversationId;
        const cursor = historyCursorRef.current;
        const container = scrollContainerRef.current;
        if (!id || !cursor || !hasMoreHistory || loadingOlderRef.current || isSendingRef.current) return;

        loadingOlderRef.current = true;
        setLoadingOlder(true);
        try {
            const page = await fetchHistoryPage(id, cursor);
            // Người dùng có thể đã chuyển sang cuộc trò chuyện khác trong lúc tải.
            if (id !== conversationIdRef.current) return;
            if (container) {
                pendingScrollRestoreRef.current = {
                    scrollHeight: container.scrollHeight,
                    scrollTop: container.scrollTop
                };
            }
            setMessages(prev => [...page.messages, ...prev]);
            setHasMoreHistory(page.hasMore);
            historyCursorRef.current = page.nextCursor;
        } catch (err) {
            if ((err as Error).message !== 'Unauthorized') {
                console.error(err);
                toast.error('Không thể tải tin nhắn cũ hơn');
            }
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    };

    // Giữ nguyên vị trí đang đọc sau khi chèn tin nhắn cũ lên đầu danh sách.
    useLayoutEffect(() => {
        const restore = pendingScrollRestoreRef.current;
        const container = scrollContainerRef.current;
        if (!restore || !container) return;
        pendingScrollRestoreRef.current = null;
        container.scrollTop = container.scrollHeight - restore.scrollHeight + restore.scrollTop;
    }, [messages]);

    useEffect(() => {
        if (isAtBottomRef.current && scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: instantScrollRef.current ? 'auto' : 'smooth'
            });
        }
        if (!loading) instantScrollRef.current = false;
    }, [messages, loading]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAtBottomRef.current = isAtBottom;
        if (scrollTop < 200 && !loading) {
            loadOlderMessages();
        }
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

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); // Prevent default paste behavior for images
                const blob = items[i].getAsFile();
                const fileType = items[i].type; // Capture type synchronously
                if (blob) {
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

    const setSelectedModel = (id: string) => {
        if (!getModel(id)) return;
        setSelectedModelState(id);
        localStorage.setItem(SELECTED_MODEL_STORAGE, id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && attachments.length === 0) return;

        const model = getModel(selectedModel) || getModel(DEFAULT_MODEL_ID)!;
        // Đọc lại key phòng khi người dùng vừa cập nhật ở trang Cài đặt (tab khác).
        const keys = readApiKeys();
        setApiKeys(keys);
        const currentApiKey = keys[model.provider].trim();
        if (!currentApiKey) {
            toast.error(`Vui lòng nhập API Key ${PROVIDERS[model.provider].label} để dùng ${model.label}`, {
                action: {
                    label: 'Cài đặt',
                    onClick: () => router.push('/settings')
                }
            });
            return;
        }


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

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-user-api-key': currentApiKey
            };
            // Key Gemini giúp tìm kiếm tài liệu (embedding) khi đang chat bằng hãng khác.
            if (model.provider !== 'gemini' && keys.gemini.trim()) {
                headers['x-gemini-api-key'] = keys.gemini.trim();
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                cache: 'no-store',
                headers,
                body: JSON.stringify({
                    message: promptToSend,
                    attachments: attachmentsToSend,
                    conversationId: conversationId,
                    mode: selectedMode,
                    model: model.id
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // Not JSON
                }

                if (data) {
                    if (response.status === 401 && (data.error === 'API Key is missing' || /API Key/.test(data.error || ''))) {
                        router.push('/settings');
                        throw new Error(data.error === 'API Key is missing' ? 'Chưa có API Key' : data.error);
                    }
                    throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
                } else {
                    // Phản hồi không phải JSON (vd: trang lỗi HTML của Next.js/Vercel) — không hiển thị nguyên văn.
                    console.error(`Chat API ${response.status}:`, text.slice(0, 500));
                    throw new Error(`Máy chủ gặp lỗi (${response.status}). Vui lòng thử lại sau.`);
                }
            }
            if (!response.body) throw new Error('No response body');

            const newConversationId = response.headers.get('X-Conversation-Id');
            if (newConversationId && !conversationId) {
                setConversationId(newConversationId);
                router.push(`/chat?id=${newConversationId}`, undefined, { shallow: true });
                fetchConversations(token!);
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

            // Tiêu đề được tạo xong khi stream kết thúc.
            fetchConversations(token!);
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

    const handleLogout = async () => {
        const token = localStorage.getItem('chatbot_token');
        if (token) {
            // Hủy phiên trên server để token cũ không dùng lại được (vd: máy tính dùng chung).
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => { });
        }
        localStorage.removeItem('chatbot_token');
        localStorage.removeItem('chatbot_user');
        // API key gắn với trình duyệt, xóa đi để người dùng sau trên cùng máy không dùng key của người trước.
        Object.values(API_KEY_STORAGE).forEach(key => localStorage.removeItem(key));
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
        apiKeys,
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
        setSelectedMode,
        selectedModel,
        setSelectedModel,
        hasMoreHistory,
        loadingOlder
    };
}
