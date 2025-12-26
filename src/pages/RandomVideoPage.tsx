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
    SwitchCamera
} from 'lucide-react';
import { useRandomCall } from '../contexts/RandomCallContext';

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
            alert('The stranger disconnected.');
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

        setStatus('idle');
        setPartnerName('Stranger');
        setRandomCallIdle();
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
        if (!localStream) return;

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        console.log('Switching camera to:', newFacingMode);

        try {
            // Get new video stream
            const constraints = {
                video: {
                    facingMode: newFacingMode
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newVideoTrack = newStream.getVideoTracks()[0];

            // Update local stream state
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) oldVideoTrack.stop();

            const newLocalStream = new MediaStream([
                newVideoTrack,
                ...localStream.getAudioTracks()
            ]);

            setLocalStream(newLocalStream);

            // Force update local video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newLocalStream;
            }

            // Replace track in PeerConnection sender
            if (peerConnection.current) {
                const senders = peerConnection.current.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(newVideoTrack);
                }
            }

            setFacingMode(newFacingMode);

        } catch (err) {
            console.error('Error switching camera:', err);
            // Fallback: try without exact constraint or just log error
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="z-10 w-full max-w-6xl flex flex-col gap-3 sm:gap-6">

                {/* Header */}
                <div className="text-center mb-2 sm:mb-4">
                    <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Random Connect
                    </h1>
                    <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Meet new people from around the world instantly.</p>
                </div>

                {/* Video Area */}
                <div
                    ref={containerRef}
                    className="relative w-full aspect-video bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl ring-1 ring-white/5"
                    style={{ touchAction: 'none' }}
                >

                    {/* Remote Video (Main or PiP) */}
                    <motion.div
                        layout
                        drag={isSwapped}
                        dragConstraints={containerRef}
                        dragElastic={0.1}
                        whileDrag={{ scale: 1.05 }}
                        onClick={() => isSwapped && setIsSwapped(false)}
                        className={isSwapped
                            ? "absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6 w-24 sm:w-32 md:w-48 lg:w-64 aspect-video bg-black/80 rounded-lg sm:rounded-xl overflow-hidden border border-white/20 z-20 shadow-xl cursor-grab active:cursor-grabbing"
                            : "absolute inset-0 w-full h-full z-0"
                        }
                    >
                        {status === 'connected' ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                                onLoadedMetadata={(e) => {
                                    // Ensure video plays on mobile
                                    const video = e.currentTarget;
                                    video.play().catch(err => console.log('Remote video autoplay prevented:', err));
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-black/80">
                                {status === 'searching' ? (
                                    <div className="flex flex-col items-center animate-pulse">
                                        <Search className="w-8 h-8 sm:w-12 sm:h-12 mb-2 text-purple-500" />
                                        <p className="text-sm sm:text-lg font-medium text-purple-300">Looking...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <User className="w-8 h-8 sm:w-12 sm:h-12 mb-2 opacity-50" />
                                        <p className="text-sm sm:text-lg">Waiting</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {isSwapped && status === 'connected' && (
                            <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/50 rounded text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-[150px]">
                                {partnerName}
                            </div>
                        )}
                    </motion.div>

                    {/* Local Video (PiP or Main) */}
                    <motion.div
                        layout
                        drag={!isSwapped}
                        dragConstraints={containerRef}
                        dragElastic={0.1}
                        whileDrag={{ scale: 1.05 }}
                        onClick={() => !isSwapped && setIsSwapped(true)}
                        className={!isSwapped
                            ? "absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 w-24 sm:w-32 md:w-48 lg:w-64 aspect-video bg-black/60 rounded-lg sm:rounded-xl overflow-hidden border border-white/20 z-20 shadow-xl cursor-grab active:cursor-grabbing"
                            : "absolute inset-0 w-full h-full z-0"
                        }
                    >
                        {!isVideoOff ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                                onLoadedMetadata={(e) => {
                                    // Ensure video plays on mobile
                                    const video = e.currentTarget;
                                    video.play().catch(err => console.log('Local video autoplay prevented:', err));
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <VideoOff className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                            </div>
                        )}
                        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/50 rounded text-[10px] sm:text-xs font-medium">
                            You
                        </div>
                    </motion.div>

                    {/* Status Badge */}
                    <div className="absolute top-3 sm:top-4 md:top-6 left-1/2 -translate-x-1/2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5 sm:gap-2 z-30 pointer-events-none">
                        <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'searching' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="font-medium text-[10px] sm:text-sm">
                            {status === 'connected' ? `Connected: ${partnerName}` : status === 'searching' ? 'Searching...' : 'Idle'}
                        </span>
                    </div>

                </div>

                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2 sm:mt-4">

                    <button
                        onClick={toggleMute}
                        className={`p-3 sm:p-4 rounded-full transition-all duration-300 touch-manipulation ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 sm:p-4 rounded-full transition-all duration-300 touch-manipulation ${isVideoOff ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                        aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                    >
                        {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <button
                        onClick={switchCamera}
                        className="p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 touch-manipulation md:hidden"
                        title="Switch Camera"
                        aria-label="Switch Camera"
                    >
                        <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {status === 'idle' ? (
                        <button
                            onClick={handleStartSearch}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-base sm:text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95 flex items-center gap-2 touch-manipulation"
                        >
                            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="whitespace-nowrap">Find Stranger</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleEndCall(true)}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-red-500 rounded-full font-bold text-base sm:text-lg hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 transition-all active:scale-95 flex items-center gap-2 touch-manipulation"
                        >
                            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="whitespace-nowrap">{status === 'searching' ? 'Cancel' : 'End Call'}</span>
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};


export default RandomVideoPage;
