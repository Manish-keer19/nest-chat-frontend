import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    SkipForward,
    Loader2
} from 'lucide-react';
import { useRandomCall } from '../contexts/RandomCallContext';
import { toast, Toaster } from 'sonner';
import { useConnectionQuality } from '../hooks/useConnectionQuality';
import { ConnectionQualityIndicator } from '../components/ConnectionQualityIndicator';

// Enhanced RTC Configuration with TURN servers for international connectivity
// TURN servers are CRITICAL for connections between different countries/networks
const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        // STUN servers - for discovering public IP addresses
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ]
        },
        // TURN servers - for relaying media when direct connection fails
        // These are essential for international calls and restrictive networks
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
    // Optimize ICE gathering and connection establishment
    iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    bundlePolicy: 'max-bundle', // Bundle all media on single transport
    rtcpMuxPolicy: 'require', // Multiplex RTP and RTCP on same port
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
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localPipVideoRef = useRef<HTMLVideoElement>(null);
    const remotePipVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const [isSwapped, setIsSwapped] = useState(false);
    const [isDragging] = useState(false);
    const [searchAttempts, setSearchAttempts] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Connection quality monitoring
    const connectionStats = useConnectionQuality(socket, peerConnection.current);

    // Initialize Socket
    useEffect(() => {
        
        const newSocket = io(`/random-chat`, {
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

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(err => {
                console.error('Error playing local video:', err);
            });
        }
    }, [localStream]);

    // Attach remote stream to video element
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            console.log('Attaching remote stream to video element');
            remoteVideoRef.current.srcObject = remoteStream;

            // Force play with error handling
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Remote video playing successfully');
                    })
                    .catch(err => {
                        console.error('Error playing remote video:', err);
                        // Retry after a short delay
                        setTimeout(() => {
                            if (remoteVideoRef.current) {
                                remoteVideoRef.current.play().catch(console.error);
                            }
                        }, 500);
                    });
            }
        }
    }, [remoteStream]);

    // Attach streams to PiP video elements
    useEffect(() => {
        if (localPipVideoRef.current && localStream) {
            localPipVideoRef.current.srcObject = localStream;
            localPipVideoRef.current.play().catch(console.error);
        }
    }, [localStream]);

    useEffect(() => {
        if (remotePipVideoRef.current && remoteStream) {
            remotePipVideoRef.current.srcObject = remoteStream;
            remotePipVideoRef.current.play().catch(console.error);
        }
    }, [remoteStream]);

    // Auto-hide controls functionality
    useEffect(() => {
        const resetControlsTimer = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000); // Hide after 3 seconds
        };

        // Show controls on any interaction
        const handleInteraction = () => {
            resetControlsTimer();
        };

        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        window.addEventListener('click', handleInteraction);

        // Initial timer
        resetControlsTimer();

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('click', handleInteraction);
        };
    }, []);

    // WebRTC & Socket Events
    useEffect(() => {
        if (!socket) return;

        socket.on('waiting-for-partner', (data: { queuePosition?: number }) => {
            setStatus('searching');
            setRandomCallSearching();
            if (data.queuePosition) {
                toast.info(`Searching... Position in queue: ${data.queuePosition}`, {
                    duration: 2000,
                    position: 'top-center',
                });
            }
        });

        // Handle rate limiting
        socket.on('rate-limited', (data: { message: string; retryAfter: number }) => {
            toast.warning(data.message, {
                duration: 2000,
                position: 'top-center',
            });
        });

        // Handle partner quality issues
        socket.on('partner-quality-poor', (data: { message: string }) => {
            toast.warning(data.message, {
                duration: 3000,
                position: 'top-center',
            });
        });

        socket.on('match-found', async ({ role, partnerName }) => {
            console.log('Match found! Role:', role, 'Partner:', partnerName);
            setStatus('connected');
            setPartnerName(partnerName);
            setRandomCallActive(partnerName);

            // Create PeerConnection
            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerConnection.current = pc;

            // Add local tracks
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    console.log('Adding track to peer connection:', track.kind);
                    pc.addTrack(track, localStream);
                });
            } else {
                console.warn('No local stream available when creating peer connection');
            }

            // Handle remote tracks
            pc.ontrack = (event) => {
                console.log('ontrack event received:', event.track.kind);
                const [remote] = event.streams;
                if (remote) {
                    console.log('Setting remote stream with tracks:', remote.getTracks().length);
                    setRemoteStream(remote);
                } else {
                    console.error('No remote stream in ontrack event');
                }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal-ice-candidate', { candidate: event.candidate });
                }
            };

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState);
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    toast.error('Connection issue detected', {
                        duration: 2000,
                        position: 'top-center',
                    });
                }
            };

            // Handle ICE connection state
            pc.oniceconnectionstatechange = () => {
                console.log('🔌 ICE connection state:', pc.iceConnectionState);

                // Log detailed connection info for debugging
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    console.log('✅ WebRTC connection established successfully!');

                    // Log which ICE candidate pair was selected (useful for debugging TURN usage)
                    pc.getStats(null).then(stats => {
                        stats.forEach(report => {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                console.log('🎯 Active ICE candidate pair:', {
                                    local: report.localCandidateId,
                                    remote: report.remoteCandidateId,
                                    nominated: report.nominated,
                                });
                            }
                            if (report.type === 'local-candidate' && report.candidateType === 'relay') {
                                console.log('🔄 Using TURN relay server:', report.address);
                            }
                        });
                    });
                } else if (pc.iceConnectionState === 'failed') {
                    console.error('❌ ICE connection failed - may need better TURN servers');
                } else if (pc.iceConnectionState === 'disconnected') {
                    console.warn('⚠️ ICE connection disconnected - attempting to reconnect');
                }
            };

            // Handle ICE gathering state (useful for debugging)
            pc.onicegatheringstatechange = () => {
                console.log('📡 ICE gathering state:', pc.iceGatheringState);
                if (pc.iceGatheringState === 'complete') {
                    console.log('✅ ICE candidate gathering completed');
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

        // Handle single ICE candidate (backward compatibility)
        socket.on('signal-ice-candidate', async ({ candidate }) => {
            const pc = peerConnection.current;
            if (!pc) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        });

        // Handle batched ICE candidates (optimized)
        socket.on('signal-ice-candidates-batch', async ({ candidates }) => {
            const pc = peerConnection.current;
            if (!pc) return;

            console.log(`Received ${candidates.length} ICE candidates in batch`);

            // Add all candidates in parallel
            const promises = candidates.map((candidate: RTCIceCandidateInit) =>
                pc.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(err => console.error('Error adding batched ICE candidate:', err))
            );

            await Promise.allSettled(promises);
        });

        // Acknowledgment handlers (for monitoring)
        socket.on('signal-offer-ack', () => {
            console.log('Offer acknowledged by server');
        });

        socket.on('signal-answer-ack', () => {
            console.log('Answer acknowledged by server');
        });

        socket.on('match-ended', (data: { reason?: string }) => {
            setStatus('idle');
            setRandomCallIdle();
            handleEndCall(false); // Don't notify server, they told us

            const message = data.reason === 'partner_disconnected'
                ? '👋 The stranger disconnected'
                : '📞 Call ended';

            toast.error(message, {
                duration: 3000,
                position: 'top-center',
            });
        });

        // Handle socket reconnection
        socket.on('reconnect', () => {
            setIsReconnecting(false);
            toast.success('Reconnected successfully!', {
                duration: 2000,
                position: 'top-center',
            });
        });

        socket.on('reconnect_attempt', () => {
            setIsReconnecting(true);
        });

        socket.on('reconnect_failed', () => {
            setIsReconnecting(false);
            toast.error('Failed to reconnect. Please refresh the page.', {
                duration: 5000,
                position: 'top-center',
            });
        });

        return () => {
            socket.off('waiting-for-partner');
            socket.off('match-found');
            socket.off('signal-offer');
            socket.off('signal-answer');
            socket.off('signal-ice-candidate');
            socket.off('signal-ice-candidates-batch');
            socket.off('signal-offer-ack');
            socket.off('signal-answer-ack');
            socket.off('match-ended');
            socket.off('rate-limited');
            socket.off('partner-quality-poor');
            socket.off('reconnect');
            socket.off('reconnect_attempt');
            socket.off('reconnect_failed');
        };
    }, [socket, localStream, setRandomCallActive, setRandomCallSearching, setRandomCallIdle]);

    const handleStartSearch = () => {
        if (!socket) {
            toast.error('Connection not established. Please refresh.', {
                duration: 3000,
                position: 'top-center',
            });
            return;
        }

        setStatus('searching');
        setRandomCallSearching();
        setSearchAttempts(prev => prev + 1);

        // Show encouraging message after multiple attempts
        if (searchAttempts > 3) {
            toast.info('Still searching... Hang tight! 🔍', {
                duration: 2000,
                position: 'top-center',
            });
        }

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

        // Show transition feedback
        toast.info('Finding next stranger...', {
            duration: 1500,
            position: 'top-center',
        });

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

                {/* Header / Top Bar with Auto-hide */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-6 flex justify-between items-start bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none"
                        >
                            <div className="pointer-events-auto space-y-2">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.4)] animate-gradient">
                                    Random Connect
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border transition-all duration-300 shadow-lg
                                        ${status === 'connected' ? 'border-green-500/50 bg-green-500/10' : status === 'searching' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20'}
                                    `}>
                                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${status === 'connected' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse' : status === 'searching' ? 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.8)] animate-pulse' : 'bg-gray-500'}`} />
                                        <span className="text-xs sm:text-sm font-semibold text-white/95">
                                            {status === 'connected' ? `🎯 ${partnerName}` : status === 'searching' ? '🔍 Searching...' : '⏸️ Idle'}
                                        </span>
                                    </div>

                                    {/* Connection Quality Indicator */}
                                    {status === 'connected' && (
                                        <ConnectionQualityIndicator
                                            quality={connectionStats.quality}
                                            latency={connectionStats.latency}
                                            packetLoss={connectionStats.packetLoss}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Reconnection Indicator */}
                            {isReconnecting && (
                                <div className="pointer-events-auto">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 backdrop-blur-xl border border-orange-500/50 shadow-lg">
                                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                                        <span className="text-xs font-semibold text-orange-300">Reconnecting...</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Video Area - Optimized for Performance */}
                <div
                    ref={containerRef}
                    className="relative w-full h-full sm:rounded-3xl overflow-hidden bg-gray-900"
                    style={{ touchAction: 'none' }}
                >
                    {/* Remote Video Element - With Smooth Layout Animation */}
                    <motion.div
                        layout
                        layoutId="remote-video"
                        initial={false}
                        animate={{
                            zIndex: isSwapped ? 20 : 0,
                        }}
                        whileHover={isSwapped ? { scale: 1.05 } : {}}
                        whileTap={isSwapped ? { scale: 0.95 } : {}}
                        transition={{
                            layout: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                            },
                            scale: {
                                type: 'spring',
                                stiffness: 400,
                                damping: 25,
                            },
                        }}
                        className={`absolute ${isSwapped
                            ? 'bottom-36 right-3 w-[100px] h-[150px] sm:bottom-40 sm:right-6 sm:w-[140px] sm:h-[105px] md:w-[200px] md:h-[133px] lg:w-[240px] lg:h-[160px] rounded-2xl shadow-2xl border-2 cursor-pointer'
                            : 'inset-0 w-full h-full'
                            }`}
                        style={{
                            borderColor: isSwapped ? 'rgba(168, 85, 247, 0.5)' : 'transparent',
                        }}
                        onClick={() => isSwapped && !isDragging && setIsSwapped(!isSwapped)}
                    >
                        {remoteStream ? (
                            <motion.video
                                ref={el => {
                                    if (el && remoteStream && el.srcObject !== remoteStream) {
                                        el.srcObject = remoteStream;
                                        el.play().catch(() => { });
                                    }
                                }}
                                autoPlay
                                playsInline
                                layout
                                className={`w-full h-full object-cover bg-black ${isSwapped ? 'rounded-2xl' : ''}`}
                            />
                        ) : (
                            // Placeholder when no remote stream
                            <div className={`w-full h-full flex flex-col items-center justify-center bg-black/80 ${isSwapped ? 'rounded-2xl' : ''}`}>
                                {status === 'searching' ? (
                                    <div className="flex flex-col items-center scale-75 sm:scale-100">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-ping"></div>
                                            <Search className="relative w-12 h-12 text-purple-400 animate-pulse" />
                                        </div>
                                        {!isSwapped && (
                                            <div className="text-center space-y-2">
                                                <p className="text-xl font-medium text-purple-200">Looking for someone...</p>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center scale-75 sm:scale-100">
                                        <User className="w-16 h-16 mb-4 opacity-20" />
                                        {!isSwapped && (
                                            <div className="text-center space-y-2">
                                                <p className="text-2xl font-semibold opacity-80">Ready?</p>
                                                <p className="text-sm opacity-50">Click "Find Stranger"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pulsing hint border for PiP - Remote */}
                        {isSwapped && (
                            <motion.div
                                className="absolute inset-0 rounded-2xl border-2 border-purple-400/50 pointer-events-none"
                                animate={{
                                    opacity: [0.3, 0.6, 0.3],
                                    scale: [1, 1.02, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        )}

                        {/* Overlay label when in PiP */}
                        <AnimatePresence>
                            {isSwapped && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold border border-white/20 text-center pointer-events-none"
                                >
                                    {partnerName}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tap hint icon - Remote */}
                        {isSwapped && status === 'connected' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{
                                    duration: 2,
                                    repeat: 3,
                                    delay: 1,
                                }}
                                className="absolute top-2 right-2 bg-purple-500/80 backdrop-blur-sm rounded-full p-1.5 pointer-events-none"
                            >
                                <SwitchCamera className="w-3 h-3 text-white" />
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Local Video Element - With Smooth Layout Animation */}
                    <motion.div
                        layout
                        layoutId="local-video"
                        initial={false}
                        animate={{
                            zIndex: !isSwapped ? 20 : 0,
                        }}
                        whileHover={!isSwapped ? { scale: 1.05 } : {}}
                        whileTap={!isSwapped ? { scale: 0.95 } : {}}
                        transition={{
                            layout: {
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                            },
                            scale: {
                                type: 'spring',
                                stiffness: 400,
                                damping: 25,
                            },
                        }}
                        className={`absolute ${!isSwapped
                            ? 'bottom-36 right-3 w-[100px] h-[150px] sm:bottom-40 sm:right-6 sm:w-[140px] sm:h-[105px] md:w-[200px] md:h-[133px] lg:w-[240px] lg:h-[160px] rounded-2xl shadow-2xl border-2 cursor-pointer'
                            : 'inset-0 w-full h-full'
                            }`}
                        style={{
                            borderColor: !isSwapped ? 'rgba(168, 85, 247, 0.5)' : 'transparent',
                        }}
                        onClick={() => !isDragging && setIsSwapped(!isSwapped)}
                    >
                        {/* Pulsing hint border for PiP */}
                        {!isSwapped && (
                            <motion.div
                                className="absolute inset-0 rounded-2xl border-2 border-purple-400/50 pointer-events-none"
                                animate={{
                                    opacity: [0.3, 0.6, 0.3],
                                    scale: [1, 1.02, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        )}

                        {localStream && !isVideoOff ? (
                            <motion.video
                                ref={el => {
                                    if (el && localStream && el.srcObject !== localStream) {
                                        el.srcObject = localStream;
                                        el.play().catch(() => { });
                                    }
                                }}
                                autoPlay
                                muted
                                playsInline
                                layout
                                className={`w-full h-full object-cover transform scale-x-[-1] bg-black ${!isSwapped ? 'rounded-2xl' : ''}`}
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gray-900 ${!isSwapped ? 'rounded-2xl' : ''}`}>
                                <VideoOff className="w-8 h-8 text-gray-400" />
                            </div>
                        )}

                        {/* Overlay label when in PiP */}
                        <AnimatePresence>
                            {!isSwapped && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold border border-white/20 text-center pointer-events-none"
                                >
                                    You
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tap hint icon */}
                        {!isSwapped && status === 'connected' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{
                                    duration: 2,
                                    repeat: 3,
                                    delay: 1,
                                }}
                                className="absolute top-2 right-2 bg-purple-500/80 backdrop-blur-sm rounded-full p-1.5 pointer-events-none"
                            >
                                <SwitchCamera className="w-3 h-3 text-white" />
                            </motion.div>
                        )}
                    </motion.div>
                </div>



                {/* Enhanced Controls Bar with Auto-hide */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col items-center gap-6 z-30 pb-8 sm:pb-10"
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>

    );
};


export default RandomVideoPage;
