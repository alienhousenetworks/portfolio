import * as THREE from 'three';
import { WORLD } from './config.js';

export class CinematicIntro {
    constructor(scene, camera, ufo, player, npcs, welcome, onComplete) {
        this.scene = scene;
        this.camera = camera;
        this.ufo = ufo;
        this.player = player;
        this.npcs = npcs;
        this.welcome = welcome;
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

        if (this.welcome?.human) {
            this.welcome.human.visible = false;
            this.welcome.human.position.set(WORLD.parkX - 14, WORLD.groundY, WORLD.parkZ + 8);
        }
        if (this.welcome?.alien) {
            this.welcome.alien.visible = false;
            this.welcome.alien.position.set(WORLD.parkX + 14, WORLD.groundY, WORLD.parkZ + 8);
        }

        const ramp = this.ufo.getObjectByName('rampPivot');
        if (ramp) ramp.rotation.x = -Math.PI / 2;
    }

    update(dt) {
        if (!this.active) return;
        this.time += dt;
        const ramp = this.ufo.getObjectByName('rampPivot');
        const pz = WORLD.parkZ;
        const px = WORLD.parkX;

        if (this.time < 5) {
            const t = this.time / 5;
            this.ufo.position.y = THREE.MathUtils.lerp(60, 3.5, t);
            this.ufo.position.z = THREE.MathUtils.lerp(pz + 40, pz, t);
            this.camera.position.set(20, 15 + t * 5, pz + 55 - t * 25);
            this.camera.lookAt(px, 2, pz);
        } else if (this.time < 7) {
            const t = (this.time - 5) / 2;
            if (ramp) ramp.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.2, t);
            this.camera.position.set(10, 6, pz + 22);
            this.camera.lookAt(px, 2, pz);
        } else if (this.time < 11) {
            const t = (this.time - 7) / 4;
            this.player.visible = true;
            this.player.position.set(0, THREE.MathUtils.lerp(1, 0, t), THREE.MathUtils.lerp(0.5, 5.5, t));
            this.player.rotation.y = Math.PI;
            this.camera.position.set(6, 5, pz + 18);
            this.camera.lookAt(px, 1.5, pz);
        } else if (this.time < 14) {
            const t = (this.time - 11) / 3;
            if (this.player.parent === this.ufo) {
                const wp = this.player.getWorldPosition(new THREE.Vector3());
                this.ufo.remove(this.player);
                this.scene.add(this.player);
                this.player.position.copy(wp);
                this.player.position.y = WORLD.groundY;
            }
            this.player.position.set(px, WORLD.groundY, THREE.MathUtils.lerp(pz, pz - 8, t));
            this.camera.position.set(px, 5, pz + 12);
            this.camera.lookAt(px, 1.5, pz - 5);
        } else if (this.time < 20) {
            const t = (this.time - 14) / 6;
            const playerZ = pz - 10;

            if (this.welcome?.human) {
                this.welcome.human.visible = true;
                this.welcome.human.position.set(
                    THREE.MathUtils.lerp(px - 14, px - 5, t),
                    WORLD.groundY,
                    THREE.MathUtils.lerp(pz + 8, playerZ + 2, t)
                );
                this.welcome.human.lookAt(this.player.position);
            }
            if (this.welcome?.alien) {
                this.welcome.alien.visible = true;
                this.welcome.alien.position.set(
                    THREE.MathUtils.lerp(px + 14, px + 5, t),
                    WORLD.groundY,
                    THREE.MathUtils.lerp(pz + 8, playerZ + 2, t)
                );
                this.welcome.alien.lookAt(this.player.position);
            }

            this.npcs.forEach((npc, i) => {
                npc.visible = t > 0.4;
                npc.position.set(-10 + i * 5, WORLD.groundY, pz - 16 - i);
                npc.lookAt(this.player.position);
            });

            this.player.position.set(px, WORLD.groundY, playerZ);
            this.camera.position.set(
                THREE.MathUtils.lerp(px, px + 8, t),
                THREE.MathUtils.lerp(5, 4, t),
                THREE.MathUtils.lerp(pz + 8, pz - 2, t)
            );
            this.camera.lookAt(px, 1.8, playerZ);
        } else if (this.time >= 21) {
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
        if (this.welcome?.human) {
            this.welcome.human.position.set(WORLD.parkX - 6, WORLD.groundY, WORLD.parkZ - 10);
            this.welcome.human.visible = true;
        }
        if (this.welcome?.alien) {
            this.welcome.alien.position.set(WORLD.parkX + 6, WORLD.groundY, WORLD.parkZ - 10);
            this.welcome.alien.visible = true;
        }
        this.onComplete?.();
    }

    isActive() { return this.active; }
}