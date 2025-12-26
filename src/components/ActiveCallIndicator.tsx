import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Phone, Users, ArrowRight, X } from 'lucide-react';
import { useCall } from '../contexts/CallContext';
import { useRandomCall } from '../contexts/RandomCallContext';

/**
 * Global floating indicator that shows when user is in an active call
 * but has navigated away from the call page.
 * Allows quick return to the active call.
 */
export const ActiveCallIndicator = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeCall, endCall } = useCall();
    const { randomCallState, setRandomCallIdle } = useRandomCall();

    // Check if user is on a call page
    const isOnCallPage = location.pathname.includes('/chat/') || location.pathname === '/random-chat';

    // Determine if we should show the indicator
    const hasActiveRegularCall = activeCall !== null;
    const hasActiveRandomCall = randomCallState.isActive && randomCallState.status === 'connected';
    const shouldShow = (hasActiveRegularCall || hasActiveRandomCall) && !isOnCallPage;

    const handleReturnToCall = () => {
        if (hasActiveRandomCall) {
            navigate('/random-chat');
        } else if (activeCall?.conversationId) {
            navigate(`/chat/${activeCall.conversationId}`);
        }
    };

    const handleEndCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasActiveRandomCall) {
            setRandomCallIdle();
            // The RandomVideoPage will handle cleanup
        } else {
            endCall();
        }
    };

    if (!shouldShow) return null;

    const isGroupCall = activeCall?.callType?.includes('GROUP');
    const isVideoCall = hasActiveRandomCall || activeCall?.callType?.includes('VIDEO');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
            >
                <div
                    onClick={handleReturnToCall}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl cursor-pointer hover:shadow-green-500/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 sm:gap-4 border border-white/20 backdrop-blur-xl"
                >
                    {/* Icon */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                        {isVideoCall ? (
                            <Video className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        ) : (
                            <Phone className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                        )}
                    </div>

                    {/* Call Info */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            {isGroupCall && <Users className="w-4 h-4" />}
                            <span className="font-bold text-sm sm:text-base">
                                {hasActiveRandomCall
                                    ? `Random Chat: ${randomCallState.partnerName}`
                                    : isGroupCall
                                        ? 'Group Call Active'
                                        : 'Call Active'}
                            </span>
                        </div>
                        <span className="text-xs text-green-100">Tap to return</span>
                    </div>

                    {/* Return Arrow */}
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        className="ml-2 p-2 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors"
                        aria-label="End call"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
