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

        // 3-second quick drone overview sweep settling behind player in Central Park
        const t = ease(time / 3.0);
        pos.lerpVectors(new THREE.Vector3(WORLD.parkX + 50, 24, WORLD.parkZ + 50), new THREE.Vector3(WORLD.parkX, 5.0, WORLD.parkZ + 6), t);
        look.lerpVectors(new THREE.Vector3(WORLD.parkX, 6, WORLD.parkZ - 20), new THREE.Vector3(WORLD.parkX, 1.2, WORLD.parkZ - 12), t);

        return { pos, look };
    }

    update(dt) {
        if (!this.active) return;
        this.time += dt;

        // Keep UFO high in the sky and hidden
        this.ufo.position.set(WORLD.parkX, 250, WORLD.parkZ);
        this.player.visible = false;
        
        // Show welcome characters standing in park
        if (this.welcome.human) {
            this.welcome.human.visible = true;
            this.welcome.human.position.set(WORLD.parkX - 6, footY(this.welcome.human), WORLD.parkZ - 10);
        }
        if (this.welcome.alien) {
            this.welcome.alien.visible = true;
            this.welcome.alien.position.set(WORLD.parkX + 6, footY(this.welcome.alien), WORLD.parkZ - 10);
        }
        this.npcs.forEach(n => { n.visible = true; });

        if (this.time < 3.0) {
            const path = this._getDronePath(this.time);
            this.camera.position.copy(path.pos);
            this.camera.lookAt(path.look);
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