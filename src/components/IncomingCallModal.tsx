import React, { useEffect, useState } from 'react';
import { useCall } from '../contexts/CallContext';
import { playRingtone, stopRingtone } from '../utils/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

const CALL_TIMEOUT = 30000; // 30 seconds

export const IncomingCallModal: React.FC = () => {
    const { incomingCall, acceptCall, rejectCall } = useCall();
    const [timeLeft, setTimeLeft] = useState(CALL_TIMEOUT / 1000);
    const [isAccepting, setIsAccepting] = useState(false);

    // Play ringtone when incoming call appears
    useEffect(() => {
        if (incomingCall) {
            playRingtone();
            setTimeLeft(CALL_TIMEOUT / 1000);
        }

        return () => {
            stopRingtone();
        };
    }, [incomingCall]);

    // Auto-reject after timeout
    useEffect(() => {
        if (!incomingCall) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleReject('timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [incomingCall]);

    if (!incomingCall) return null;

    const isVideoCall = incomingCall.callType.includes('VIDEO');
    const isGroupCall = incomingCall.callType.includes('GROUP');

    const handleAccept = async () => {
        if (isAccepting) return; // Prevent double-click

        setIsAccepting(true);
        stopRingtone();

        try {
            await acceptCall();
            toast.success('Call connected!', {
                duration: 2000,
                position: 'top-center',
            });
        } catch (error) {
            console.error('Error accepting call:', error);
            toast.error('Failed to connect. Please try again.', {
                duration: 3000,
                position: 'top-center',
            });
            setIsAccepting(false);
        }
    };

    const handleReject = (reason?: string) => {
        stopRingtone();
        rejectCall(reason);

        if (reason === 'timeout') {
            toast.error('Call missed - No answer', {
                duration: 3000,
                position: 'top-center',
            });
        }
    };

    const progress = (timeLeft / (CALL_TIMEOUT / 1000)) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            >
                {/* Enhanced Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tl from-indigo-600/30 to-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '0.5s' }} />

                    {/* Animated rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-[400px] h-[400px] border-2 border-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                <motion.div
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f1419]/95 border border-white/20 rounded-[2rem] p-8 sm:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col items-center ring-1 ring-white/10"
                >
                    {/* Progress Ring */}
                    <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">{timeLeft}s</span>
                    </div>

                    {/* Status Badge */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6 flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30 backdrop-blur-md"
                    >
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]"></span>
                        </span>
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                            {isVideoCall ? '📹 Video Call' : '📞 Voice Call'}
                        </span>
                    </motion.div>

                    {/* Caller Avatar */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', damping: 15 }}
                        className="relative mb-6 group"
                    >
                        {/* Animated glow ring */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-full blur-xl opacity-60 animate-pulse" />

                        {/* Progress ring */}
                        <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] -rotate-90">
                            <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="3"
                            />
                            <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="3"
                                strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                                strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full ring-4 ring-[#1a1a2e] overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                            {incomingCall.initiator.avatarUrl ? (
                                <img
                                    src={incomingCall.initiator.avatarUrl}
                                    alt={incomingCall.initiator.username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-6xl font-black text-white drop-shadow-lg">
                                    {incomingCall.initiator.username.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </motion.div>

                    {/* Caller Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                            {incomingCall.initiator.username}
                        </h2>
                        {isGroupCall && (
                            <span className="inline-block text-sm font-semibold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 mb-2">
                                👥 Group Call
                            </span>
                        )}
                        <p className="text-slate-300 text-base sm:text-lg font-medium">
                            {isVideoCall ? "wants to video chat with you" : "is calling you"}
                        </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-2 gap-4 sm:gap-6 w-full"
                    >
                        <button
                            onClick={() => handleReject()}
                            disabled={isAccepting}
                            className="group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
                        >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/50">
                                <X className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={3} />
                            </div>
                            <span className="text-sm sm:text-base font-bold text-red-400 group-hover:text-red-300">Decline</span>
                        </button>

                        <button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 border-2 border-green-500/30 hover:border-green-500/50 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md overflow-hidden"
                        >
                            {isAccepting && (
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-pulse" />
                            )}
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-green-500/50">
                                {isAccepting ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    isVideoCall ? <Video className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={3} /> : <Phone className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={3} />
                                )}
                            </div>
                            <span className="relative text-sm sm:text-base font-bold text-green-400 group-hover:text-green-300">
                                {isAccepting ? 'Connecting...' : 'Accept'}
                            </span>
                        </button>
                    </motion.div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
