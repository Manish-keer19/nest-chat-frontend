import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// WebRTC Configuration
const RTC_CONFIGURATION: RTCConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302',
        },
        {
            urls: 'stun:stun1.l.google.com:19302',
        },
        // Add TURN server for production
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password',
        // },
    ],
    iceCandidatePoolSize: 10,
};

export interface CallParticipant {
    userId: string;
    username: string;
    avatarUrl?: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
}

export interface ActiveCall {
    callId: string;
    callType: 'AUDIO_1TO1' | 'VIDEO_1TO1' | 'AUDIO_GROUP' | 'VIDEO_GROUP';
    initiator?: CallParticipant;
    participants: CallParticipant[];
    status: 'calling' | 'ringing' | 'active' | 'ended';
    conversationId?: string;
}

export interface IncomingCall {
    callId: string;
    callType: 'AUDIO_1TO1' | 'VIDEO_1TO1' | 'AUDIO_GROUP' | 'VIDEO_GROUP';
    initiator: CallParticipant;
    conversationId?: string;
}

export const useWebRTC = (userId: string, username: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Refs to avoid stale closures
    const localStreamRef = useRef<MediaStream | null>(null);
    const activeCallRef = useRef<ActiveCall | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Peer connections for each participant (userId -> RTCPeerConnection)
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const pendingOffers = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());

    /**
     * Initialize Socket.IO connection
     */
    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const newSocket = io(`${API_URL}/call`, {
            transports: ['websocket'],
            auth: {
                token: localStorage.getItem('token'),
            },
        });

        newSocket.on('connect', () => {
            console.log('Connected to call namespace');
            newSocket.emit('identify', { userId, username });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [userId, username]);

    /**
     * Setup socket event listeners
     */
    useEffect(() => {
        if (!socket) return;

        // Incoming call
        socket.on('call:incoming', (data: IncomingCall) => {
            console.log('Incoming call:', data);
            setIncomingCall(data);
        });

        // Call accepted
        socket.on('call:accepted', ({ username, userId: acceptedUserId }) => {
            console.log('Call accepted by:', username);
            setActiveCall((prev) => {
                if (!prev) return null;
                // Add user to participants if needed
                const exists = prev.participants.find(p => p.userId === acceptedUserId);
                const newParticipants = exists ? prev.participants : [...prev.participants, { userId: acceptedUserId, username }];
                return {
                    ...prev,
                    status: 'active',
                    participants: newParticipants
                };
            });

            // If we are already in the call (and not the one connecting), initiate connection to the new participant
            if (acceptedUserId !== userId) {
                console.log(`User ${username} joined. Initiating connection.`);
                createPeerConnection(acceptedUserId, true);
            }
        });

        // Call rejected
        socket.on('call:rejected', ({ userId: rejectedUserId, reason }) => {
            console.log('Call rejected by:', rejectedUserId, reason);
            setActiveCall(null);
            cleanupCall();
        });

        // Call ended
        socket.on('call:ended', ({ endedBy, duration }) => {
            console.log('Call ended by:', endedBy, 'Duration:', duration);
            setActiveCall(null);
            cleanupCall();
        });

        // WebRTC Signaling: Receive offer
        socket.on('call:offer', async ({ fromUserId, offer }) => {
            console.log('Received offer from:', fromUserId);
            pendingOffers.current.set(fromUserId, offer);

            // If call is already active, process immediately
            if (activeCallRef.current?.status === 'active') {
                handleReceiveOffer(fromUserId, offer);
            } else {
                console.log('Stored offer from:', fromUserId, 'Will process after accepting call');
            }
        });

        // WebRTC Signaling: Receive answer
        socket.on('call:answer', async ({ fromUserId, answer }) => {
            console.log('Received answer from:', fromUserId);
            await handleReceiveAnswer(fromUserId, answer);
        });

        // WebRTC Signaling: Receive ICE candidate
        socket.on('call:ice-candidate', async ({ fromUserId, candidate }) => {
            console.log('Received ICE candidate from:', fromUserId);
            await handleReceiveIceCandidate(fromUserId, candidate);
        });

        // Participant muted
        socket.on('call:participant-muted', ({ userId: mutedUserId, isMuted }) => {
            console.log('Participant muted:', mutedUserId, isMuted);
            // Update UI to show muted status
        });

        // Participant video toggled
        socket.on('call:participant-video-toggled', ({ userId: toggledUserId, isVideoOff }) => {
            console.log('Participant video toggled:', toggledUserId, isVideoOff);
            // Update UI to show video status
        });

        // Group call: participant joined
        socket.on('group-call:participant-joined', ({ participant, allParticipants }) => {
            console.log('Participant joined:', participant);
            setActiveCall((prev) =>
                prev
                    ? {
                        ...prev,
                        participants: allParticipants,
                    }
                    : null
            );
            // Establish peer connection with new participant
            if (participant.userId !== userId) {
                createPeerConnection(participant.userId, true);
            }
        });

        // Group call: participant left
        socket.on('group-call:participant-left', ({ userId: leftUserId }) => {
            console.log('Participant left:', leftUserId);
            closePeerConnection(leftUserId);
        });

        return () => {
            socket.off('call:incoming');
            socket.off('call:accepted');
            socket.off('call:rejected');
            socket.off('call:ended');
            socket.off('call:offer');
            socket.off('call:answer');
            socket.off('call:ice-candidate');
            socket.off('call:participant-muted');
            socket.off('call:participant-video-toggled');
            socket.off('group-call:participant-joined');
            socket.off('group-call:participant-left');
        };
    }, [socket, userId]);

    /**
     * Get user media (camera/microphone)
     */
    const getUserMedia = async (isVideo: boolean) => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: isVideo
                    ? {
                        width: { min: 640, ideal: 1920, max: 1920 },
                        height: { min: 400, ideal: 1080, max: 1080 },
                        aspectRatio: { ideal: 1.7777777778 }, // 16:9
                        frameRate: { min: 15, ideal: 30, max: 60 },
                    }
                    : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    };

    /**
     * Create and send offer
     */
    const createAndSendOffer = async (participantUserId: string, pc: RTCPeerConnection, callId?: string) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log('Created offer for:', participantUserId);

            const currentCallId = callId || activeCallRef.current?.callId;

            if (socketRef.current && currentCallId) {
                console.log('Sending offer to backend, callId:', currentCallId);
                socketRef.current.emit('call:offer', {
                    callId: currentCallId,
                    targetUserId: participantUserId,
                    offer: { type: offer.type, sdp: offer.sdp },
                });
            } else {
                console.error('Cannot send offer - socket or callId missing', { socket: !!socketRef.current, callId: currentCallId });
            }
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    /**
     * Create peer connection for a participant
     */
    const createPeerConnection = useCallback(
        (participantUserId: string, isInitiator: boolean, stream?: MediaStream, callId?: string) => {
            if (peerConnections.current.has(participantUserId)) {
                return peerConnections.current.get(participantUserId)!;
            }

            const pc = new RTCPeerConnection(RTC_CONFIGURATION);

            // Use provided stream or fall back to localStreamRef
            const mediaStream = stream || localStreamRef.current;

            // Add local stream tracks
            if (mediaStream) {
                console.log('Adding tracks to peer connection for:', participantUserId);
                mediaStream.getTracks().forEach((track) => {
                    console.log('Adding track:', track.kind, track.label);
                    pc.addTrack(track, mediaStream);
                });
            } else {
                console.warn('No media stream available when creating peer connection');
            }

            // Handle incoming tracks
            pc.ontrack = (event) => {
                console.log('Received remote track from:', participantUserId, event.track.kind);
                const [remoteStream] = event.streams;
                setRemoteStreams((prev) => new Map(prev).set(participantUserId, remoteStream));
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current && (callId || activeCallRef.current)) {
                    socketRef.current.emit('call:ice-candidate', {
                        callId: callId || activeCallRef.current!.callId,
                        targetUserId: participantUserId,
                        candidate: event.candidate.toJSON(),
                    });
                }
            };

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState, 'for', participantUserId);
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    closePeerConnection(participantUserId);
                }
            };

            peerConnections.current.set(participantUserId, pc);

            // If initiator, create and send offer
            if (isInitiator) {
                createAndSendOffer(participantUserId, pc, callId);
            }

            return pc;
        },
        [] // Depend only on refs (stable)
    );

    /**
     * Handle received offer
     */
    const handleReceiveOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit, stream?: MediaStream, callId?: string) => {
        try {
            console.log('Handling offer from:', fromUserId);
            const mediaStream = stream || localStreamRef.current;
            console.log('Local stream available:', !!mediaStream);
            console.log('Local stream tracks:', mediaStream?.getTracks().length);

            // Use passed callId or fallback to activeCallRef
            const currentCallId = callId || activeCallRef.current?.callId;

            const pc = createPeerConnection(fromUserId, false, mediaStream || undefined, currentCallId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Process queued ICE candidates
            const queuedCandidates = iceCandidateQueue.current.get(fromUserId) || [];
            for (const candidate of queuedCandidates) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueue.current.delete(fromUserId);

            // Create and send answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('Created answer for:', fromUserId);

            if (socket && currentCallId) {
                socket.emit('call:answer', {
                    callId: currentCallId,
                    targetUserId: fromUserId,
                    answer: { type: answer.type, sdp: answer.sdp },
                });
            }
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    };

    /**
     * Handle received answer
     */
    const handleReceiveAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
        try {
            const pc = peerConnections.current.get(fromUserId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));

                // Process queued ICE candidates
                const queuedCandidates = iceCandidateQueue.current.get(fromUserId) || [];
                for (const candidate of queuedCandidates) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                iceCandidateQueue.current.delete(fromUserId);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    };

    /**
     * Handle received ICE candidate
     */
    const handleReceiveIceCandidate = async (
        fromUserId: string,
        candidate: RTCIceCandidateInit
    ) => {
        try {
            const pc = peerConnections.current.get(fromUserId);
            if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                // Queue candidate if remote description not set yet
                const queue = iceCandidateQueue.current.get(fromUserId) || [];
                queue.push(candidate);
                iceCandidateQueue.current.set(fromUserId, queue);
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    };

    /**
     * Close peer connection
     */
    const closePeerConnection = (participantUserId: string) => {
        const pc = peerConnections.current.get(participantUserId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(participantUserId);
        }
        setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(participantUserId);
            return newMap;
        });
    };

    /**
     * Initiate a call
     */
    const initiateCall = async (
        recipientIds: string[],
        callType: 'AUDIO_1TO1' | 'VIDEO_1TO1' | 'AUDIO_GROUP' | 'VIDEO_GROUP',
        conversationId?: string
    ) => {
        if (!socket) {
            throw new Error('Socket not connected');
        }

        try {
            // Get user media
            const isVideo = callType.includes('VIDEO');
            const stream = await getUserMedia(isVideo);

            // Emit initiate call event
            socket.emit(
                'call:initiate',
                {
                    recipientIds,
                    callType,
                    conversationId,
                },
                (response: any) => {
                    if (response.error) {
                        throw new Error(response.error);
                    }

                    setActiveCall({
                        callId: response.call.callId,
                        callType,
                        participants: response.call.participants,
                        status: 'calling',
                        conversationId,
                    });

                    // For 1-to-1 calls, immediately create peer connection with the stream and callId
                    if (callType.includes('1TO1') && recipientIds.length === 1) {
                        createPeerConnection(recipientIds[0], true, stream, response.call.callId);
                    }
                }
            );
        } catch (error) {
            console.error('Error initiating call:', error);
            throw error;
        }
    };

    /**
     * Accept incoming call
     */
    const acceptCall = async () => {
        if (!socket || !incomingCall) {
            return;
        }

        try {
            // Get user media FIRST
            const isVideo = incomingCall.callType.includes('VIDEO');
            const stream = await getUserMedia(isVideo);

            console.log('Got media stream, now processing call');

            // Emit accept event
            socket.emit('call:accept', { callId: incomingCall.callId }, (response: any) => {
                if (response.error) {
                    throw new Error(response.error);
                }

                setActiveCall({
                    callId: incomingCall.callId,
                    callType: incomingCall.callType,
                    initiator: incomingCall.initiator,
                    participants: [incomingCall.initiator],
                    status: 'active',
                    conversationId: incomingCall.conversationId,
                });

                setIncomingCall(null);

                // Now process the pending offer with the stream
                const pendingOffer = pendingOffers.current.get(incomingCall.initiator.userId);
                if (pendingOffer) {
                    console.log('Processing pending offer from:', incomingCall.initiator.userId);
                    pendingOffers.current.delete(incomingCall.initiator.userId);
                    handleReceiveOffer(incomingCall.initiator.userId, pendingOffer, stream, incomingCall.callId);
                } else {
                    console.warn('No pending offer found for:', incomingCall.initiator.userId);
                    // Fallback: create peer connection anyway
                    createPeerConnection(incomingCall.initiator.userId, false, stream, incomingCall.callId);
                }
            });
        } catch (error) {
            console.error('Error accepting call:', error);
            throw error;
        }
    };

    /**
     * Reject incoming call
     */
    const rejectCall = (reason?: string) => {
        if (!socket || !incomingCall) {
            return;
        }

        socket.emit('call:reject', {
            callId: incomingCall.callId,
            reason,
        });

        setIncomingCall(null);
    };

    /**
     * End active call
     */
    const endCall = () => {
        console.log('[WebRTC] Ending call...', { hasSocket: !!socket, hasActiveCall: !!activeCall });

        if (!socket || !activeCall) {
            console.warn('[WebRTC] Cannot end call - missing socket or activeCall');
            // Still cleanup local resources even if socket is missing
            cleanupCall();
            return;
        }

        if (activeCall.callType.includes('GROUP')) {
            socket.emit('group-call:leave', { callId: activeCall.callId });
        } else {
            socket.emit('call:end', { callId: activeCall.callId });
        }

        cleanupCall();
        console.log('[WebRTC] Call ended and cleaned up');
    };

    /**
     * Toggle mute
     */
    const toggleMute = () => {
        if (!localStream || !socket || !activeCall) {
            return;
        }

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);

            socket.emit('call:toggle-mute', {
                callId: activeCall.callId,
                isMuted: !audioTrack.enabled,
            });
        }
    };

    /**
     * Toggle video
     */
    const toggleVideo = () => {
        if (!localStream || !socket || !activeCall) {
            return;
        }

        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);

            socket.emit('call:toggle-video', {
                callId: activeCall.callId,
                isVideoOff: !videoTrack.enabled,
            });
        }
    };

    /**
     * Toggle screen share
     */
    const toggleScreenShare = async () => {
        if (!socket || !activeCall) return;

        try {
            if (isScreenSharing) {
                // Stop screen share and revert to camera
                const stream = await getUserMedia(!isVideoOff);
                const videoTrack = stream.getVideoTracks()[0];

                if (localStream) {
                    // Stop screen share track
                    const screenTrack = localStream.getVideoTracks()[0];
                    screenTrack.stop();

                    // Add camera track to local stream
                    localStream.removeTrack(screenTrack);
                    localStream.addTrack(videoTrack);
                    setLocalStream(new MediaStream([videoTrack, ...localStream.getAudioTracks()]));
                }

                // Replace track in all peer connections
                peerConnections.current.forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                setIsScreenSharing(false);
            } else {
                // Start screen share
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const screenTrack = stream.getVideoTracks()[0];

                // Handle user stopping screen share via browser UI
                screenTrack.onended = () => {
                    if (isScreenSharing) toggleScreenShare();
                };

                if (localStream) {
                    // Stop camera track
                    localStream.getVideoTracks().forEach(track => track.stop());

                    // Add screen track to local stream
                    const audioTracks = localStream.getAudioTracks();
                    setLocalStream(new MediaStream([screenTrack, ...audioTracks]));
                } else {
                    setLocalStream(stream);
                }

                // Replace track in all peer connections
                peerConnections.current.forEach(async (pc, participantId) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    } else {
                        // If no video sender (e.g. audio only call), add track
                        pc.addTrack(screenTrack, localStream!);
                        await createAndSendOffer(participantId, pc);
                    }
                });

                setIsScreenSharing(true);
            }
        } catch (error) {
            console.error('Error toggling screen share:', error);
        }
    };

    /**
     * Switch Camera (Front/Rear)
     */
    const switchCamera = async () => {
        if (!localStream || isScreenSharing || isVideoOff) return;

        try {
            const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
            console.log('Switching camera to:', newFacingMode);

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { exact: newFacingMode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                }
            };

            let newStream: MediaStream;
            try {
                newStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                // Fallback without exact constraint if it fails (e.g. on desktop)
                console.warn('Exact facing mode failed, trying loose constraint', e);
                const looseConstraints: MediaStreamConstraints = {
                    video: {
                        facingMode: newFacingMode,
                    }
                };
                newStream = await navigator.mediaDevices.getUserMedia(looseConstraints);
            }

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Stop old video track
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                oldVideoTrack.stop();
                localStream.removeTrack(oldVideoTrack);
            }

            // Add new track to local stream
            localStream.addTrack(newVideoTrack);

            // Force state update to refresh local video element
            setLocalStream(new MediaStream(localStream.getTracks()));

            // Replace track in all peer connections
            peerConnections.current.forEach((pc) => {
                const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newVideoTrack);
                }
            });

            setFacingMode(newFacingMode);

        } catch (error) {
            console.error('Error switching camera:', error);
            // Optionally show user feedback
        }
    };

    /**
     * Cleanup call resources
     */
    const cleanupCall = () => {
        console.log('[WebRTC] Starting cleanup...', {
            hasLocalStream: !!localStream,
            peerConnectionCount: peerConnections.current.size,
            remoteStreamCount: remoteStreams.size
        });

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                console.log(`[WebRTC] Stopping ${track.kind} track`);
                track.stop();
            });
            setLocalStream(null);
        }

        // Close all peer connections
        peerConnections.current.forEach((pc, userId) => {
            console.log(`[WebRTC] Closing peer connection for user: ${userId}`);
            pc.close();
        });
        peerConnections.current.clear();

        // Clear remote streams
        setRemoteStreams(new Map());

        // Reset state
        setActiveCall(null);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);

        console.log('[WebRTC] Cleanup complete');
    };

    /**
     * Join an existing group call
     */
    const joinGroupCall = async (callId: string, callType: 'AUDIO_GROUP' | 'VIDEO_GROUP') => {
        if (!socket) throw new Error('Socket not connected');

        try {
            // Get user media
            const isVideo = callType.includes('VIDEO');
            const stream = await getUserMedia(isVideo);

            return new Promise<void>((resolve, reject) => {
                socket.emit('group-call:join', { callId }, (response: any) => {
                    if (response.error) {
                        stream.getTracks().forEach(t => t.stop());
                        reject(new Error(response.error));
                        return;
                    }

                    const call = response.call;

                    setActiveCall({
                        callId: call.id,
                        callType: call.callType,
                        participants: call.participants.map((p: any) => ({
                            userId: p.user.id,
                            username: p.user.username,
                            avatarUrl: p.user.avatarUrl
                        })),
                        status: 'active',
                        conversationId: call.conversationId
                    });

                    // Initiate connections to all existing participants (who have JOINED)
                    // The backend response for 'group-call:join' returns 'call' which has 'participants'
                    call.participants.forEach((p: any) => {
                        if (p.user.id !== userId && p.status === 'JOINED') {
                            createPeerConnection(p.user.id, true, stream, call.id);
                        }
                    });

                    resolve();
                });
            });
        } catch (error) {
            console.error('Error joining group call:', error);
            throw error;
        }
    };

    return {
        socket,
        localStream,
        remoteStreams,
        activeCall,
        incomingCall,
        isMuted,
        isVideoOff,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        isScreenSharing,
        switchCamera,
        joinGroupCall,
    };
};
