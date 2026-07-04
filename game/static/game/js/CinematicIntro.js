import * as THREE from 'three';
import { COLORS } from './config.js';

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
        this.duration = 12;
        this.phase = 0;
    }

    start() {
        this.active = true;
        this.time = 0;
        document.body.classList.add('cinematic');

        this.ufo.visible = true;
        this.ufo.position.set(0, 80, 50);
        this.player.visible = false;
        this.npcs.forEach(npc => { npc.visible = false; });

        this.camera.position.set(30, 40, 80);
        this.camera.lookAt(0, 20, 30);
    }

    update(dt) {
        if (!this.active) return;

        this.time += dt;
        const t = this.time / this.duration;

        if (this.time < 4) {
            this.ufo.position.y = THREE.MathUtils.lerp(80, 5, this.time / 4);
            this.ufo.position.z = THREE.MathUtils.lerp(50, 30, this.time / 4);
            this.ufo.rotation.y += dt * 0.5;

            const beam = this.ufo.getObjectByName('beam');
            if (beam) beam.material.opacity = 0.1 + Math.sin(this.time * 3) * 0.05;

            this.camera.position.set(
                40 * Math.cos(this.time * 0.3),
                30 + Math.sin(this.time * 0.5) * 5,
                60 + this.time * 5
            );
            this.camera.lookAt(this.ufo.position);
        } else if (this.time < 7) {
            const localT = (this.time - 4) / 3;
            this.ufo.position.y = THREE.MathUtils.lerp(5, 3, localT);
            this.camera.position.set(
                THREE.MathUtils.lerp(40, 15, localT),
                THREE.MathUtils.lerp(15, 8, localT),
                THREE.MathUtils.lerp(50, 40, localT)
            );
            this.camera.lookAt(0, 2, 30);
        } else if (this.time < 9) {
            const localT = (this.time - 7) / 2;
            this.player.visible = true;
            this.player.position.set(0, 0, 32);
            this.player.position.y = 0;

            this.camera.position.set(
                THREE.MathUtils.lerp(15, 5, localT),
                THREE.MathUtils.lerp(8, 4, localT),
                THREE.MathUtils.lerp(40, 38, localT)
            );
            this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
        } else if (this.time < 11) {
            const localT = (this.time - 9) / 2;
            this.npcs.forEach((npc, i) => {
                npc.visible = true;
                const targetZ = 22 - i * 2;
                npc.position.z = THREE.MathUtils.lerp(targetZ + 10, targetZ, localT);
            });

            this.camera.position.set(0, 5, 42);
            this.camera.lookAt(0, 2, 25);
        } else if (this.time >= this.duration) {
            this._finish();
        }

        const beam = this.ufo.getObjectByName('beam');
        if (beam && this.time > 4) {
            beam.material.opacity = THREE.MathUtils.lerp(beam.material.opacity, 0, dt * 2);
        }
    }

    _finish() {
        this.active = false;
        document.body.classList.remove('cinematic');
        this.ufo.position.set(0, 3, 30);

        this.npcs.forEach(npc => { npc.visible = true; });

        if (this.onComplete) this.onComplete();
    }

    isActive() {
        return this.active;
    }
}