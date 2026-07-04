import * as THREE from 'three';
import { COLORS } from './config.js';

export class CinematicIntro {
    constructor(scene, camera, ufo, player, npcs, worldBuilder, onComplete) {
        this.scene = scene;
        this.camera = camera;
        this.ufo = ufo;
        this.player = player;
        this.npcs = npcs;
        this.world = worldBuilder;
        this.onComplete = onComplete;
        this.active = false;
        this.time = 0;
        this.duration = 20;
        this.landingPos = new THREE.Vector3(0, 3, 30);
    }

    start() {
        this.active = true;
        this.time = 0;
        document.body.classList.add('cinematic');

        this.ufo.visible = true;
        this.ufo.position.set(0, 120, 80);
        this.ufo.rotation.set(0, 0, 0);

        this.player.visible = false;
        this.player.position.set(0, 1.2, 0);
        this.ufo.add(this.player);

        this.npcs.forEach(npc => { npc.visible = false; });

        const ramp = this.ufo.getObjectByName('rampPivot');
        if (ramp) ramp.rotation.x = -Math.PI / 2;

        const door = this.ufo.getObjectByName('door');
        if (door) door.position.z = 3.85;

        this.camera.position.set(60, 90, 120);
        this.camera.lookAt(0, 0, 0);
    }

    update(dt) {
        if (!this.active) return;
        this.time += dt;

        const beam = this.ufo.getObjectByName('beam');
        const ramp = this.ufo.getObjectByName('rampPivot');
        const door = this.ufo.getObjectByName('door');
        const dust = this.ufo.getObjectByName('dustRing');

        if (this.time < 4) {
            const t = this.time / 4;
            this.ufo.position.y = THREE.MathUtils.lerp(120, 25, t);
            this.ufo.position.z = THREE.MathUtils.lerp(80, 35, t);
            this.ufo.rotation.y += dt * 0.8;
            if (beam) beam.material.opacity = 0.05 + t * 0.15;

            this.camera.position.set(
                80 * Math.cos(this.time * 0.2),
                60 + Math.sin(this.time * 0.4) * 10,
                100 + this.time * 8
            );
            this.camera.lookAt(this.ufo.position);
        } else if (this.time < 8) {
            const t = (this.time - 4) / 4;
            this.ufo.position.y = THREE.MathUtils.lerp(25, this.landingPos.y, t);
            this.ufo.position.z = THREE.MathUtils.lerp(35, this.landingPos.z, t);
            this.ufo.rotation.y = THREE.MathUtils.lerp(this.ufo.rotation.y, 0, t * 0.5);

            if (beam) beam.material.opacity = 0.2 - t * 0.1;
            if (dust) dust.material.opacity = t > 0.7 ? (t - 0.7) * 2 : 0;

            this.camera.position.set(
                THREE.MathUtils.lerp(50, 18, t),
                THREE.MathUtils.lerp(25, 10, t),
                THREE.MathUtils.lerp(55, 48, t)
            );
            this.camera.lookAt(0, 2, 30);
        } else if (this.time < 10) {
            const t = (this.time - 8) / 2;
            this.ufo.position.y = THREE.MathUtils.lerp(this.landingPos.y, 3.2, t);

            if (ramp) ramp.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.15, t);
            if (door) door.position.z = THREE.MathUtils.lerp(3.85, 4.5, t);
            if (beam) beam.material.opacity = THREE.MathUtils.lerp(beam.material.opacity, 0, dt * 3);
            if (dust) dust.material.opacity = THREE.MathUtils.lerp(dust.material.opacity, 0.4, t);

            this.camera.position.set(12, 6, 42);
            this.camera.lookAt(0, 2, 32);
        } else if (this.time < 14) {
            const t = (this.time - 10) / 4;
            this.player.visible = true;

            const rampEnd = new THREE.Vector3(0, 0.1, 3.5 + 3.5);
            rampEnd.applyMatrix4(this.ufo.matrixWorld);

            const startLocal = new THREE.Vector3(0, 1.2, 0.5);
            const midLocal = new THREE.Vector3(0, 0.8, 2.5);
            const endLocal = new THREE.Vector3(0, 0, 5.8);

            let localPos;
            if (t < 0.4) {
                const lt = t / 0.4;
                localPos = startLocal.clone().lerp(midLocal, lt);
            } else {
                const lt = (t - 0.4) / 0.6;
                localPos = midLocal.clone().lerp(endLocal, lt);
            }
            this.player.position.copy(localPos);
            this.player.rotation.y = Math.PI;

            const walkBob = Math.sin(t * 20) * 0.03;
            this.player.position.y += walkBob;

            this.camera.position.set(
                THREE.MathUtils.lerp(12, 6, t),
                5,
                THREE.MathUtils.lerp(42, 40, t)
            );
            this.camera.lookAt(
                this.player.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.5, 0))
            );
        } else if (this.time < 17) {
            const t = (this.time - 14) / 3;

            if (this.player.parent === this.ufo) {
                const worldPos = this.player.getWorldPosition(new THREE.Vector3());
                const worldRot = this.player.rotation.y + this.ufo.rotation.y;
                this.ufo.remove(this.player);
                this.scene.add(this.player);
                this.player.position.copy(worldPos);
                this.player.rotation.y = worldRot;
            }

            const groundY = this.world.getTerrainHeight(0, 32);
            this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, groundY, t);
            this.player.position.z = THREE.MathUtils.lerp(this.player.position.z, 32, t);

            this.npcs.forEach((npc, i) => {
                npc.visible = true;
                const targetX = -5 + i * 2.5;
                const targetZ = 22 - i * 1.5;
                npc.position.x = THREE.MathUtils.lerp(targetX, targetX, t);
                npc.position.z = THREE.MathUtils.lerp(targetZ + 15, targetZ, t);
                npc.position.y = this.world.getTerrainHeight(npc.position.x, npc.position.z);
                npc.lookAt(this.player.position.x, npc.position.y, this.player.position.z);
            });

            this.camera.position.set(0, 5.5, 40);
            this.camera.lookAt(0, 2, 26);
        } else if (this.time < 19) {
            if (dust) dust.material.opacity = THREE.MathUtils.lerp(dust.material.opacity, 0, dt * 2);

            this.camera.position.set(
                8 * Math.sin(this.time * 0.3),
                6,
                38
            );
            this.camera.lookAt(0, 2, 28);
        } else if (this.time >= this.duration) {
            this._finish();
        }
    }

    _finish() {
        this.active = false;
        document.body.classList.remove('cinematic');

        if (this.player.parent === this.ufo) {
            const worldPos = this.player.getWorldPosition(new THREE.Vector3());
            this.ufo.remove(this.player);
            this.scene.add(this.player);
            this.player.position.copy(worldPos);
        }

        this.player.position.y = this.world.getTerrainHeight(
            this.player.position.x,
            this.player.position.z
        );
        this.player.visible = true;
        this.npcs.forEach(npc => { npc.visible = true; });

        const dust = this.ufo.getObjectByName('dustRing');
        if (dust) dust.material.opacity = 0;

        if (this.onComplete) this.onComplete();
    }

    isActive() {
        return this.active;
    }
}