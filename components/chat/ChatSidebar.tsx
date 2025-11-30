import React, { useState } from 'react';

interface ChatSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    conversations: any[];
    conversationId: string | null;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onRenameConversation: (id: string, newTitle: string) => void;
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
    onDeleteConversation,
    user,
    onLogout,
    onOpenSettings
}: ChatSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

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

    return (
        <aside className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} bg-[#1e1f20] flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col overflow-hidden border-r border-[#444746]/30`}>
            <div className="p-4 flex flex-col h-full">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#333537] rounded-full text-[#e3e3e3] mb-4 inline-block w-fit">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
                </button>

                <button
                    onClick={onNewChat}
                    className="flex items-center gap-3 bg-[#1e1f20] hover:bg-[#333537] border border-[#444746] text-[#e3e3e3] px-4 py-3 rounded-full w-full transition-colors mb-6 shadow-sm"
                >
                    <svg className="w-5 h-5 text-[#c4c7c5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-sm font-medium">Cuộc trò chuyện mới</span>
                </button>

                <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-1">
                    <p className="text-xs font-medium text-[#c4c7c5] px-3 mb-2 uppercase tracking-wider">Gần đây</p>
                    {conversations.map((conv) => (
                        <div key={conv._id} className="group relative">
                            <button
                                onClick={() => onSelectConversation(conv._id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors pr-8 ${conversationId === conv._id ? 'bg-[#004a77] text-[#c2e7ff]' : 'text-[#e3e3e3] hover:bg-[#333537]'}`}
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
                                        className="bg-transparent border-none outline-none w-full p-0 text-inherit"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    conv.title || conv.lastMessage || 'Cuộc trò chuyện mới'
                                )}
                            </button>
                            {editingId !== conv._id && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1e1f20] shadow-sm rounded-md">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartRename(conv._id, conv.title || conv.lastMessage || 'Cuộc trò chuyện mới');
                                        }}
                                        className="p-1 hover:bg-[#444746] rounded text-[#c4c7c5] hover:text-[#e3e3e3]"
                                        title="Đổi tên"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
                                                onDeleteConversation(conv._id);
                                            }
                                        }}
                                        className="p-1 hover:bg-[#444746] rounded text-[#c4c7c5] hover:text-red-400"
                                        title="Xóa"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-auto border-t border-[#444746]/30 pt-4">
                    <button
                        onClick={onOpenSettings}
                        className="flex items-center gap-3 hover:bg-[#333537] text-[#e3e3e3] px-4 py-3 rounded-full w-full transition-colors mb-2"
                    >
                        <svg className="w-5 h-5 text-[#c4c7c5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-sm font-medium">Cài đặt API Key</span>
                    </button>
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
                            <p className="text-xs text-[#c4c7c5] truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 hover:bg-[#333537] text-red-400 px-4 py-3 rounded-full w-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="text-sm font-medium">Đăng xuất</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
