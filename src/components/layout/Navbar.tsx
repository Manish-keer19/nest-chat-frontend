import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Layers, MessageCircle, LogOut, UserPlus, Menu, X, Maximize, Minimize, Video } from 'lucide-react';

interface NavbarProps {
    user: any;
    isLoggedIn: boolean;
    onLogout: () => void;
    currentPage?: 'home' | 'chat';
}

export default function Navbar({ user, isLoggedIn, onLogout, currentPage }: NavbarProps) {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050508]/70 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform duration-300">
                        <img
                            src="https://res.cloudinary.com/manish19/image/upload/v1766670690/social_media_app/avatars/v18pqflwyzixmwnbsqo2.jpg"
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            MS
                        </span>
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    {/* Fullscreen Toggle (Desktop) */}
                    <button
                        onClick={toggleFullScreen}
                        className="hidden md:flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>

                    {isLoggedIn ? (
                        <>
                            <Link to="/posts">
                                <Button variant="ghost" className="hidden md:flex text-slate-300 hover:text-white hover:bg-white/5 gap-2 rounded-xl transition-all">
                                    <Layers className="w-4 h-4" />
                                    <span>Feed</span>
                                </Button>
                            </Link>

                            <Link to="/random-chat">
                                <Button variant="ghost" className="hidden md:flex text-slate-300 hover:text-white hover:bg-white/5 gap-2 rounded-xl transition-all">
                                    <Video className="w-4 h-4" />
                                    <span>Random</span>
                                </Button>
                            </Link>

                            {currentPage !== 'chat' && (
                                <Link to="/chat">
                                    <Button className="hidden md:flex bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 backdrop-blur-md gap-2 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105">
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Chat</span>
                                    </Button>
                                </Link>
                            )}

                            <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block" />

                            <div className="relative z-50">
                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full pl-1 pr-4 py-1 transition-all cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-[#050508] relative">
                                        {user?.username?.charAt(0).toUpperCase()}
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#050508]" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300 hidden sm:block">{user?.username}</span>
                                </button>

                                {/* Profile Dropdown */}
                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-56 bg-[#0f172a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                                        >
                                            <div className="p-4 border-b border-white/5 bg-white/5">
                                                <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <Link to="/profile">
                                                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">
                                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                                            <UserPlus className="w-4 h-4" />
                                                        </div>
                                                        My Profile
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={onLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left mt-1"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-red-500/10">
                                                        <LogOut className="w-4 h-4" />
                                                    </div>
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link to="/login">
                                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 font-medium px-4 rounded-xl transition-all">
                                    Sign In
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 rounded-xl px-6 py-2 font-semibold transition-all hover:scale-105 active:scale-95">
                                    Sign Up
                                </Button>
                            </Link>
                        </div>
                    )}
                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>


            {/* Mobile Menu */}
            <AnimatePresence>
                {
                    isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden bg-[#050508] border-b border-white/10 overflow-hidden"
                        >
                            <div className="p-4 space-y-4">
                                {/* Mobile Fullscreen Toggle */}
                                <button
                                    onClick={toggleFullScreen}
                                    className="w-full flex items-center justify-center gap-2 p-3 text-slate-300 hover:text-white bg-white/5 rounded-xl border border-white/5"
                                >
                                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
                                </button>
                                {isLoggedIn ? (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold ring-2 ring-[#0f172a]">
                                                {user?.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white truncate">{user?.username}</p>
                                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Link to="/random-chat" onClick={() => setIsMobileMenuOpen(false)} className="col-span-2">
                                                <Button variant="ghost" className="w-full justify-start text-purple-400 hover:text-purple-300 hover:bg-white/5 gap-2 rounded-xl h-12 border border-purple-500/20 bg-purple-500/10">
                                                    <Video className="w-4 h-4" />
                                                    Random Chat
                                                </Button>
                                            </Link>
                                            <Link to="/posts" onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5 gap-2 rounded-xl h-12">
                                                    <Layers className="w-4 h-4" />
                                                    Feed
                                                </Button>
                                            </Link>
                                            <Link to="/chat" onClick={() => setIsMobileMenuOpen(false)}>
                                                <Button className="w-full justify-start bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 gap-2 rounded-xl h-12">
                                                    <MessageCircle className="w-4 h-4" />
                                                    Chat
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className="h-[1px] bg-white/10 my-2" />

                                        <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                                            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left">
                                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                                    <UserPlus className="w-4 h-4" />
                                                </div>
                                                My Profile
                                            </button>
                                        </Link>

                                        <button
                                            onClick={() => {
                                                onLogout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                                        >
                                            <div className="p-1.5 rounded-lg bg-red-500/10">
                                                <LogOut className="w-4 h-4" />
                                            </div>
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button variant="ghost" className="w-full text-slate-300 hover:text-white hover:bg-white/5 font-medium rounded-xl h-12">
                                                Sign In
                                            </Button>
                                        </Link>
                                        <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg rounded-xl h-12 font-semibold">
                                                Sign Up
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </nav>
    );
}
