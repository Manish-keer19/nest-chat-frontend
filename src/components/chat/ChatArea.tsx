import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { MessageBubble } from './MessageBubble';
import { Send, MoreVertical, Trash2, ArrowLeft, Info, UserPlus, Users, AlertTriangle, Paperclip, Smile } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GroupDetailsModal } from './GroupDetailsModal';
import api from '../../api';

interface ChatAreaProps {
    conversation: any;
    messages: any[];
    onSendMessage: (text: string) => void;
    currentUser: any;
    onRefresh: () => void;
    onBack?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ conversation, messages, onSendMessage, currentUser, onRefresh, onBack }) => {
    const [text, setText] = useState('');
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteAction, setDeleteAction] = useState<'delete' | 'leave' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Scroll input into view when keyboard opens on mobile
    const handleFocus = () => {
        setTimeout(() => {
            inputContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    };

    const handleSend = () => {
        if (!text.trim()) return;
        onSendMessage(text);
        setText('');
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleDeleteGroup = () => {
        setDeleteAction('delete');
        setShowDeleteModal(true);
        setShowAdminMenu(false);
    };

    const handleLeaveGroup = () => {
        setDeleteAction('leave');
        setShowDeleteModal(true);
        setShowAdminMenu(false);
    };

    const confirmDelete = async () => {
        try {
            if (deleteAction === 'delete') {
                await api.post(`/conversations/${conversation.id}/delete`, { userId: currentUser.id });
            } else if (deleteAction === 'leave') {
                await api.post(`/conversations/${conversation.id}/remove-user`, {
                    userId: currentUser.id,
                    requesterId: currentUser.id
                });
            }
            setShowDeleteModal(false);
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert(`Failed to ${deleteAction} group`);
        }
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
                {/* Background Animation */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="z-10 text-center p-8 max-w-md backdrop-blur-sm bg-white/5 rounded-3xl border border-white/10 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full opacity-20 animate-ping" />
                        <div className="relative w-full h-full bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Send className="w-10 h-10 text-white transform -rotate-12 ml-1 mt-1" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Welcome to Chat</h2>
                    <p className="text-slate-400 leading-relaxed">
                        Select a conversation from the sidebar or start a new one to begin messaging.
                    </p>
                </div>
            </div>
        );
    }

    const otherUser = !conversation.isGroup
        ? conversation.users.find((u: any) => u.userId !== currentUser.id)?.user
        : null;

    const title = conversation.isGroup ? conversation.name : otherUser?.username;

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#0a0a0f] h-full relative">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl opacity-50" />
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Header - Professional glass effect */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-[#1e293b]/80 backdrop-blur-xl shadow-sm z-20 relative flex-shrink-0">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="md:hidden text-white hover:bg-white/10 active:bg-white/20 p-2 rounded-xl transition-all flex-shrink-0 border border-white/10 touch-manipulation"
                            aria-label="Back to conversations"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="relative flex-shrink-0">
                        <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white font-medium shadow-lg ring-2 ring-white/20 ${conversation.isGroup
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                            : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500'
                            }`}>
                            {conversation.isGroup ? <Users className="w-5 h-5 md:w-6 md:h-6" /> : title?.[0]?.toUpperCase()}
                        </div>
                        {!conversation.isGroup && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a] shadow-sm shadow-green-500/50" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white text-base md:text-lg tracking-tight truncate">{title}</h2>
                        {conversation.isGroup ? (
                            <span className="text-[11px] md:text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <Users className="w-3 h-3" />
                                {conversation.users.length} members
                            </span>
                        ) : (
                            <span className="text-[11px] md:text-xs text-green-400 font-medium flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-500/50" />
                                Online
                            </span>
                        )}
                    </div>
                </div>

                {conversation.isGroup && (
                    <div className="relative">
                        <button
                            onClick={() => setShowAdminMenu(!showAdminMenu)}
                            className="p-2 md:p-2.5 text-gray-400 hover:text-white active:bg-white/20 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20 touch-manipulation"
                            aria-label="Group options"
                        >
                            <MoreVertical size={18} className="md:w-5 md:h-5" />
                        </button>

                        <AnimatePresence>
                            {showAdminMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 z-50"
                                >
                                    <button
                                        onClick={() => { setShowGroupDetails(true); setShowAdminMenu(false); }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-blue-600/20 hover:text-blue-400 transition-all flex items-center gap-3"
                                    >
                                        <Info size={16} className="flex-shrink-0" />
                                        <span>Group Info</span>
                                    </button>

                                    {conversation.ownerId === currentUser.id && (
                                        <button
                                            onClick={() => { setShowGroupDetails(true); setShowAdminMenu(false); }}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-400 transition-all flex items-center gap-3"
                                        >
                                            <UserPlus size={16} className="flex-shrink-0" />
                                            <span>Add Members</span>
                                        </button>
                                    )}

                                    <div className="h-px bg-white/10 my-2" />

                                    {conversation.ownerId === currentUser.id ? (
                                        <button
                                            onClick={handleDeleteGroup}
                                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-all flex items-center gap-3"
                                        >
                                            <Trash2 size={16} className="flex-shrink-0" />
                                            <span>Delete Group</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleLeaveGroup}
                                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-all flex items-center gap-3"
                                        >
                                            <ArrowLeft size={16} className="flex-shrink-0" />
                                            <span>Leave Group</span>
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Messages - Responsive padding and spacing */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 z-10 scrollbar-thin scrollbar-thumb-gray-700 overscroll-contain">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser.id;
                        const previousMessage = messages[index - 1];
                        const showDateSeparator = !previousMessage ||
                            new Date(msg.createdAt).toDateString() !== new Date(previousMessage.createdAt).toDateString();

                        // Message grouping: show sender info only when sender changes or time gap > 5min
                        const timeDiff = previousMessage
                            ? new Date(msg.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()
                            : Infinity;
                        const showSenderInfo = !previousMessage ||
                            previousMessage.senderId !== msg.senderId ||
                            timeDiff > 300000; // 5 minutes

                        let dateLabel = '';
                        if (showDateSeparator) {
                            const today = new Date();
                            const msgDate = new Date(msg.createdAt);
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);

                            if (msgDate.toDateString() === today.toDateString()) {
                                dateLabel = 'Today';
                            } else if (msgDate.toDateString() === yesterday.toDateString()) {
                                dateLabel = 'Yesterday';
                            } else {
                                dateLabel = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                            }
                        }

                        return (
                            <React.Fragment key={msg.id || index}>
                                {showDateSeparator && (
                                    <div className="flex justify-center my-4 md:my-6 sticky top-0 z-10">
                                        <div className="bg-[#1e293b]/80 backdrop-blur-md border border-white/10 px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-lg">
                                            <span className="text-[10px] md:text-xs font-medium text-slate-300">
                                                {dateLabel}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <MessageBubble
                                    message={msg}
                                    isMe={isMe}
                                    isGroup={conversation.isGroup}
                                    onUpdate={onRefresh}
                                    previousMessage={previousMessage}
                                    showSenderInfo={showSenderInfo}
                                />
                            </React.Fragment>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input - Professional glass effect */}
            <div ref={inputContainerRef} className="p-3 md:p-4 lg:p-5 bg-transparent z-20 flex-shrink-0">
                <div className="max-w-4xl mx-auto flex items-end gap-2 bg-[#1e293b]/90 backdrop-blur-xl border border-white/15 p-2 md:p-2.5 rounded-2xl md:rounded-3xl shadow-xl shadow-black/10">
                    <button
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all flex-shrink-0"
                        title="Add attachment"
                    >
                        <Paperclip size={20} />
                    </button>

                    <textarea
                        ref={textareaRef}
                        className="flex-1 bg-transparent text-white text-[15px] placeholder-slate-500 resize-none max-h-32 min-h-[24px] py-2.5 focus:outline-none scrollbar-hide"
                        placeholder="Type a message..."
                        value={text}
                        onFocus={handleFocus}
                        onChange={(e) => {
                            setText(e.target.value);
                            // Auto-grow textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                        style={{ height: 'auto' }}
                    />

                    <div className="flex items-center gap-1">
                        <button
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all flex-shrink-0 hidden md:block"
                            title="Emoji"
                        >
                            <Smile size={20} />
                        </button>

                        <Button
                            onClick={handleSend}
                            disabled={!text.trim()}
                            className="rounded-full w-11 h-11 flex items-center justify-center bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-blue-500 hover:to-blue-600 active:scale-95 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 transform transition-all p-0 flex-shrink-0"
                            aria-label="Send message"
                        >
                            <Send className="w-5 h-5 text-white ml-0.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Group Details Modal */}
            {showGroupDetails && (
                <GroupDetailsModal
                    conversation={conversation}
                    currentUser={currentUser}
                    onClose={() => setShowGroupDetails(false)}
                    onUpdate={onRefresh}
                />
            )}

            {/* Delete/Leave Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteModal(false)}
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
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {deleteAction === 'delete' ? 'Delete Group?' : 'Leave Group?'}
                                    </h3>
                                    <p className="text-sm text-slate-400">This action cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">
                                {deleteAction === 'delete'
                                    ? 'All messages and members will be removed permanently. Are you sure you want to delete this group?'
                                    : 'You will no longer have access to this group\'s messages. Are you sure you want to leave?'
                                }
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all shadow-lg shadow-red-600/30"
                                >
                                    {deleteAction === 'delete' ? 'Delete' : 'Leave'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
