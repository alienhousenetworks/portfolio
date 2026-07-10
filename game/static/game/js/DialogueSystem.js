import { inferGender } from './CharacterModels.js';

/** Common browser TTS name patterns for gendered voices */
const FEMALE_VOICE_RE = /female|woman|girl|samantha|victoria|karen|moira|fiona|tessa|veena|zira|susan|salli|joanna|ivy|kimberly|kendra|amy|emma|olivia|aria|jenny|sara|nora|heather|lisa|allison|ava|serena|karen|paulina|monica|lekha|meijia|ting-ting|sin-ji|yu-shu|kyoko|oto|alice|amelie|thomasina|flo|shelley|catherine|martha|isabela|luciana|paulina|wavenet.*f\b|neural.*female/i;
const MALE_VOICE_RE = /male|\bman\b|boy|daniel|david|mark|alex|fred|tom|james|brian|matthew|justin|joey|\bguy\b|ryan|nathan|aaron|gordon|george|rishi|arthur|thomas|oliver|aaron|jorge|diego|juan|lee|wavenet.*m\b|neural.*male|microsoft david|microsoft mark|google us english$/i;

export class DialogueSystem {
    constructor(data) {
        this.data = data;
        this.box = document.getElementById('dialogue-box');
        this.speakerEl = this.box.querySelector('.dialogue-speaker');
        this.textEl = this.box.querySelector('.dialogue-text');
        this.queue = [];
        this.idx = 0;
        this.active = false;
        this.onComplete = null;
        this._typing = null;
        this._voices = [];
        this._voiceCache = { male: null, female: null, neutral: null };

        this._loadVoices();
        if (window.speechSynthesis) {
            // Chrome loads voices async
            window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
        }

        this.box.addEventListener('click', () => this.advance());
        addEventListener('keydown', e => {
            if (e.code === 'KeyE' && this.active) { e.preventDefault(); this.advance(); }
        });
    }

    _loadVoices() {
        if (!window.speechSynthesis) return;
        this._voices = window.speechSynthesis.getVoices() || [];
        this._voiceCache = { male: null, female: null, neutral: null };
    }

    /**
     * Pick a browser voice matching gender.
     * Prefer English; fall back to pitch if no gendered voice is found.
     */
    _pickVoice(gender = 'neutral') {
        if (!this._voices.length) this._loadVoices();
        const voices = this._voices;
        if (!voices.length) return null;

        const key = gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'neutral';
        if (this._voiceCache[key]) return this._voiceCache[key];

        const en = voices.filter(v => /^en([-_]|$)/i.test(v.lang));
        const pool = en.length ? en : voices;

        let picked = null;
        if (key === 'female') {
            picked = pool.find(v => FEMALE_VOICE_RE.test(v.name))
                || pool.find(v => FEMALE_VOICE_RE.test(v.voiceURI || ''))
                || pool.find(v => !MALE_VOICE_RE.test(v.name));
        } else if (key === 'male') {
            picked = pool.find(v => MALE_VOICE_RE.test(v.name) && !FEMALE_VOICE_RE.test(v.name))
                || pool.find(v => MALE_VOICE_RE.test(v.voiceURI || ''))
                || pool.find(v => !FEMALE_VOICE_RE.test(v.name));
        } else {
            picked = pool.find(v => /google|microsoft|siri|premium|enhanced/i.test(v.name)) || pool[0];
        }

        this._voiceCache[key] = picked || pool[0] || null;
        return this._voiceCache[key];
    }

    /** Resolve line.gender or infer from speaker name / known roles */
    _resolveGender(line) {
        if (line.gender === 'female' || line.gender === 'male' || line.gender === 'neutral') {
            return line.gender;
        }
        const speaker = (line.speaker || '').trim();
        if (!speaker || /^system$/i.test(speaker)) return 'neutral';

        // Welcome ambassadors (from intro lines)
        if (/alien ambassador|zyx|alien/i.test(speaker) && !/human/i.test(speaker)) {
            // Alien welcome uses female model by default in main/app
            if (line.genderHint) return line.genderHint;
        }
        if (/human ambassador/i.test(speaker)) return 'male';

        const name = speaker.split(/[·•|–—\-]/)[0].trim();
        // Prefer explicit name inference (female name set)
        const inferred = inferGender(name, line.type || 'human');
        return inferred === 'female' ? 'female' : 'male';
    }

    getIntroDialogue() {
        const site = this.data.siteName || 'AlienHouse Networks';
        const hero = this.data.hero || {};
        const welcome = this.data.welcome || {};
        const lines = [
            { speaker: 'SYSTEM', text: `Landing complete. Welcome to ${site} planetary city.`, gender: 'neutral' },
        ];

        if (welcome.humanLine) {
            lines.push({
                speaker: `${welcome.humanName || 'Human Ambassador'} · ${site}`,
                text: welcome.humanLine,
                gender: welcome.humanGender || 'male',
            });
        }
        if (welcome.alienLine) {
            lines.push({
                speaker: `${welcome.alienName || 'Alien Ambassador'} · ${site}`,
                text: welcome.alienLine,
                // Matches female alien model used in main.js / app.js
                gender: welcome.alienGender || 'female',
            });
        }

        const team = this.data.team || [];
        if (team[0] && !welcome.humanLine) {
            const g = team[0].gender
                || (inferGender(team[0].name || '', 'human') === 'female' ? 'female' : 'male');
            lines.push({
                speaker: team[0].name,
                text: `Welcome! I'm ${team[0].name}, ${team[0].role} at ${site}.`,
                gender: g,
            });
        }

        lines.push({
            speaker: 'SYSTEM',
            text: `${hero.subtext || 'Explore our districts.'} Visit bus & metro stops to travel to service cities. WASD move, drag to look 360°, E for details.`,
            gender: 'neutral',
        });
        return lines;
    }

    start(lines, onComplete) {
        this.queue = lines;
        this.idx = 0;
        this.onComplete = onComplete;
        this.active = true;
        this.box.classList.add('active');
        this._show();
    }

    _show() {
        if (this.idx >= this.queue.length) { this.close(); return; }
        const line = this.queue[this.idx];
        this.speakerEl.textContent = line.speaker;
        this.textEl.textContent = '';
        let i = 0;
        clearInterval(this._typing);
        this._typing = setInterval(() => {
            this.textEl.textContent += line.text[i++];
            if (i >= line.text.length) clearInterval(this._typing);
        }, 20);

        this._speak(line);
    }

    _speak(line) {
        if (!window.speechSynthesis || !line?.text) return;
        window.speechSynthesis.cancel();

        const gender = this._resolveGender(line);
        const utterance = new SpeechSynthesisUtterance(line.text);
        utterance.rate = gender === 'female' ? 1.04 : gender === 'male' ? 1.0 : 1.05;

        // Pitch reinforces gender when OS voice list is sparse
        if (gender === 'female') utterance.pitch = 1.2;
        else if (gender === 'male') utterance.pitch = 0.85;
        else utterance.pitch = 1.0;

        const voice = this._pickVoice(gender);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'en-US';
        } else {
            utterance.lang = 'en-US';
        }

        window.speechSynthesis.speak(utterance);
    }

    advance() {
        if (!this.active) return;
        if (this._typing) {
            clearInterval(this._typing);
            this.textEl.textContent = this.queue[this.idx].text;
            this._typing = null;
            return;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.idx++;
        this._show();
    }

    close() {
        this.active = false;
        this.box.classList.remove('active');
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.onComplete?.();
    }
}
