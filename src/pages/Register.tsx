import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Zap, CheckCircle2, Shield, Heart } from 'lucide-react';
import api from '../api';
import { oauthService } from '../services'; // Added oauthService
import { Button } from '../components/ui/Button';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/signup', { username, email, password });
            // Auto login after registration
            const loginRes = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', loginRes.data.token);
            localStorage.setItem('user', JSON.stringify(loginRes.data.user));
            navigate('/chat');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = (provider: 'google' | 'github') => {
        if (provider === 'google') {
            oauthService.loginWithGoogle();
        } else {
            oauthService.loginWithGithub();
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Left Side - Brand & Value Prop */}
            <div className="hidden lg:flex flex-1 relative bg-[#0a0a0c] overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(147,51,234,0.08),transparent)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.08),transparent)]" />

                <div className="relative z-10 max-w-lg">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-10 shadow-xl shadow-purple-900/20">
                        <Zap className="w-7 h-7 text-white" />
                    </div>

                    <h1 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
                        Start Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Journey Here
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 mb-12 leading-relaxed font-light">
                        Join next-generation social platform. Safe, secure, and built for real connections.
                    </p>

                    <div className="space-y-6">
                        {[
                            { text: "Unlimited Random Chats", icon: Heart, color: "text-pink-400" },
                            { text: "Secure Group Conversations", icon: Shield, color: "text-emerald-400" },
                            { text: "Crystal Clear Calls", icon: Zap, color: "text-yellow-400" },
                            { text: "No Hidden Fees", icon: CheckCircle2, color: "text-blue-400" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                                <span className="text-lg font-medium">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative bg-[#050505]">
                <Link to="/" className="absolute top-8 right-8 text-sm text-slate-400 hover:text-white transition-colors">
                    Back to Home
                </Link>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                        <p className="text-slate-400">Join thousands of users today.</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Username</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="johndoe"
                                    required
                                    className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder-slate-600 outline-none hover:border-white/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl pl-11 pr-4 py-3.5 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder-slate-600 outline-none hover:border-white/20"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min 6 chars"
                                        required
                                        className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl pl-10 pr-10 py-3.5 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder-slate-600 outline-none hover:border-white/20 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm"
                                        required
                                        className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl pl-10 pr-10 py-3.5 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder-slate-600 outline-none hover:border-white/20 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-4 bg-[#050505] text-slate-500">Or continue with</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center gap-2 bg-[#0f1115] hover:bg-[#1a1d24] border border-white/5 hover:border-white/20 text-white py-3 rounded-xl transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Google
                        </button>
                        <button onClick={() => handleOAuthLogin('github')} className="flex items-center justify-center gap-2 bg-[#0f1115] hover:bg-[#1a1d24] border border-white/5 hover:border-white/20 text-white py-3 rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                            GitHub
                        </button>
                    </div>

                    <p className="text-center text-slate-400 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
