import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { MessageBubble } from './MessageBubble';
import { ChatHeaderSkeleton, MessageSkeleton } from '../ui/Skeleton';
import { Send, MoreVertical, Trash2, ArrowLeft, Info, UserPlus, Users, AlertTriangle, Paperclip, Smile, X, Phone, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GroupDetailsModal } from './GroupDetailsModal';
import { EmojiPicker } from './EmojiPicker';
import Avatar from '../ui/Avatar';
import api from '../../api';
import { playSendSound } from '../../utils/sounds';
import { MediaModal } from './MediaModal';
import { MediaUploadModal } from './MediaUploadModal';
import { CallButton } from '../CallButton';
import { useCall } from '../../contexts/CallContext';

interface ChatAreaProps {
    conversation: any;
    messages: any[];
    onSendMessage: (text: string, attachments?: any[], replyToId?: string) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    typingUsers: any[];
    currentUser: any;
    onRefresh: () => void;
    onBack?: () => void;
    isLoading?: boolean;
    onlineUsers?: { [userId: string]: { isOnline: boolean, lastSeen: string | null } };
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    conversation,
    messages,
    onSendMessage,
    onTyping,
    onStopTyping,
    typingUsers,
    currentUser,
    onRefresh,
    onBack,
    isLoading = false,
    onlineUsers = {}
}) => {
    const [text, setText] = useState('');
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [deleteAction, setDeleteAction] = useState<'delete' | 'leave' | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; previewUrl: string; type: 'IMAGE' | 'VIDEO' | 'FILE' }[]>([]);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [previewMedia, setPreviewMedia] = useState<any | null>(null);
    const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);

    const typingTimeoutRef = useRef<any>(null);
    const lastTypingEmitRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Call functionality
    const { initiateCall } = useCall();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showEmojiPicker && inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    // Scroll input into view when keyboard opens on mobile
    const handleFocus = () => {
        setTimeout(() => {
            inputContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    };

    const handleSend = async () => {
        if (!text.trim() && selectedFiles.length === 0) return;

        const messageText = text;
        const filesToUpload = [...selectedFiles];

        // Clear input immediately for better UX
        setText('');
        setSelectedFiles([]);
        setReplyingTo(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        playSendSound();

        // If there are files, upload them first, then send message
        if (filesToUpload.length > 0) {
            try {
                const uploadedAttachments = await Promise.all(
                    filesToUpload.map(async (fileItem) => {
                        const formData = new FormData();
                        formData.append('file', fileItem.file);
                        formData.append('folder', 'chat-messages');

                        const res = await api.post('/upload/single', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });

                        // Format attachment data to match backend expectations
                        return {
                            url: res.data.url,
                            publicId: res.data.publicId,
                            resourceType: res.data.resourceType || (fileItem.type === 'IMAGE' ? 'image' : fileItem.type === 'VIDEO' ? 'video' : 'raw'),
                            mimeType: fileItem.file.type,
                            size: fileItem.file.size,
                            originalName: fileItem.file.name,
                        };
                    })
                );

                // Send message with uploaded attachments
                onSendMessage(messageText, uploadedAttachments, replyingTo?.id);
            } catch (error) {
                console.error('Error uploading files:', error);
                alert('Failed to upload files. Please try again.');
            }
        } else {
            // Send text-only message
            onSendMessage(messageText, undefined, replyingTo?.id);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);

        // Optimized Typing indication (Throttled)
        const now = Date.now();
        if (now - lastTypingEmitRef.current > 2000) {
            onTyping();
            lastTypingEmitRef.current = now;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping();
            lastTypingEmitRef.current = 0;
        }, 3000);

        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Reset input
        e.target.value = '';

        // Create preview URLs and store files
        const newFiles = files.map(file => {
            const id = Math.random().toString(36).substring(7);
            const previewUrl = URL.createObjectURL(file);
            const type = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'FILE';

            return { id, file, previewUrl, type };
        });

        setSelectedFiles((prev: any) => [...prev, ...newFiles]);
        setShowMediaUploadModal(true);
    };

    const removeSelectedFile = (id: string) => {
        setSelectedFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file) URL.revokeObjectURL(file.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };


    const handleEmojiSelect = (emoji: string) => {
        setText(prev => prev + emoji);
        // Focus back on textarea
        textareaRef.current?.focus();
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

    // Show skeleton loading while fetching conversation/messages
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#0a0a0f] h-full">
                <ChatHeaderSkeleton />
                <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-3 md:py-4">
                    {[...Array(5)].map((_, i) => (
                        <MessageSkeleton key={i} isMe={i % 2 === 0} />
                    ))}
                </div>
            </div>
        );
    }

    const otherUser = !conversation.isGroup
        ? conversation.users.find((u: any) => u.userId !== currentUser.id)?.user
        : null;

    // Determine status from passed onlineUsers or fallback
    const otherUserId = otherUser?.id || null;
    const presence = otherUserId ? onlineUsers[otherUserId] : null;
    const isOnline = presence?.isOnline || false;

    // Format last seen timestamp
    let statusText = 'Offline';
    if (isOnline) {
        statusText = 'Online';
    } else if (presence?.lastSeen) {
        const lastSeenDate = new Date(presence.lastSeen);
        const now = new Date();
        const diff = now.getTime() - lastSeenDate.getTime();

        if (diff < 60000) statusText = 'Last seen just now';
        else if (diff < 3600000) statusText = `Last seen ${Math.floor(diff / 60000)}m ago`;
        else if (diff < 86400000) statusText = `Last seen ${Math.floor(diff / 3600000)}h ago`;
        else statusText = `Last seen ${lastSeenDate.toLocaleDateString()}`;
    }

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
                        {conversation.isGroup ? (
                            conversation.iconUrl ? (
                                <Avatar
                                    src={conversation.iconUrl}
                                    alt={conversation.name || 'Group'}
                                    size="lg"
                                    className="ring-2 ring-white/20 shadow-lg rounded-2xl"
                                />
                            ) : (
                                <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white font-medium shadow-lg ring-2 ring-white/20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                                    <Users className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                            )
                        ) : (
                            <>
                                <Avatar
                                    src={otherUser?.avatarUrl}
                                    alt={otherUser?.username || 'User'}
                                    size="lg"
                                    className="ring-2 ring-white/20 shadow-lg rounded-2xl"
                                />
                                {isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a] shadow-sm shadow-green-500/50" />
                                )}
                            </>
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
                            <span className={`text-[11px] md:text-xs font-medium flex items-center gap-1.5 ${isOnline ? 'text-green-400' : 'text-slate-400'}`}>
                                {isOnline && <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-500/50" />}
                                {statusText}
                            </span>
                        )}
                    </div>
                </div>

                {/* Call Buttons */}
                <div className="flex items-center gap-2">
                    {!conversation.isGroup && otherUser && (
                        <CallButton
                            recipientId={otherUser.id}
                            recipientName={otherUser.username}
                            conversationId={conversation.id}
                        />
                    )}

                    {conversation.isGroup && (
                        <>
                            <button
                                onClick={() => {
                                    const participantIds = conversation.users
                                        .filter((u: any) => u.userId !== currentUser.id)
                                        .map((u: any) => u.userId);
                                    initiateCall(participantIds, 'AUDIO_GROUP', conversation.id);
                                }}
                                className="p-2 md:p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20"
                                title="Audio call"
                            >
                                <Phone size={18} className="md:w-5 md:h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    const participantIds = conversation.users
                                        .filter((u: any) => u.userId !== currentUser.id)
                                        .map((u: any) => u.userId);
                                    initiateCall(participantIds, 'VIDEO_GROUP', conversation.id);
                                }}
                                className="p-2 md:p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20"
                                title="Video call"
                            >
                                <Video size={18} className="md:w-5 md:h-5" />
                            </button>
                        </>
                    )}
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
                                    onReply={(m: any) => setReplyingTo(m)}
                                    previousMessage={previousMessage}
                                    showSenderInfo={showSenderInfo}
                                    status={msg.status}
                                />
                            </React.Fragment>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input - Professional glass effect */}
            <div ref={inputContainerRef} className="p-3 md:p-4 lg:p-5 bg-transparent z-20 flex-shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col bg-[#1e293b]/90 backdrop-blur-xl border border-white/15 rounded-2xl md:rounded-3xl shadow-xl shadow-black/10 overflow-hidden">

                    {/* Typing Status Overlay */}
                    <AnimatePresence>
                        {typingUsers?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="px-4 py-1.5 flex items-center gap-2 bg-blue-500/5"
                            >
                                <div className="flex -space-x-2">
                                    {typingUsers.slice(0, 3).map((u, i) => (
                                        <div key={u.userId} style={{ zIndex: 10 - i }}>
                                            <Avatar src={u.avatarUrl} alt={u.username} size="xs" className="ring-2 ring-[#0f172a]" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[11px] text-blue-400 font-medium animate-pulse">
                                    {typingUsers.length === 1
                                        ? `${typingUsers[0].username} is typing...`
                                        : `${typingUsers.length} people are typing...`}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reply Preview */}
                    <AnimatePresence>
                        {replyingTo && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1 bg-blue-500 rounded-full h-8 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Replying to {replyingTo.sender?.username}</p>
                                        <p className="text-xs text-slate-400 truncate">{replyingTo.content}</p>
                                    </div>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-end gap-2 p-2 md:p-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                            multiple
                            onChange={handleFileSelect}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 disabled:opacity-50"
                            title="Upload files"
                        >
                            <Paperclip size={20} />
                        </button>

                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2.5 rounded-full transition-all flex-shrink-0 ${showEmojiPicker
                                ? 'text-blue-400 bg-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            title="Emoji"
                        >
                            <Smile size={20} />
                        </button>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full mb-4 left-0 z-50">
                                    <EmojiPicker
                                        onEmojiSelect={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                </div>
                            )}
                        </AnimatePresence>

                        <textarea
                            ref={textareaRef}
                            className="flex-1 bg-transparent text-white text-[15px] placeholder-slate-500 resize-none max-h-32 min-h-[24px] py-1.5 focus:outline-none scrollbar-hide"
                            placeholder="Type a message..."
                            value={text}
                            onFocus={handleFocus}
                            onChange={handleTextChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={1}
                        />

                        <Button
                            onClick={handleSend}
                            disabled={!text.trim() && selectedFiles.length === 0}
                            className="rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-blue-500 hover:to-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 transform transition-all p-0 flex-shrink-0"
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
            {/* Media Preview Modal */}
            <MediaModal
                isOpen={!!previewMedia}
                onClose={() => setPreviewMedia(null)}
                media={previewMedia}
            />
            {/* Media Upload (WhatsApp Style) Modal */}
            <MediaUploadModal
                isOpen={showMediaUploadModal}
                items={selectedFiles as any}
                onClose={() => {
                    setShowMediaUploadModal(false);
                    setSelectedFiles([]);
                }}
                onRemove={removeSelectedFile}
                onAddMore={() => fileInputRef.current?.click()}
                caption={text}
                onCaptionChange={setText}
                onSend={() => {
                    handleSend();
                    setShowMediaUploadModal(false);
                }}
            />
        </div>
    );
};
