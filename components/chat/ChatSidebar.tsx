import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';

interface ChatSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    conversations: any[];
    conversationId: string | null;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
    onTogglePin: (id: string, isPinned: boolean) => void;
    onToggleArchive: (id: string, isArchived: boolean) => void;
    onDeleteConversation: (id: string) => void;
    user: any;
    onLogout: () => void;
    onOpenSettings: () => void;
}

export default function ChatSidebar({
    sidebarOpen,
    setSidebarOpen,
    conversations,
    conversationId,
    onNewChat,
    onSelectConversation,
    onRenameConversation,
    onTogglePin,
    onToggleArchive,
    onDeleteConversation,
    user,
    onLogout,
    onOpenSettings
}: ChatSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleStartRename = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditTitle(currentTitle);
    };

    const handleFinishRename = (id: string) => {
        if (editTitle.trim()) {
            onRenameConversation(id, editTitle);
        }
        setEditingId(null);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const token = localStorage.getItem('chatbot_token');
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data.results || []);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const groupedConversations = useMemo(() => {
        if (searchQuery.trim()) {
            return {
                search: searchResults,
                pinned: [], today: [], yesterday: [], older: [], archived: []
            };
        }

        const pinned = conversations.filter(c => c.isPinned && !c.isArchived);
        const archived = conversations.filter(c => c.isArchived);
        const others = conversations.filter(c => !c.isPinned && !c.isArchived);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = (dateStr: string) => new Date(dateStr).toDateString() === today.toDateString();
        const isYesterday = (dateStr: string) => new Date(dateStr).toDateString() === yesterday.toDateString();

        const todayConvs = others.filter(c => isToday(c.updatedAt));
        const yesterdayConvs = others.filter(c => isYesterday(c.updatedAt));
        const olderConvs = others.filter(c => !isToday(c.updatedAt) && !isYesterday(c.updatedAt));

        return {
            search: [],
            pinned,
            today: todayConvs,
            yesterday: yesterdayConvs,
            older: olderConvs,
            archived
        };
    }, [conversations, searchQuery, searchResults]);

    const renderConversationItem = (conv: any, isSearchResult = false) => (
        <div key={conv.id || conv._id} className="group relative">
            <button
                onClick={() => onSelectConversation(conv.id || conv._id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm truncate transition-all duration-200 pr-10 border border-transparent ${conversationId === (conv.id || conv._id)
                    ? 'bg-white/10 text-white border-white/5 shadow-sm'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
            >
                {editingId === conv._id ? (
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename(conv._id);
                            if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="bg-transparent border-none outline-none w-full p-0 text-inherit font-medium"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div>
                        <span className="font-medium block truncate">{conv.title || conv.lastMessage || 'Cuộc trò chuyện mới'}</span>
                        {isSearchResult && conv.type === 'message' && (
                            <span className="text-xs text-gray-500 block truncate mt-0.5">{conv.match}</span>
                        )}
                    </div>
                )}
            </button>
            {!isSearchResult && editingId !== conv._id && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1e1f20] shadow-lg rounded-lg border border-white/10 p-0.5 z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(conv._id, !conv.isPinned); }}
                        className={`p-1.5 hover:bg-white/10 rounded-md transition-colors ${conv.isPinned ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
                        title={conv.isPinned ? "Bỏ ghim" : "Ghim"}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStartRename(conv._id, conv.title); }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                        title="Đổi tên"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleArchive(conv._id, !conv.isArchived); }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                        title={conv.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) onDeleteConversation(conv._id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                        title="Xóa"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`fixed inset-y-0 left-0 z-50 h-full md:relative md:translate-x-0 bg-[#0a0a0a] md:bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0 w-[85%] max-w-[300px] md:w-[300px] md:max-w-none' : '-translate-x-full w-[85%] max-w-[300px] md:w-0 md:translate-x-0'}`}>
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                            <img src="/AECK_white.png" alt="AECK" className="h-8 object-contain" />
                        </div>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        </button>
                    </div>

                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all"
                        />
                        <svg className="w-4 h-4 text-gray-500 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <button
                        onClick={onNewChat}
                        className="group flex items-center gap-3 bg-white text-black hover:bg-gray-200 px-4 py-3.5 rounded-xl w-full transition-all shadow-lg mb-6 transform hover:-translate-y-0.5"
                    >
                        <div className="bg-black/10 p-1 rounded-lg group-hover:rotate-90 transition-transform duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="text-sm font-semibold">Cuộc trò chuyện mới</span>
                    </button>

                    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-4 custom-scrollbar">
                        {searchQuery.trim() ? (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider">Kết quả tìm kiếm</p>
                                {groupedConversations.search?.length === 0 ? (
                                    <p className="text-sm text-gray-500 px-4">Không tìm thấy kết quả</p>
                                ) : (
                                    groupedConversations.search?.map(c => renderConversationItem(c, true))
                                )}
                            </div>
                        ) : (
                            <>
                                {groupedConversations.pinned.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                            Đã ghim
                                        </p>
                                        {groupedConversations.pinned.map(c => renderConversationItem(c))}
                                    </div>
                                )}

                                {groupedConversations.today.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider">Hôm nay</p>
                                        {groupedConversations.today.map(c => renderConversationItem(c))}
                                    </div>
                                )}

                                {groupedConversations.yesterday.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider">Hôm qua</p>
                                        {groupedConversations.yesterday.map(c => renderConversationItem(c))}
                                    </div>
                                )}

                                {groupedConversations.older.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider">Cũ hơn</p>
                                        {groupedConversations.older.map(c => renderConversationItem(c))}
                                    </div>
                                )}

                                {groupedConversations.archived.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 px-3 mb-2 uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                            Lưu trữ
                                        </p>
                                        {groupedConversations.archived.map(c => renderConversationItem(c))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-auto border-t border-white/10 pt-4 space-y-2">
                        <button onClick={onOpenSettings} className="flex items-center gap-3 hover:bg-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl w-full transition-colors group">
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-sm font-medium">Cài đặt</span>
                        </button>
                        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/5">
                            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm shadow-md">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'User'}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Đăng xuất">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-[10px] text-gray-600 font-mono">v2024.12.01-1</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
