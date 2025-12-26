import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../contexts/CallContext';
import {
    Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff,
    ZoomIn, ZoomOut, RefreshCw, Minimize2, Maximize2,
    Users, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export const OngoingCallUI: React.FC = () => {
    const {
        activeCall,
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        endCall,
        toggleScreenShare,
        isScreenSharing,
        switchCamera,
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
    const [isLocalMain, setIsLocalMain] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Call duration timer
    useEffect(() => {
        if (!activeCall) return;

        const interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeCall]);

    // Format call duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-hide controls with smooth transition
    useEffect(() => {
        const resetControlsTimer = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
        };

        window.addEventListener('mousemove', resetControlsTimer);
        window.addEventListener('touchstart', resetControlsTimer);
        window.addEventListener('click', resetControlsTimer);
        resetControlsTimer();

        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            window.removeEventListener('mousemove', resetControlsTimer);
            window.removeEventListener('touchstart', resetControlsTimer);
            window.removeEventListener('click', resetControlsTimer);
        };
    }, []);

    const toggleZoom = () => {
        setZoomLevel(prev => prev === 1 ? 1.5 : 1);
        toast.success(zoomLevel === 1 ? 'Zoomed in' : 'Zoomed out', {
            duration: 1000,
            position: 'top-center',
        });
    };

    const handleEndCall = () => {
        endCall();
        toast.success('Call ended', {
            duration: 2000,
            position: 'top-center',
        });
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleScreenClick = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
    };

    const handleScreenShare = async () => {
        try {
            await toggleScreenShare();
        } catch (error) {
            console.error('Screen share error:', error);
            toast.error('Screen sharing not available on this device', {
                duration: 3000,
                position: 'top-center',
            });
        }
    };

    // Attach local stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(console.error);
        }
    }, [localStream, isLocalMain]);

    // Attach remote streams
    useEffect(() => {
        remoteStreams.forEach((stream, userId) => {
            const element = remoteVideoRefs.current.get(userId);
            if (element && element.srcObject !== stream) {
                element.srcObject = stream;
                element.play().catch(console.error);
            }
        });
    }, [remoteStreams, isLocalMain]);

    if (!activeCall) {
        console.log('[OngoingCallUI] No active call, hiding UI');
        return null;
    }

    const location = useLocation();
    const isRandomPage = location.pathname === '/random-chat';
    const conversationIdMatch = location.pathname.match(/\/chat\/([^\/]+)/);
    const currentConversationId = conversationIdMatch ? conversationIdMatch[1] : null;

    const isOnCallPage = activeCall.conversationId
        ? currentConversationId === activeCall.conversationId
        : isRandomPage;

    if (!isOnCallPage) return null;

    const isVideoCall = activeCall.callType.includes('VIDEO');
    const remoteStreamCount = remoteStreams.size;

    // Minimized View
    if (isMinimized) {
        return (
            <motion.div
                drag
                dragMomentum={false}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="fixed bottom-24 right-4 z-[9999] w-40 h-56 md:w-56 md:h-80 bg-gradient-to-br from-gray-900 to-black rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-500/50 cursor-move group"
            >
                <div className="w-full h-full relative">
                    {isVideoCall && localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                            <Users className="w-12 h-12 text-white/50" />
                        </div>
                    )}

                    {/* Expand Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-all hover:scale-110 shadow-lg"
                        >
                            <Maximize2 size={24} />
                        </button>
                    </div>

                    {/* Status Indicators */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        <div className="px-2 py-1 bg-green-500 rounded-full animate-pulse shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold">
                            {formatDuration(callDuration)}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#000] to-[#0f0520] z-[9999] overflow-hidden flex flex-col">
            {/* Top Bar - Info */}
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: showControls ? 0 : -100, opacity: showControls ? 1 : 0 }}
                className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
            >
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Call Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
                            <span className="text-white font-semibold text-sm md:text-base">
                                {isVideoCall ? '📹 Video Call' : '📞 Voice Call'}
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-mono text-sm">
                                {formatDuration(callDuration)}
                            </span>
                        </div>

                        {remoteStreamCount > 0 && (
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                                <Users className="w-4 h-4 text-purple-400" />
                                <span className="text-white text-sm font-semibold">
                                    {remoteStreamCount + 1} participants
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Top Right Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="hidden md:flex p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all hover:scale-110 border border-white/10"
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>

                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all hover:scale-110 border border-white/10"
                            title="Minimize"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div
                className="relative flex-1 w-full h-full"
                ref={constraintsRef}
                onClick={handleScreenClick}
            >
                {isVideoCall ? (
                    remoteStreamCount <= 1 ? (
                        // 1-on-1 Video Layout
                        <OneOnOneVideoLayout
                            localStream={localStream}
                            remoteStreams={remoteStreams}
                            isLocalMain={isLocalMain}
                            setIsLocalMain={setIsLocalMain}
                            isVideoOff={isVideoOff}
                            zoomLevel={zoomLevel}
                            activeCall={activeCall}
                            localVideoRef={localVideoRef}
                            remoteVideoRefs={remoteVideoRefs}
                            constraintsRef={constraintsRef}
                        />
                    ) : (
                        // Group Video Grid
                        <GroupVideoGrid
                            localStream={localStream}
                            remoteStreams={remoteStreams}
                            isVideoOff={isVideoOff}
                            activeCall={activeCall}
                            localVideoRef={localVideoRef}
                            remoteVideoRefs={remoteVideoRefs}
                        />
                    )
                ) : (
                    // Audio Call UI
                    <AudioCallUI
                        activeCall={activeCall}
                        remoteStreams={remoteStreams}
                        remoteVideoRefs={remoteVideoRefs}
                        callDuration={callDuration}
                    />
                )}
            </div>

            {/* Enhanced Controls Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0 z-50 p-4 md:p-8 pb-8 md:pb-10"
                    >
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-gradient-to-r from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 md:p-6 shadow-2xl ring-1 ring-white/10">
                                <div className="flex items-center justify-center gap-3 md:gap-6">

                                    {/* Mute Button */}
                                    <ControlButton
                                        active={isMuted}
                                        onClick={toggleMute}
                                        onIcon={<MicOff className="w-6 h-6" />}
                                        offIcon={<Mic className="w-6 h-6" />}
                                        activeClass="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50"
                                        label={isMuted ? 'Unmute' : 'Mute'}
                                    />

                                    {/* Video Toggle */}
                                    {isVideoCall && (
                                        <ControlButton
                                            active={isVideoOff}
                                            onClick={toggleVideo}
                                            onIcon={<VideoOff className="w-6 h-6" />}
                                            offIcon={<Video className="w-6 h-6" />}
                                            activeClass="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50"
                                            label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                                        />
                                    )}

                                    {/* Screen Share */}
                                    {isVideoCall && (
                                        <ControlButton
                                            active={isScreenSharing}
                                            onClick={handleScreenShare}
                                            onIcon={<MonitorUp className="w-6 h-6" />}
                                            offIcon={<MonitorUp className="w-6 h-6" />}
                                            activeClass="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50"
                                            defaultClass="bg-white/10 hover:bg-green-500/20 hover:text-green-400 border border-white/20"
                                            label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                                        />
                                    )}

                                    {/* Camera Switch (Mobile) */}
                                    {isVideoCall && !isScreenSharing && (
                                        <div className="md:hidden">
                                            <ControlButton
                                                active={false}
                                                onClick={switchCamera}
                                                onIcon={<RefreshCw className="w-6 h-6" />}
                                                offIcon={<RefreshCw className="w-6 h-6" />}
                                                label="Switch camera"
                                            />
                                        </div>
                                    )}

                                    {/* Zoom (Desktop) */}
                                    {isVideoCall && !isScreenSharing && remoteStreamCount <= 1 && (
                                        <div className="hidden md:block">
                                            <ControlButton
                                                active={zoomLevel > 1}
                                                onClick={toggleZoom}
                                                onIcon={<ZoomOut className="w-6 h-6" />}
                                                offIcon={<ZoomIn className="w-6 h-6" />}
                                                activeClass="bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                label={zoomLevel > 1 ? 'Zoom out' : 'Zoom in'}
                                            />
                                        </div>
                                    )}

                                    {/* End Call - Prominent */}
                                    <button
                                        onClick={handleEndCall}
                                        className="relative group w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 flex items-center justify-center text-white shadow-2xl shadow-red-600/50 transition-all hover:scale-110 active:scale-95 mx-2 ring-2 ring-red-500/20"
                                        title="End call"
                                    >
                                        <PhoneOff className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper Component - Enhanced Control Button
const ControlButton = ({
    active,
    onClick,
    onIcon,
    offIcon,
    activeClass = '',
    defaultClass = 'bg-white/10 hover:bg-white/20 border border-white/20',
    label
}: any) => (
    <button
        onClick={onClick}
        className={`relative group w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-110 ${active ? activeClass : defaultClass
            } text-white shadow-lg`}
        title={label}
    >
        {active ? onIcon : offIcon}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
        </div>
    </button>
);

// 1-on-1 Video Layout Component
const OneOnOneVideoLayout = ({
    localStream,
    remoteStreams,
    isLocalMain,
    setIsLocalMain,
    isVideoOff,
    zoomLevel,
    activeCall,
    constraintsRef
}: any) => {
    const remoteEntry = Array.from(remoteStreams.entries())[0] as [string, MediaStream] | undefined;
    const remoteUserId = remoteEntry?.[0];
    const remoteStream = remoteEntry?.[1];

    const mainStream = isLocalMain ? localStream : remoteStream;
    const mainIsLocal = isLocalMain;

    return (
        <div className="absolute inset-0">
            {/* Main Video */}
            <div className="w-full h-full relative bg-black">
                {mainStream && !(mainIsLocal && isVideoOff) ? (
                    <video
                        key={mainIsLocal ? 'local-main' : `remote-main-${remoteUserId}`}
                        ref={el => {
                            if (el && mainStream && el.srcObject !== mainStream) {
                                el.srcObject = mainStream;
                            }
                        }}
                        autoPlay
                        playsInline
                        muted={mainIsLocal}
                        className="w-full h-full object-contain transition-transform duration-500 bg-black"
                        style={{ transform: `scale(${zoomLevel})` }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                        <div className="flex flex-col items-center animate-pulse">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-6xl md:text-7xl text-white font-black shadow-2xl mb-4">
                                {mainIsLocal ? 'Me' : activeCall.participants.find((p: any) => p.userId === remoteUserId)?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-2xl text-white/70 font-semibold">Camera Off</span>
                        </div>
                    </div>
                )}

                {/* Name Tag */}
                <div className="absolute top-8 left-8 bg-black/50 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/20 shadow-lg">
                    <span className="text-white font-bold text-lg tracking-wide drop-shadow-md">
                        {mainIsLocal ? 'You' : activeCall.participants.find((p: any) => p.userId === remoteUserId)?.username || 'User'}
                    </span>
                </div>
            </div>

            {/* PiP Video */}
            <motion.div
                drag
                dragConstraints={constraintsRef}
                dragElastic={0.05}
                dragMomentum={false}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLocalMain(!isLocalMain)}
                className="absolute bottom-32 right-6 w-32 h-48 md:w-48 md:h-72 bg-black rounded-3xl overflow-hidden shadow-2xl border-3 border-white/30 cursor-pointer z-20 group hover:border-purple-500/50 transition-all"
            >
                {(() => {
                    const pipStream = isLocalMain ? remoteStream : localStream;
                    const pipIsLocal = !isLocalMain;

                    return (
                        <>
                            {pipStream && !(pipIsLocal && isVideoOff) ? (
                                <video
                                    key={pipIsLocal ? 'local-pip' : `remote-pip-${remoteUserId}`}
                                    ref={el => {
                                        if (el && pipStream && el.srcObject !== pipStream) {
                                            el.srcObject = pipStream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                    muted={pipIsLocal}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white font-bold">
                                        {pipIsLocal ? 'Me' : activeCall.participants.find((p: any) => p.userId === remoteUserId)?.username?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                {pipIsLocal ? 'You' : 'Remote'} • Tap to swap
                            </div>
                        </>
                    );
                })()}
            </motion.div>
        </div>
    );
};

// Group Video Grid Component
const GroupVideoGrid = ({
    localStream,
    remoteStreams,
    isVideoOff,
    activeCall
}: any) => (
    <div className="h-full w-full p-4 md:p-8 grid gap-4 md:gap-6 auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
        {/* Remote Videos */}
        {(Array.from(remoteStreams.entries()) as [string, MediaStream][]).map(([userId, stream]) => (
            <div key={userId} className="relative w-full h-full min-h-[200px] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-black shadow-2xl border-2 border-white/10 group hover:border-purple-500/50 transition-all">
                <video
                    ref={el => {
                        if (el && stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                        }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
                    <span className="text-white text-sm md:text-base font-bold">
                        {activeCall.participants.find((p: any) => p.userId === userId)?.username || 'Unknown'}
                    </span>
                </div>
            </div>
        ))}

        {/* Local Video */}
        <div className="relative w-full h-full min-h-[200px] rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 to-blue-900 shadow-2xl border-2 border-purple-500/50">
            {!isVideoOff && localStream ? (
                <video
                    ref={el => {
                        if (el && localStream && el.srcObject !== localStream) {
                            el.srcObject = localStream;
                        }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-3xl md:text-4xl font-black border-2 border-purple-500/50">
                        You
                    </div>
                </div>
            )}
            <div className="absolute bottom-4 left-4 bg-purple-600/80 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-lg ring-2 ring-purple-400/30">
                <span className="text-white text-sm md:text-base font-black">You</span>
            </div>
        </div>
    </div>
);

// Audio Call UI Component
const AudioCallUI = ({ activeCall, remoteStreams, callDuration }: any) => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hidden audio elements */}
        {(Array.from(remoteStreams.entries()) as [string, MediaStream][]).map(([userId, stream]) => (
            <audio
                key={userId}
                ref={el => {
                    if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                    }
                }}
                autoPlay
                playsInline
                className="hidden"
            />
        ))}

        {/* Avatar */}
        <div className="relative z-10 mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-[80px] rounded-full animate-pulse" />
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-1.5 shadow-2xl">
                <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden ring-4 ring-white/10">
                    {activeCall.initiator?.avatarUrl ? (
                        <img src={activeCall.initiator.avatarUrl} alt="caller" className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-7xl md:text-8xl text-white font-black">
                            {activeCall.initiator?.username?.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* Caller Info */}
        <h2 className="relative z-10 text-4xl md:text-6xl font-black text-white tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
            {activeCall.initiator?.username}
        </h2>

        <div className="relative z-10 flex items-center gap-3 px-6 py-3 bg-blue-500/20 backdrop-blur-xl rounded-full border border-blue-400/30 shadow-lg">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
            <p className="text-blue-300 font-bold text-lg">Audio Call • {formatDuration(callDuration)}</p>
        </div>
    </div>
);

// Helper function for duration formatting
const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
