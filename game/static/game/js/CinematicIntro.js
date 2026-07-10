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

        // Initial UFO position high up
        this.ufo.position.set(WORLD.parkX, 120, WORLD.parkZ);
        this.player.visible = false;
        this.player.position.set(0, 1.2, 0.5);
        this.ufo.add(this.player);

        const thruster = this.ufo.getObjectByName('thrusterLight');
        if (thruster) {
            thruster.intensity = 5;
            thruster.color.setHex(0x48D2C9); // vibrant cyan
        }

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

        // Add a clean overlay hints for skipping
        const skipHint = document.createElement('div');
        skipHint.id = 'cinematic-skip-hint';
        skipHint.style.position = 'fixed';
        skipHint.style.bottom = '24px';
        skipHint.style.right = '24px';
        skipHint.style.color = '#fff';
        skipHint.style.fontFamily = 'system-ui, sans-serif';
        skipHint.style.fontSize = '13px';
        skipHint.style.fontWeight = '500';
        skipHint.style.background = 'rgba(15, 23, 42, 0.75)';
        skipHint.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        skipHint.style.padding = '10px 16px';
        skipHint.style.borderRadius = '24px';
        skipHint.style.cursor = 'pointer';
        skipHint.style.zIndex = '1000';
        skipHint.style.letterSpacing = '0.05em';
        skipHint.style.transition = 'all 0.2s';
        skipHint.style.backdropFilter = 'blur(4px)';
        skipHint.innerHTML = 'Press <kbd style="background:rgba(255,255,255,0.25); padding:2px 6px; border-radius:4px;">SPACE</kbd> or Click to Skip';
        document.body.appendChild(skipHint);

        const skip = () => { if (this.active) this._done(); };
        skipHint.addEventListener('click', skip);
        
        this._skipHandler = (e) => {
            if (e.code === 'Space' || e.code === 'Escape') {
                e.preventDefault();
                skip();
            }
        };
        window.addEventListener('keydown', this._skipHandler);
    }

    _spawnDust(x, z) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 2, 24),
            new THREE.MeshBasicMaterial({ color: 0x48D2C9, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.16, z);
        ring.userData.life = 1.5;
        ring.userData.scale = 1.0;
        this.scene.add(ring);
        this.dustRings.push(ring);
    }

    _updateDust(dt) {
        this.dustRings = this.dustRings.filter(ring => {
            ring.userData.life -= dt;
            ring.userData.scale += dt * 8;
            ring.scale.set(ring.userData.scale, ring.userData.scale, 1);
            ring.material.opacity = Math.max(0, ring.userData.life * 0.55);
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

    _getDronePath(time) {
        const pos = new THREE.Vector3();
        const look = new THREE.Vector3();
        
        if (time < 2.2) {
            // Sweep down from mountains over the central avenue
            const t = ease(time / 2.2);
            pos.lerpVectors(new THREE.Vector3(-140, 42, -220), new THREE.Vector3(0, 14, -130), t);
            look.lerpVectors(new THREE.Vector3(0, 5, -120), new THREE.Vector3(0, 4, -40), t);
        } else if (time < 4.4) {
            // Speed under the first highway overpass
            const t = ease((time - 2.2) / 2.2);
            pos.lerpVectors(new THREE.Vector3(0, 14, -130), new THREE.Vector3(0, 3.2, -45), t);
            look.lerpVectors(new THREE.Vector3(0, 4, -40), new THREE.Vector3(WORLD.parkX, 2, WORLD.parkZ), t);
        } else {
            // Rise up towards the park to catch the UFO warp-in
            const t = ease((time - 4.4) / 1.6);
            pos.lerpVectors(new THREE.Vector3(0, 3.2, -45), new THREE.Vector3(WORLD.parkX + 32, 22, WORLD.parkZ + 65), t);
            look.lerpVectors(new THREE.Vector3(WORLD.parkX, 2, WORLD.parkZ), new THREE.Vector3(WORLD.parkX, 8, WORLD.parkZ), t);
        }
        return { pos, look };
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

        if (this.time < 6.0) {
            // 1. Drone Flyby through the city
            const path = this._getDronePath(this.time);
            this.camera.position.copy(path.pos);
            this.camera.lookAt(path.look);
            
            // Keep UFO hidden high up
            this.ufo.position.set(px, 120, pz);
        } else if (this.time < 11.0) {
            // 2. UFO warp-in descent
            const t = ease((this.time - 6.0) / 5.0);
            const bob = Math.sin(this.time * 4) * (1 - t) * 0.9;
            this.ufo.position.y = THREE.MathUtils.lerp(120, 3.8, t) + bob;
            this.ufo.position.z = pz;
            this.ufo.rotation.y = Math.sin(this.time * 0.5) * 0.12 * (1 - t);

            if (thruster) thruster.intensity = THREE.MathUtils.lerp(5, 0.8, t);
            if (rim?.material) rim.material.emissiveIntensity = 0.2 + Math.sin(this.time * 12) * 0.15;

            // Camera moves to lock-on to the UFO descending in the park
            const camT = ease(Math.min(1, (this.time - 6.0) / 4.0));
            this._lerpCamera(
                new THREE.Vector3(px + 32, 22, pz + 65),
                new THREE.Vector3(px + 16, 8, pz + 32),
                new THREE.Vector3(px, 8, pz),
                new THREE.Vector3(px, 1.8, pz),
                camT
            );
        } else if (this.time < 11.5) {
            // 3. Landing shockwave & dust
            const t = (this.time - 11.0) / 0.5;
            this.ufo.position.y = 3.8 - Math.sin(t * Math.PI) * 0.28;
            if (t > 0.3 && this.dustRings.length < 4) {
                this._spawnDust(px, pz);
                this._spawnDust(px - 2, pz + 2);
                this._spawnDust(px + 2, pz - 2);
            }
            this.camera.position.set(px + 14, 6.2, pz + 24);
            this.camera.lookAt(px, 1.5, pz);
        } else if (this.time < 13.5) {
            // 4. Ramp opening
            const t = ease((this.time - 11.5) / 2.0);
            if (ramp) ramp.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.15, t);
            if (thruster) thruster.intensity = 0.25;
            this.camera.position.set(
                THREE.MathUtils.lerp(px + 14, px + 8, t),
                THREE.MathUtils.lerp(6.2, 5.0, t),
                THREE.MathUtils.lerp(pz + 24, pz + 18, t)
            );
            this.camera.lookAt(px, 1.4, pz);
        } else if (this.time < 17.0) {
            // 5. Player walks down the ramp
            const t = easeOut((this.time - 13.5) / 3.5);
            this.player.visible = true;
            this._walkPhase += dt * 5;
            this.player.position.set(
                0,
                THREE.MathUtils.lerp(1.2, 0, t),
                THREE.MathUtils.lerp(0.5, 5.2, t)
            );
            this.player.rotation.y = Math.PI;
            animateHumanWalk(this.player, this._walkPhase, 0.85);

            this.camera.position.set(px + 6, 4.8, pz + 16);
            this.camera.lookAt(px, 1.3, pz + 2);
        } else if (this.time < 20.0) {
            // 6. Player steps off ramp onto grass
            const t = ease((this.time - 17.0) / 3.0);
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
            animateHumanWalk(this.player, this._walkPhase, 1.0);

            this.camera.position.set(
                THREE.MathUtils.lerp(px + 6, px, t),
                4.8,
                THREE.MathUtils.lerp(pz + 15, pz + 9, t)
            );
            this.camera.lookAt(px, 1.4, THREE.MathUtils.lerp(pz, pz - 5, t));
        } else if (this.time < 27.5) {
            // 7. Ambassadors step forward and greet
            const t = ease((this.time - 20.0) / 7.5);
            const playerZ = pz - 10;

            this._walkPhase += dt * 2;
            this.player.position.set(px, footY(this.player), playerZ);
            this.player.rotation.y = 0;
            animateHumanWalk(this.player, this._walkPhase, 0.25);

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
                npc.visible = t > 0.4;
                npc.position.set(-10 + i * 5, footY(npc), pz - 16 - i);
                npc.lookAt(px, footY(npc) + 1, playerZ);
            });

            const camAngle = t * 0.45;
            this.camera.position.set(
                px + Math.sin(camAngle) * 11,
                THREE.MathUtils.lerp(4.8, 3.8, t),
                pz + Math.cos(camAngle) * 7.5
            );
            this.camera.lookAt(px, 1.5, playerZ);
        } else {
            this._done();
        }
    }

    _done() {
        this.active = false;
        document.body.classList.remove('cinematic');

        // Clean up UI skip element and keypress listener
        const skipHint = document.getElementById('cinematic-skip-hint');
        if (skipHint) skipHint.remove();
        if (this._skipHandler) {
            window.removeEventListener('keydown', this._skipHandler);
            this._skipHandler = null;
        }

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