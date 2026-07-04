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
        const hero = this.data.hero || {};

        const lines = [
            {
                speaker: 'PLANET AI',
                text: 'Atmospheric entry complete. Earth-like conditions detected. Indigenous alien population active below.',
            },
            {
                speaker: 'LANDING SYSTEM',
                text: 'Touchdown confirmed. Ramp deployed. Human explorer, you may disembark safely.',
            },
        ];

        if ((this.data.team || []).length > 0) {
            const lead = this.data.team[0];
            lines.push({
                speaker: `${lead.name.toUpperCase()} [ALIEN]`,
                text: `Welcome to our world, human! I am ${lead.name}, ${lead.role} at ${site}. We aliens have built an advanced civilization here — and we're glad you came.`,
            });
        }

        if ((this.data.team || []).length > 1) {
            const second = this.data.team[1];
            lines.push({
                speaker: `${second.name.toUpperCase()} [ALIEN]`,
                text: `I'm ${second.name}. You'll see our people everywhere on this planet. We specialize in ${hero.gradient || 'engineering'} the future — ${hero.subtext || 'advanced technology'}.`,
            });
        }

        lines.push({
            speaker: (this.data.team[0]?.name || 'GUIDE').toUpperCase() + ' [ALIEN]',
            text: `Walk around our campus freely. Visit the HQ, service towers, project labs, and meet more of our alien crew. Press E near glowing beacons to learn about ${site}.`,
        });

        lines.push({
            speaker: 'SYSTEM',
            text: 'Use WASD to move, mouse drag to look, Shift to run. The planet is yours to explore, human.',
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