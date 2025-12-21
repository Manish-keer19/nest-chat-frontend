import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Sidebar } from '../components/chat/Sidebar';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';

export default function ConversationsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

        newSocket.on('message', () => {
            fetchConversations();
        });

        fetchConversations();

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    const fetchConversations = async () => {
        if (!user) return;
        try {
            const res = await api.get(`/conversations/user/${user.id}`);
            setConversations(res.data);
        } catch (e) {
            console.error('Failed to fetch conversations', e);
        }
    };

    const handleSelectConversation = (id: string) => {
        // Mobile users navigate to focused chat view
        navigate(`/chat/${id}`);
    };

    const handleStartChat = async (targetUserId: string) => {
        try {
            const res = await api.post('/conversations', {
                user1Id: user.id,
                user2Id: targetUserId
            });
            await fetchConversations();
            // Mobile users navigate to focused chat view
            navigate(`/chat/${res.data.id}`);
        } catch (e) {
            console.error('Failed to start chat', e);
        }
    };

    // On desktop (md and above), redirect to /chat which has the full layout
    useEffect(() => {
        const checkScreenSize = () => {
            if (window.innerWidth >= 768) {
                navigate('/chat', { replace: true });
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, [navigate]);

    if (!user) return null;

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#1e293b] to-[#0f172a] font-sans overflow-hidden">
            {/* Sidebar - Full width on mobile, constrained on desktop */}
            <div className="w-full md:w-80 lg:w-[360px] xl:w-[400px] flex-shrink-0">
                <Sidebar
                    conversations={conversations}
                    activeConversationId={null}
                    onSelectConversation={handleSelectConversation}
                    onCreateGroup={() => setIsModalOpen(true)}
                    onStartChat={handleStartChat}
                    currentUser={user}
                />
            </div>

            {/* Welcome message on desktop - hidden on mobile */}
            <div className="hidden md:flex flex-1 items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Welcome to Chat</h2>
                    <p className="text-slate-400 mb-6">
                        Select a conversation from the sidebar to start chatting, or explore new users to connect with.
                    </p>
                    <div className="flex flex-col gap-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2 justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>Click on any conversation to view messages</span>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span>Use the Explore tab to find new users</span>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span>Create groups to chat with multiple people</span>
                        </div>
                    </div>
                </div>
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
