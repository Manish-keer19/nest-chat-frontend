import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { useNavigate } from 'react-router-dom';

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
                    // If message already exists (optimistic update), ignore? 
                    // Currently backend sends everything including ID, so we can check uniqueness if needed
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                }
                return prev;
            });
            fetchConversations();
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
        } catch (e) {
            console.error('Failed to fetch conversations', e);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const refreshMessages = async () => {
        if (activeConversationId) {
            setIsLoadingMessages(true);
            try {
                const res = await api.get(`/conversations/${activeConversationId}`);
                setMessages(res.data);
                fetchConversations(); // Update sidebars last message too
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
            const res = await api.get(`/conversations/${id}`);
            setMessages(res.data);
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

    const handleSendMessage = (text: string) => {
        if (!socket || !activeConversationId || !user) return;
        socket.emit('send-message', {
            conversationId: activeConversationId,
            senderId: user.id,
            text
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
                    currentUser={user}
                    onRefresh={refreshMessages}
                    onBack={handleBackToList}
                    isLoading={isLoadingMessages}
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
