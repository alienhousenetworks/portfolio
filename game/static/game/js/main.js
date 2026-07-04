import * as THREE from 'three';
import { COLORS } from './config.js';
import { createAvatar, createUFO, createNameTag } from './AvatarFactory.js';
import { WorldBuilder } from './WorldBuilder.js';
import { PlayerController } from './PlayerController.js';
import { DialogueSystem } from './DialogueSystem.js';
import { CinematicIntro } from './CinematicIntro.js';
import { WatercolorPass } from './WatercolorPass.js';

class AlienWorldGame {
    constructor(gameData, textureBase) {
        this.data = gameData;
        this.textureBase = textureBase;
        this.clock = new THREE.Clock();
        this.state = 'loading';
        this.pois = [];
        this.npcs = [];
        this.nearestPOI = null;

        this._initRenderer();
        this._initScene();
        this._buildWorld();
        this._initPlayer();
        this._initNPCs();
        this._initSystems();
        this._bindUI();
        this._animate();
    }

    _initRenderer() {
        const container = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            600
        );

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.watercolor?.setSize(window.innerWidth, window.innerHeight);
        });
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.loader = new THREE.TextureLoader();
    }

    _buildWorld() {
        const builder = new WorldBuilder(this.scene, this.loader, this.data, this.textureBase);
        const result = builder.build();
        this.worldBuilder = builder;
        this.pois = result.pois;
        this.colliders = result.colliders;
        this._updateLoading(60);
    }

    _initPlayer() {
        this.player = createAvatar({
            suitColor: 0x1a2a3a,
            accentColor: COLORS.alienCyan,
            name: 'Visitor',
        });
        this.player.position.set(0, 0, 32);
        this.player.visible = false;
        this.scene.add(this.player);

        this.ufo = createUFO();
        this.ufo.position.set(0, 80, 50);
        this.scene.add(this.ufo);

        this.playerController = new PlayerController(
            this.camera,
            this.player,
            this.worldBuilder,
            this.colliders
        );
        this._updateLoading(80);
    }

    _initNPCs() {
        const team = (this.data.team || []).slice(0, 5);
        const positions = [
            { x: -4, z: 20 },
            { x: 0, z: 18 },
            { x: 4, z: 20 },
            { x: -7, z: 22 },
            { x: 7, z: 22 },
        ];

        team.forEach((member, i) => {
            const npc = createAvatar({
                suitColor: [COLORS.alienDim, 0x1a3a2a, 0x0a2030][i % 3],
                accentColor: COLORS.alien,
                name: member.name,
            });
            npc.position.set(positions[i].x, 0, positions[i].z + 10);
            npc.visible = false;

            const tag = createNameTag(member.name);
            npc.add(tag);

            this.scene.add(npc);
            this.npcs.push({ mesh: npc, data: member, homePos: { ...positions[i], z: positions[i].z } });
        });
        this._updateLoading(95);
    }

    _initSystems() {
        this.dialogue = new DialogueSystem(this.data);
        this.cinematic = new CinematicIntro(
            this.scene,
            this.camera,
            this.ufo,
            this.player,
            this.npcs.map(n => n.mesh),
            () => this._onCinematicComplete()
        );
        this.watercolor = new WatercolorPass(this.renderer, this.scene, this.camera);
        this._updateLoading(100);

        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            this.state = 'start';
        }, 500);
    }

    _bindUI() {
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.state === 'playing' && !this.dialogue.active) {
                if (this.nearestPOI) this._interactPOI(this.nearestPOI);
            }
        });

        document.getElementById('info-close').addEventListener('click', () => {
            document.getElementById('info-panel').classList.remove('active');
            this.playerController.enable();
        });
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        this.state = 'cinematic';
        this.cinematic.start();
    }

    _onCinematicComplete() {
        this.state = 'dialogue';
        this.playerController.setPosition(0, 28);
        this.dialogue.start(this.dialogue.getIntroDialogue(), () => {
            this.state = 'playing';
            this.playerController.enable();
            document.getElementById('hud').classList.add('visible');
            document.querySelector('.back-link').classList.add('visible');
        });
    }

    _interactPOI(poi) {
        this.playerController.disable();
        const panel = document.getElementById('info-panel');
        panel.querySelector('.info-panel-title').textContent = poi.title;
        panel.querySelector('.info-panel-subtitle').textContent = poi.subtitle;
        panel.querySelector('.info-panel-body').textContent = poi.content;
        panel.classList.add('active');
    }

    _updatePOIProximity() {
        if (this.state !== 'playing' || this.dialogue.active) {
            this.nearestPOI = null;
            document.getElementById('interact-prompt').classList.remove('visible');
            return;
        }

        const playerPos = this.player.position;
        let nearest = null;
        let nearestDist = Infinity;

        this.pois.forEach(poi => {
            const dist = playerPos.distanceTo(poi.position);
            if (dist < poi.radius && dist < nearestDist) {
                nearest = poi;
                nearestDist = dist;
            }
            if (poi.marker) {
                poi.marker.children.forEach(child => {
                    if (child.name === 'holo') child.rotation.y += 0.02;
                });
                const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
                const ring = poi.marker.children[1];
                if (ring) ring.scale.set(pulse, pulse, 1);
            }
        });

        this.nearestPOI = nearest;
        const prompt = document.getElementById('interact-prompt');
        if (nearest) {
            prompt.classList.add('visible');
            prompt.innerHTML = `<kbd>E</kbd> Explore: ${nearest.title}`;
        } else {
            prompt.classList.remove('visible');
        }
    }

    _updateHUD() {
        if (this.state !== 'playing') return;
        const pos = this.player.position;
        document.getElementById('coord-display').textContent =
            `${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}`;
        document.getElementById('zone-display').textContent =
            this.nearestPOI ? this.nearestPOI.subtitle : 'EXPLORING';
        document.getElementById('site-display').textContent = this.data.siteName;
    }

    _updateMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (!canvas || this.state !== 'playing') return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const scale = w / 200;

        ctx.fillStyle = 'rgba(0, 10, 5, 0.9)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < w; i += 20) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        this.pois.forEach(poi => {
            const px = w / 2 + poi.position.x * scale;
            const py = h / 2 + poi.position.z * scale;
            ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        const px = w / 2 + this.player.position.x * scale;
        const py = h / 2 + this.player.position.z * scale;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
            px - Math.sin(this.player.rotation.y) * 8,
            py - Math.cos(this.player.rotation.y) * 8
        );
        ctx.stroke();
    }

    _animateNPCs(dt) {
        this.npcs.forEach((npc, i) => {
            if (!npc.mesh.visible) return;
            npc.mesh.position.y = this.worldBuilder.getTerrainHeight(
                npc.mesh.position.x,
                npc.mesh.position.z
            );
            npc.mesh.rotation.y = Math.sin(Date.now() * 0.001 + i) * 0.1;
        });
    }

    _updateLoading(pct) {
        const fill = document.querySelector('.loading-bar-fill');
        if (fill) fill.style.width = `${pct}%`;
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);
        const elapsed = this.clock.getElapsedTime();

        if (this.cinematic?.isActive()) {
            this.cinematic.update(dt);
        } else if (this.state === 'playing') {
            this.playerController.update(dt);
        }

        this._animateNPCs(dt);
        this._updatePOIProximity();
        this._updateHUD();
        this._updateMinimap();

        this.ufo.rotation.y += dt * 0.2;
        const ufoLights = this.ufo.children.filter(c => c.geometry?.type === 'SphereGeometry');
        ufoLights.forEach((light, i) => {
            light.material.emissiveIntensity = 0.8 + Math.sin(elapsed * 3 + i) * 0.4;
        });

        this.watercolor.render(elapsed);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const dataEl = document.getElementById('game-data');
    let gameData = JSON.parse(dataEl.textContent);
    if (typeof gameData === 'string') gameData = JSON.parse(gameData);
    const textureBase = JSON.parse(document.getElementById('texture-base').textContent);
    new AlienWorldGame(gameData, textureBase);
});