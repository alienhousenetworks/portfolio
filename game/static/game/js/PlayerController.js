import * as THREE from 'three';
import { PLAYER, WORLD, CAMERA, PHYSICS } from './config.js';
import { updateLocomotionPose, tickAnimator } from './AvatarFactory.js';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class PlayerController {
    constructor(camera, avatar, colliders, canvas, terrain = null) {
        this.camera = camera;
        this.avatar = avatar;
        this.colliders = colliders;
        this.canvas = canvas;
        this.terrain = terrain;
        this.velocity = new THREE.Vector3();
        this.vy = 0;                    // vertical velocity for physics
        this.onGround = false;
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

        // Player height scale
        this.playerHeight = PLAYER.height;

        this._input();
        this._listenHeightSlider();
    }

    _listenHeightSlider() {
        // Listen for height-change events dispatched from the UI slider
        window.addEventListener('player-height-change', (e) => {
            const newH = e.detail.height;
            this.playerHeight = newH;
            // Scale the avatar uniformly based on ratio to default height
            const scale = newH / PLAYER.height;
            this.avatar.scale.setScalar(scale);
            // Adjust camera look-height proportionally
            this._lookHeightScaled = CAMERA.lookHeight * scale;
        });
    }

    _input() {
        addEventListener('keydown', e => {
            if (!this.enabled) return;
            if (MOVE_KEYS.has(e.code)) e.preventDefault();
            this.keys[e.code] = true;
            if (e.code.startsWith('Shift')) this.isRunning = true;

            // Jump
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.onGround) {
                    this.vy = PHYSICS.jumpForce;
                    this.onGround = false;
                }
            }
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
        const lookH = this._lookHeightScaled || CAMERA.lookHeight;
        const cosP = Math.cos(this.camPitch);
        this._desiredCam.set(
            target.x + Math.sin(this.camYaw) * cosP * this.camDistance,
            target.y + Math.sin(this.camPitch) * this.camDistance + CAMERA.heightBoost,
            target.z + Math.cos(this.camYaw) * cosP * this.camDistance
        );
    }

    _snapCamera() {
        const p = this.avatar.position;
        const lookH = this._lookHeightScaled || CAMERA.lookHeight;
        this._placeCamera(p);
        this.camera.position.copy(this._desiredCam);
        this._lookPoint.set(p.x, p.y + lookH, p.z);
        this.camera.lookAt(this._lookPoint);
    }

    _updateCamera(dt) {
        const p = this.avatar.position;
        const lookH = this._lookHeightScaled || CAMERA.lookHeight;
        this._placeCamera(p);
        const alpha = 1 - Math.exp(-CAMERA.positionDamp * dt);
        this.camera.position.lerp(this._desiredCam, alpha);
        this._lookPoint.set(p.x, p.y + lookH, p.z);
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
        const curY = this.avatar.position.y;
        let nx = ox + this.velocity.x * dt;
        let nz = oz + this.velocity.z * dt;

        // --- Horizontal collision + block-top stepping ---
        const blockedX = this._blockedWithStep(nx, oz, curY);
        if (blockedX) nx = ox;
        const blockedZ = this._blockedWithStep(ox, nz, curY);
        if (blockedZ) nz = oz;
        if (!blockedX && !blockedZ && this._blockedWithStep(nx, nz, curY)) { nx = ox; nz = oz; }

        // River traversal check
        if (this.terrain && !this.terrain.canTraverse(ox, oz, curY, nx, nz)) {
            nx = ox;
            nz = oz;
        }

        this.avatar.position.x = THREE.MathUtils.clamp(nx, -WORLD.bound, WORLD.bound);
        this.avatar.position.z = THREE.MathUtils.clamp(nz, -WORLD.bound, WORLD.bound);

        // --- Vertical physics (gravity + ground snap) ---
        const terrainY = this.terrain
            ? this.terrain.getWalkableHeight(nx, nz, curY)
            : WORLD.groundY;

        // Check if standing on top of a block
        const blockTopY = this._getBlockTopBelow(nx, nz, curY);
        const floorY = Math.max(terrainY, blockTopY !== null ? blockTopY : -Infinity);

        // Apply gravity
        this.vy -= PHYSICS.gravity * dt;
        this.vy = Math.max(this.vy, PHYSICS.terminalVelocity);

        let newY = curY + this.vy * dt;

        // Ground / platform collision
        if (newY <= floorY + PHYSICS.groundSnap && this.vy <= 0) {
            newY = floorY;
            this.vy = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Smooth height transition for all climbing/slopes (GTA style)
        if (this.vy <= 0 && Math.abs(terrainY - curY) < 3.0) {
            const ySmooth = 12; // smooth factor
            this.avatar.position.y += (terrainY - this.avatar.position.y) * (1 - Math.exp(-ySmooth * dt));
            this.onGround = true;
            this.vy = 0;
        } else {
            this.avatar.position.y = newY;
        }

        tickAnimator(this.avatar, dt);
        updateLocomotionPose(this.avatar, {
            moving: this.velocity.lengthSq() > 0.1,
            running: this.isRunning,
            onGround: this.onGround,
            climbing: this.terrain?.isOnStair(this.avatar.position.x, this.avatar.position.z),
            fade: 0.18,
        });

        this._updateCamera(dt);
    }

    /**
     * Returns the Y position of the top of any block directly below (and close to) the player.
     * Returns null if no block found.
     */
    _getBlockTopBelow(x, z, y) {
        const r = PLAYER.radius * 0.8;
        let best = null;
        for (const c of this.colliders) {
            const hw = c.w / 2 + r;
            const hd = c.d / 2 + r;
            if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) {
                const top = (c.floorY || 0) + (c.h || 0);
                // Only count blocks that are below or near the player
                if (top <= y + PLAYER.maxStepHeight + 0.5) {
                    if (best === null || top > best) best = top;
                }
            }
        }
        return best;
    }

    /**
     * Check if movement to (x,z) at current height y is blocked.
     * Allows stepping UP onto a block if its top is within maxStepHeight.
     */
    _blockedWithStep(x, z, y) {
        const r = PLAYER.radius;
        for (const c of this.colliders) {
            const hw = c.w / 2 + r;
            const hd = c.d / 2 + r;
            if (Math.abs(x - c.x) < hw && Math.abs(z - c.z) < hd) {
                // Is this a stair-traversal exception?
                if (c.d > 100 && this.terrain?.isOnStair(x, z)) continue;

                const blockFloor = c.floorY || 0;
                const blockTop = blockFloor + (c.h || 0);

                // If the block top is within step-up range AND player is approaching from below top
                if (blockTop <= y + PLAYER.maxStepHeight && blockTop > blockFloor) {
                    // Allow: player can step up onto this block
                    continue;
                }

                // If player is above the block top (standing on it), allow movement
                if (y >= blockTop - 0.1) continue;

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
            if (!this._blockedWithStep(tx, tz, 0)) return { x: tx, z: tz };
        }
        return { x, z };
    }

    setPosition(x, z, preferredX = null, preferredZ = null) {
        const safe = this.findSafePosition(x, z, preferredX, preferredZ);
        const y = this.terrain ? this.terrain.getHeightAt(safe.x, safe.z) : WORLD.groundY;
        this.avatar.position.set(safe.x, y, safe.z);
        this.avatar.rotation.y = 0;
        this.velocity.set(0, 0, 0);
        this.vy = 0;
        this.onGround = true;
        this.syncCameraToPlayer();
        this._snapCamera();
    }
}