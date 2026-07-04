import * as THREE from 'three';
import { PLAYER, WORLD, CAMERA } from './config.js';
import { animateHumanWalk } from './AvatarFactory.js';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class PlayerController {
    constructor(camera, avatar, colliders, canvas) {
        this.camera = camera;
        this.avatar = avatar;
        this.colliders = colliders;
        this.canvas = canvas;
        this.velocity = new THREE.Vector3();
        this.camYaw = 0;
        this.camPitch = CAMERA.defaultPitch;
        this.camDistance = CAMERA.defaultDistance;
        this.keys = {};
        this.enabled = false;
        this.isRunning = false;
        this.walkCycle = 0;
        this.isMoving = false;
        this._lookTarget = new THREE.Vector3();
        this._offset = new THREE.Vector3();
        this._input();
    }

    _input() {
        addEventListener('keydown', e => {
            if (!this.enabled) return;
            if (MOVE_KEYS.has(e.code)) e.preventDefault();
            this.keys[e.code] = true;
            if (e.code.startsWith('Shift')) this.isRunning = true;
        });
        addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code.startsWith('Shift')) this.isRunning = false;
        });

        let drag = false, lx = 0, ly = 0;
        const onDown = (e) => {
            if (!this.enabled) return;
            this.canvas?.focus();
            drag = true;
            lx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
            ly = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        };
        const onUp = () => { drag = false; };
        const onMove = (e) => {
            if (!this.enabled || !drag) return;
            const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
            const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
            this.camYaw -= (cx - lx) * CAMERA.yawSpeed;
            this.camPitch += (cy - ly) * CAMERA.pitchSpeed;
            this.camPitch = THREE.MathUtils.clamp(this.camPitch, CAMERA.minPitch, CAMERA.maxPitch);
            lx = cx;
            ly = cy;
        };
        const onWheel = (e) => {
            if (!this.enabled) return;
            e.preventDefault();
            this.camDistance += e.deltaY * 0.01;
            this.camDistance = THREE.MathUtils.clamp(this.camDistance, CAMERA.minDistance, CAMERA.maxDistance);
        };

        this.canvas?.setAttribute('tabindex', '0');
        this.canvas?.addEventListener('mousedown', onDown);
        this.canvas?.addEventListener('mouseup', onUp);
        this.canvas?.addEventListener('mousemove', onMove);
        this.canvas?.addEventListener('wheel', onWheel, { passive: false });
        this.canvas?.addEventListener('touchstart', onDown, { passive: false });
        this.canvas?.addEventListener('touchend', onUp);
        this.canvas?.addEventListener('touchmove', onMove, { passive: false });
    }

    enable() {
        this.enabled = true;
        this._clearKeys();
        this.canvas?.focus();
        this.syncCameraToPlayer();
        this._updateCamera();
    }

    disable() {
        this.enabled = false;
        this.velocity.set(0, 0, 0);
        this.isMoving = false;
        this._clearKeys();
    }

    syncCameraToPlayer() {
        this.camYaw = this.avatar.rotation.y;
    }

    _clearKeys() {
        this.keys = {};
        this.isRunning = false;
    }

    _updateCamera() {
        const target = this.avatar.position.clone();
        target.y += CAMERA.lookHeight;

        const cosP = Math.cos(this.camPitch);
        this._offset.set(
            Math.sin(this.camYaw) * cosP * this.camDistance,
            Math.sin(this.camPitch) * this.camDistance + CAMERA.heightBoost,
            Math.cos(this.camYaw) * cosP * this.camDistance
        );

        this.camera.position.lerp(target.clone().add(this._offset), CAMERA.smoothing);
        this._lookTarget.lerp(target, CAMERA.lookSmoothing);
        this.camera.lookAt(this._lookTarget);
    }

    update(dt) {
        if (!this.enabled) return;

        const speed = this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
        const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
        const dir = new THREE.Vector3();

        if (this.keys.KeyW || this.keys.ArrowUp) dir.add(fwd);
        if (this.keys.KeyS || this.keys.ArrowDown) dir.sub(fwd);
        if (this.keys.KeyA || this.keys.ArrowLeft) dir.sub(right);
        if (this.keys.KeyD || this.keys.ArrowRight) dir.add(right);

        this.isMoving = dir.lengthSq() > 0;

        if (this.isMoving) {
            dir.normalize();
            this.velocity.set(dir.x * speed, 0, dir.z * speed);
            const moveYaw = Math.atan2(dir.x, dir.z);
            this.avatar.rotation.y = moveYaw;
            this.camYaw = THREE.MathUtils.lerp(
                this.camYaw,
                moveYaw,
                1 - Math.pow(1 - CAMERA.followSpeed, dt * 60)
            );
            this.walkCycle += dt * (this.isRunning ? 12 : 9);
        } else {
            this.velocity.set(0, 0, 0);
        }

        const ox = this.avatar.position.x;
        const oz = this.avatar.position.z;
        let nx = ox + this.velocity.x * dt;
        let nz = oz + this.velocity.z * dt;

        if (this._blocked(nx, oz)) nx = ox;
        if (this._blocked(ox, nz)) nz = oz;
        if (this._blocked(nx, nz)) { nx = ox; nz = oz; }

        this.avatar.position.x = THREE.MathUtils.clamp(nx, -WORLD.bound, WORLD.bound);
        this.avatar.position.z = THREE.MathUtils.clamp(nz, -WORLD.bound, WORLD.bound);
        this.avatar.position.y = WORLD.groundY;

        if (this.avatar.userData.isHuman && this.velocity.lengthSq() > 0.5) {
            animateHumanWalk(this.avatar, this.walkCycle, this.isRunning ? 1.2 : 1);
        } else if (this.avatar.userData.walkParts) {
            (this.avatar.userData.walkParts || []).forEach(name => {
                const p = this.avatar.getObjectByName(name);
                if (p) p.rotation.x = THREE.MathUtils.lerp(p.rotation.x, 0, 0.15);
            });
        }

        this._updateCamera();
    }

    _blocked(x, z) {
        const r = PLAYER.radius;
        for (const c of this.colliders) {
            const hw = c.w / 2 + r;
            const hd = c.d / 2 + r;
            if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) return true;
        }
        return false;
    }

    findSafePosition(x, z, preferredX = null, preferredZ = null) {
        const candidates = [];
        if (preferredX != null && preferredZ != null) {
            candidates.push([preferredX, preferredZ]);
        }
        candidates.push([x, z]);
        for (let ring = 1; ring <= 12; ring++) {
            const step = ring * 3;
            candidates.push(
                [x + step, z], [x - step, z], [x, z + step], [x, z - step],
                [x + step, z + step], [x - step, z + step],
                [x + step, z - step], [x - step, z - step],
                [x + step * 0.5, z + step], [x, z + step * 1.5]
            );
        }
        for (const [tx, tz] of candidates) {
            if (!this._blocked(tx, tz)) return { x: tx, z: tz };
        }
        return { x, z };
    }

    setPosition(x, z, preferredX = null, preferredZ = null) {
        const safe = this.findSafePosition(x, z, preferredX, preferredZ);
        this.avatar.position.set(safe.x, WORLD.groundY, safe.z);
        this.velocity.set(0, 0, 0);
        this.syncCameraToPlayer();
    }
}