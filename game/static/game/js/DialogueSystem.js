export class DialogueSystem {
    constructor(gameData) {
        this.data = gameData;
        this.box = document.getElementById('dialogue-box');
        this.speakerEl = this.box.querySelector('.dialogue-speaker');
        this.textEl = this.box.querySelector('.dialogue-text');
        this.queue = [];
        this.currentIndex = 0;
        this.active = false;
        this.onComplete = null;

        this.box.addEventListener('click', () => this.advance());
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.active) {
                e.preventDefault();
                this.advance();
            }
        });
    }

    getIntroDialogue() {
        const site = this.data.siteName;
        const hero = this.data.hero;
        const lines = [
            {
                speaker: 'MISSION CONTROL',
                text: `Approaching advanced planet sector. ${site} colony detected below.`,
            },
            {
                speaker: 'NAVIGATION AI',
                text: 'Landing sequence initiated. Atmospheric conditions optimal. Welcome to the future.',
            },
        ];

        if (this.data.team.length > 0) {
            const lead = this.data.team[0];
            lines.push({
                speaker: lead.name.toUpperCase(),
                text: `Greetings, traveler! I'm ${lead.name}, ${lead.role} at ${site}. We've been expecting you.`,
            });
        }

        if (this.data.team.length > 1) {
            const second = this.data.team[1];
            lines.push({
                speaker: second.name.toUpperCase(),
                text: `I'm ${second.name}. Our team engineers ${hero.gradient.toLowerCase()} solutions across the galaxy.`,
            });
        }

        lines.push({
            speaker: this.data.team[0]?.name?.toUpperCase() || 'GUIDE',
            text: `${hero.subtext} Explore our planetary campus — visit the HQ, service modules, project labs, and team plaza. Press E near glowing markers to learn more.`,
        });

        lines.push({
            speaker: 'SYSTEM',
            text: 'Free roam enabled. Use WASD to move, mouse drag to look around, Shift to run. Good luck, explorer.',
        });

        return lines;
    }

    start(lines, onComplete) {
        this.queue = lines;
        this.currentIndex = 0;
        this.onComplete = onComplete;
        this.active = true;
        this.box.classList.add('active');
        this._showCurrent();
    }

    _showCurrent() {
        if (this.currentIndex >= this.queue.length) {
            this.close();
            return;
        }
        const line = this.queue[this.currentIndex];
        this.speakerEl.textContent = line.speaker;
        this.textEl.textContent = '';
        this._typeText(line.text);
    }

    _typeText(text) {
        let i = 0;
        const interval = setInterval(() => {
            this.textEl.textContent += text[i];
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 25);
        this._typeInterval = interval;
    }

    advance() {
        if (!this.active) return;
        if (this._typeInterval) {
            clearInterval(this._typeInterval);
            this.textEl.textContent = this.queue[this.currentIndex].text;
            this._typeInterval = null;
            return;
        }
        this.currentIndex++;
        this._showCurrent();
    }

    close() {
        this.active = false;
        this.box.classList.remove('active');
        if (this.onComplete) this.onComplete();
    }

    showPOI(poi) {
        this.start([
            { speaker: poi.subtitle, text: poi.title },
            { speaker: 'INFO', text: poi.content },
        ]);
    }
}