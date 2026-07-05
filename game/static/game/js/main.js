import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { preloadCharacterModels } from './CharacterModels.js';
import { createHumanAvatar, createAlienAvatar, createUFO, createNameTag } from './AvatarFactory.js';
import { WorldBuilder } from './WorldBuilder.js';
import { TerrainSystem } from './TerrainSystem.js';
import { PlayerController } from './PlayerController.js';
import { DialogueSystem } from './DialogueSystem.js';
import { CinematicIntro } from './CinematicIntro.js';
import { TransitSystem } from './Vehicles.js';
import { CitizenManager } from './Citizens.js';
import { TransitRideController } from './TransitRide.js';
import { DISTRICT_DEFS, MAP_LEGEND, POI_MAP_COLORS, getDistrictAt } from './Districts.js';
import { getZoneAt, getZoneLabel } from './CityZones.js';
import { TransitPicker } from './TransitPicker.js';

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
        this.scene.background = new THREE.Color(PALETTE.fog);
        this.terrain = new TerrainSystem();
        this.terrain.build(this.scene);
        const built = new WorldBuilder(this.scene, data, this.terrain).build();
        this.world = built;
        this.pois = built.pois;
        this.colliders = built.colliders;

        this.transit = new TransitSystem(this.scene);
        const stops = this.transit.build();
        this.interactables = [...this.pois, ...stops];

        this.citizens = new CitizenManager(this.scene, this.terrain);
        this._buildMapLegend();

        this.ufo = createUFO();
        this.ufo.position.set(0, 60, 90);
        this.scene.add(this.ufo);

        this.transitPicker = new TransitPicker(
            this.data.transitDestinations || [],
            (dest, stop, mode) => this._startJourney(dest, stop, mode),
            () => this.playerCtrl?.enable()
        );
        this.dialogue = new DialogueSystem(data);
        this._ui();
        requestAnimationFrame(() => this._loop());
    }

    _setLoadProgress(pct) {
        const fill = document.querySelector('.loading-bar-fill');
        const title = document.querySelector('#loading-screen .start-title');
        if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
        if (title) title.textContent = pct < 1 ? 'Loading Characters…' : 'Building World';
    }

    async initCharacters() {
        const base = this.data.staticBase || '/static/game/';
        try {
            await preloadCharacterModels(base, pct => this._setLoadProgress(pct));
        } catch (err) {
            console.error('[game] Failed to load character models', err);
        }

        const buildings = this.world?.buildings || this.data.buildings || [];
        this.citizens.spawn(this.data.team || [], buildings);

        this.player = createHumanAvatar({ modelKey: 'male' });
        this.player.visible = false;
        this.scene.add(this.player);

        const welcome = this.data.welcome || {};
        this.welcomeHuman = createHumanAvatar({ modelKey: 'female' });
        this.welcomeHuman.visible = false;
        this.welcomeHuman.add(createNameTag(welcome.humanName || 'Human Ambassador'));
        this.scene.add(this.welcomeHuman);

        this.welcomeAlien = createAlienAvatar({ modelKey: 'fantasy', variant: 0 });
        this.welcomeAlien.visible = false;
        this.welcomeAlien.add(createNameTag(welcome.alienName || 'Alien Ambassador'));
        this.scene.add(this.welcomeAlien);

        this.playerCtrl = new PlayerController(this.camera, this.player, this.colliders, this.renderer.domElement, this.terrain);
        this.ride = new TransitRideController(this.scene, this.camera, this.player, this.transit);
        this.cinematic = new CinematicIntro(
            this.scene, this.camera, this.ufo, this.player,
            this.citizens.getTeamMeshes(),
            { human: this.welcomeHuman, alien: this.welcomeAlien },
            () => this._afterCinematic()
        );

        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('start-screen')?.classList.remove('hidden');
        this.state = 'start';
    }

    _renderer() {
        const el = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.95;
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
            this.playerCtrl.syncCameraToPlayer();
            this.playerCtrl.enable();
            document.getElementById('hud')?.classList.add('visible');
            document.querySelector('.back-link')?.classList.add('visible');
            document.getElementById('height-control')?.classList.add('visible');
            const hint = document.getElementById('physics-hint');
            if (hint) {
                hint.classList.add('visible');
                setTimeout(() => hint.classList.add('fade-out'), 7000);
            }
        });
    }

    _interact(target) {
        if (target.type === 'citizen' && target.isHost) {
            this._openDetailPanel({
                title: target.panelTitle || target.hostBuilding,
                subtitle: `${target.title} · ${target.subtitle}`,
                body: target.panelContent || target.content,
                greeting: target.content,
                speaker: target.title,
            });
            return;
        }
        if (target.type === 'citizen') {
            this.playerCtrl.disable();
            this.dialogue.start(
                [{ speaker: target.title, text: target.content }],
                () => this.playerCtrl.enable()
            );
            return;
        }
        if (target.type === 'bus_stop') {
            this._openTransitPicker(target, 'bus');
            return;
        }
        if (target.type === 'train_station') {
            this._openTransitPicker(target, 'metro');
            return;
        }
        this._openDetailPanel({
            title: target.title,
            subtitle: target.subtitle,
            body: target.content || target.panelContent,
        });
    }

    _openTransitPicker(stop, mode) {
        this.playerCtrl.disable();
        document.getElementById('interact-prompt')?.classList.remove('visible');
        this.transitPicker.open(stop, mode);
    }

    _startJourney(dest, stop, mode) {
        this.state = 'riding';
        this.playerCtrl.disable();
        const pos = this.player.position;
        this.ride.startJourney({
            fromX: pos.x,
            fromZ: pos.z,
            dest,
            stop,
            mode,
            onArriveDest: () => {
                this.citizens.spawnCrowdAt(
                    dest.arrivalX ?? dest.x + 8,
                    dest.arrivalZ ?? dest.z + 18,
                    dest.district || 'downtown',
                    12
                );
            },
            onComplete: (arrival) => {
                const d = arrival?.dest || dest;
                this.playerCtrl.setPosition(
                    d.x, d.z,
                    d.arrivalX ?? d.x + 8,
                    d.arrivalZ ?? d.z + 18
                );
                this.state = 'playing';
                this.playerCtrl.enable();
            },
        });
    }

    _openPOI(poi) {
        this._openDetailPanel({
            title: poi.title,
            subtitle: poi.subtitle,
            body: poi.content || poi.panelContent,
        });
    }

    _openDetailPanel({ title, subtitle, body, greeting, speaker }) {
        this.playerCtrl.disable();
        const p = document.getElementById('info-panel');
        p.querySelector('.info-panel-title').textContent = title || 'Details';
        p.querySelector('.info-panel-subtitle').textContent = subtitle || '';

        const bodyEl = p.querySelector('.info-panel-body');
        let text = body || 'No details available.';
        if (greeting && speaker) {
            text = `${speaker} says: "${greeting}"\n\n${text}`;
        }
        bodyEl.textContent = text;
        p.classList.add('active');
    }

    _proximity() {
        if (this.state === 'riding' || this.state !== 'playing' || this.dialogue.active
            || document.getElementById('transit-picker')?.classList.contains('active')) {
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
            let verb = 'Visit';
            let label = best.title;
            if (best.type === 'citizen') {
                verb = best.isHost ? 'Learn about' : 'Talk to';
                label = best.isHost ? (best.hostBuilding || best.panelTitle) : best.title;
            } else if (best.type === 'train_station' || best.type === 'bus_stop') verb = 'Travel to city from';
            prompt.innerHTML = `<kbd>E</kbd> ${verb} ${label}`;
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
        const district = getDistrictAt(p.x, p.z);
        const zone = getZoneLabel(getZoneAt(p.x, p.z));
        document.getElementById('zone-display').textContent =
            this.nearestTarget?.subtitle || (district.id !== 'downtown' ? district.label : zone).toUpperCase();
        document.getElementById('site-display').textContent = this.data.siteName;
    }

    _buildMapLegend() {
        const el = document.getElementById('map-legend');
        if (!el) return;
        el.innerHTML = MAP_LEGEND.map(item =>
            `<span class="legend-item"><i style="background:${item.color}"></i>${item.label}</span>`
        ).join('');
    }

    _minimap() {
        const c = document.getElementById('minimap-canvas');
        if (!c || (this.state !== 'playing' && this.state !== 'riding')) return;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height, sc = w / 400;
        const cx = w / 2, cy = h / 2;

        ctx.fillStyle = '#a6d58f';
        ctx.fillRect(0, 0, w, h);

        const rcx = cx + WORLD.riverX * sc;
        ctx.fillStyle = '#4ed2c8';
        ctx.fillRect(rcx - WORLD.riverWidth * sc / 2, 0, WORLD.riverWidth * sc, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const off = i * WORLD.roadSpacing * sc;
            ctx.beginPath(); ctx.moveTo(cx + off, 0); ctx.lineTo(cx + off, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, cy + off); ctx.lineTo(w, cy + off); ctx.stroke();
        }

        Object.values(DISTRICT_DEFS).forEach(d => {
            if (d.id === 'downtown') return;
            const dx = cx + d.x * sc, dy = cy + d.z * sc, r = d.radius * sc;
            ctx.fillStyle = d.color + '33';
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, 6.28);
            ctx.fill();
            ctx.strokeStyle = d.color + '88';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = d.color;
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(d.shortLabel, dx, dy + 3);
        });

        this.interactables.forEach(item => {
            const mx = cx + item.position.x * sc;
            const my = cy + item.position.z * sc;
            const col = POI_MAP_COLORS[item.type] || '#4a8';
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(mx, my, item.type === 'hq' ? 5 : 3.5, 0, 6.28);
            ctx.fill();
            if (item.mapLabel && ['hq', 'service', 'project', 'contact'].includes(item.type)) {
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.font = '7px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(item.mapLabel, mx + 5, my + 2);
            }
        });

        const px = cx + this.player.position.x * sc;
        const py = cy + this.player.position.z * sc;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 6.28);
        ctx.fill();
        ctx.stroke();
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

        if (this.terrain && this.terrain.update) {
            this.terrain.update(dt);
        }

        // Animate clouds drifting
        this._animateClouds(dt);

        this._proximity();
        this._hud();
        this._minimap();
        this.renderer.render(this.scene, this.camera);
    }

    _animateClouds(dt) {
        const clouds = this.world?._cloudMeshes || this.world?.cloudMeshes || [];
        clouds.forEach(c => {
            c.g.position.x += c.dir * c.speed * dt;
            // Wrap clouds around the world
            if (c.g.position.x > 320) c.g.position.x = -320;
            if (c.g.position.x < -320) c.g.position.x = 320;
        });
    }
}

function loadGameData() {
    const el = document.getElementById('game-data');
    if (!el || !el.textContent) {
        console.error('[game] #game-data missing — using defaults');
        return {
            siteName: 'ALIENHOUSE', email: '', team: [], services: [], projects: [],
            about: [], hero: {}, transitDestinations: [], welcome: {},
        };
    }
    let data = JSON.parse(el.textContent);
    if (typeof data === 'string') data = JSON.parse(data);
    return data;
}

addEventListener('DOMContentLoaded', async () => {
    const game = new Game(loadGameData());
    await game.initCharacters();
});