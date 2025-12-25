import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import type { ActiveCall, IncomingCall } from '../types/call';

interface CallContextType {
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    activeCall: ActiveCall | null;
    incomingCall: IncomingCall | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    initiateCall: (
        recipientIds: string[],
        callType: 'AUDIO_1TO1' | 'VIDEO_1TO1' | 'AUDIO_GROUP' | 'VIDEO_GROUP',
        conversationId?: string
    ) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: (reason?: string) => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => void;
    switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
    children: ReactNode;
    userId: string;
    username: string;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children, userId, username }) => {
    const webRTC = useWebRTC(userId, username);

    return (
        <CallContext.Provider
            value={{
                localStream: webRTC.localStream,
                remoteStreams: webRTC.remoteStreams,
                activeCall: webRTC.activeCall,
                incomingCall: webRTC.incomingCall,
                isMuted: webRTC.isMuted,
                isVideoOff: webRTC.isVideoOff,
                initiateCall: webRTC.initiateCall,
                acceptCall: webRTC.acceptCall,
                rejectCall: webRTC.rejectCall,
                endCall: webRTC.endCall,
                toggleMute: webRTC.toggleMute,
                toggleVideo: webRTC.toggleVideo,
                toggleScreenShare: webRTC.toggleScreenShare,
                isScreenSharing: webRTC.isScreenSharing,
                switchCamera: webRTC.switchCamera,
            }}
        >
            {children}
        </CallContext.Provider>
    );
};

export const useCall = (): CallContextType => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
