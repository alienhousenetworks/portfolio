import * as THREE from 'three';
import { WORLD, PALETTE, PLAYER } from './config.js';
import { preloadCharacterModels, hasCriticalModels, cycleOutfitPreset } from './CharacterModels.js';
import { createHumanAvatar, createAlienAvatar, createUFO, createNameTag, playEmote } from './AvatarFactory.js';
import { WorldBuilder } from './WorldBuilder.js';
import { TerrainSystem } from './TerrainSystem.js';
import { ChunkManager } from './ChunkManager.js';
import { PlayerController } from './PlayerController.js';
import { DialogueSystem } from './DialogueSystem.js';
import { CinematicIntro } from './CinematicIntro.js';
import { TransitSystem } from './Vehicles.js';
import { CitizenManager } from './Citizens.js';
import { TransitRideController } from './TransitRide.js';
import { DISTRICT_DEFS, MAP_LEGEND, POI_MAP_COLORS, getDistrictAt } from './Districts.js';
import { getZoneAt, getZoneLabel } from './CityZones.js';
import { TransitPicker } from './TransitPicker.js';
import { audio } from './AudioManager.js';

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
        this.chunks = new ChunkManager(70, 3);
        this.terrain = new TerrainSystem();
        this.terrain.build(this.scene);
        const built = new WorldBuilder(this.scene, data, this.terrain, this.chunks).build();
        this.chunks.preloadAround(0, 0, 3);
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
        this._ready = false;
        requestAnimationFrame(() => this._loop());
    }

    _showLoadError(msg) {
        const title = document.querySelector('#loading-screen .start-title');
        const fill = document.querySelector('.loading-bar-fill');
        if (title) title.textContent = msg;
        if (fill) fill.style.width = '0%';
    }

    _setLoadProgress(pct, _id, label) {
        const fill = document.querySelector('.loading-bar-fill');
        const title = document.querySelector('#loading-screen .start-title');
        if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
        if (title) {
            title.textContent = label || (pct < 1 ? 'Loading player…' : 'Ready');
        }
    }

    async initCharacters() {
        const base = this.data.staticBase || '/static/game/';
        const result = await preloadCharacterModels(base, (pct, id, label) => {
            this._setLoadProgress(pct, id, label);
        });

        if (!hasCriticalModels()) {
            const hint = result.errors[0]?.error?.message?.includes('LFS')
                ? 'GLB models missing on server. Run: git lfs pull and collectstatic'
                : 'Character models failed to load. Check browser console.';
            this._showLoadError(hint);
            console.error('[game] No character models loaded', result.errors);
            return;
        }
        if (result.errors.length) {
            console.warn('[game] Some character models failed:', result.errors);
        }

        const buildings = this.world?.buildings || this.data.buildings || [];
        this.citizens.spawn(this.data.team || [], buildings);

        this.player = createHumanAvatar({
            gender: 'male', modelKey: 'male', outfitPreset: 0,
            targetHeight: PLAYER.height, variant: 0,
        });
        this.player.visible = false;
        this.scene.add(this.player);
        this.chunks.markAlwaysVisible(this.player);

        const welcome = this.data.welcome || {};
        this.welcomeHuman = createHumanAvatar({
            gender: 'male', modelKey: 'male', name: welcome.humanName, outfitPreset: 1,
            targetHeight: PLAYER.height,
        });
        this.welcomeHuman.visible = false;
        this.welcomeHuman.add(createNameTag(welcome.humanName || 'Human Ambassador'));
        this.scene.add(this.welcomeHuman);

        this.welcomeAlien = createAlienAvatar({
            variant: 0, modelKey: 'female', name: welcome.alienName, targetHeight: PLAYER.height,
        });
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

        this._ready = true;
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('start-screen')?.classList.remove('hidden');
        this.state = 'start';

    }

    _renderer() {
        const el = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        el.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 900);
        this.camera.position.set(0, 8, 60);

        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
        });
    }

    _ui() {
        document.getElementById('btn-start')?.addEventListener('click', () => {
            audio.init();
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
            if (e.code === 'KeyC' && this.state === 'playing' && this.player) {
                const preset = cycleOutfitPreset(this.player);
                const el = document.getElementById('outfit-display');
                if (el) el.textContent = preset.name;
            }
            if (e.code === 'KeyG' && this.state === 'playing' && this.player) {
                playEmote(this.player);
            }
        });
    }

    _afterCinematic() {
        this.state = 'dialogue';
        this.chunks?.preloadAround(0, 115, 3);
        this.playerCtrl.setPosition(0, 115);
        this.dialogue.start(this.dialogue.getIntroDialogue(), () => {
            this.state = 'playing';
            this.playerCtrl.syncCameraToPlayer();
            this.playerCtrl.enable();
            document.getElementById('hud')?.classList.add('visible');
            document.getElementById('side-toolbar')?.classList.add('visible');
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
                this.chunks?.preloadAround(d.x, d.z, 3);
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
        if (!this._ready || !this.player) return;
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
        if (!this._ready || !this.player) return;
        if (this.state === 'riding') {
            const p = this.player.position;
            document.getElementById('coord-display').textContent = `${p.x.toFixed(0)}, ${p.z.toFixed(0)}`;
            document.getElementById('zone-display').textContent = 'IN TRANSIT';
            return;
        }
        if (this.state !== 'playing') return;
        const p = this.player.position;
        document.getElementById('coord-display').textContent = `${p.x.toFixed(0)}, ${p.z.toFixed(0)}`;
        // Simple zone label based on position in the Japanese city grid
        let zoneLabel = 'OUTSIDE TOWN';
        if (Math.abs(p.x) < 80 && Math.abs(p.z) < 65) {
            if (p.z < -16) zoneLabel = p.x < 0 ? 'NORTH-WEST' : 'NORTH-EAST';
            else if (p.z > 16) zoneLabel = p.x < 0 ? 'SOUTH-WEST' : 'SOUTH-EAST';
            else zoneLabel = p.x < -38 ? 'WEST ALLEY' : p.x > 38 ? 'EAST ALLEY' : 'MAIN STREET';
        }
        document.getElementById('zone-display').textContent = this.nearestTarget?.subtitle || zoneLabel;
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
        if (!c || !this._ready || !this.player || (this.state !== 'playing' && this.state !== 'riding')) return;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height;
        const sc = w / 480;  // larger city → slightly zoomed-out map
        const cx = w / 2, cy = h / 2;

        // 1. Grass background (warm green)
        ctx.fillStyle = '#90c87a';
        ctx.fillRect(0, 0, w, h);

        // 2. Larger city concrete slab
        ctx.fillStyle = '#a8b4b0';
        ctx.fillRect(cx - 165 * sc, cy - 145 * sc, 330 * sc, 290 * sc);

        // 3. River along the West side
        ctx.fillStyle = '#7ac4d0';
        ctx.fillRect(cx - 168 * sc, cy - 150 * sc, 18 * sc, 300 * sc);

        // 4. Few roads only (tree-avenue layout)
        ctx.fillStyle = '#6a747c';
        // Main Avenue N–S (X=0)
        ctx.fillRect(cx - 5.5 * sc, cy - 135 * sc, 11 * sc, 270 * sc);
        // Cross Boulevard E–W (Z=0)
        ctx.fillRect(cx - 155 * sc, cy - 5 * sc, 310 * sc, 10 * sc);
        // North Quiet Lane (Z=-90)
        ctx.fillRect(cx - 145 * sc, cy - 94 * sc, 290 * sc, 8 * sc);
        // South Quiet Lane (Z=90)
        ctx.fillRect(cx - 145 * sc, cy + 86 * sc, 290 * sc, 8 * sc);

        // Tree-line hint (green edges along main avenue)
        ctx.fillStyle = 'rgba(90, 168, 80, 0.55)';
        ctx.fillRect(cx - 8.5 * sc, cy - 135 * sc, 2.2 * sc, 270 * sc);
        ctx.fillRect(cx + 6.3 * sc, cy - 135 * sc, 2.2 * sc, 270 * sc);

        // 5. Central plaza
        ctx.fillStyle = '#78b060';
        ctx.beginPath();
        ctx.arc(cx, cy, 14 * sc, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = '#c8c4b8';
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5 * sc, 0, 6.28);
        ctx.fill();

        // District labels
        ctx.font = `bold ${Math.max(6, 6.5 * sc)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(30,42,56,0.65)';
        ctx.fillText('MAIN AVE', cx, cy - 50 * sc);
        ctx.fillText('EAST BLOCK', cx + 90 * sc, cy - 40 * sc);
        ctx.fillText('WEST BLOCK', cx - 90 * sc, cy + 35 * sc);
        ctx.fillText('SOUTH LANE', cx, cy + 100 * sc);
        ctx.fillText('NORTH LANE', cx, cy - 100 * sc);

        // POI dots
        this.interactables.forEach(item => {
            const mx = cx + item.position.x * sc;
            const my = cy + item.position.z * sc;
            const col = POI_MAP_COLORS[item.type] || '#4a8';
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(mx, my, item.type === 'hq' ? 5 : 3.5, 0, 6.28);
            ctx.fill();
            if (item.mapLabel && ['hq', 'service', 'project', 'contact'].includes(item.type)) {
                ctx.fillStyle = 'rgba(30,42,56,0.8)';
                ctx.font = '7px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(item.mapLabel, mx + 5, my + 2);
            }
        });

        // Player dot (white with dark ring)
        const px = cx + this.player.position.x * sc;
        const py = cy + this.player.position.z * sc;
        ctx.fillStyle = '#1e2a38';
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, 6.28);
        ctx.fill();
    }

    _loop() {
        requestAnimationFrame(() => this._loop());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this._ready) {
            if (this.cinematic?.isActive()) {
                this.cinematic.update(dt);
            } else if (this.ride?.isActive()) {
                this.ride.update(dt);
                this.transit.update(dt);
                this.citizens.update(dt);
                this.chunks?.update(this.player.position.x, this.player.position.z);
            } else if (this.state === 'playing' && this.playerCtrl) {
                this.playerCtrl.update(dt);
                this.transit.update(dt);
                this.citizens.update(dt);
                this.chunks?.update(this.player.position.x, this.player.position.z);
            }

            this._proximity();
            this._hud();
            this._minimap();
        }

        if (this.terrain?.update) {
            this.terrain.update(dt);
        }

        this._animateClouds(dt);
        this.renderer.render(this.scene, this.camera);
    }

    _animateClouds(dt) {
        const clouds = this.world?._cloudMeshes || this.world?.cloudMeshes || [];
        if (!clouds.length) return;
        clouds.forEach(c => {
            if (!c?.g) return;
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