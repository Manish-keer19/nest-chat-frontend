import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import {
    Video, Shield, Globe, Zap,
    ArrowRight, Star, MessageCircle, Heart
} from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-change'));
        setUser(null);
        setIsLoggedIn(false);
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 selection:text-purple-200 font-sans overflow-x-hidden">
            <Navbar user={user} isLoggedIn={isLoggedIn} onLogout={handleLogout} currentPage="home" />

            {/* Hero Section */}
            <main className="relative pt-32 pb-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />

                <div className="text-center max-w-4xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-8"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        <span>Welcome</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
                    >
                        Meet Strangers <br />
                        <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            Make Friends
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Experience the thrill of random connections. Our advanced matching algorithm
                        pairs you with people worldwide for instant, high-quality video calls.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link to={isLoggedIn ? "/random-chat" : "/register"}>
                            <Button className="px-8 py-4  text-black hover:bg-slate-200 rounded-full text-lg font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                                <Video className="w-5 h-5" />
                                Start Random Chat
                            </Button>
                        </Link>
                        <Link to={isLoggedIn ? "/chat" : "/login"}>
                            <Button className="px-8 py-4 bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 rounded-full text-lg font-semibold transition-all flex items-center gap-2">
                                Chat Dashboard <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Feature Grid - Complete Communication Suite */}
                <div className="mb-32">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Complete Communication Suite</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                                More than just random connections. We provide a fully-featured platform for all your social needs.
                            </p>
                        </motion.div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Video,
                                title: "Random Video Chat",
                                desc: "Our signature feature. Meet interesting people globally with one click.",
                                color: "text-purple-400",
                                bg: "bg-purple-500/10"
                            },
                            {
                                icon: MessageCircle,
                                title: "Private & Group Chat",
                                desc: "Create unlimited groups or chat 1-on-1. Stay connected with your circle.",
                                color: "text-blue-400",
                                bg: "bg-blue-500/10"
                            },
                            {
                                icon: Zap,
                                title: "HD Audio & Video Calls",
                                desc: "Crystal clear voice and video calls for both individuals and groups.",
                                color: "text-yellow-400",
                                bg: "bg-yellow-500/10"
                            },
                            {
                                icon: Heart,
                                title: "Rich Media Sharing",
                                desc: "Share photos, videos, and files seamlessly within your conversations.",
                                color: "text-pink-400",
                                bg: "bg-pink-500/10"
                            },
                            {
                                icon: Globe,
                                title: "Global Connectivity",
                                desc: "Low-latency infrastructure ensures smooth chatting anywhere in the world.",
                                color: "text-cyan-400",
                                bg: "bg-cyan-500/10"
                            },
                            {
                                icon: Shield,
                                title: "Secure & Encrypted",
                                desc: "Your private conversations and calls are protected with top-tier security.",
                                color: "text-emerald-400",
                                bg: "bg-emerald-500/10"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="p-8 rounded-3xl bg-[#0f0f12] border border-white/5 hover:border-white/10 transition-colors group hover:-translate-y-1 duration-300"
                            >
                                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Developer Section - Prominent & Professional */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#0f0f12] shadow-2xl mb-20"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-blue-600/10" />

                    <div className="relative p-12 md:p-16 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
                            <Star className="w-3 h-3" /> Meet the Developer
                        </div>

                        <div className="w-32 h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 mb-6">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0f0f12]">
                                <img
                                    src="https://res.cloudinary.com/manish19/image/upload/v1766670690/social_media_app/avatars/v18pqflwyzixmwnbsqo2.jpg"
                                    alt="Manish Keer"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <h2 className="text-4xl font-bold mb-2">Manish Keer</h2>
                        <p className="text-lg text-purple-400 font-medium mb-6">Full Stack Developer & Creator</p>

                        <p className="text-slate-400 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
                            Crafting seamless digital experiences with modern web technologies.
                            Check out my work and contributions on GitHub.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://github.com/manish-keer19/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-3.5 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                GitHub Profile
                            </a>
                        </div>
                    </div>
                </motion.div>

            </main>

            {/* Footer Section */}
            <footer className="border-t border-white/5 bg-[#0a0a0c] py-12 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">SocialApp</span>
                    </div>
                    <div className="flex gap-8 text-sm text-slate-400">
                        <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span>
                        <span className="cursor-pointer hover:text-white transition-colors">Safety Guidelines</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        Developed by Manish Keer © 2025
                    </div>
                </div>
            </footer>
        </div>
    );
}
