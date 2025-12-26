import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
    Video,
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    Search,
    User,
    SwitchCamera,
    SkipForward
} from 'lucide-react';
import { useRandomCall } from '../contexts/RandomCallContext';
import { toast, Toaster } from 'sonner';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

const RandomVideoPage = () => {
    const { setRandomCallActive, setRandomCallSearching, setRandomCallIdle } = useRandomCall();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'idle' | 'searching' | 'connected'>('idle');
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [partnerName, setPartnerName] = useState('Stranger');

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const [isSwapped, setIsSwapped] = useState(false);

    // Initialize Socket
    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const newSocket = io(`${API_URL}/random-chat`, {
            transports: ['websocket'],
            auth: {
                token: localStorage.getItem('token'),
            },
        });

        setSocket(newSocket);
        socketRef.current = newSocket;

        return () => {
            newSocket.disconnect();
            // Reset global state when leaving the page
            setRandomCallIdle();
        };
    }, [setRandomCallIdle]);

    // Initialize Media
    const initMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error('Error accessing media:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        initMedia();
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
        };
    }, []); // Run once on mount

    // WebRTC & Socket Events
    useEffect(() => {
        if (!socket) return;

        socket.on('waiting-for-partner', () => {
            setStatus('searching');
            setRandomCallSearching();
        });

        socket.on('match-found', async ({ role, partnerName }) => {
            console.log('Match found! Role:', role);
            setStatus('connected');
            setPartnerName(partnerName);
            setRandomCallActive(partnerName);

            // Create PeerConnection
            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerConnection.current = pc;

            // Add local tracks
            if (localStream) {
                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            }

            // Handle remote tracks
            pc.ontrack = (event) => {
                const [remote] = event.streams;
                console.log('Received remote stream:', remote);
                setRemoteStream(remote);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remote;
                }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal-ice-candidate', { candidate: event.candidate });
                }
            };

            if (role === 'initiator') {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('signal-offer', { offer });
            }
        });

        socket.on('signal-offer', async ({ offer }) => {
            const pc = peerConnection.current;
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal-answer', { answer });
        });

        socket.on('signal-answer', async ({ answer }) => {
            const pc = peerConnection.current;
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('signal-ice-candidate', async ({ candidate }) => {
            const pc = peerConnection.current;
            if (!pc) return;
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('match-ended', () => {
            setStatus('idle');
            setRandomCallIdle();
            handleEndCall(false); // Don't notify server, they told us
            toast.error('The stranger disconnected.', {
                duration: 3000,
                position: 'top-center',
            });
        });

        return () => {
            socket.off('waiting-for-partner');
            socket.off('match-found');
            socket.off('signal-offer');
            socket.off('signal-answer');
            socket.off('signal-ice-candidate');
            socket.off('match-ended');
        };
    }, [socket, localStream]);

    const handleStartSearch = () => {
        if (!socket) return;
        setStatus('searching');
        setRandomCallSearching();
        socket.emit('find-partner');
    };

    const handleEndCall = (notifyServer = true) => {
        if (notifyServer && socket) {
            socket.emit('leave-pool');
        }

        // Close PC
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        setRemoteStream(null);
        setStatus('idle');
        setPartnerName('Stranger');
        setRandomCallIdle();
    };

    const handleNext = () => {
        // Disconnect current
        handleEndCall(true);
        // Small delay to ensure state reset before searching again
        setTimeout(() => {
            handleStartSearch();
        }, 300);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const newVideoState = !isVideoOff;
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !newVideoState; // If video is off, enable track
            });
            setIsVideoOff(newVideoState);

            // Force refresh video element to ensure it displays properly
            if (localVideoRef.current && !newVideoState) {
                localVideoRef.current.srcObject = null;
                setTimeout(() => {
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStream;
                    }
                }, 10);
            }
        }
    };

    const switchCamera = async () => {
        if (!localStream) {
            toast.error('No camera available', {
                duration: 2000,
                position: 'top-center',
            });
            return;
        }

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        console.log('Switching camera to:', newFacingMode);

        // Show loading toast
        const loadingToast = toast.loading('Switching camera...', {
            position: 'top-center',
        });

        try {
            // Try with exact constraint first
            let constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { exact: newFacingMode }
                },
                audio: false
            };

            let newStream: MediaStream;

            try {
                newStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (exactError) {
                // Fallback to non-exact constraint
                console.warn('Exact facing mode failed, trying loose constraint:', exactError);
                constraints = {
                    video: {
                        facingMode: newFacingMode
                    },
                    audio: false
                };
                newStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Stop old video track
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                oldVideoTrack.stop();
            }

            // Create new stream with new video track and existing audio
            const newLocalStream = new MediaStream([
                newVideoTrack,
                ...localStream.getAudioTracks()
            ]);

            setLocalStream(newLocalStream);

            // Update local video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newLocalStream;
            }

            // Replace track in PeerConnection sender
            if (peerConnection.current) {
                const senders = peerConnection.current.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(newVideoTrack);
                    console.log('Video track replaced in peer connection');
                }
            }

            setFacingMode(newFacingMode);

            // Success feedback
            toast.success(`Switched to ${newFacingMode === 'user' ? 'front' : 'rear'} camera`, {
                id: loadingToast,
                duration: 2000,
                position: 'top-center',
            });

        } catch (err) {
            console.error('Error switching camera:', err);
            toast.error('Failed to switch camera. Your device may not have multiple cameras.', {
                id: loadingToast,
                duration: 3000,
                position: 'top-center',
            });
        }
    };

    return (
        <div className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-br from-[#0a0118] via-[#09090b] to-[#0f0520] text-white flex flex-col items-center justify-center sm:p-4">
            {/* Toast Notifications */}
            <Toaster richColors closeButton theme="dark" />

            {/* Enhanced Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                {/* Animated gradient orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tl from-blue-600/30 to-cyan-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 rounded-full blur-[100px]" />

                {/* Grid overlay for depth */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            </div>

            {/* Main Container */}
            <div className={`
                z-10 w-full flex flex-col relative transition-all duration-500
                h-full sm:h-auto sm:aspect-video sm:max-w-6xl 
                sm:bg-gradient-to-br sm:from-black/50 sm:via-black/40 sm:to-black/30 
                sm:backdrop-blur-2xl sm:rounded-[2rem] sm:border sm:border-white/20 
                sm:shadow-[0_20px_80px_rgba(0,0,0,0.8)] sm:overflow-hidden
                sm:ring-1 sm:ring-white/10
            `}>

                {/* Header / Top Bar */}
                <div className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-6 flex justify-between items-start bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none">
                    <div className="pointer-events-auto space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.4)] animate-gradient">
                            Random Connect
                        </h1>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border transition-all duration-300 w-fit shadow-lg
                            ${status === 'connected' ? 'border-green-500/50 bg-green-500/10' : status === 'searching' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20'}
                        `}>
                            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${status === 'connected' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse' : status === 'searching' ? 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.8)] animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-xs sm:text-sm font-semibold text-white/95">
                                {status === 'connected' ? `🎯 ${partnerName}` : status === 'searching' ? '🔍 Searching...' : '⏸️ Idle'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Video Area */}
                <div
                    ref={containerRef}
                    className="relative w-full h-full sm:rounded-3xl overflow-hidden bg-gray-900"
                    style={{ touchAction: 'none' }}
                >

                    {/* Main Video Layer - Shows Remote by default, Local when swapped */}
                    <div
                        className="absolute inset-0 w-full h-full z-0"
                    >
                        {!isSwapped ? (
                            // Default: Show Remote Video in Main
                            status === 'connected' && remoteStream ? (
                                <video
                                    key="main-remote"
                                    ref={(el) => {
                                        if (el && remoteStream && el.srcObject !== remoteStream) {
                                            el.srcObject = remoteStream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                    onLoadedMetadata={(e) => {
                                        e.currentTarget.play().catch(console.error);
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-black/80">
                                    {status === 'searching' ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-ping"></div>
                                                <Search className="relative w-16 h-16 mb-4 text-purple-400" />
                                            </div>
                                            <p className="text-xl font-medium text-purple-200">Looking for someone...</p>
                                            <p className="text-sm text-purple-400/60 mt-2">Hang tight!</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <User className="w-20 h-20 mb-4 opacity-20" />
                                            <div className="text-center space-y-2">
                                                <p className="text-2xl font-semibold opacity-80">Ready to Connect?</p>
                                                <p className="text-sm opacity-50">Click "Find Stranger" to start</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            // Swapped: Show Local Video in Main
                            localStream && !isVideoOff ? (
                                <video
                                    key="main-local"
                                    ref={(el) => {
                                        if (el && localStream && el.srcObject !== localStream) {
                                            el.srcObject = localStream;
                                        }
                                    }}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                    <VideoOff className="w-20 h-20 text-gray-400" />
                                </div>
                            )
                        )}
                    </div>

                    {/* PiP Video (Floating) - Shows Local by default, Remote when swapped */}
                    <motion.div
                        layout
                        drag
                        dragConstraints={containerRef}
                        dragElastic={0.1}
                        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                        onClick={() => {
                            setIsSwapped(!isSwapped);
                            toast.success(isSwapped ? 'Switched to remote view' : 'Switched to your view', {
                                duration: 1500,
                                position: 'top-center',
                            });
                        }}
                        className={`
                            absolute z-20 overflow-hidden shadow-2xl border bg-black/80 cursor-grab active:cursor-grabbing
                            top-4 right-4 
                            w-[120px] h-[180px] sm:w-[150px] sm:h-[100px] md:w-[240px] md:h-[160px] lg:w-[320px] lg:h-[213px]
                            rounded-xl transition-all duration-300
                            ${isSwapped ? 'ring-2 ring-purple-500 border-purple-500/50' : 'border-white/20'}
                        `}
                    >
                        {!isSwapped ? (
                            // Default PiP: Show Local Video
                            localStream && !isVideoOff ? (
                                <video
                                    key="pip-local"
                                    ref={(el) => {
                                        if (el && localStream && el.srcObject !== localStream) {
                                            el.srcObject = localStream;
                                        }
                                    }}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <VideoOff className="w-8 h-8 text-gray-400" />
                                </div>
                            )
                        ) : (
                            // Swapped PiP: Show Remote Video
                            status === 'connected' && remoteStream ? (
                                <video
                                    key="pip-remote"
                                    ref={(el) => {
                                        if (el && remoteStream && el.srcObject !== remoteStream) {
                                            el.srcObject = remoteStream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <User className="w-8 h-8 text-gray-400" />
                                </div>
                            )
                        )}

                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] sm:text-xs font-medium border border-white/10">
                            {!isSwapped ? 'You' : partnerName}
                        </div>

                        {/* Tap to swap indicator */}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600/80 backdrop-blur-sm rounded text-[10px] font-medium border border-purple-400/30 opacity-0 hover:opacity-100 transition-opacity">
                            Tap to swap
                        </div>
                    </motion.div>

                </div>

                {/* Enhanced Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col items-center gap-6 z-30 pb-8 sm:pb-10">

                    {/* Main Actions */}
                    <div className="flex items-center gap-3 sm:gap-5">

                        <button
                            onClick={toggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            className={`group relative p-4 sm:p-5 rounded-2xl backdrop-blur-xl transition-all duration-300 active:scale-95 shadow-2xl ${isMuted
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-red-500/50'
                                : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 shadow-black/50'
                                }`}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button
                            onClick={toggleVideo}
                            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                            className={`group relative p-4 sm:p-5 rounded-2xl backdrop-blur-xl transition-all duration-300 active:scale-95 shadow-2xl ${isVideoOff
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-red-500/50'
                                : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 shadow-black/50'
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button
                            onClick={switchCamera}
                            title="Switch camera"
                            className="md:hidden p-4 sm:p-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 backdrop-blur-xl transition-all duration-300 active:scale-95 shadow-2xl shadow-black/50"
                        >
                            <SwitchCamera className="w-6 h-6" />
                        </button>

                        {/* Call Actions */}
                        {status === 'idle' ? (
                            <button
                                onClick={handleStartSearch}
                                className="group relative px-10 py-4 sm:py-5 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-2xl font-black text-lg sm:text-xl shadow-2xl shadow-purple-600/50 hover:shadow-purple-500/60 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                                <Search className="w-6 h-6 animate-pulse" />
                                <span className="relative z-10">Find Stranger</span>
                            </button>
                        ) : (
                            <div className="flex gap-3 sm:gap-4">
                                <button
                                    onClick={() => handleEndCall(true)}
                                    className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 active:scale-95 transition-all duration-300 backdrop-blur-xl"
                                    title="End call"
                                >
                                    <PhoneOff className="w-6 h-6" />
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                                </button>

                                <button
                                    onClick={handleNext}
                                    className="group relative px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-white to-gray-100 text-black font-black text-lg sm:text-xl shadow-2xl shadow-white/20 hover:shadow-white/30 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10">Next</span>
                                    <SkipForward className="w-5 h-5 fill-current relative z-10" />
                                </button>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};


export default RandomVideoPage;
