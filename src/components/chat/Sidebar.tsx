import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSearch } from './UserSearch';
import { ConversationSkeleton } from '../ui/Skeleton';
import { Users, MessageSquare, Home, LogOut, Search, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../ui/Avatar';


interface SidebarProps {
    conversations: any[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onCreateGroup: () => void;
    onStartChat: (userId: string) => void;
    currentUser: any;
    isLoading?: boolean;
    onlineUsers?: { [userId: string]: { isOnline: boolean, lastSeen: string | null } };
}

export const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onCreateGroup,
    onStartChat,
    currentUser,
    isLoading = false,
    onlineUsers = {}
}) => {
    const [activeTab, setActiveTab] = useState<'chats' | 'explore'>('chats');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true;
        const displayName = conv.isGroup
            ? conv.name
            : conv.users?.find((u: any) => u.userId !== currentUser.id)?.user?.username || 'Unknown User';
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="w-full bg-[#111827] border-r border-white/8 flex flex-col h-full shadow-2xl z-20">
            {/* Header - Compact & Clean */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="font-bold text-white text-lg tracking-tight">Messages</h1>
                    <button
                        onClick={onCreateGroup}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                        title="Create Group"
                    >
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>

                {/* Search Bar - Compact */}
                <div className="relative group">
                    <div className="relative bg-[#0f172a]/50 border border-white/10 rounded-xl flex items-center transition-all focus-within:border-blue-500/50 focus-within:bg-[#0f172a]">
                        <Search className="w-4 h-4 text-slate-500 ml-3" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-white text-xs py-2 px-2.5 rounded-xl focus:outline-none placeholder-slate-600"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mr-2 p-0.5 text-slate-500 hover:text-white rounded-full transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs - Underline Style */}
                <div className="flex border-b border-white/5 relative">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`flex-1 pb-2 text-xs font-semibold transition-all relative ${activeTab === 'chats'
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Chats
                        {activeTab === 'chats' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('explore')}
                        className={`flex-1 pb-2 text-xs font-semibold transition-all relative ${activeTab === 'explore'
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Explore
                        {activeTab === 'explore' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'chats' ? (
                        <motion.div
                            key="chats"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                {isLoading ? (
                                    // Skeleton loading state
                                    <>
                                        {[...Array(5)].map((_, i) => (
                                            <ConversationSkeleton key={i} />
                                        ))}
                                    </>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 opacity-50">
                                        <MessageSquare className="w-10 h-10 mb-2" />
                                        <p className="text-xs">No conversations</p>
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => {
                                        const otherUser = !conv.isGroup
                                            ? conv.users?.find((u: any) => u.userId !== currentUser.id)
                                            : null;

                                        const displayName = conv.isGroup
                                            ? conv.name
                                            : otherUser?.user?.username || 'Unknown User';

                                        const lastMessage = conv.messages?.[0];
                                        const isActive = activeConversationId === conv.id;

                                        const isOnline = otherUser ? onlineUsers[otherUser.userId]?.isOnline : false;

                                        return (
                                            <motion.div
                                                key={conv.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                onClick={() => onSelectConversation(conv.id)}
                                                className={`
                                                    group relative rounded-2xl cursor-pointer transition-all duration-200 
                                                    flex items-center touch-manipulation
                                                    p-2.5 md:p-3 gap-2.5 md:gap-3
                                                    hover:scale-[1.01] active:scale-[0.99]
                                                    ${isActive
                                                        ? 'bg-gradient-to-r from-blue-600/15 to-purple-600/15 border-l-2 border-blue-500 shadow-lg shadow-blue-500/15'
                                                        : 'hover:bg-white/5 border-l-2 border-transparent'
                                                    }
                                                `}
                                            >
                                                {/* Avatar - Responsive sizing */}
                                                <div className="relative flex-shrink-0">
                                                    {conv.isGroup ? (
                                                        conv.iconUrl ? (
                                                            <Avatar
                                                                src={conv.iconUrl}
                                                                alt={displayName}
                                                                size="md"
                                                                className="md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full ring-2 ring-white/10"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-md ring-2 ring-white/10 bg-gradient-to-br from-indigo-500 to-purple-500">
                                                                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <>
                                                            <Avatar
                                                                src={otherUser?.user?.avatarUrl}
                                                                alt={displayName}
                                                                size="md"
                                                                className="md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full ring-2 ring-white/10"
                                                            />
                                                            {isOnline && (
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111827] shadow-sm shadow-green-500/50" />
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Content - Responsive truncation */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <h3 className={`font-medium truncate text-sm ${isActive ? 'text-white' : 'text-slate-200'
                                                            }`}>
                                                            {displayName}
                                                        </h3>
                                                        {lastMessage && (
                                                            <span className="text-[11px] text-slate-500 ml-2 flex-shrink-0">
                                                                {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] text-slate-400 truncate max-w-[140px] md:max-w-[180px] lg:max-w-[220px]">
                                                        {conv.isGroup && lastMessage ? (
                                                            <span className="font-semibold mr-1">{lastMessage.sender?.username}:</span>
                                                        ) : null}
                                                        {lastMessage?.content || 'No messages'}
                                                    </p>
                                                </div>

                                                {/* Badge & Status Indicators */}
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    {(conv.unreadCount > 0 && !isActive) && (
                                                        <motion.div
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full text-[10px] font-bold text-white shadow-lg shadow-blue-500/30"
                                                        >
                                                            {conv.unreadCount}
                                                        </motion.div>
                                                    )}
                                                    {isActive && (
                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="explore"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <UserSearch onStartChat={onStartChat} currentUserId={currentUser.id} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer - Minimalist */}
            <div className="p-3 border-t border-white/5 bg-[#0f172a]/50 flex items-center gap-3 backdrop-blur-sm">
                <Avatar
                    src={currentUser?.avatarUrl}
                    alt={currentUser?.username}
                    size="md"
                    className="ring-2 ring-white/15"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.username}</p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-500/50" />
                        <p className="text-[11px] text-green-400 font-medium">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleGoHome}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Home"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowLogoutModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                                    <LogOut className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Confirm Logout</h3>
                                    <p className="text-sm text-slate-400">Are you sure you want to leave?</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">
                                You'll need to log in again to access your messages.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all shadow-lg shadow-red-600/30"
                                >
                                    Logout
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
