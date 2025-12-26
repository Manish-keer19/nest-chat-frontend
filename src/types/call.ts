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

export type CallType = 'AUDIO_1TO1' | 'VIDEO_1TO1' | 'AUDIO_GROUP' | 'VIDEO_GROUP';
