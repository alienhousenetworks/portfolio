class AudioManager {
    constructor() {
        this.ctx = null;
        this.synthEnabled = false;
        this.musicInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.synthEnabled = true;
        this.startMusic();
    }

    startMusic() {
        if (!this.synthEnabled) return;

        // Pentatonic scale for beautiful, harmonious wind-chime melody
        const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        
        // Cozy ambient chords
        const chords = [
            [130.81, 261.63, 329.63, 392.00, 493.88], // Cmaj9
            [174.61, 349.23, 440.00, 523.25, 587.33], // Fmaj9
            [110.00, 220.00, 329.63, 392.00, 440.00], // Am7
            [196.00, 293.66, 392.00, 493.88, 587.33]  // G6/9
        ];

        let chordIdx = 0;
        const playNextChord = () => {
            if (this.ctx.state === 'suspended') return;
            const now = this.ctx.currentTime;
            
            // 1. Play warm ambient chord pad
            const chord = chords[chordIdx];
            chord.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, now);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(idx === 0 ? 0.016 : 0.008, now + 1.2); 
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 5.0);
            });

            // 2. Play 3 or 4 sparkling pentatonic bell notes over the chord
            for (let i = 0; i < 4; i++) {
                const triggerTime = now + 0.3 + i * 1.1 + Math.random() * 0.3;
                const noteFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
                
                const bellOsc = this.ctx.createOscillator();
                const bellGain = this.ctx.createGain();

                bellOsc.type = 'sine'; // Pure beautiful bell tone
                bellOsc.frequency.setValueAtTime(noteFreq, triggerTime);

                bellGain.gain.setValueAtTime(0, triggerTime);
                bellGain.gain.linearRampToValueAtTime(0.005, triggerTime + 0.05); // Fast attack
                bellGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 1.8); // Long ring decay

                bellOsc.connect(bellGain);
                bellGain.connect(this.ctx.destination);

                bellOsc.start(triggerTime);
                bellOsc.stop(triggerTime + 2.0);
            }

            chordIdx = (chordIdx + 1) % chords.length;
        };

        playNextChord();
        this.musicInterval = setInterval(playNextChord, 5000);
    }

    playFootstep(isRunning) {
        if (!this.synthEnabled || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;
        
        const bufferSize = this.ctx.sampleRate * 0.08; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = isRunning ? 380 : 220;
        filter.Q.value = 1.8;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isRunning ? 0.03 : 0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isRunning ? 0.05 : 0.08));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }
}

export const audio = new AudioManager();
