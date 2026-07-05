import * as THREE from 'three';
import { PLAYER, WORLD, CAMERA } from './config.js';
import { animateHumanWalk } from './AvatarFactory.js';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class PlayerController {
    constructor(camera, avatar, colliders, canvas, terrain = null) {
        this.camera = camera;
        this.avatar = avatar;
        this.colliders = colliders;
        this.canvas = canvas;
        this.terrain = terrain;
        this.velocity = new THREE.Vector3();
        this.camYaw = 0;
        this.camPitch = CAMERA.defaultPitch;
        this.camDistance = CAMERA.defaultDistance;
        this.keys = {};
        this.enabled = false;
        this.isRunning = false;
        this.walkCycle = 0;
        this._desiredCam = new THREE.Vector3();
        this._lookPoint = new THREE.Vector3();
        this._fwd = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
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
        this._syncCamYawFromCamera();
        this._snapCamera();
    }

    disable() {
        this.enabled = false;
        this.velocity.set(0, 0, 0);
        this._clearKeys();
    }

    syncCameraToPlayer() {
        this.camYaw = this.avatar.rotation.y + Math.PI;
    }

    _syncCamYawFromCamera() {
        const dx = this.camera.position.x - this.avatar.position.x;
        const dz = this.camera.position.z - this.avatar.position.z;
        if (dx * dx + dz * dz > 0.04) {
            this.camYaw = Math.atan2(dx, dz);
        }
    }

    _clearKeys() {
        this.keys = {};
        this.isRunning = false;
    }

    _moveBasis() {
        const p = this.avatar.position;
        this._fwd.set(p.x - this.camera.position.x, 0, p.z - this.camera.position.z);
        if (this._fwd.lengthSq() < 1e-4) {
            this._fwd.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
        } else {
            this._fwd.normalize();
        }
        this._right.crossVectors(this._fwd, this._up).normalize();
    }

    _placeCamera(target) {
        const cosP = Math.cos(this.camPitch);
        this._desiredCam.set(
            target.x + Math.sin(this.camYaw) * cosP * this.camDistance,
            target.y + Math.sin(this.camPitch) * this.camDistance + CAMERA.heightBoost,
            target.z + Math.cos(this.camYaw) * cosP * this.camDistance
        );
    }

    _snapCamera() {
        const p = this.avatar.position;
        this._placeCamera(p);
        this.camera.position.copy(this._desiredCam);
        this._lookPoint.set(p.x, p.y + CAMERA.lookHeight, p.z);
        this.camera.lookAt(this._lookPoint);
    }

    _updateCamera(dt) {
        const p = this.avatar.position;
        this._placeCamera(p);
        const alpha = 1 - Math.exp(-CAMERA.positionDamp * dt);
        this.camera.position.lerp(this._desiredCam, alpha);
        this._lookPoint.set(p.x, p.y + CAMERA.lookHeight, p.z);
        this.camera.lookAt(this._lookPoint);
    }

    update(dt) {
        if (!this.enabled) return;

        this._moveBasis();
        const speed = this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const dir = new THREE.Vector3();

        if (this.keys.KeyW || this.keys.ArrowUp) dir.add(this._fwd);
        if (this.keys.KeyS || this.keys.ArrowDown) dir.sub(this._fwd);
        if (this.keys.KeyA || this.keys.ArrowLeft) dir.sub(this._right);
        if (this.keys.KeyD || this.keys.ArrowRight) dir.add(this._right);

        if (dir.lengthSq() > 0) {
            dir.normalize();
            this.velocity.set(dir.x * speed, 0, dir.z * speed);
            this.avatar.rotation.y = Math.atan2(dir.x, dir.z);
            this.walkCycle += dt * (this.isRunning ? 12 : 9);
        } else {
            this.velocity.set(0, 0, 0);
        }

        const ox = this.avatar.position.x;
        const oz = this.avatar.position.z;
        let nx = ox + this.velocity.x * dt;
        let nz = oz + this.velocity.z * dt;

        const curY = this.avatar.position.y;

        if (this._blocked(nx, oz, curY)) nx = ox;
        if (this._blocked(ox, nz, curY)) nz = oz;
        if (this._blocked(nx, nz, curY)) { nx = ox; nz = oz; }

        if (this.terrain && !this.terrain.canTraverse(ox, oz, curY, nx, nz)) {
            nx = ox;
            nz = oz;
        }

        this.avatar.position.x = THREE.MathUtils.clamp(nx, -WORLD.bound, WORLD.bound);
        this.avatar.position.z = THREE.MathUtils.clamp(nz, -WORLD.bound, WORLD.bound);

        const targetY = this.terrain
            ? this.terrain.getWalkableHeight(nx, nz, curY)
            : WORLD.groundY;
        const onStair = this.terrain?.isOnStair(nx, nz);
        const ySmooth = onStair ? 14 : 10;
        this.avatar.position.y += (targetY - this.avatar.position.y) * (1 - Math.exp(-ySmooth * dt));

        if (this.avatar.userData.isHuman && this.velocity.lengthSq() > 0.5) {
            animateHumanWalk(this.avatar, this.walkCycle, this.isRunning ? 1.1 : 0.9);
        } else if (this.avatar.userData.walkParts) {
            (this.avatar.userData.walkParts || []).forEach(name => {
                const part = this.avatar.getObjectByName(name);
                if (part) part.rotation.x = THREE.MathUtils.lerp(part.rotation.x, 0, 0.15);
            });
        }

        this._updateCamera(dt);
    }

    _blocked(x, z, y = WORLD.groundY) {
        const r = PLAYER.radius;
        for (const c of this.colliders) {
            const hw = c.w / 2 + r;
            const hd = c.d / 2 + r;
            if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) {
                if (c.d > 100 && this.terrain?.isOnStair(x, z)) continue;
                return true;
            }
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
        const y = this.terrain ? this.terrain.getHeightAt(safe.x, safe.z) : WORLD.groundY;
        this.avatar.position.set(safe.x, y, safe.z);
        this.avatar.rotation.y = 0;
        this.velocity.set(0, 0, 0);
        this.syncCameraToPlayer();
        this._snapCamera();
    }
}