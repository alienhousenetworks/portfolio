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
        
        // Soft lofi chiptune repeating chord progression (Calm music)
        const notes = [
            [261.63, 329.63, 392.00, 523.25], // C major
            [349.23, 440.00, 523.25, 698.46], // F major
            [293.66, 349.23, 440.00, 587.33], // D minor
            [392.00, 493.88, 587.33, 783.99], // G major
        ];
        
        let chordIdx = 0;
        const playNextChord = () => {
            if (this.ctx.state === 'suspended') return;
            const now = this.ctx.currentTime;
            const chord = notes[chordIdx];
            chord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle'; // Cozy soft chiptune sound
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.015, now + 0.8); // Very soft background music
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8); // Decay
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(now);
                osc.stop(now + 4);
            });
            chordIdx = (chordIdx + 1) % notes.length;
        };

        playNextChord();
        this.musicInterval = setInterval(playNextChord, 4000);
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
