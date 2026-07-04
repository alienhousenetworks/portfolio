import * as THREE from 'three';
import { WORLD } from './config.js';
import { createBus, createTrain } from './Vehicles.js';

export const CAMERA_MODES = [
    { id: 'chase', label: 'Chase Cam' },
    { id: 'low', label: 'Low Rider' },
    { id: 'passenger', label: 'Passenger View' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'aerial', label: 'Aerial View' },
];

export class TransitRideController {
    constructor(scene, camera, player, transit) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.transit = transit;
        this.active = false;
        this.vehicle = null;
        this.vehicleData = null;
        this.waypoints = [];
        this.wpIdx = 0;
        this.speed = 30;
        this.cameraModeIdx = 0;
        this.type = null;
        this.onComplete = null;
        this.onArriveDest = null;
        this.destLabel = '';
        this.lineLabel = '';
        this.progress = 0;
        this.rideTime = 0;
        this.legs = [];
        this.legIdx = 0;
        this.transferTimer = 0;
        this._camPos = new THREE.Vector3();
        this._lookAt = new THREE.Vector3();
        this._fwd = new THREE.Vector3();
        this._right = new THREE.Vector3();

        this._onKey = (e) => {
            if (!this.active || e.code !== 'KeyV') return;
            e.preventDefault();
            this.cycleCamera();
        };
        addEventListener('keydown', this._onKey);
    }

    get cameraMode() {
        return CAMERA_MODES[this.cameraModeIdx];
    }

    isActive() {
        return this.active;
    }

    cycleCamera() {
        this.cameraModeIdx = (this.cameraModeIdx + 1) % CAMERA_MODES.length;
        this._refreshHud();
    }

    startJourney({ fromX, fromZ, dest, stop, mode, onComplete, onArriveDest }) {
        this.legs = this._planLegs(fromX, fromZ, dest, stop, mode);
        this._dest = dest;
        this.legIdx = 0;
        this.active = true;
        this.onComplete = onComplete;
        this.onArriveDest = onArriveDest;
        this.destLabel = dest.name;
        this.lineLabel = stop.title || 'Transit';
        this.progress = 0;
        this.rideTime = 0;
        this.cameraModeIdx = 0;
        this.transferTimer = 0;
        document.body.classList.add('riding');
        this._beginLeg();
    }

    _planLegs(fromX, fromZ, dest, stop, mode) {
        const legs = [];
        const destX = dest.x;
        const destZ = dest.z;

        if (mode === 'metro' && stop.trackX != null) {
            const trackX = stop.trackX;
            legs.push({
                type: 'train',
                fromX: trackX,
                fromZ: fromZ,
                toX: trackX,
                toZ: destZ,
                label: 'Metro rail',
            });
            if (Math.abs(destX - trackX) > 18) {
                legs.push({
                    type: 'bus',
                    fromX: trackX + 3,
                    fromZ: destZ,
                    toX: destX,
                    toZ: destZ,
                    label: 'Connecting bus',
                });
            }
        } else {
            legs.push({
                type: 'bus',
                fromX,
                fromZ,
                toX: destX,
                toZ: destZ,
                label: 'City bus',
            });
        }
        return legs;
    }

    _beginLeg() {
        const leg = this.legs[this.legIdx];
        if (!leg) {
            this._endRide();
            return;
        }

        this._disposeVehicle();
        this.waypoints = this._buildRoadPath(leg.fromX, leg.fromZ, leg.toX, leg.toZ);
        this.wpIdx = 1;
        this.type = leg.type;
        this.speed = leg.type === 'train' ? 30 : 34;

        if (leg.type === 'train') {
            const train = createTrain();
            train.position.set(leg.fromX, WORLD.groundY, leg.fromZ);
            train.rotation.y = leg.toZ > leg.fromZ ? 0 : Math.PI;
            this.scene.add(train);
            this.vehicle = train;
            this.vehicleData = null;
            this.waypoints = [
                { x: leg.fromX, z: leg.fromZ },
                { x: leg.toX, z: leg.toZ },
            ];
            this.wpIdx = 1;
            this._board({ x: 1.8, y: 1.35, z: -6 });
            this._showHud('METRO RAIL');
        } else {
            const bus = createBus(leg.label?.includes('Connecting') ? 0x44aacc : 0xd4a020);
            bus.position.set(leg.fromX, WORLD.groundY, leg.fromZ);
            this.scene.add(bus);
            this.vehicle = bus;
            this._board({ x: 0.6, y: 1.05, z: -0.8 });
            this._showHud(leg.label || 'CITY BUS');
        }

        if (this.legIdx > 0) {
            this.lineLabel = `${leg.label} — leg ${this.legIdx + 1}/${this.legs.length}`;
        }
        this._snapCamera();
    }

    _disposeVehicle() {
        if (!this.vehicle) return;
        if (this.player.parent === this.vehicle) {
            const wp = this.player.getWorldPosition(new THREE.Vector3());
            this.vehicle.remove(this.player);
            this.scene.add(this.player);
            this.player.position.copy(wp);
            this.player.position.y = WORLD.groundY;
        }
        if (this.type === 'bus' || !this.vehicleData) {
            this.scene.remove(this.vehicle);
        } else if (this.vehicleData) {
            this.vehicleData.riding = false;
        }
        this.vehicle = null;
        this.vehicleData = null;
    }

    _buildRoadPath(fx, fz, tx, tz) {
        const S = WORLD.roadSpacing;
        const snap = (v) => Math.round(v / S) * S;
        const pts = [{ x: fx, z: fz }];
        const rx = snap(fx);
        const rz = snap(fz);
        const rtx = snap(tx);
        const rtz = snap(tz);

        if (Math.hypot(fx - rx, fz - rz) > 3) pts.push({ x: rx, z: fz });
        if (Math.abs(rz - fz) > 3 || Math.abs(rx - fx) > 3) pts.push({ x: rx, z: rz });
        if (Math.abs(rtx - rx) > 3) pts.push({ x: rtx, z: rz });
        if (Math.abs(rtz - rz) > 3) pts.push({ x: rtx, z: rtz });
        if (Math.hypot(tx - rtx, tz - rtz) > 3) pts.push({ x: tx, z: rtz });
        pts.push({ x: tx, z: tz });

        return pts.filter((p, i, arr) =>
            i === 0 || Math.hypot(p.x - arr[i - 1].x, p.z - arr[i - 1].z) > 2
        );
    }

    _pathLength() {
        let len = 0;
        for (let i = 1; i < this.waypoints.length; i++) {
            const a = this.waypoints[i - 1];
            const b = this.waypoints[i];
            len += Math.hypot(b.x - a.x, b.z - a.z);
        }
        return Math.max(len, 1);
    }

    _distanceAlongPath() {
        let totalLegs = 0;
        for (let l = 0; l < this.legIdx; l++) {
            const leg = this.legs[l];
            totalLegs += Math.hypot(leg.toX - leg.fromX, leg.toZ - leg.fromZ);
        }
        let len = totalLegs;
        for (let i = 1; i < this.wpIdx; i++) {
            const a = this.waypoints[i - 1];
            const b = this.waypoints[i];
            len += Math.hypot(b.x - a.x, b.z - a.z);
        }
        if (this.wpIdx > 0 && this.wpIdx < this.waypoints.length && this.vehicle) {
            const a = this.waypoints[this.wpIdx - 1];
            const vx = this.vehicle.position.x;
            const vz = this.vehicle.position.z;
            len += Math.min(Math.hypot(vx - a.x, vz - a.z), this._pathLength());
        }
        return len;
    }

    _totalJourneyLength() {
        return this.legs.reduce((sum, leg) =>
            sum + Math.hypot(leg.toX - leg.fromX, leg.toZ - leg.fromZ), 0) || 1;
    }

    _board(local) {
        this.player.visible = true;
        if (this.player.parent) this.player.parent.remove(this.player);
        this.vehicle.add(this.player);
        this.player.position.set(local.x, local.y, local.z);
        this.player.rotation.set(0, Math.PI, 0);
    }

    update(dt) {
        if (!this.active) return;

        if (this.transferTimer > 0) {
            this.transferTimer -= dt;
            if (this.transferTimer <= 0) this._beginLeg();
            this._refreshHud();
            return;
        }

        if (!this.vehicle) return;

        this.rideTime += dt;
        const arrived = this.type === 'train' ? this._moveTrain(dt) : this._moveBus(dt);

        if (arrived) {
            if (this.legIdx + 1 < this.legs.length) {
                this.legIdx++;
                this.transferTimer = 2.2;
                this.lineLabel = `Transfer — ${this.legs[this.legIdx].label}`;
                this._disposeVehicle();
                this._refreshHud();
                return;
            }
            this._endRide();
            return;
        }

        this.progress = this._distanceAlongPath() / this._totalJourneyLength();
        this._updateCamera(dt);
        this._refreshHud();
    }

    _moveBus(dt) {
        const target = this.waypoints[this.wpIdx];
        if (!target) return true;

        const vx = this.vehicle.position.x;
        const vz = this.vehicle.position.z;
        const dx = target.x - vx;
        const dz = target.z - vz;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.5) {
            this.wpIdx++;
            return this.wpIdx >= this.waypoints.length;
        }

        const step = this.speed * dt;
        this.vehicle.position.x += (dx / dist) * Math.min(step, dist);
        this.vehicle.position.z += (dz / dist) * Math.min(step, dist);
        this.vehicle.rotation.y = Math.atan2(dx, dz);
        return false;
    }

    _moveTrain(dt) {
        const target = this.waypoints[this.wpIdx];
        if (!target) return true;

        const vx = this.vehicle.position.x;
        const vz = this.vehicle.position.z;
        const dx = target.x - vx;
        const dz = target.z - vz;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.5) {
            this.wpIdx++;
            return this.wpIdx >= this.waypoints.length;
        }

        const step = this.speed * dt;
        this.vehicle.position.x += (dx / dist) * Math.min(step, dist);
        this.vehicle.position.z += (dz / dist) * Math.min(step, dist);
        this.vehicle.rotation.y = Math.atan2(dx, dz);
        return false;
    }

    _updateCamera(dt) {
        const v = this.vehicle;
        const yaw = v.rotation.y;
        this._fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
        this._right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        const pos = v.position;
        const bob = this.type === 'bus' ? Math.sin(this.rideTime * 14) * 0.08 : 0;
        const mode = this.cameraMode.id;
        let cam = new THREE.Vector3();
        let look = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);

        switch (mode) {
            case 'chase':
                cam.set(pos.x - this._fwd.x * 16, pos.y + 8 + bob, pos.z - this._fwd.z * 16);
                look.set(pos.x + this._fwd.x * 10, pos.y + 2, pos.z + this._fwd.z * 10);
                break;
            case 'low':
                cam.set(pos.x - this._fwd.x * 7, pos.y + 2.4, pos.z - this._fwd.z * 7);
                look.set(pos.x + this._fwd.x * 35, pos.y + 1.2, pos.z + this._fwd.z * 35);
                break;
            case 'passenger':
                cam.set(
                    pos.x + this._right.x * -1.4 + this._fwd.x * 0.8,
                    pos.y + (this.type === 'train' ? 2.1 : 1.85),
                    pos.z + this._right.z * -1.4 + this._fwd.z * 0.8
                );
                look.set(pos.x + this._fwd.x * 50, pos.y + 1.8, pos.z + this._fwd.z * 50);
                break;
            case 'cinematic':
                cam.set(pos.x + this._right.x * 12, pos.y + 4.5, pos.z + this._right.z * 12);
                look.set(pos.x, pos.y + 2.5, pos.z);
                break;
            case 'aerial':
                cam.set(pos.x, pos.y + 32, pos.z - 10);
                look.set(pos.x + this._fwd.x * 5, pos.y, pos.z + this._fwd.z * 5);
                break;
        }

        const smooth = 1 - Math.pow(0.0004, dt);
        this._camPos.lerp(cam, smooth);
        this._lookAt.lerp(look, smooth * 1.4);
        this.camera.position.copy(this._camPos);
        this.camera.lookAt(this._lookAt);
    }

    _snapCamera() {
        this._updateCamera(1);
        this._camPos.copy(this.camera.position);
        if (this.vehicle) {
            this._lookAt.set(
                this.vehicle.position.x + this._fwd.x * 8,
                this.vehicle.position.y + 1.5,
                this.vehicle.position.z + this._fwd.z * 8
            );
        }
    }

    _endRide() {
        const lastLeg = this.legs[this.legs.length - 1];
        const dest = this._dest;
        const exitX = dest?.arrivalX ?? lastLeg?.toX ?? this.player.position.x;
        const exitZ = dest?.arrivalZ ?? (lastLeg?.toZ != null ? lastLeg.toZ + 16 : this.player.position.z);

        this._disposeVehicle();
        if (this.player.parent !== this.scene) {
            this.scene.add(this.player);
        }
        this.player.position.set(exitX, WORLD.groundY, exitZ);
        this.player.rotation.set(0, 0, 0);
        this.player.visible = true;

        this.active = false;
        document.body.classList.remove('riding');
        this._hideHud();

        const arriveDest = this.onArriveDest;
        const cb = this.onComplete;
        this.onComplete = null;
        this.onArriveDest = null;
        this.legs = [];
        this._dest = null;
        arriveDest?.();
        cb?.({ x: exitX, z: exitZ, dest });
    }

    _showHud(transitType) {
        const hud = document.getElementById('ride-hud');
        if (!hud) return;
        hud.classList.add('visible');
        document.getElementById('ride-type').textContent = transitType;
        this._refreshHud();
    }

    _hideHud() {
        document.getElementById('ride-hud')?.classList.remove('visible');
    }

    _refreshHud() {
        const fill = document.getElementById('ride-progress-fill');
        const dest = document.getElementById('ride-dest');
        const line = document.getElementById('ride-line');
        const cam = document.getElementById('ride-camera');
        if (this.transferTimer > 0) {
            if (line) line.textContent = 'Transferring — please wait...';
            if (fill) fill.style.width = `${(this.progress * 100).toFixed(1)}%`;
            return;
        }
        if (fill) fill.style.width = `${(this.progress * 100).toFixed(1)}%`;
        if (dest) dest.textContent = this.destLabel;
        if (line) line.textContent = this.lineLabel;
        if (cam) cam.textContent = this.cameraMode.label;
    }
}