import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface RandomCallState {
    isActive: boolean;
    partnerName: string;
    status: 'idle' | 'searching' | 'connected';
}

interface RandomCallContextType {
    randomCallState: RandomCallState;
    setRandomCallActive: (partnerName: string) => void;
    setRandomCallSearching: () => void;
    setRandomCallIdle: () => void;
}

const RandomCallContext = createContext<RandomCallContextType | undefined>(undefined);

export const RandomCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [randomCallState, setRandomCallState] = useState<RandomCallState>({
        isActive: false,
        partnerName: '',
        status: 'idle',
    });

    const setRandomCallActive = useCallback((partnerName: string) => {
        setRandomCallState({
            isActive: true,
            partnerName,
            status: 'connected',
        });
    }, []);

    const setRandomCallSearching = useCallback(() => {
        setRandomCallState({
            isActive: true,
            partnerName: '',
            status: 'searching',
        });
    }, []);

    const setRandomCallIdle = useCallback(() => {
        setRandomCallState({
            isActive: false,
            partnerName: '',
            status: 'idle',
        });
    }, []);

    return (
        <RandomCallContext.Provider
            value={{
                randomCallState,
                setRandomCallActive,
                setRandomCallSearching,
                setRandomCallIdle,
            }}
        >
            {children}
        </RandomCallContext.Provider>
    );
};

export const useRandomCall = (): RandomCallContextType => {
    const context = useContext(RandomCallContext);
    if (!context) {
        throw new Error('useRandomCall must be used within a RandomCallProvider');
    }
    return context;
};
