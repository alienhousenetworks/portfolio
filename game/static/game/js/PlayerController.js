import * as THREE from 'three';
import { PLAYER } from './config.js';

export class PlayerController {
    constructor(camera, avatar, worldBuilder, colliders) {
        this.camera = camera;
        this.avatar = avatar;
        this.world = worldBuilder;
        this.colliders = colliders;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 4, 8);
        this.cameraAngle = 0;
        this.cameraPitch = 0.3;

        this.keys = {};
        this.enabled = false;
        this.isRunning = false;
        this.walkCycle = 0;

        this._bindInput();
    }

    _bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isRunning = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isRunning = false;
        });

        let isDragging = false;
        let lastX = 0;

        document.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            isDragging = true;
            lastX = e.clientX;
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        document.addEventListener('mousemove', (e) => {
            if (!this.enabled || !isDragging) return;
            const dx = e.clientX - lastX;
            this.cameraAngle -= dx * 0.005;
            lastX = e.clientX;
        });

        document.addEventListener('touchstart', (e) => {
            if (!this.enabled || e.touches.length !== 1) return;
            isDragging = true;
            lastX = e.touches[0].clientX;
        });
        document.addEventListener('touchend', () => { isDragging = false; });
        document.addEventListener('touchmove', (e) => {
            if (!this.enabled || !isDragging) return;
            const dx = e.touches[0].clientX - lastX;
            this.cameraAngle -= dx * 0.005;
            lastX = e.touches[0].clientX;
        });
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.velocity.set(0, 0, 0);
    }

    get position() {
        return this.avatar.position;
    }

    update(dt) {
        if (!this.enabled) return;

        const speed = this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed;
        this.direction.set(0, 0, 0);

        const forward = new THREE.Vector3(-Math.sin(this.cameraAngle), 0, -Math.cos(this.cameraAngle));
        const right = new THREE.Vector3(Math.cos(this.cameraAngle), 0, -Math.sin(this.cameraAngle));

        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.add(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.sub(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.sub(right);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.add(right);

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            this.velocity.x = this.direction.x * speed;
            this.velocity.z = this.direction.z * speed;

            const targetRotation = Math.atan2(this.direction.x, this.direction.z);
            this.avatar.rotation.y = THREE.MathUtils.lerp(
                this.avatar.rotation.y,
                targetRotation,
                10 * dt
            );
            this.walkCycle += dt * (this.isRunning ? 12 : 7);
        } else {
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, 8 * dt);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, 8 * dt);
        }

        const newX = this.avatar.position.x + this.velocity.x * dt;
        const newZ = this.avatar.position.z + this.velocity.z * dt;

        if (!this._checkCollision(newX, this.avatar.position.z)) {
            this.avatar.position.x = newX;
        }
        if (!this._checkCollision(this.avatar.position.x, newZ)) {
            this.avatar.position.z = newZ;
        }

        const half = WORLD_BOUNDARY;
        this.avatar.position.x = THREE.MathUtils.clamp(this.avatar.position.x, -half, half);
        this.avatar.position.z = THREE.MathUtils.clamp(this.avatar.position.z, -half, half);

        const terrainY = this.world.getTerrainHeight(
            this.avatar.position.x,
            this.avatar.position.z
        );
        this.avatar.position.y = terrainY;

        this._animateWalk();
        this._updateCamera();
    }

    _checkCollision(x, z) {
        for (const c of this.colliders) {
            if (
                Math.abs(x - c.x) < c.w / 2 + PLAYER.radius &&
                Math.abs(z - c.z) < c.d / 2 + PLAYER.radius
            ) {
                return true;
            }
        }
        return false;
    }

    _animateWalk() {
        const moving = this.velocity.lengthSq() > 0.1;
        if (!moving) return;

        const parts = this.avatar.userData.walkParts || [];
        parts.forEach((name, i) => {
            const part = this.avatar.getObjectByName(name);
            if (part) {
                const swing = Math.sin(this.walkCycle + i * 1.2) * 0.35;
                if (name.includes('leg')) part.rotation.x = swing;
                if (name.includes('arm') || name.includes('forearm')) part.rotation.x = -swing * 0.6;
            }
        });
    }

    _updateCamera() {
        const offset = this.cameraOffset.clone();
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngle);
        offset.y += Math.sin(this.cameraPitch) * 2;

        const target = this.avatar.position.clone();
        target.y += PLAYER.height * 0.6;

        const desiredPos = target.clone().add(offset);
        this.camera.position.lerp(desiredPos, 0.08);
        this.camera.lookAt(target);
    }

    setPosition(x, z) {
        this.avatar.position.set(x, 0, z);
        const y = this.world.getTerrainHeight(x, z);
        this.avatar.position.y = y;
        this._updateCamera();
    }
}

const WORLD_BOUNDARY = 180;