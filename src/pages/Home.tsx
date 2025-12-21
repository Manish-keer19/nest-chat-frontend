import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { MessageCircle, LogOut, LogIn, UserPlus, Github, Mail, MapPin, Calendar, Code2, Database, Server, Zap, Sparkles, Rocket, Trophy, GitBranch, Star, ExternalLink, ChevronRight, Layers, Box, FileCode } from 'lucide-react';

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
        setUser(null);
        setIsLoggedIn(false);
        navigate('/login');
    };

    const developerInfo = {
        name: "Manish Keer",
        title: "Full Stack Developer",
        location: "India",
        email: "manishkeer530@gmail.com",
        github: "Manish-keer19",
        bio: "Passionate developer building modern web applications with cutting-edge technologies. Specialized in React, Node.js, NestJS, and real-time applications.",
        skills: [
            { name: "React", level: 90, color: "from-cyan-400 to-blue-500", icon: Layers, bgColor: "from-cyan-500/20 to-blue-600/20" },
            { name: "Node.js", level: 85, color: "from-green-400 to-emerald-600", icon: Server, bgColor: "from-green-500/20 to-emerald-600/20" },
            { name: "NestJS", level: 88, color: "from-red-500 to-pink-600", icon: Box, bgColor: "from-red-500/20 to-pink-600/20" },
            { name: "TypeScript", level: 92, color: "from-blue-500 to-indigo-600", icon: FileCode, bgColor: "from-blue-500/20 to-indigo-600/20" },
            { name: "PostgreSQL", level: 80, color: "from-blue-600 to-cyan-600", icon: Database, bgColor: "from-blue-600/20 to-cyan-600/20" },
            { name: "Socket.io", level: 85, color: "from-yellow-400 to-orange-500", icon: Zap, bgColor: "from-yellow-500/20 to-orange-600/20" },
        ],
        stats: [
            { label: "Projects Completed", value: "40+", icon: Trophy, color: "text-yellow-400" },
            { label: "Code Commits", value: "500+", icon: GitBranch, color: "text-green-400" },
            { label: "Years Experience", value: "1+", icon: Rocket, color: "text-blue-400" },
        ],
        highlights: [
            { icon: Code2, title: "Clean Code", description: "Writing maintainable and scalable code" },
            { icon: Zap, title: "Fast Performance", description: "Optimized for speed and efficiency" },
            { icon: Database, title: "Data Driven", description: "Building robust database architectures" },
            { icon: Server, title: "Backend Expert", description: "Crafting powerful server solutions" },
        ]
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1e] to-[#0a0a0f] text-white overflow-hidden relative">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-black/20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                            </div>
                            <div>
                                <span className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    Manish Keer
                                </span>
                                <p className="text-xs text-slate-400">Full Stack Developer</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            {isLoggedIn ? (
                                <>
                                    <span className="text-xs md:text-sm text-slate-400 hidden sm:flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-blue-400 font-medium">{user?.username}</span>
                                    </span>
                                    <Link to="/conversations">
                                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 md:px-6 py-2 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="hidden sm:inline">Chat</span>
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={handleLogout}
                                        variant="secondary"
                                        className="px-4 md:px-6 py-2 rounded-xl border-2 border-red-500/20 hover:border-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 flex items-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="hidden sm:inline">Logout</span>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login">
                                        <Button
                                            variant="secondary"
                                            className="px-4 md:px-6 py-2 rounded-xl border-2 border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <LogIn className="w-4 h-4" />
                                            <span className="hidden sm:inline">Login</span>
                                        </Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 md:px-6 py-2 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 flex items-center gap-2">
                                            <UserPlus className="w-4 h-4" />
                                            <span className="hidden sm:inline">Sign Up</span>
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Enhanced with Animations */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-24"
                >
                    {/* Profile Image - Enhanced */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-8 flex justify-center"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 2 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="relative"
                            >
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 group-hover:border-white/20 transition-all duration-500">
                                    <img
                                        src="https://res.cloudinary.com/manish19/image/upload/v1752930717/spring/profile/kjtwypqrvzgapyutbmlh.jpg"
                                        alt="Manish Keer"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-4 border-[#0a0a0f] flex items-center justify-center"
                                >
                                    <Star className="w-5 h-5 text-white fill-white" />
                                </motion.div>
                            </motion.div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="space-y-4 mb-8"
                    >
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient leading-tight">
                            {developerInfo.name}
                        </h1>
                        <p className="text-xl md:text-2xl lg:text-3xl text-slate-300 font-light">
                            {developerInfo.title}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base text-slate-400">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2"
                            >
                                <MapPin className="w-4 h-4 text-blue-400" />
                                <span>{developerInfo.location}</span>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2"
                            >
                                <Mail className="w-4 h-4 text-purple-400" />
                                <span>{developerInfo.email}</span>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2"
                            >
                                <Calendar className="w-4 h-4 text-pink-400" />
                                <span>Available for work</span>
                            </motion.div>
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed px-4"
                    >
                        {developerInfo.bio}
                    </motion.p>

                    {/* Action Buttons - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="flex flex-wrap items-center justify-center gap-4"
                    >
                        <motion.a
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            href={`https://github.com/${developerInfo.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 hover:shadow-lg"
                        >
                            <Github className="w-5 h-5" />
                            <span className="font-medium">GitHub</span>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.a>
                        {isLoggedIn && (
                            <Link to="/conversations">
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        <span>Start Chatting</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            </Link>
                        )}
                    </motion.div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-24">
                    {developerInfo.stats.map((stat, index) => (
                        <div
                            key={index}
                            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center ${stat.color}`}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                                    <div className="text-sm text-slate-400">{stat.label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Highlights */}
                <div className="mb-16 md:mb-24">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        What I Bring to the Table
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {developerInfo.highlights.map((highlight, index) => (
                            <div
                                key={index}
                                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <highlight.icon className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{highlight.title}</h3>
                                    <p className="text-sm text-slate-400">{highlight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Skills - Enhanced with Icons */}
                <div className="mb-16 md:mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                    >
                        Technical Expertise
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {developerInfo.skills.map((skill, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:shadow-2xl"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${skill.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            {/* Icon with gradient background */}
                                            <motion.div
                                                whileHover={{ rotate: 360, scale: 1.1 }}
                                                transition={{ duration: 0.6 }}
                                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${skill.bgColor} flex items-center justify-center border border-white/10 shadow-lg`}
                                            >
                                                <skill.icon className={`w-6 h-6 bg-gradient-to-br ${skill.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
                                            </motion.div>
                                            <span className="text-lg font-bold text-white">{skill.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-blue-400">{skill.level}%</span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${skill.level}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                            className={`h-full bg-gradient-to-r ${skill.color} rounded-full relative`}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                {isLoggedIn && (
                    <div className="text-center">
                        <div className="inline-block relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-30" />
                            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                                <h3 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    Ready to Connect?
                                </h3>
                                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                    Join the conversation and collaborate with other developers
                                </p>
                                <Link to="/conversations">
                                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 text-lg flex items-center gap-2 mx-auto">
                                        <MessageCircle className="w-5 h-5" />
                                        <span>Open Chat</span>
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 backdrop-blur-xl bg-black/20 mt-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <div className="text-center">
                        <p className="text-slate-400 mb-2">
                            Built with <span className="text-red-500">❤️</span> by <span className="text-blue-400 font-medium">{developerInfo.name}</span>
                        </p>
                        <p className="text-sm text-slate-500">© 2025 All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
}
