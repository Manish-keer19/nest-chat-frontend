import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../contexts/CallContext';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

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

    // Auto-hide controls
    useEffect(() => {
        const resetControlsTimer = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 5000);
        };

        window.addEventListener('mousemove', resetControlsTimer);
        window.addEventListener('touchstart', resetControlsTimer);
        resetControlsTimer();

        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            window.removeEventListener('mousemove', resetControlsTimer);
            window.removeEventListener('touchstart', resetControlsTimer);
        };
    }, []);

    const toggleZoom = () => {
        setZoomLevel(prev => prev === 1 ? 2 : 1);
    };

    // Attach local stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(console.error);
        }
    }, [localStream, isLocalMain]); // Re-attach if switching views

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

    if (!activeCall) return null;

    const location = useLocation();
    const isRandomPage = location.pathname === '/random-chat';
    const conversationIdMatch = location.pathname.match(/\/chat\/([^\/]+)/);
    const currentConversationId = conversationIdMatch ? conversationIdMatch[1] : null;

    // Check if we are on the correct page for this call
    // If it's a random call (no conversationId), we must be on /random-chat
    // If it's a regular call (has conversationId), we must be on /chat/:id
    const isOnCallPage = activeCall.conversationId
        ? currentConversationId === activeCall.conversationId
        : isRandomPage; // Fallback logic if conversationId missing (likely random call)

    // If not on the call page, hide this UI (ActiveCallIndicator will show instead)
    if (!isOnCallPage) return null;

    const isVideoCall = activeCall.callType.includes('VIDEO');
    const remoteStreamCount = remoteStreams.size;

    if (isMinimized) {
        return (
            <motion.div
                drag
                dragMomentum={false}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-24 right-4 z-[9999] w-32 h-48 md:w-48 md:h-72 bg-black rounded-2xl shadow-2xl overflow-hidden border-2 border-white/20 cursor-move pointer-events-auto"
            >
                {/* Minimized Content */}
                <div className="w-full h-full relative group">
                    {/* Show local or remote */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                        >
                            <ZoomIn size={20} />
                        </button>
                    </div>
                    <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full animate-pulse" />
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#000] z-[9999] overflow-hidden flex flex-col font-sans">
            {/* Minimize Button */}
            <button
                onClick={() => setIsMinimized(true)}
                className="absolute top-4 right-4 z-[10000] p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all"
            >
                <ZoomOut size={24} />
            </button>
            {/* Main Content Area */}
            <div className="relative flex-1 w-full h-full" ref={constraintsRef}>
                {isVideoCall ? (
                    remoteStreamCount <= 1 ? (
                        // 1-on-1 Layout
                        <div className="absolute inset-0">
                            {/* Full Screen Video (Main) */}
                            {(() => {
                                const remoteEntry = Array.from(remoteStreams.entries())[0];
                                const remoteUserId = remoteEntry?.[0];
                                const remoteStream = remoteEntry?.[1];

                                const mainStream = isLocalMain ? localStream : remoteStream;
                                const mainIsLocal = isLocalMain;
                                const mainKey = mainIsLocal ? 'local-main' : `remote-main-${remoteUserId}`;

                                return (
                                    <div className="w-full h-full relative">
                                        <video
                                            key={mainKey}
                                            ref={el => {
                                                if (el) {
                                                    if (mainStream && el.srcObject !== mainStream) el.srcObject = mainStream;
                                                    if (mainIsLocal) localVideoRef.current = el;
                                                    else if (remoteUserId) remoteVideoRefs.current.set(remoteUserId, el);
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            muted={mainIsLocal}
                                            className={`w-full h-full object-cover transition-transform duration-500 will-change-transform ${mainIsLocal && isVideoOff ? 'hidden' : ''}`}
                                            style={{ transform: `scale(${zoomLevel})` }}
                                        />

                                        {/* Avatar Fallback for Main View */}
                                        {((mainIsLocal && isVideoOff) || (!mainIsLocal && !mainStream)) && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                                                <div className="flex flex-col items-center animate-pulse">
                                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-5xl text-white font-bold shadow-2xl mb-4">
                                                        {mainIsLocal ? 'Me' : activeCall.participants.find(p => p.userId === remoteUserId)?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xl text-white/50 font-medium">Video Paused</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Name Tag */}
                                        <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                                            <span className="text-white font-semibold tracking-wide drop-shadow-md">
                                                {mainIsLocal ? 'You' : activeCall.participants.find(p => p.userId === remoteUserId)?.username || 'User'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Floating PIP Video (Secondary) */}
                            <motion.div
                                drag
                                dragConstraints={constraintsRef}
                                dragElastic={0.05}
                                dragMomentum={false}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsLocalMain(!isLocalMain)}
                                className="absolute bottom-32 right-6 w-36 h-52 md:w-56 md:h-80 bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 cursor-pointer z-20 group"
                            >
                                {(() => {
                                    const remoteEntry = Array.from(remoteStreams.entries())[0];
                                    const remoteUserId = remoteEntry?.[0];
                                    const remoteStream = remoteEntry?.[1];

                                    const pipStream = isLocalMain ? remoteStream : localStream;
                                    const pipIsLocal = !isLocalMain;
                                    const pipKey = pipIsLocal ? 'local-pip' : `remote-pip-${remoteUserId}`;

                                    return (
                                        <>
                                            <video
                                                key={pipKey}
                                                ref={el => {
                                                    if (el) {
                                                        if (pipStream && el.srcObject !== pipStream) el.srcObject = pipStream;
                                                        if (pipIsLocal) localVideoRef.current = el;
                                                        else if (remoteUserId) remoteVideoRefs.current.set(remoteUserId, el);
                                                    }
                                                }}
                                                autoPlay
                                                playsInline
                                                muted={pipIsLocal}
                                                className={`w-full h-full object-cover ${pipIsLocal && isVideoOff ? 'hidden' : ''}`}
                                            />

                                            {/* Avatar Fallback for PIP */}
                                            {((pipIsLocal && isVideoOff) || (!pipIsLocal && !pipStream)) && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a]">
                                                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-xl text-white font-bold">
                                                        {pipIsLocal ? 'Me' : activeCall.participants.find(p => p.userId === remoteUserId)?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {pipIsLocal ? 'You' : 'Remote'}
                                            </div>
                                        </>
                                    );
                                })()}
                            </motion.div>
                        </div>
                    ) : (
                        // Group Grid Layout
                        <div className="h-full w-full p-4 md:p-6 grid gap-4 md:gap-6 auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center content-center max-w-7xl mx-auto">
                            {/* Remote Videos */}
                            {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                                <div key={userId} className="relative w-full h-full rounded-3xl overflow-hidden bg-[#1a1a1a] shadow-xl border border-white/5 group">
                                    <video
                                        ref={el => {
                                            if (el) {
                                                remoteVideoRefs.current.set(userId, el);
                                                if (stream && el.srcObject !== stream) el.srcObject = stream;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-white text-sm font-medium">
                                            {activeCall.participants.find(p => p.userId === userId)?.username || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {/* Local Video */}
                            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-[#1a1a1a] shadow-xl border border-white/5 border-b-blue-500/50">
                                <video
                                    ref={el => {
                                        localVideoRef.current = el;
                                        if (el && localStream) el.srcObject = localStream;
                                    }}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-2xl font-bold border border-blue-500/30">
                                            You
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-4 bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl">
                                    <span className="text-white text-sm font-medium">You</span>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    // Audio Call UI
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#000]">
                        {/* Hidden audio elements */}
                        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                            <audio
                                key={userId}
                                ref={el => {
                                    if (el) {
                                        remoteVideoRefs.current.set(userId, el as any);
                                        if (stream && el.srcObject !== stream) el.srcObject = stream;
                                    }
                                }}
                                autoPlay
                                playsInline
                                className="hidden"
                            />
                        ))}

                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
                            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 p-1 shadow-2xl relative z-10">
                                <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                                    {activeCall.initiator?.avatarUrl ? (
                                        <img src={activeCall.initiator.avatarUrl} alt="caller" className="w-full h-full object-cover opacity-90" />
                                    ) : (
                                        <span className="text-6xl text-white font-bold">{activeCall.initiator?.username?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <h2 className="mt-8 text-3xl md:text-5xl font-bold text-white tracking-tight">{activeCall.initiator?.username}</h2>
                        <p className="mt-2 text-blue-400 font-medium text-lg animate-pulse">00:00 • Audio Call</p>
                    </div>
                )}
            </div>

            {/* Floating Controls Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6"
                    >
                        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center justify-center gap-3 md:gap-6">

                            <ControlButton
                                active={isMuted}
                                onClick={toggleMute}
                                onIcon={<MicOff className="w-6 h-6" />}
                                offIcon={<Mic className="w-6 h-6" />}
                                activeClass="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                label="Toggle Mute"
                            />

                            {isVideoCall && (
                                <ControlButton
                                    active={isVideoOff}
                                    onClick={toggleVideo}
                                    onIcon={<VideoOff className="w-6 h-6" />}
                                    offIcon={<Video className="w-6 h-6" />}
                                    activeClass="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                    label="Toggle Camera"
                                />
                            )}

                            {isVideoCall && (
                                <ControlButton
                                    active={isScreenSharing}
                                    onClick={toggleScreenShare}
                                    onIcon={<MonitorUp className="w-6 h-6" />}
                                    offIcon={<MonitorUp className="w-6 h-6" />}
                                    activeClass="bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                    defaultClass="hover:bg-green-500/20 hover:text-green-400"
                                    label="Share Screen"
                                />
                            )}

                            {isVideoCall && !isScreenSharing && (
                                <div className="md:hidden">
                                    <ControlButton
                                        active={false}
                                        onClick={switchCamera}
                                        onIcon={<RefreshCw className="w-6 h-6" />}
                                        offIcon={<RefreshCw className="w-6 h-6" />}
                                        label="Switch Camera"
                                    />
                                </div>
                            )}

                            {isVideoCall && !isScreenSharing && (
                                <div className="hidden md:block">
                                    <ControlButton
                                        active={false}
                                        onClick={toggleZoom}
                                        onIcon={<ZoomOut className="w-6 h-6" />}
                                        offIcon={<ZoomIn className="w-6 h-6" />}
                                        label="Zoom"
                                    />
                                </div>
                            )}

                            {/* End Call - Prominent */}
                            <button
                                onClick={endCall}
                                className="w-16 h-16 rounded-2xl bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-all hover:scale-110 active:scale-95 mx-2"
                                title="End Call"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper Component for consistent buttons
const ControlButton = ({ active, onClick, onIcon, offIcon, activeClass = '', defaultClass = 'bg-white/5 hover:bg-white/10 text-white', label }: any) => (
    <button
        onClick={onClick}
        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${active ? activeClass : defaultClass}`}
        title={label}
    >
        {active ? onIcon : offIcon}
    </button>
);
