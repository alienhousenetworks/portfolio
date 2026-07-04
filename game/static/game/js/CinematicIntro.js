import * as THREE from 'three';
import { WORLD } from './config.js';

export class CinematicIntro {
    constructor(scene, camera, ufo, player, npcs, onComplete) {
        this.scene = scene;
        this.camera = camera;
        this.ufo = ufo;
        this.player = player;
        this.npcs = npcs;
        this.onComplete = onComplete;
        this.active = false;
        this.time = 0;
        this.landZ = WORLD.parkZ;
    }

    start() {
        this.active = true;
        this.time = 0;
        document.body.classList.add('cinematic');

        this.ufo.position.set(WORLD.parkX, 60, WORLD.parkZ + 40);
        this.player.visible = false;
        this.player.position.set(0, 1, 0);
        this.ufo.add(this.player);
        this.npcs.forEach(n => { n.visible = false; });

        const ramp = this.ufo.getObjectByName('rampPivot');
        if (ramp) ramp.rotation.x = -Math.PI / 2;
    }

    update(dt) {
        if (!this.active) return;
        this.time += dt;
        const ramp = this.ufo.getObjectByName('rampPivot');
        const pz = WORLD.parkZ;

        if (this.time < 5) {
            const t = this.time / 5;
            this.ufo.position.y = THREE.MathUtils.lerp(60, 3.5, t);
            this.ufo.position.z = THREE.MathUtils.lerp(pz + 40, pz, t);
            this.camera.position.set(20, 15 + t * 5, pz + 55 - t * 25);
            this.camera.lookAt(WORLD.parkX, 2, pz);
        } else if (this.time < 7) {
            const t = (this.time - 5) / 2;
            if (ramp) ramp.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.2, t);
            this.camera.position.set(10, 6, pz + 22);
            this.camera.lookAt(WORLD.parkX, 2, pz);
        } else if (this.time < 11) {
            const t = (this.time - 7) / 4;
            this.player.visible = true;
            this.player.position.set(0, THREE.MathUtils.lerp(1, 0, t), THREE.MathUtils.lerp(0.5, 5.5, t));
            this.player.rotation.y = Math.PI;
            this.camera.position.set(6, 5, pz + 18);
            this.camera.lookAt(WORLD.parkX, 1.5, pz);
        } else if (this.time < 14) {
            const t = (this.time - 11) / 3;
            if (this.player.parent === this.ufo) {
                const wp = this.player.getWorldPosition(new THREE.Vector3());
                this.ufo.remove(this.player);
                this.scene.add(this.player);
                this.player.position.copy(wp);
                this.player.position.y = WORLD.groundY;
            }
            this.player.position.set(
                WORLD.parkX,
                WORLD.groundY,
                THREE.MathUtils.lerp(pz, pz - 8, t)
            );

            this.npcs.forEach((npc, i) => {
                npc.visible = true;
                npc.position.set(-8 + i * 5, WORLD.groundY, THREE.MathUtils.lerp(pz + 5, pz - 14, t));
                npc.lookAt(this.player.position);
            });
            this.camera.position.set(WORLD.parkX, 5, pz + 12);
            this.camera.lookAt(WORLD.parkX, 1.5, pz - 5);
        } else if (this.time >= 15) {
            this._done();
        }
    }

    _done() {
        this.active = false;
        document.body.classList.remove('cinematic');
        if (this.player.parent === this.ufo) {
            const wp = this.player.getWorldPosition(new THREE.Vector3());
            this.ufo.remove(this.player);
            this.scene.add(this.player);
            this.player.position.copy(wp);
        }
        this.player.position.set(WORLD.parkX, WORLD.groundY, WORLD.parkZ - 6);
        this.npcs.forEach(n => { n.visible = true; });
        this.onComplete?.();
    }

    isActive() { return this.active; }
}