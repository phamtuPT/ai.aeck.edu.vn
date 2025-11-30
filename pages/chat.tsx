import React, { useState } from 'react';
import Head from 'next/head';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import SettingsModal from '@/components/chat/SettingsModal';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const {
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
    } = useChat();

    const onNewChat = () => {
        handleNewChat();
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const onSelectConversation = (id: string) => {
        selectConversation(id);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden">
            <Head>
                <title>Trợ giảng AI</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
            </Head>

            <ChatSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                conversations={conversations}
                conversationId={conversationId}
                onNewChat={onNewChat}
                onSelectConversation={onSelectConversation}
                onRenameConversation={handleRename}
                onDeleteConversation={deleteConversation}
                user={user}
                onLogout={handleLogout}
                onOpenSettings={() => setShowSettings(true)}
            />

            <main className="flex-1 flex flex-col relative min-w-0">
                <header className="flex items-center justify-between px-5 py-4 text-[#e3e3e3] border-b border-[#444746]/30">
                    <div className="flex items-center gap-2">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#333537] rounded-full mr-2">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
                            </button>
                        )}
                        <span className="text-lg font-medium">Trợ giảng AI</span>
                    </div>
                </header>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 pb-48 scroll-smooth"
                >
                    <ChatMessages
                        messages={messages}
                        loading={loading}
                        messagesEndRef={messagesEndRef}
                    />
                </div>

                <ChatInput
                    input={input}
                    setInput={setInput}
                    onSendMessage={handleSendMessage}
                    onFileSelect={handleFileSelect}
                    fileInputRef={fileInputRef}
                    selectedImages={selectedImages}
                    onRemoveImage={removeImage}
                    loading={loading}
                    onPaste={handlePaste}
                />
            </main>

            <SettingsModal
                showSettings={showSettings}
                onClose={() => setShowSettings(false)}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onSave={() => saveApiKey(apiKey)}
            />
        </div>
    );
}
