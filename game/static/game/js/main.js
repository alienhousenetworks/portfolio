import * as THREE from 'three';
import { WORLD } from './config.js';
import { createHumanAvatar, createUFO } from './AvatarFactory.js';
import { WorldBuilder } from './WorldBuilder.js';
import { PlayerController } from './PlayerController.js';
import { DialogueSystem } from './DialogueSystem.js';
import { CinematicIntro } from './CinematicIntro.js';
import { TransitSystem } from './Vehicles.js';
import { CitizenManager } from './Citizens.js';
import { TransitRideController } from './TransitRide.js';

class Game {
    constructor(data) {
        this.data = data;
        this.clock = new THREE.Clock();
        this.state = 'loading';
        this.pois = [];
        this.interactables = [];
        this.nearestTarget = null;

        this._renderer();
        this.scene = new THREE.Scene();
        const built = new WorldBuilder(this.scene, data).build();
        this.world = built;
        this.pois = built.pois;
        this.colliders = built.colliders;

        this.transit = new TransitSystem(this.scene);
        const stops = this.transit.build();
        this.interactables = [...this.pois, ...stops];

        this.citizens = new CitizenManager(this.scene);
        this.citizens.spawn(this.data.team || []);

        this.player = createHumanAvatar();
        this.player.visible = false;
        this.scene.add(this.player);

        this.ufo = createUFO();
        this.ufo.position.set(0, 60, 90);
        this.scene.add(this.ufo);

        this.playerCtrl = new PlayerController(this.camera, this.player, this.colliders, this.renderer.domElement);
        this.ride = new TransitRideController(this.scene, this.camera, this.player, this.transit);
        this.dialogue = new DialogueSystem(data);
        this.cinematic = new CinematicIntro(
            this.scene, this.camera, this.ufo, this.player,
            this.citizens.getTeamMeshes(),
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

        this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 800);
        this.camera.position.set(0, 8, 60);

        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
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
            if (e.code === 'KeyE' && this.state === 'playing' && !this.dialogue.active && this.nearestTarget) {
                this._interact(this.nearestTarget);
            }
        });
    }

    _afterCinematic() {
        this.state = 'dialogue';
        this.playerCtrl.setPosition(WORLD.parkX, WORLD.parkZ - 6);
        this.dialogue.start(this.dialogue.getIntroDialogue(), () => {
            this.state = 'playing';
            this.playerCtrl.enable();
            document.getElementById('hud')?.classList.add('visible');
            document.querySelector('.back-link')?.classList.add('visible');
        });
    }

    _interact(target) {
        if (target.type === 'citizen') {
            this.playerCtrl.disable();
            this.dialogue.start(
                [{ speaker: target.title, text: target.content }],
                () => this.playerCtrl.enable()
            );
            return;
        }
        if (target.type === 'bus_stop') {
            this._startBusRide(target);
            return;
        }
        if (target.type === 'train_station') {
            const boarding = this.transit.getNearestTrainStation(this.player.position);
            if (boarding && boarding.stop.id === target.id) {
                this._startTrainRide(boarding);
            } else {
                this._openPOI(target);
            }
            return;
        }
        this._openPOI(target);
    }

    _startBusRide(stop) {
        this.state = 'riding';
        this.playerCtrl.disable();
        document.getElementById('interact-prompt')?.classList.remove('visible');
        this.ride.startBusRide(stop, () => {
            this.state = 'playing';
            this.playerCtrl.enable();
        });
    }

    _startTrainRide(boarding) {
        this.state = 'riding';
        this.playerCtrl.disable();
        document.getElementById('interact-prompt')?.classList.remove('visible');
        this.ride.startTrainRide(boarding, () => {
            this.state = 'playing';
            this.playerCtrl.enable();
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
        if (this.state === 'riding' || this.state !== 'playing' || this.dialogue.active) {
            this.nearestTarget = null;
            document.getElementById('interact-prompt')?.classList.remove('visible');
            return;
        }
        let best = null, dist = Infinity;
        const pos = this.player.position;

        this.interactables.forEach(item => {
            const d = pos.distanceTo(item.position);
            if (d < item.radius && d < dist) { best = item; dist = d; }
        });

        const citizen = this.citizens.getNearby(pos);
        if (citizen) {
            const c = this.citizens.toInteractable(citizen);
            const d = pos.distanceTo(c.position);
            if (d < dist) { best = c; dist = d; }
        }

        this.nearestTarget = best;
        const prompt = document.getElementById('interact-prompt');
        if (best) {
            prompt.classList.add('visible');
            const verb = best.type === 'citizen' ? 'Talk to' : best.type === 'train_station' ? 'Board' : 'Visit';
            prompt.innerHTML = `<kbd>E</kbd> ${verb} ${best.title}`;
        } else {
            prompt.classList.remove('visible');
        }
    }

    _hud() {
        if (this.state === 'riding') {
            const p = this.player.position;
            document.getElementById('coord-display').textContent = `${p.x.toFixed(0)}, ${p.z.toFixed(0)}`;
            document.getElementById('zone-display').textContent = 'IN TRANSIT';
            return;
        }
        if (this.state !== 'playing') return;
        const p = this.player.position;
        document.getElementById('coord-display').textContent = `${p.x.toFixed(0)}, ${p.z.toFixed(0)}`;
        document.getElementById('zone-display').textContent = this.nearestTarget?.subtitle || 'DOWNTOWN';
        document.getElementById('site-display').textContent = this.data.siteName;
    }

    _minimap() {
        const c = document.getElementById('minimap-canvas');
        if (!c || this.state !== 'playing') return;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height, sc = w / 400;
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 0, w, h);

        this.interactables.forEach(item => {
            ctx.fillStyle = item.type === 'bus_stop' ? '#d4a020'
                : item.type === 'train_station' ? '#4488cc' : '#4a8';
            ctx.beginPath();
            ctx.arc(w / 2 + item.position.x * sc, h / 2 + item.position.z * sc, 3, 0, 6.28);
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

        if (this.cinematic.isActive()) {
            this.cinematic.update(dt);
        } else if (this.ride.isActive()) {
            this.ride.update(dt);
            this.transit.update(dt);
            this.citizens.update(dt);
        } else if (this.state === 'playing') {
            this.playerCtrl.update(dt);
            this.transit.update(dt);
            this.citizens.update(dt);
        }

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