import * as THREE from 'three';
import { WORLD } from './config.js';
import { animateHumanWalk } from './AvatarFactory.js';
import { floorYForAvatar } from './CharacterModels.js';

function footY(mesh, surfaceY = WORLD.groundY) {
    return mesh ? floorYForAvatar(mesh, surfaceY) : surfaceY;
}

function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

export class CinematicIntro {
    constructor(scene, camera, ufo, player, npcs, welcome, onComplete) {
        this.scene = scene;
        this.camera = camera;
        this.ufo = ufo;
        this.player = player;
        this.npcs = npcs || [];
        this.welcome = welcome || {};
        this.onComplete = onComplete;
        this.active = false;
        this.time = 0;
        this.dustRings = [];
        this._walkPhase = 0;
    }

    start() {
        this.active = true;
        this.time = 0;
        this._walkPhase = 0;
        document.body.classList.add('cinematic');

        this.ufo.position.set(WORLD.parkX, 80, WORLD.parkZ + 55);
        this.player.visible = false;
        this.player.position.set(0, 1.2, 0.5);
        this.ufo.add(this.player);

        const thruster = this.ufo.getObjectByName('thrusterLight');
        if (thruster) thruster.intensity = 3;

        this.npcs.forEach(n => { n.visible = false; });
        if (this.welcome.human) {
            this.welcome.human.visible = false;
            this.welcome.human.position.set(WORLD.parkX - 16, footY(this.welcome.human), WORLD.parkZ + 12);
        }
        if (this.welcome.alien) {
            this.welcome.alien.visible = false;
            this.welcome.alien.position.set(WORLD.parkX + 16, footY(this.welcome.alien), WORLD.parkZ + 12);
        }

        const ramp = this.ufo.getObjectByName('rampPivot');
        if (ramp) ramp.rotation.x = -Math.PI / 2;

        this.camera.position.set(WORLD.parkX + 35, 25, WORLD.parkZ + 70);
        this.camera.lookAt(WORLD.parkX, 5, WORLD.parkZ);
    }

    _spawnDust(x, z) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 2, 24),
            new THREE.MeshBasicMaterial({ color: 0xccbb99, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.15, z);
        ring.userData.life = 1.2;
        ring.userData.scale = 1;
        this.scene.add(ring);
        this.dustRings.push(ring);
    }

    _updateDust(dt) {
        this.dustRings = this.dustRings.filter(ring => {
            ring.userData.life -= dt;
            ring.userData.scale += dt * 4;
            ring.scale.set(ring.userData.scale, ring.userData.scale, 1);
            ring.material.opacity = Math.max(0, ring.userData.life * 0.4);
            if (ring.userData.life <= 0) {
                this.scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
                return false;
            }
            return true;
        });
    }

    _lerpCamera(fromPos, toPos, fromLook, toLook, t) {
        this.camera.position.lerpVectors(fromPos, toPos, t);
        const look = new THREE.Vector3().lerpVectors(fromLook, toLook, t);
        this.camera.lookAt(look);
    }

    update(dt) {
        if (!this.active) return;
        this.time += dt;
        this._updateDust(dt);

        const ramp = this.ufo.getObjectByName('rampPivot');
        const thruster = this.ufo.getObjectByName('thrusterLight');
        const rim = this.ufo.getObjectByName('rimLight');
        const pz = WORLD.parkZ;
        const px = WORLD.parkX;

        if (this.time < 7) {
            const t = ease(this.time / 7);
            const bob = Math.sin(this.time * 3) * (1 - t) * 0.8;
            this.ufo.position.y = THREE.MathUtils.lerp(80, 3.8, t) + bob;
            this.ufo.position.z = THREE.MathUtils.lerp(pz + 55, pz, t);
            this.ufo.rotation.y = Math.sin(this.time * 0.4) * 0.08 * (1 - t);

            if (thruster) thruster.intensity = THREE.MathUtils.lerp(3, 0.6, t);
            if (rim?.material) rim.material.emissiveIntensity = 0.15 + Math.sin(this.time * 8) * 0.1;

            const camT = ease(Math.min(1, this.time / 6));
            this._lerpCamera(
                new THREE.Vector3(px + 35, 25, pz + 70),
                new THREE.Vector3(px + 18, 10, pz + 38),
                new THREE.Vector3(px, 8, pz + 20),
                new THREE.Vector3(px, 2, pz),
                camT
            );
        } else if (this.time < 7.4) {
            const t = (this.time - 7) / 0.4;
            this.ufo.position.y = 3.8 - Math.sin(t * Math.PI) * 0.35;
            if (t > 0.5 && this.dustRings.length < 3) {
                this._spawnDust(px, pz);
            }
            this.camera.position.set(px + 14, 7, pz + 28);
            this.camera.lookAt(px, 1.5, pz);
        } else if (this.time < 9.5) {
            const t = ease((this.time - 7.4) / 2.1);
            if (ramp) ramp.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.15, t);
            if (thruster) thruster.intensity = 0.3;
            this.camera.position.set(
                THREE.MathUtils.lerp(px + 14, px + 8, t),
                THREE.MathUtils.lerp(7, 5.5, t),
                THREE.MathUtils.lerp(pz + 28, pz + 20, t)
            );
            this.camera.lookAt(px, 1.5, pz);
        } else if (this.time < 13) {
            const t = easeOut((this.time - 9.5) / 3.5);
            this.player.visible = true;
            this._walkPhase += dt * 5;
            this.player.position.set(
                0,
                THREE.MathUtils.lerp(1.2, 0, t),
                THREE.MathUtils.lerp(0.5, 5.2, t)
            );
            this.player.rotation.y = Math.PI;
            animateHumanWalk(this.player, this._walkPhase, 0.8);

            this.camera.position.set(px + 6, 5, pz + 18);
            this.camera.lookAt(px, 1.4, pz + 2);
        } else if (this.time < 16) {
            const t = ease((this.time - 13) / 3);
            if (this.player.parent === this.ufo) {
                const wp = this.player.getWorldPosition(new THREE.Vector3());
                this.ufo.remove(this.player);
                this.scene.add(this.player);
                this.player.position.copy(wp);
                this.player.position.y = footY(this.player);
            }
            this._walkPhase += dt * 6;
            this.player.position.set(
                px,
                footY(this.player),
                THREE.MathUtils.lerp(pz, pz - 9, t)
            );
            this.player.rotation.y = Math.PI;
            animateHumanWalk(this.player, this._walkPhase, 1);

            this.camera.position.set(
                THREE.MathUtils.lerp(px + 6, px, t),
                5,
                THREE.MathUtils.lerp(pz + 16, pz + 10, t)
            );
            this.camera.lookAt(px, 1.5, THREE.MathUtils.lerp(pz, pz - 5, t));
        } else if (this.time < 24) {
            const t = ease((this.time - 16) / 8);
            const playerZ = pz - 10;

            this._walkPhase += dt * 2;
            this.player.position.set(px, footY(this.player), playerZ);
            this.player.rotation.y = 0;
            animateHumanWalk(this.player, this._walkPhase, 0.3);

            if (this.welcome.human) {
                this.welcome.human.visible = true;
                this.welcome.human.position.set(
                    THREE.MathUtils.lerp(px - 16, px - 5.5, t),
                    footY(this.welcome.human),
                    THREE.MathUtils.lerp(pz + 12, playerZ + 2.5, t)
                );
                this.welcome.human.lookAt(px, footY(this.welcome.human) + 1.5, playerZ);
            }
            if (this.welcome.alien) {
                this.welcome.alien.visible = true;
                this.welcome.alien.position.set(
                    THREE.MathUtils.lerp(px + 16, px + 5.5, t),
                    footY(this.welcome.alien),
                    THREE.MathUtils.lerp(pz + 12, playerZ + 2.5, t)
                );
                this.welcome.alien.lookAt(px, footY(this.welcome.alien) + 1.5, playerZ);
            }

            this.npcs.forEach((npc, i) => {
                npc.visible = t > 0.35;
                npc.position.set(-10 + i * 5, footY(npc), pz - 16 - i);
                npc.lookAt(px, footY(npc) + 1, playerZ);
            });

            const camAngle = t * 0.4;
            this.camera.position.set(
                px + Math.sin(camAngle) * 12,
                THREE.MathUtils.lerp(5, 4.2, t),
                pz + Math.cos(camAngle) * 8
            );
            this.camera.lookAt(px, 1.7, playerZ);
        } else if (this.time >= 25) {
            this._done();
        }
    }

    _done() {
        this.active = false;
        document.body.classList.remove('cinematic');
        const thruster = this.ufo.getObjectByName('thrusterLight');
        if (thruster) thruster.intensity = 0;

        if (this.player.parent === this.ufo) {
            const wp = this.player.getWorldPosition(new THREE.Vector3());
            this.ufo.remove(this.player);
            this.scene.add(this.player);
            this.player.position.copy(wp);
        }
        this.player.position.set(WORLD.parkX, footY(this.player), WORLD.parkZ - 6);
        this.player.rotation.y = 0;
        this.player.visible = true;

        this.npcs.forEach(n => { n.visible = true; });
        if (this.welcome.human) {
            this.welcome.human.position.set(WORLD.parkX - 6, footY(this.welcome.human), WORLD.parkZ - 10);
            this.welcome.human.visible = true;
        }
        if (this.welcome.alien) {
            this.welcome.alien.position.set(WORLD.parkX + 6, footY(this.welcome.alien), WORLD.parkZ - 10);
            this.welcome.alien.visible = true;
        }

        this.dustRings.forEach(r => {
            this.scene.remove(r);
            r.geometry?.dispose();
            r.material?.dispose();
        });
        this.dustRings = [];

        this.onComplete?.();
    }

    isActive() { return this.active; }
}