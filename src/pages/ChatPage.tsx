import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { useNavigate } from 'react-router-dom';
import { useMessageReadTracking } from '../hooks/useMessageReadTracking';
import { playReceiveSound } from '../utils/sounds';

export default function ChatPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: any[] }>({});
    const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: { isOnline: boolean, lastSeen: string | null } }>({});

    // Initialize User
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/login');
            return;
        }
        const userData = JSON.parse(userStr);
        setUser(userData);
    }, [navigate]);

    // Connect Socket & Fetch Conversations
    useEffect(() => {
        if (!user) return;

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        const newSocket = io(socketUrl, {
            autoConnect: true,
            auth: {
                token: localStorage.getItem('token')
            }
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket');
            newSocket.emit('join', user.username);
        });

        newSocket.on('message', (msg: any) => {
            setMessages((prev) => {
                if (msg.conversationId === activeConversationIdRef.current) {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    if (msg.senderId !== user.id) {
                        playReceiveSound();
                    }
                    return [...prev, msg];
                }
                return prev;
            });
            fetchConversations();
        });

        newSocket.on('user-typing', (data: any) => {
            setTypingUsers(prev => {
                const current = prev[data.conversationId] || [];
                if (current.find(u => u.userId === data.userId)) return prev;
                return {
                    ...prev,
                    [data.conversationId]: [...current, data]
                };
            });
        });

        newSocket.on('user-stop-typing', (data: any) => {
            setTypingUsers(prev => ({
                ...prev,
                [data.conversationId]: (prev[data.conversationId] || []).filter(u => u.userId !== data.userId)
            }));
        });

        // --- READ RECEIPT LISTENERS ---
        newSocket.on('message-delivery-update', (data: { messageId: string; status: string }) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
        });

        newSocket.on('message-read-update', (data: { messageId: string; status: string }) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
        });

        newSocket.on('conversation-read-update', (data: { conversationId: string; userId: string }) => {
            if (data.conversationId === activeConversationIdRef.current) {
                setMessages(prev => prev.map(m => m.senderId !== data.userId ? { ...m, status: 'read' } : m));
            }
            // Update sidebar unread counts
            setConversations(prev => prev.map(c =>
                c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
            ));
        });

        newSocket.on('user-presence-update', (data: { userId: string; isOnline: boolean; lastSeen: string | null }) => {
            setOnlineUsers(prev => ({
                ...prev,
                [data.userId]: { isOnline: data.isOnline, lastSeen: data.lastSeen }
            }));
        });

        setSocket(newSocket);
        fetchConversations();

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // Ref to track active conversation for socket callback
    const activeConversationIdRef = useRef<string | null>(null);
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const fetchConversations = async () => {
        if (!user) return;
        setIsLoadingConversations(true);
        try {
            const res = await api.get(`/conversations/user/${user.id}`);
            setConversations(res.data);

            // Extract all other user IDs to initial fetch online status if needed
            // Ideally backend returns this with conversations, or we fetch separate/bulk
            // For now, let's assume `user-presence-update` will handle real-time, 
            // and we initialize from conversation data if available (backfill needed in backend response)
            // or fetch explicitly.

            const userIds = new Set<string>();
            res.data.forEach((c: any) => {
                c.users?.forEach((u: any) => {
                    if (u.userId !== user.id) userIds.add(u.userId);
                });
            });

            // Optional: Bulk fetch presence state. For now, rely on updates or modify backend to return it.
            if (userIds.size > 0) {
                try {
                    const presenceRes = await api.post('/users/presence', { userIds: Array.from(userIds) });
                    setOnlineUsers(prev => ({
                        ...prev,
                        ...presenceRes.data.reduce((acc: any, curr: any) => ({ ...acc, [curr.id]: { isOnline: curr.isOnline, lastSeen: curr.lastSeen } }), {})
                    }));
                } catch (e) {
                    // Silently fail or log
                    console.warn("Failed to fetch initial presence", e);
                }
            }
        } catch (e) {
            console.error('Failed to fetch conversations', e);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    // Initialize message read tracking
    const { markConversationAsRead } = useMessageReadTracking(
        socket,
        activeConversationId,
        user?.id || null
    );

    const refreshMessages = async () => {
        if (activeConversationId && user) {
            setIsLoadingMessages(true);
            try {
                const res = await api.get(`/conversations/${activeConversationId}?userId=${user.id}`);
                setMessages(res.data);
                fetchConversations(); // Update sidebar unread counts
            } catch (e) {
                console.error('Failed to fetch messages', e);
            } finally {
                setIsLoadingMessages(false);
            }
        }
    };

    const handleSelectConversation = async (id: string) => {
        setActiveConversationId(id);
        setIsMobileSidebarOpen(false); // Hide sidebar on mobile when conversation is selected
        setIsLoadingMessages(true);
        socket?.emit('join-conversation', id);
        try {
            const res = await api.get(`/conversations/${id}?userId=${user.id}`);
            setMessages(res.data);

            // Mark conversation as read after loading messages
            console.log('About to mark conversation as read:', { id, hasFunction: !!markConversationAsRead });
            if (markConversationAsRead) {
                await markConversationAsRead();
            }
        } catch (e) {
            console.error('Failed to fetch messages', e);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleStartChat = async (targetUserId: string) => {
        try {
            // Create or get conversation
            const res = await api.post('/conversations', {
                user1Id: user.id,
                user2Id: targetUserId
            });
            // Refresh list
            await fetchConversations();
            // Select it
            handleSelectConversation(res.data.id);
        } catch (e) {
            console.error('Failed to start chat', e);
        }
    };

    const handleSendMessage = (text: string, attachments?: any[], replyToId?: string) => {
        if (!socket || !activeConversationId || !user) return;
        socket.emit('send-message', {
            conversationId: activeConversationId,
            senderId: user.id,
            text,
            attachments,
            replyToId
        });
        // Also stop typing when message sent
        socket.emit('stop-typing', { conversationId: activeConversationId, userId: user.id });
    };

    const handleTyping = () => {
        if (!socket || !activeConversationId || !user) return;
        socket.emit('typing', {
            conversationId: activeConversationId,
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
        });
    };

    const handleStopTyping = () => {
        if (!socket || !activeConversationId || !user) return;
        socket.emit('stop-typing', {
            conversationId: activeConversationId,
            userId: user.id
        });
    };

    const handleBackToList = () => {
        setActiveConversationId(null);
        setIsMobileSidebarOpen(true);
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#1e293b] to-[#0f172a] font-sans overflow-hidden">
            {/* Sidebar - Responsive width optimization */}
            <div className={`
                ${isMobileSidebarOpen || !activeConversationId ? 'flex w-full' : 'hidden'} 
                md:flex md:w-80 lg:w-[360px] xl:w-[400px] flex-shrink-0
            `}>
                <Sidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    onCreateGroup={() => setIsModalOpen(true)}
                    onStartChat={handleStartChat}
                    currentUser={user}
                    isLoading={isLoadingConversations}
                    onlineUsers={onlineUsers}
                />
            </div>

            {/* Chat Area - Constrained max-width for readability on large screens */}
            <div className={`
                ${!isMobileSidebarOpen || activeConversationId ? 'flex' : 'hidden'} 
                md:flex flex-1 min-w-0
            `}>
                <ChatArea
                    conversation={activeConversation}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTyping}
                    typingUsers={typingUsers[activeConversationId || ''] || []}
                    currentUser={user}
                    onRefresh={refreshMessages}
                    onBack={handleBackToList}
                    isLoading={isLoadingMessages}
                    onlineUsers={onlineUsers}
                />
            </div>

            {isModalOpen && (
                <CreateGroupModal
                    currentUserId={user.id}
                    onClose={() => setIsModalOpen(false)}
                    onCreated={() => {
                        fetchConversations();
                        setIsModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
