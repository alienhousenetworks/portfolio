import * as THREE from 'three';
import { WORLD } from './config.js';
import { createBus } from './Vehicles.js';

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
        this.destLabel = '';
        this.lineLabel = '';
        this.progress = 0;
        this.rideTime = 0;
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

    startBusRide(stop, onComplete) {
        const idx = parseInt(stop.id.split('-')[1], 10) || 0;
        const colors = [0xd4a020, 0xcc4444, 0x44aacc, 0x88aa44];
        const bus = createBus(colors[idx % colors.length]);
        bus.position.set(stop.position.x, WORLD.groundY, stop.position.z);
        this.scene.add(bus);

        this.waypoints = this._buildRoadPath(
            stop.position.x, stop.position.z,
            stop.destX, stop.destZ
        );
        this.vehicle = bus;
        this.vehicleData = null;
        this.type = 'bus';
        this.speed = 34;
        this.wpIdx = 1;
        this.active = true;
        this.onComplete = onComplete;
        this.destLabel = `District (${stop.destX}, ${stop.destZ})`;
        this.lineLabel = stop.title;
        this.progress = 0;
        this.rideTime = 0;
        this.cameraModeIdx = 0;

        this._board({ x: 0.6, y: 1.05, z: -0.8 });
        document.body.classList.add('riding');
        this._showHud('CITY BUS');
        this._snapCamera();
    }

    startTrainRide(boarding, onComplete) {
        const { stop, train } = boarding;
        train.riding = true;
        this.vehicle = train.mesh;
        this.vehicleData = train;
        this.type = 'train';
        this.waypoints = [
            { x: train.x, z: stop.position.z },
            { x: train.x, z: stop.destZ },
        ];
        this.wpIdx = 1;
        this.speed = Math.max(24, Math.abs(train.speed) * 1.15);
        this.active = true;
        this.onComplete = onComplete;
        this.destLabel = stop.destZ > stop.position.z ? 'North Terminal' : 'South Terminal';
        this.lineLabel = stop.title;
        this.progress = 0;
        this.rideTime = 0;
        this.cameraModeIdx = 0;

        this._board({ x: 1.8, y: 1.35, z: -6 });
        document.body.classList.add('riding');
        this._showHud('METRO RAIL');
        this._snapCamera();
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
        let len = 0;
        for (let i = 1; i < this.wpIdx; i++) {
            const a = this.waypoints[i - 1];
            const b = this.waypoints[i];
            len += Math.hypot(b.x - a.x, b.z - a.z);
        }
        if (this.wpIdx > 0 && this.wpIdx < this.waypoints.length) {
            const a = this.waypoints[this.wpIdx - 1];
            const b = this.waypoints[this.wpIdx];
            const seg = Math.hypot(b.x - a.x, b.z - a.z);
            const vx = this.vehicle.position.x;
            const vz = this.vehicle.position.z;
            const traveled = Math.hypot(vx - a.x, vz - a.z);
            len += Math.min(traveled, seg);
        }
        return len;
    }

    _board(local) {
        this.player.visible = true;
        if (this.player.parent) this.player.parent.remove(this.player);
        this.vehicle.add(this.player);
        this.player.position.set(local.x, local.y, local.z);
        this.player.rotation.set(0, Math.PI, 0);
    }

    update(dt) {
        if (!this.active || !this.vehicle) return;

        this.rideTime += dt;
        const arrived = this.type === 'train'
            ? this._moveTrain(dt)
            : this._moveBus(dt);

        if (arrived) {
            this._endRide();
            return;
        }

        this.progress = this._distanceAlongPath() / this._pathLength();
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
        const target = this.waypoints[1];
        const vz = this.vehicle.position.z;
        const dz = target.z - vz;
        const dir = Math.sign(dz) || 1;

        if (Math.abs(dz) < 2) return true;

        const step = this.speed * dt;
        this.vehicle.position.z += dir * Math.min(step, Math.abs(dz));
        this.vehicle.rotation.y = dir > 0 ? 0 : Math.PI;
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
                cam.set(
                    pos.x - this._fwd.x * 16,
                    pos.y + 8 + bob,
                    pos.z - this._fwd.z * 16
                );
                look.set(pos.x + this._fwd.x * 10, pos.y + 2, pos.z + this._fwd.z * 10);
                break;
            case 'low':
                cam.set(
                    pos.x - this._fwd.x * 7,
                    pos.y + 2.4,
                    pos.z - this._fwd.z * 7
                );
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
                cam.set(
                    pos.x + this._right.x * 12,
                    pos.y + 4.5,
                    pos.z + this._right.z * 12
                );
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
        this._lookAt.set(
            this.vehicle.position.x + this._fwd.x * 8,
            this.vehicle.position.y + 1.5,
            this.vehicle.position.z + this._fwd.z * 8
        );
    }

    _endRide() {
        const end = this.waypoints[this.waypoints.length - 1];
        const exitX = this.type === 'train' ? end.x + 3 : end.x;
        const exitZ = end.z;

        if (this.player.parent === this.vehicle) {
            this.vehicle.remove(this.player);
        }
        this.scene.add(this.player);
        this.player.position.set(exitX, WORLD.groundY, exitZ);
        this.player.rotation.y = this.vehicle.rotation.y;
        this.player.visible = true;

        if (this.type === 'bus') {
            this.scene.remove(this.vehicle);
        } else if (this.vehicleData) {
            this.vehicleData.riding = false;
        }

        this.active = false;
        this.vehicle = null;
        this.vehicleData = null;
        document.body.classList.remove('riding');
        this._hideHud();

        const cb = this.onComplete;
        this.onComplete = null;
        cb?.({ x: exitX, z: exitZ });
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
        if (fill) fill.style.width = `${(this.progress * 100).toFixed(1)}%`;
        if (dest) dest.textContent = this.destLabel;
        if (line) line.textContent = this.lineLabel;
        if (cam) cam.textContent = this.cameraMode.label;
    }
}