/**
 * MobileControls — on-screen walk joystick + Run / Jump / Interact for touch devices.
 * Feeds the same key codes PlayerController already uses (WASD + isRunning + jump()).
 */
export class MobileControls {
    /**
     * @param {object} opts
     * @param {() => object|null} opts.getPlayerCtrl
     * @param {() => void} [opts.onInteract]
     */
    constructor(opts = {}) {
        this.getPlayerCtrl = opts.getPlayerCtrl || (() => null);
        this.onInteract = opts.onInteract || (() => {});
        this.root = document.getElementById('mobile-controls');
        this._wantVisible = false;
        this._visible = false;
        this._stickActive = false;
        this._stickId = null;
        this._baseX = 0;
        this._baseY = 0;
        this._keysDown = new Set();
        this._runHeld = false;

        if (!this.root) {
            this.root = this._buildDom();
            document.body.appendChild(this.root);
        }

        this.stickZone = this.root.querySelector('.mc-stick-zone');
        this.stickBase = this.root.querySelector('.mc-stick-base');
        this.stickKnob = this.root.querySelector('.mc-stick-knob');
        this.btnRun = this.root.querySelector('#mc-run');
        this.btnJump = this.root.querySelector('#mc-jump');
        this.btnInteract = this.root.querySelector('#mc-interact');

        this._bind();
        this._syncVisibility();
        addEventListener('resize', () => this._syncVisibility());
        addEventListener('orientationchange', () => setTimeout(() => this._syncVisibility(), 150));
    }

    _buildDom() {
        const el = document.createElement('div');
        el.id = 'mobile-controls';
        el.className = 'mobile-controls';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `
            <div class="mc-stick-zone" data-touch-ui="1">
                <div class="mc-stick-base">
                    <div class="mc-stick-knob"></div>
                    <div class="mc-stick-hint">MOVE</div>
                </div>
            </div>
            <div class="mc-actions" data-touch-ui="1">
                <button type="button" class="mc-btn mc-run" id="mc-run" aria-label="Run">RUN</button>
                <button type="button" class="mc-btn mc-jump" id="mc-jump" aria-label="Jump">JUMP</button>
                <button type="button" class="mc-btn mc-interact" id="mc-interact" aria-label="Interact">E</button>
            </div>
        `;
        return el;
    }

    isMobileUi() {
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const narrow = window.matchMedia('(max-width: 920px)').matches;
        const touch = navigator.maxTouchPoints > 0;
        // Phone / tablet touch: show controls. Desktop mouse only: hide.
        if (coarse) return true;
        if (touch && narrow) return true;
        return false;
    }

    show() {
        this._wantVisible = true;
        this._syncVisibility();
    }

    hide() {
        this._wantVisible = false;
        this._releaseAll();
        this._syncVisibility();
    }

    _syncVisibility() {
        const show = !!this._wantVisible && this.isMobileUi();
        this._visible = show;
        this.root.classList.toggle('visible', show);
        this.root.setAttribute('aria-hidden', show ? 'false' : 'true');
        document.body.classList.toggle('mobile-controls-on', show);
        if (!show) this._releaseAll();
    }

    _bind() {
        const zone = this.stickZone;
        zone.addEventListener('pointerdown', (e) => this._onStickDown(e), { passive: false });
        zone.addEventListener('pointermove', (e) => this._onStickMove(e), { passive: false });
        zone.addEventListener('pointerup', (e) => this._onStickUp(e));
        zone.addEventListener('pointercancel', (e) => this._onStickUp(e));

        this._holdButton(this.btnRun, {
            down: () => {
                this._runHeld = true;
                const pc = this.getPlayerCtrl();
                if (pc) pc.isRunning = true;
                this.btnRun.classList.add('active');
            },
            up: () => {
                this._runHeld = false;
                const pc = this.getPlayerCtrl();
                if (pc) pc.isRunning = false;
                this.btnRun.classList.remove('active');
            },
        });

        this._holdButton(this.btnJump, {
            down: () => {
                this.btnJump.classList.add('active');
                this.getPlayerCtrl()?.jump?.();
            },
            up: () => this.btnJump.classList.remove('active'),
        });

        this._holdButton(this.btnInteract, {
            down: () => {
                this.btnInteract.classList.add('active');
                this.onInteract();
            },
            up: () => this.btnInteract.classList.remove('active'),
        });

        this.root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _holdButton(btn, { down, up }) {
        if (!btn) return;
        const start = (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { btn.setPointerCapture(e.pointerId); } catch { /* ok */ }
            down(e);
        };
        const end = (e) => {
            e.preventDefault();
            e.stopPropagation();
            up(e);
        };
        btn.addEventListener('pointerdown', start);
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointercancel', end);
        btn.addEventListener('lostpointercapture', end);
    }

    _onStickDown(e) {
        if (!this._visible) return;
        e.preventDefault();
        e.stopPropagation();
        this._stickActive = true;
        this._stickId = e.pointerId;
        try { this.stickZone.setPointerCapture(e.pointerId); } catch { /* ok */ }
        const rect = this.stickBase.getBoundingClientRect();
        this._baseX = rect.left + rect.width / 2;
        this._baseY = rect.top + rect.height / 2;
        this._onStickMove(e);
    }

    _onStickMove(e) {
        if (!this._stickActive || e.pointerId !== this._stickId) return;
        e.preventDefault();
        e.stopPropagation();
        const dx = e.clientX - this._baseX;
        const dy = e.clientY - this._baseY;
        const maxR = 46;
        const len = Math.hypot(dx, dy) || 1;
        const scale = Math.min(1, maxR / len);
        const kx = dx * scale;
        const ky = dy * scale;
        this.stickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

        const nx = dx / maxR;
        const ny = dy / maxR;
        const dead = 0.2;
        this._applyMoveKeys({
            KeyW: ny < -dead,
            KeyS: ny > dead,
            KeyA: nx < -dead,
            KeyD: nx > dead,
        });
    }

    _onStickUp(e) {
        if (e && this._stickId != null && e.pointerId !== this._stickId) return;
        this._stickActive = false;
        this._stickId = null;
        if (this.stickKnob) this.stickKnob.style.transform = 'translate(-50%, -50%)';
        this._applyMoveKeys({ KeyW: false, KeyA: false, KeyS: false, KeyD: false });
    }

    _applyMoveKeys(map) {
        const pc = this.getPlayerCtrl();
        if (!pc || !pc.enabled) {
            // Drop move input while dialogue / ride / menus disable the player
            if (pc?.keys) {
                for (const code of this._keysDown) pc.keys[code] = false;
            }
            this._keysDown.clear();
            return;
        }
        if (!pc.keys) pc.keys = {};
        for (const [code, down] of Object.entries(map)) {
            pc.keys[code] = !!down;
            if (down) this._keysDown.add(code);
            else this._keysDown.delete(code);
        }
        if (this._runHeld) pc.isRunning = true;
    }

    _releaseAll() {
        const pc = this.getPlayerCtrl();
        if (pc?.keys) {
            for (const code of this._keysDown) pc.keys[code] = false;
            if (this._runHeld) pc.isRunning = false;
        }
        this._keysDown.clear();
        this._runHeld = false;
        this._stickActive = false;
        this._stickId = null;
        if (this.stickKnob) this.stickKnob.style.transform = 'translate(-50%, -50%)';
        this.btnRun?.classList.remove('active');
        this.btnJump?.classList.remove('active');
        this.btnInteract?.classList.remove('active');
    }

    setInteractAvailable(on) {
        this.btnInteract?.classList.toggle('ready', !!on);
    }
}
