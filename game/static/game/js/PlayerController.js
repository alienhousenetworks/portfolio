import * as THREE from 'three';
import { PLAYER, WORLD } from './config.js';

const BOUND = 140;

export class PlayerController {
    constructor(camera, avatar, colliders) {
        this.camera = camera;
        this.avatar = avatar;
        this.colliders = colliders;
        this.velocity = new THREE.Vector3();
        this.camAngle = 0;
        this.keys = {};
        this.enabled = false;
        this.isRunning = false;
        this.walkCycle = 0;
        this._input();
    }

    _input() {
        addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code.startsWith('Shift')) this.isRunning = true;
        });
        addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code.startsWith('Shift')) this.isRunning = false;
        });
        let drag = false, lx = 0;
        addEventListener('mousedown', e => { if (this.enabled) { drag = true; lx = e.clientX; } });
        addEventListener('mouseup', () => { drag = false; });
        addEventListener('mousemove', e => {
            if (!this.enabled || !drag) return;
            this.camAngle -= (e.clientX - lx) * 0.004;
            lx = e.clientX;
        });
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; this.velocity.set(0, 0, 0); }

    update(dt) {
        if (!this.enabled) return;
        const speed = this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const fwd = new THREE.Vector3(-Math.sin(this.camAngle), 0, -Math.cos(this.camAngle));
        const right = new THREE.Vector3(Math.cos(this.camAngle), 0, -Math.sin(this.camAngle));
        const dir = new THREE.Vector3();

        if (this.keys.KeyW || this.keys.ArrowUp) dir.add(fwd);
        if (this.keys.KeyS || this.keys.ArrowDown) dir.sub(fwd);
        if (this.keys.KeyA || this.keys.ArrowLeft) dir.sub(right);
        if (this.keys.KeyD || this.keys.ArrowRight) dir.add(right);

        if (dir.lengthSq() > 0) {
            dir.normalize();
            this.velocity.set(dir.x * speed, 0, dir.z * speed);
            this.avatar.rotation.y = Math.atan2(dir.x, dir.z);
            this.walkCycle += dt * 8;
        } else {
            this.velocity.lerp(new THREE.Vector3(), 8 * dt);
        }

        let nx = this.avatar.position.x + this.velocity.x * dt;
        let nz = this.avatar.position.z + this.velocity.z * dt;
        if (this._hit(nx, this.avatar.position.z)) nx = this.avatar.position.x;
        if (this._hit(this.avatar.position.x, nz)) nz = this.avatar.position.z;

        this.avatar.position.x = THREE.MathUtils.clamp(nx, -BOUND, BOUND);
        this.avatar.position.z = THREE.MathUtils.clamp(nz, -BOUND, BOUND);
        this.avatar.position.y = WORLD.groundY;

        (this.avatar.userData.walkParts || []).forEach((name, i) => {
            const p = this.avatar.getObjectByName(name);
            if (p && this.velocity.lengthSq() > 0.5) {
                const s = Math.sin(this.walkCycle + i) * 0.3;
                if (name.includes('leg')) p.rotation.x = s;
                if (name.includes('arm')) p.rotation.x = -s * 0.5;
            }
        });

        const target = this.avatar.position.clone();
        target.y += 1.5;
        const off = new THREE.Vector3(Math.sin(this.camAngle) * 7, 5, Math.cos(this.camAngle) * 7);
        this.camera.position.lerp(target.clone().add(off), 0.1);
        this.camera.lookAt(target);
    }

    _hit(x, z) {
        for (const c of this.colliders) {
            if (Math.abs(x - c.x) < c.w / 2 + PLAYER.radius && Math.abs(z - c.z) < c.d / 2 + PLAYER.radius)
                return true;
        }
        return false;
    }
}