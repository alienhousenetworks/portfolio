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

        this.box.addEventListener('click', () => this.advance());
        addEventListener('keydown', e => {
            if (e.code === 'KeyE' && this.active) { e.preventDefault(); this.advance(); }
        });
    }

    getIntroDialogue() {
        const site = this.data.siteName || 'AlienHouse Networks';
        const hero = this.data.hero || {};
        const welcome = this.data.welcome || {};
        const lines = [
            { speaker: 'SYSTEM', text: `Landing complete. Welcome to ${site} planetary city.` },
        ];

        if (welcome.humanLine) {
            lines.push({
                speaker: `${welcome.humanName || 'Human Ambassador'} · ${site}`,
                text: welcome.humanLine,
            });
        }
        if (welcome.alienLine) {
            lines.push({
                speaker: `${welcome.alienName || 'Alien Ambassador'} · ${site}`,
                text: welcome.alienLine,
            });
        }

        const team = this.data.team || [];
        if (team[0] && !welcome.humanLine) {
            lines.push({
                speaker: team[0].name,
                text: `Welcome! I'm ${team[0].name}, ${team[0].role} at ${site}.`,
            });
        }

        lines.push({
            speaker: 'SYSTEM',
            text: `${hero.subtext || 'Explore our districts.'} Visit bus & metro stops to travel to service cities. WASD move, drag to look 360°, E for details.`,
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

        // Speak the words aloud exactly as written
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(line.text);
            utterance.rate = 1.05;
            utterance.pitch = (line.speaker.includes('Ambassador') || line.speaker.includes('Zyx')) ? 0.8 : 1.05;
            window.speechSynthesis.speak(utterance);
        }
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