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
import { MAP_LEGEND, getDistrictAt, getAreaDisplayName } from './Districts.js';
import { getZoneAt, getZoneLabel } from './CityZones.js';
import { drawMinimap } from './Minimap.js';
import { TransitPicker } from './TransitPicker.js';
import { audio } from './AudioManager.js';
import { EnvironmentSystem } from './EnvironmentSystem.js';
import { MobileControls } from './MobileControls.js';

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
        this.chunks = new ChunkManager(80, 2);
        this.terrain = new TerrainSystem();
        this.terrain.build(this.scene);
        const built = new WorldBuilder(this.scene, data, this.terrain, this.chunks).build();
        this.chunks.preloadAround(0, 0, 2);
        this.world = built;
        this.pois = built.pois;
        this.colliders = built.colliders;

        // Location-based day/night + Japan-style seasons (GPS with Tokyo fallback)
        this.environment = new EnvironmentSystem(this.scene, {
            renderer: this.renderer,
            handles: {
                skyMesh: built.skyMesh,
                lights: built.lights,
                groundGrass: built.groundGrass,
            },
        });
        this.environment.init().then((state) => {
            console.info('[env]', state.label, state.location);
        });

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
        this.mobileControls = new MobileControls({
            getPlayerCtrl: () => this.playerCtrl,
            onInteract: () => {
                if (this.state === 'playing' && !this.dialogue.active && this.nearestTarget) {
                    this._interact(this.nearestTarget);
                } else if (this.dialogue?.active) {
                    this.dialogue.advance();
                }
            },
        });
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
        // antialias off + lower DPR: biggest fill-rate win on retina laptops
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
        });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        // Skip sorting translucent props every frame when possible
        this.renderer.sortObjects = true;
        el.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 520);
        this.camera.position.set(0, 8, 60);
        this._frame = 0;

        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
            this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
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
            document.getElementById('height-control')?.classList.add('visible');
            this.mobileControls?.show();
            const hint = document.getElementById('physics-hint');
            if (hint) {
                // Mobile: shorter, touch-friendly hint
                if (this.mobileControls?.isMobileUi()) {
                    hint.innerHTML = 'Drag right side to look · Joystick to move · <b>RUN</b> / <b>JUMP</b> / <b>E</b>';
                }
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
                [{
                    speaker: target.title,
                    text: target.content,
                    gender: target.gender || target.citizen?.gender || 'male',
                }],
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
        this.mobileControls?.hide();
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
                this.mobileControls?.show();
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
        this.mobileControls?.setInteractAvailable(!!best);
        if (best) {
            prompt.classList.add('visible');
            let verb = 'Visit';
            let label = best.title;
            if (best.type === 'citizen') {
                verb = best.isHost ? 'Learn about' : 'Talk to';
                label = best.isHost ? (best.hostBuilding || best.panelTitle) : best.title;
            } else if (best.type === 'train_station' || best.type === 'bus_stop') verb = 'Travel to city from';
            const isMobile = this.mobileControls?.isMobileUi?.();
            prompt.innerHTML = isMobile
                ? `<kbd>E</kbd> ${verb} ${label}`
                : `<kbd>E</kbd> ${verb} ${label}`;
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
        const areaName = getAreaDisplayName(p.x, p.z);
        const zone = getZoneLabel(getZoneAt(p.x, p.z));
        document.getElementById('zone-display').textContent =
            this.nearestTarget?.subtitle || areaName || zone || 'OUTSIDE TOWN';
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
        drawMinimap(ctx, {
            player: {
                x: this.player.position.x,
                z: this.player.position.z,
                rotationY: this.player.rotation?.y ?? 0,
            },
            pois: this.interactables || [],
            worldSpan: 540,
        });
    }

    _loop() {
        requestAnimationFrame(() => this._loop());
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this._frame = (this._frame || 0) + 1;

        if (this._ready) {
            if (this.cinematic?.isActive()) {
                this.cinematic.update(dt);
            } else if (this.ride?.isActive()) {
                this.ride.update(dt);
                this.transit.update(dt);
                // NPCs every other frame while riding
                if ((this._frame & 1) === 0) this.citizens.update(dt * 2);
                this.chunks?.update(this.player.position.x, this.player.position.z);
            } else if (this.state === 'playing' && this.playerCtrl) {
                this.playerCtrl.update(dt);
                this.transit.update(dt);
                this.citizens.setFocus?.(this.player.position.x, this.player.position.z);
                this.citizens.update(dt);
                this.chunks?.update(this.player.position.x, this.player.position.z);
            }

            // HUD / proximity / minimap at lower rate — not every frame
            if ((this._frame % 2) === 0) this._proximity();
            if ((this._frame % 3) === 0) this._hud();
            if ((this._frame % 4) === 0) this._minimap();
        }

        if (this.terrain?.update && (this._frame % 2) === 0) {
            this.terrain.update(dt * 2);
        }

        this.environment?.update(dt);
        if ((this._frame % 2) === 0) this._animateClouds(dt * 2);
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