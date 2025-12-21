import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse'
}) => {
    const baseClasses = 'bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 bg-[length:200%_100%]';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: ''
    };

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%')
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
        />
    );
};

// Conversation List Skeleton
export const ConversationSkeleton: React.FC = () => {
    return (
        <div className="p-2.5 md:p-3 flex items-center gap-2.5 md:gap-3 rounded-2xl">
            <Skeleton variant="circular" width={44} height={44} className="flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-center">
                    <Skeleton width="60%" height={16} />
                    <Skeleton width={40} height={12} />
                </div>
                <Skeleton width="80%" height={14} />
            </div>
        </div>
    );
};

// Message Skeleton
export const MessageSkeleton: React.FC<{ isMe?: boolean }> = ({ isMe = false }) => {
    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`flex gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && <Skeleton variant="circular" width={32} height={32} className="flex-shrink-0" />}
                <div className="space-y-1">
                    {!isMe && <Skeleton width={80} height={12} />}
                    <Skeleton width={Math.random() * 100 + 150} height={40} className="rounded-2xl" />
                </div>
            </div>
        </div>
    );
};

// Chat Header Skeleton
export const ChatHeaderSkeleton: React.FC = () => {
    return (
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-[#1e293b]/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 md:gap-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="space-y-2">
                    <Skeleton width={120} height={18} />
                    <Skeleton width={80} height={12} />
                </div>
            </div>
            <Skeleton variant="circular" width={40} height={40} />
        </div>
    );
};

// User Search Skeleton
export const UserSearchSkeleton: React.FC = () => {
    return (
        <div className="p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
                <Skeleton width="50%" height={16} />
                <Skeleton width="70%" height={12} />
            </div>
        </div>
    );
};
