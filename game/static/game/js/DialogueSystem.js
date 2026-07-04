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
        const site = this.data.siteName || 'AlienHouse';
        const hero = this.data.hero || {};
        const lines = [
            { speaker: 'SYSTEM', text: 'Landing complete. Earth-like city detected. Alien population confirmed.' },
        ];
        const team = this.data.team || [];
        if (team[0]) {
            lines.push({ speaker: team[0].name, text: `Welcome, human. I'm ${team[0].name}, ${team[0].role} at ${site}. This is our city — we built it here on this planet.` });
        }
        if (team[1]) {
            lines.push({ speaker: team[1].name, text: `${hero.subtext || 'We build advanced technology.'} Walk around downtown, visit buildings marked with beacons, press E to learn about us.` });
        }
        lines.push({ speaker: 'SYSTEM', text: 'WASD to move. Mouse drag to look. Shift to run. Explore the city.' });
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
    }

    advance() {
        if (!this.active) return;
        if (this._typing) {
            clearInterval(this._typing);
            this.textEl.textContent = this.queue[this.idx].text;
            this._typing = null;
            return;
        }
        this.idx++;
        this._show();
    }

    close() {
        this.active = false;
        this.box.classList.remove('active');
        this.onComplete?.();
    }
}