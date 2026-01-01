import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { ChatArea } from '../components/chat/ChatArea';
import { ChatHeaderSkeleton, MessageSkeleton } from '../components/ui/Skeleton';
import { useMessageReadTracking } from '../hooks/useMessageReadTracking';
import { playReceiveSound } from '../utils/sounds';

export default function ChatConversationPage() {
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId: string }>();
    const [user, setUser] = useState<any>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversation, setConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<any[]>([]);

    const activeConversationIdRef = useRef<string | null>(null);

    // Initialize message read tracking
    const { markConversationAsRead } = useMessageReadTracking(
        socket,
        conversationId || null,
        user?.id || null
    );

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

    // Connect Socket
    useEffect(() => {
        if (!user) return;

        
        const newSocket = io("/", {
            autoConnect: true,
            auth: {
                token: localStorage.getItem('token')
            }
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket');
            newSocket.emit('join', user.username);
            if (conversationId) {
                newSocket.emit('join-conversation', conversationId);
            }
        });

        newSocket.on('message', (msg: any) => {
            setMessages((prev) => {
                if (msg.conversationId === activeConversationIdRef.current) {
                    if (prev.find(m => m.id === msg.id)) return prev;

                    // Play receive sound if message is from someone else
                    if (msg.senderId !== user.id) {
                        playReceiveSound();
                    }

                    return [...prev, msg];
                }
                return prev;
            });
        });

        newSocket.on('user-typing', (data: any) => {
            if (data.conversationId === activeConversationIdRef.current) {
                setTypingUsers(prev => {
                    if (prev.find(u => u.userId === data.userId)) return prev;
                    return [...prev, data];
                });
            }
        });

        newSocket.on('user-stop-typing', (data: any) => {
            if (data.conversationId === activeConversationIdRef.current) {
                setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, conversationId]);

    // Load conversation and messages
    useEffect(() => {
        if (!conversationId || !user) return;

        activeConversationIdRef.current = conversationId;

        const loadConversation = async () => {
            setIsLoading(true);
            try {
                // Fetch conversation details
                const convRes = await api.get(`/conversations/user/${user.id}`);
                const conv = convRes.data.find((c: any) => c.id === conversationId);

                if (!conv) {
                    console.error('Conversation not found');
                    navigate('/conversations');
                    return;
                }

                setConversation(conv);

                // Fetch messages
                const messagesRes = await api.get(`/conversations/${conversationId}`);
                setMessages(messagesRes.data);

                // Join conversation room
                socket?.emit('join-conversation', conversationId);

                // Mark conversation as read after loading messages
                if (markConversationAsRead) {
                    await markConversationAsRead();
                }
            } catch (e) {
                console.error('Failed to load conversation', e);
                navigate('/conversations');
            } finally {
                setIsLoading(false);
            }
        };

        loadConversation();
    }, [conversationId, user, socket, navigate, markConversationAsRead]);

    const refreshMessages = async () => {
        if (conversationId) {
            try {
                const res = await api.get(`/conversations/${conversationId}`);
                setMessages(res.data);
            } catch (e) {
                console.error('Failed to fetch messages', e);
            }
        }
    };

    const handleSendMessage = (text: string, attachments?: any[], replyToId?: string) => {
        if (!socket || !conversationId || !user) return;
        socket.emit('send-message', {
            conversationId,
            senderId: user.id,
            text,
            attachments,
            replyToId
        });
        // Also stop typing when message sent
        socket.emit('stop-typing', { conversationId, userId: user.id });
    };

    const handleTyping = () => {
        if (!socket || !conversationId || !user) return;
        socket.emit('typing', {
            conversationId,
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
        });
    };

    const handleStopTyping = () => {
        if (!socket || !conversationId || !user) return;
        socket.emit('stop-typing', {
            conversationId,
            userId: user.id
        });
    };

    const handleBack = () => {
        navigate('/conversations');
    };

    // Show loading skeleton while fetching data
    if (!user || isLoading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#1e293b] to-[#0f172a] font-sans overflow-hidden">
                <div className="w-full flex flex-col min-w-0 bg-gradient-to-br from-[#0f172a] to-[#0a0a0f]">
                    <ChatHeaderSkeleton />
                    <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-3 md:py-4">
                        {[...Array(5)].map((_, i) => (
                            <MessageSkeleton key={i} isMe={i % 2 === 0} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if conversation not found
    if (!conversation) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#1e293b] to-[#0f172a] font-sans overflow-hidden items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Conversation Not Found</h2>
                    <p className="text-slate-400 mb-6">This conversation doesn't exist or you don't have access to it.</p>
                    <button
                        onClick={() => navigate('/conversations')}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
                    >
                        Back to Conversations
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#1e293b] to-[#0f172a] font-sans overflow-hidden">
            <div className="w-full flex flex-col min-w-0">
                <ChatArea
                    conversation={conversation}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTyping}
                    typingUsers={typingUsers}
                    currentUser={user}
                    onRefresh={refreshMessages}
                    onBack={handleBack}
                />
            </div>
        </div>
    );
}
