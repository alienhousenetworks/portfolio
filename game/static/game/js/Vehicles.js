import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';

function mat(color, opts = {}) {
    const p = { color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0.1 };
    if (opts.emissive != null) { p.emissive = opts.emissive; p.emissiveIntensity = opts.emissiveIntensity ?? 0.1; }
    return new THREE.MeshStandardMaterial(p);
}

export function createBus(bodyColor = 0xd4a020) {
    const bus = new THREE.Group();
    bus.name = 'bus';

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 6), mat(bodyColor));
    body.position.y = 1.3;
    bus.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.3, 6.02), mat(0xffffff));
    stripe.position.y = 1.8;
    bus.add(stripe);

    const glass = mat(0x88aacc, { roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 5; i++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), glass);
        w.position.set(1.41, 1.5, -2 + i * 1.1);
        w.rotation.y = Math.PI / 2;
        bus.add(w);
    }

    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
    const wheelMat = mat(0x1a1a1a, { roughness: 0.95 });
    [[-1, 0.45, 2], [1, 0.45, 2], [-1, 0.45, -2], [1, 0.45, -2]].forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, y, z);
        bus.add(w);
    });

    const dest = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.4, 0.05),
        mat(0x111111, { emissive: 0x00cc44, emissiveIntensity: 0.3 })
    );
    dest.position.set(0, 2.1, 3.01);
    bus.add(dest);

    return bus;
}

export function createTrainCar(isEngine = false) {
    const car = new THREE.Group();
    const bodyColor = isEngine ? 0x2244aa : 0x556677;
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, isEngine ? 7 : 8), mat(bodyColor, { metalness: 0.3 }));
    body.position.y = 1.5;
    car.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.25, isEngine ? 7 : 8), mat(PALETTE.accent));
    stripe.position.y = 2.2;
    car.add(stripe);

    if (isEngine) {
        const nose = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 1.5), mat(0x334488, { metalness: 0.4 }));
        nose.position.set(0, 1.6, 4.2);
        car.add(nose);
    }

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10);
    const wheelMat = mat(0x222222);
    for (let i = 0; i < (isEngine ? 3 : 4); i++) {
        [-1.2, 1.2].forEach(x => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.35, -2.5 + i * 1.8);
            car.add(w);
        });
    }
    return car;
}

export function createTrain() {
    const train = new THREE.Group();
    const engine = createTrainCar(true);
    engine.position.z = 0;
    train.add(engine);
    const car1 = createTrainCar(false);
    car1.position.z = -8.5;
    train.add(car1);
    const car2 = createTrainCar(false);
    car2.position.z = -17;
    train.add(car2);
    return train;
}

export function createBusStop() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), mat(0x888888, { metalness: 0.5 }));
    pole.position.y = 1.5;
    g.add(pole);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.08), mat(0x2244aa));
    sign.position.set(0, 2.8, 0);
    g.add(sign);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.5), mat(0x8b6914));
    bench.position.set(0, 0.5, 0.8);
    g.add(bench);
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), mat(0xaaaaaa, { transparent: true, opacity: 0.7 }));
    shelter.position.set(0, 3.2, 0.3);
    g.add(shelter);
    return g;
}

export function createTrainStation() {
    const g = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 3), mat(PALETTE.concrete));
    platform.position.y = 0.1;
    g.add(platform);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 3), mat(0xcccccc));
    roof.position.y = 3.5;
    g.add(roof);
    [[-3.5, 0, 1.4], [3.5, 0, 1.4], [-3.5, 0, -1.4], [3.5, 0, -1.4]].forEach(([x, y, z]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), mat(0x888888, { metalness: 0.4 }));
        p.position.set(x, 1.75, z);
        g.add(p);
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.1), mat(0x111133, { emissive: PALETTE.accent, emissiveIntensity: 0.15 }));
    board.position.set(0, 2, 1.55);
    g.add(board);
    return g;
}

export class TransitSystem {
    constructor(scene) {
        this.scene = scene;
        this.buses = [];
        this.trains = [];
        this.stops = [];
    }

    build() {
        this._rails();
        this._spawnBuses();
        this._spawnTrains();
        this._spawnStops();
        return this.stops;
    }

    _rails() {
        const railMat = mat(0x666666, { metalness: 0.6, roughness: 0.4 });
        const tieMat = mat(0x5c4033, { roughness: 0.95 });
        [-120, 120].forEach(x => {
            for (let z = -300; z < 300; z += 4) {
                const tie = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 0.8), tieMat);
                tie.position.set(x, 0.08, z);
                this.scene.add(tie);
            }
            [-0.8, 0.8].forEach(offset => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 600), railMat);
                rail.position.set(x + offset, 0.18, 0);
                this.scene.add(rail);
            });
        });
    }

    _spawnBuses() {
        const routes = [
            { axis: 'z', pos: 0, min: -280, max: 280, speed: 18, color: 0xd4a020, label: 'Route 7' },
            { axis: 'z', pos: 50, min: -280, max: 280, speed: -15, color: 0xcc4444, label: 'Route 3' },
            { axis: 'x', pos: 0, min: -280, max: 280, speed: 16, color: 0x44aacc, label: 'Route 12' },
            { axis: 'x', pos: -50, min: -280, max: 280, speed: -14, color: 0x88aa44, label: 'Route 5' },
        ];
        routes.forEach((r, i) => {
            const bus = createBus(r.color);
            const t = (i * 0.25) % 1;
            if (r.axis === 'z') {
                bus.position.set(r.pos, WORLD.groundY, THREE.MathUtils.lerp(r.min, r.max, t));
                bus.rotation.y = r.speed > 0 ? 0 : Math.PI;
            } else {
                bus.position.set(THREE.MathUtils.lerp(r.min, r.max, t), WORLD.groundY, r.pos);
                bus.rotation.y = r.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
            this.scene.add(bus);
            this.buses.push({ mesh: bus, ...r });
        });
    }

    _spawnTrains() {
        [
            { x: -120, min: -250, max: 250, speed: 22 },
            { x: 120, min: 250, max: -250, speed: -20 },
        ].forEach((r, i) => {
            const train = createTrain();
            train.position.set(r.x, WORLD.groundY, r.min);
            train.rotation.y = r.speed > 0 ? 0 : Math.PI;
            this.scene.add(train);
            this.trains.push({ mesh: train, ...r, phase: i * 0.3 });
        });
    }

    _spawnStops() {
        const busStopData = [
            [25, 75], [-25, 75], [75, 25], [-75, -25], [100, -100], [-100, 100], [0, -150], [150, 0],
        ];
        busStopData.forEach(([x, z], i) => {
            const marker = createBusStop();
            marker.position.set(x, 0, z);
            this.scene.add(marker);
            this.stops.push({
                id: `bus-${i}`,
                type: 'bus_stop',
                position: new THREE.Vector3(x, 0, z),
                radius: 5,
                title: `Bus Stop — Route ${(i % 4) + 3}`,
                subtitle: 'TRANSIT',
                content: `Catch the city bus here. Routes run north-south and east-west across the planet. Route ${(i % 4) + 3} connects downtown to the outer districts. Wait for the colored bus to arrive!`,
                marker,
                destX: (i % 2 === 0 ? 1 : -1) * 100,
                destZ: (i % 3 === 0 ? 1 : -1) * 80,
            });
        });

        [
            { x: -120, z: -80, name: 'West Station' },
            { x: -120, z: 120, name: 'West Terminal' },
            { x: 120, z: -60, name: 'East Station' },
            { x: 120, z: 140, name: 'East Terminal' },
        ].forEach((st, i) => {
            const marker = createTrainStation();
            marker.position.set(st.x, 0, st.z);
            this.scene.add(marker);
            this.stops.push({
                id: `train-${i}`,
                type: 'train_station',
                position: new THREE.Vector3(st.x, 0, st.z),
                radius: 7,
                title: st.name,
                subtitle: 'METRO RAIL',
                content: `${st.name} — AlienHouse Metro connects the east and west districts. Press E while a train is at the platform to board and ride to the next station.`,
                marker,
                trackX: st.x,
                destZ: st.z > 0 ? -120 : 120,
            });
        });
    }

    update(dt, elapsed) {
        this.buses.forEach(b => {
            const axis = b.axis;
            const spd = b.speed * dt;
            if (axis === 'z') {
                b.mesh.position.z += spd;
                if (b.speed > 0 && b.mesh.position.z > b.max) b.mesh.position.z = b.min;
                if (b.speed < 0 && b.mesh.position.z < b.min) b.mesh.position.z = b.max;
            } else {
                b.mesh.position.x += spd;
                if (b.speed > 0 && b.mesh.position.x > b.max) b.mesh.position.x = b.min;
                if (b.speed < 0 && b.mesh.position.x < b.min) b.mesh.position.x = b.max;
            }
        });

        this.trains.forEach(t => {
            t.mesh.position.z += t.speed * dt;
            if (t.speed > 0 && t.mesh.position.z > t.max) t.mesh.position.z = t.min;
            if (t.speed < 0 && t.mesh.position.z < t.max) t.mesh.position.z = t.min;
        });
    }

    getNearestTrainStation(playerPos, maxDist = 8) {
        let best = null, d = maxDist;
        this.stops.filter(s => s.type === 'train_station').forEach(s => {
            const dist = playerPos.distanceTo(s.position);
            if (dist < d) { best = s; d = dist; }
        });
        if (!best) return null;
        const train = this.trains.find(t => t.x === best.trackX);
        if (!train) return null;
        const trainDist = Math.abs(train.mesh.position.z - best.position.z);
        return trainDist < 15 ? { stop: best, train } : null;
    }
}