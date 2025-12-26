// Sound notification utility for chat messages
import messageAudio from "../assets/message.mp3"
import notificationAudio from "../assets/notificatiion.wav"
import meraYesuRingtone from "../assets/Mera_yesu.mp3"
import toyPhoneRingtone from "../assets/toy_phone.mp3"

class SoundManager {
    private enabled: boolean = true;
    private sendAudio: HTMLAudioElement | null = null;
    private receiveAudio: HTMLAudioElement | null = null;
    private ringtoneInterval: number | null = null;
    private currentRingtone: HTMLAudioElement | null = null;
    private ringtoneAudios: HTMLAudioElement[] = [];

    constructor() {
        // Initialize sound enabled state from localStorage
        const stored = localStorage.getItem('soundEnabled');
        if (stored !== null) {
            this.enabled = stored === 'true';
        }

        // Initialize audio elements
        this.initializeAudioFiles();
    }

    private initializeAudioFiles() {
        try {
            // Create audio element for send sound (message.mp3)
            // this.sendAudio = new Audio('/sounds/message.mp3');
            this.sendAudio = new Audio(messageAudio);
            this.sendAudio.volume = 0.5;
            this.sendAudio.preload = 'auto';

            // Create audio element for receive sound (notification.wav)
            this.receiveAudio = new Audio(notificationAudio);
            // this.receiveAudio = new Audio('/sounds/notification.wav');
            this.receiveAudio.volume = 0.6;
            this.receiveAudio.preload = 'auto';

            // Initialize ringtone audio files
            const ringtone1 = new Audio(meraYesuRingtone);
            ringtone1.volume = 0.7;
            ringtone1.preload = 'auto';
            ringtone1.loop = false; // We'll handle looping manually

            const ringtone2 = new Audio(toyPhoneRingtone);
            ringtone2.volume = 0.7;
            ringtone2.preload = 'auto';
            ringtone2.loop = false; // We'll handle looping manually

            this.ringtoneAudios = [ringtone1, ringtone2];

            // Handle errors - if files don't exist, we'll use fallback tones
            this.sendAudio.addEventListener('error', () => {
                console.warn('message.mp3 not found, using fallback tone');
                this.sendAudio = null;
            });

            this.receiveAudio.addEventListener('error', () => {
                console.warn('notification.wav not found, using fallback tone');
                this.receiveAudio = null;
            });

            // Handle ringtone errors
            this.ringtoneAudios.forEach((audio, index) => {
                audio.addEventListener('error', () => {
                    console.warn(`Ringtone ${index + 1} not found`);
                });
            });
        } catch (error) {
            console.error('Error initializing audio files:', error);
        }
    }

    private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
        if (!this.enabled) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            // Smooth envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.error('Error playing tone:', error);
        }
    }

    private playDoubleBeep() {
        if (!this.enabled) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // First beep
            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.frequency.value = 600;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0, audioContext.currentTime);
            gain1.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            osc1.start(audioContext.currentTime);
            osc1.stop(audioContext.currentTime + 0.08);

            // Second beep (slightly higher pitch)
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 700;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
            gain2.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.11);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);
            osc2.start(audioContext.currentTime + 0.1);
            osc2.stop(audioContext.currentTime + 0.18);
        } catch (error) {
            console.error('Error playing double beep:', error);
        }
    }

    /**
     * Play a pleasant ringtone pattern (ascending tones)
     */
    private playRingtonePattern() {
        if (!this.enabled) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = audioContext.currentTime;

            // Create a pleasant ascending pattern
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            const noteDuration = 0.3;
            const gap = 0.05;

            notes.forEach((freq, index) => {
                const startTime = now + index * (noteDuration + gap);
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();

                osc.connect(gain);
                gain.connect(audioContext.destination);

                osc.frequency.value = freq;
                osc.type = 'sine';

                // Envelope
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

                osc.start(startTime);
                osc.stop(startTime + noteDuration);
            });
        } catch (error) {
            console.error('Error playing ringtone pattern:', error);
        }
    }

    /**
     * Start playing ringtone (loops until stopped)
     * Randomly selects between available ringtones
     */
    playRingtone() {
        if (!this.enabled) return;

        // Stop any existing ringtone
        this.stopRingtone();

        // Randomly select a ringtone
        if (this.ringtoneAudios.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.ringtoneAudios.length);
            this.currentRingtone = this.ringtoneAudios[randomIndex];

            // Play the selected ringtone
            this.currentRingtone.currentTime = 0;
            this.currentRingtone.play().catch(err => {
                console.warn('Failed to play ringtone audio, using fallback:', err);
                this.playRingtonePattern();
                // Fallback to pattern-based ringtone
                this.ringtoneInterval = window.setInterval(() => {
                    this.playRingtonePattern();
                }, 2000);
            });

            // When the ringtone ends, replay it (loop)
            this.currentRingtone.addEventListener('ended', () => {
                if (this.currentRingtone) {
                    this.currentRingtone.currentTime = 0;
                    this.currentRingtone.play().catch(err => {
                        console.error('Error replaying ringtone:', err);
                    });
                }
            });
        } else {
            // Fallback to pattern-based ringtone if no audio files available
            this.playRingtonePattern();
            this.ringtoneInterval = window.setInterval(() => {
                this.playRingtonePattern();
            }, 2000);
        }
    }

    /**
     * Stop the ringtone
     */
    stopRingtone() {
        // Stop audio-based ringtone
        if (this.currentRingtone) {
            this.currentRingtone.pause();
            this.currentRingtone.currentTime = 0;
            this.currentRingtone = null;
        }

        // Stop pattern-based ringtone interval
        if (this.ringtoneInterval !== null) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
    }

    playSendSound() {
        if (!this.enabled) return;

        try {
            if (this.sendAudio) {
                // Play audio file
                this.sendAudio.currentTime = 0; // Reset to start
                this.sendAudio.play().catch(err => {
                    console.warn('Failed to play send audio, using fallback:', err);
                    this.playTone(800, 0.08, 'sine');
                });
            } else {
                // Fallback to generated tone
                this.playTone(800, 0.08, 'sine');
            }
        } catch (error) {
            console.error('Error playing send sound:', error);
        }
    }

    playReceiveSound() {
        if (!this.enabled) return;

        try {
            if (this.receiveAudio) {
                // Play audio file
                this.receiveAudio.currentTime = 0; // Reset to start
                this.receiveAudio.play().catch(err => {
                    console.warn('Failed to play receive audio, using fallback:', err);
                    this.playDoubleBeep();
                });
            } else {
                // Fallback to generated double beep
                this.playDoubleBeep();
            }
        } catch (error) {
            console.error('Error playing receive sound:', error);
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        localStorage.setItem('soundEnabled', enabled.toString());
    }

    isEnabled(): boolean {
        const stored = localStorage.getItem('soundEnabled');
        if (stored !== null) {
            this.enabled = stored === 'true';
        }
        return this.enabled;
    }

    toggle(): boolean {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled.toString());
        return this.enabled;
    }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSendSound = () => soundManager.playSendSound();
export const playReceiveSound = () => soundManager.playReceiveSound();
export const playRingtone = () => soundManager.playRingtone();
export const stopRingtone = () => soundManager.stopRingtone();
export const toggleSound = () => soundManager.toggle();
export const isSoundEnabled = () => soundManager.isEnabled();

