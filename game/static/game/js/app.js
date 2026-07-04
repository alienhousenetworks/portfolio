import * as THREE from 'three';
import { WORLD } from './config.js';
import { createHumanAvatar, createAlienAvatar, createUFO, createNameTag } from './AvatarFactory.js';
import { WorldBuilder } from './WorldBuilder.js';
import { PlayerController } from './PlayerController.js';
import { DialogueSystem } from './DialogueSystem.js';
import { CinematicIntro } from './CinematicIntro.js';

class Game {
    constructor(data) {
        this.data = data;
        this.clock = new THREE.Clock();
        this.state = 'loading';
        this.pois = [];
        this.npcs = [];
        this.nearestPOI = null;

        this._renderer();
        this.scene = new THREE.Scene();
        const built = new WorldBuilder(this.scene, data).build();
        this.world = built;
        this.pois = built.pois;
        this.colliders = built.colliders;

        this.player = createHumanAvatar();
        this.player.visible = false;
        this.scene.add(this.player);

        this.ufo = createUFO();
        this.ufo.position.set(0, 60, 90);
        this.scene.add(this.ufo);

        this.playerCtrl = new PlayerController(this.camera, this.player, this.colliders);
        this._npcs();
        this.dialogue = new DialogueSystem(data);
        this.cinematic = new CinematicIntro(
            this.scene, this.camera, this.ufo, this.player,
            this.npcs.map(n => n.mesh),
            () => this._afterCinematic()
        );
        this._ui();
        requestAnimationFrame(() => this._loop());
        setTimeout(() => {
            document.getElementById('loading-screen')?.classList.add('hidden');
            document.getElementById('start-screen')?.classList.remove('hidden');
            this.state = 'start';
        }, 400);
    }

    _renderer() {
        const el = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 300);
        this.camera.position.set(0, 8, 60);

        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
        });
    }

    _npcs() {
        const team = (this.data.team || []).slice(0, 4);
        team.forEach((m, i) => {
            const mesh = createAlienAvatar();
            mesh.position.set(-4 + i * 2.5, WORLD.groundY, 50);
            mesh.visible = false;
            mesh.add(createNameTag(m.name));
            this.scene.add(mesh);
            this.npcs.push({ mesh, data: m });
        });
    }

    _ui() {
        document.getElementById('btn-start')?.addEventListener('click', () => {
            document.getElementById('start-screen')?.classList.add('hidden');
            this.state = 'cinematic';
            this.cinematic.start();
        });
        document.getElementById('info-close')?.addEventListener('click', () => {
            document.getElementById('info-panel')?.classList.remove('active');
            this.playerCtrl.enable();
        });
        addEventListener('keydown', e => {
            if (e.code === 'KeyE' && this.state === 'playing' && !this.dialogue.active && this.nearestPOI) {
                this._openPOI(this.nearestPOI);
            }
        });
    }

    _afterCinematic() {
        this.state = 'dialogue';
        this.dialogue.start(this.dialogue.getIntroDialogue(), () => {
            this.state = 'playing';
            this.playerCtrl.enable();
            document.getElementById('hud')?.classList.add('visible');
            document.querySelector('.back-link')?.classList.add('visible');
        });
    }

    _openPOI(poi) {
        this.playerCtrl.disable();
        const p = document.getElementById('info-panel');
        p.querySelector('.info-panel-title').textContent = poi.title;
        p.querySelector('.info-panel-subtitle').textContent = poi.subtitle;
        p.querySelector('.info-panel-body').textContent = poi.content;
        p.classList.add('active');
    }

    _proximity() {
        if (this.state !== 'playing' || this.dialogue.active) {
            this.nearestPOI = null;
            document.getElementById('interact-prompt')?.classList.remove('visible');
            return;
        }
        let best = null, dist = Infinity;
        const pos = this.player.position;
        this.pois.forEach(poi => {
            const d = pos.distanceTo(poi.position);
            if (d < poi.radius && d < dist) { best = poi; dist = d; }
        });
        this.nearestPOI = best;
        const prompt = document.getElementById('interact-prompt');
        if (best) {
            prompt.classList.add('visible');
            prompt.innerHTML = `<kbd>E</kbd> ${best.title}`;
        } else {
            prompt.classList.remove('visible');
        }
    }

    _hud() {
        if (this.state !== 'playing') return;
        const p = this.player.position;
        document.getElementById('coord-display').textContent = `${p.x.toFixed(0)}, ${p.z.toFixed(0)}`;
        document.getElementById('zone-display').textContent = this.nearestPOI?.subtitle || 'DOWNTOWN';
        document.getElementById('site-display').textContent = this.data.siteName;
    }

    _minimap() {
        const c = document.getElementById('minimap-canvas');
        if (!c || this.state !== 'playing') return;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height, sc = w / 200;
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 0, w, h);
        this.pois.forEach(poi => {
            ctx.fillStyle = '#4a8';
            ctx.beginPath();
            ctx.arc(w / 2 + poi.position.x * sc, h / 2 + poi.position.z * sc, 3, 0, 6.28);
            ctx.fill();
        });
        const px = w / 2 + this.player.position.x * sc;
        const py = h / 2 + this.player.position.z * sc;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 6.28);
        ctx.fill();
    }

    _loop() {
        requestAnimationFrame(() => this._loop());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.cinematic.isActive()) this.cinematic.update(dt);
        else if (this.state === 'playing') this.playerCtrl.update(dt);

        this._proximity();
        this._hud();
        this._minimap();
        this.renderer.render(this.scene, this.camera);
    }
}

function loadGameData() {
    const el = document.getElementById('game-data');
    if (!el || !el.textContent) {
        console.error('[game] #game-data missing — using defaults');
        return { siteName: 'ALIENHOUSE', email: '', team: [], services: [], projects: [], about: [], hero: {} };
    }
    let data = JSON.parse(el.textContent);
    if (typeof data === 'string') data = JSON.parse(data);
    return data;
}

addEventListener('DOMContentLoaded', () => {
    new Game(loadGameData());
});