import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh } from './ToonStyle.js';

function mat(color, opts = {}) {
    return toonMat(color, opts);
}

export function createBus(bodyColor = PALETTE.busCream, accentColor = PALETTE.busOrange) {
    const bus = new THREE.Group();
    bus.name = 'bus';

    const body = toonMesh(new THREE.BoxGeometry(2.6, 1.8, 5.8), bodyColor);
    body.mesh.position.y = 1.4;
    bus.add(body.group);

    const lower = toonMesh(new THREE.BoxGeometry(2.62, 0.5, 5.82), accentColor);
    lower.mesh.position.y = 0.65;
    bus.add(lower.group);

    const roof = toonMesh(new THREE.BoxGeometry(2.5, 0.2, 5.7), bodyColor);
    roof.mesh.position.y = 2.35;
    bus.add(roof.group);

    for (let i = 0; i < 4; i++) {
        const win = toonMesh(new THREE.BoxGeometry(0.85, 0.75, 0.08), PALETTE.glass);
        win.mesh.position.set(1.31, 1.5, -1.8 + i * 1.2);
        bus.add(win.group);
    }

    [-1, 1].forEach(side => {
        const headlight = toonMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10), 0xf8f0d8);
        headlight.mesh.rotation.z = Math.PI / 2;
        headlight.mesh.position.set(side * 0.9, 0.9, 2.9);
        bus.add(headlight.group);
    });

    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10);
    [[-0.95, 0.42, 1.8], [0.95, 0.42, 1.8], [-0.95, 0.42, -1.8], [0.95, 0.42, -1.8]].forEach(([x, y, z]) => {
        const w = toonMesh(wheelGeo, 0x2a2a2a);
        w.mesh.rotation.z = Math.PI / 2;
        w.mesh.position.set(x, y, z);
        bus.add(w.group);
    });

    const dest = toonMesh(new THREE.BoxGeometry(1.8, 0.35, 0.06), 0xf0ece4);
    dest.mesh.position.set(0, 2.1, 2.91);
    bus.add(dest.group);

    return bus;
}

export function createTrainCar(isEngine = false) {
    const car = new THREE.Group();
    const body = toonMesh(
        new THREE.BoxGeometry(2.8, 2.6, isEngine ? 6.5 : 7.5),
        PALETTE.trainSilver
    );
    body.mesh.position.y = 1.6;
    car.add(body.group);

    const stripe = toonMesh(
        new THREE.BoxGeometry(2.82, 0.3, isEngine ? 6.52 : 7.52),
        PALETTE.trainPeach
    );
    stripe.mesh.position.y = 1.9;
    car.add(stripe.group);

    const winCount = isEngine ? 4 : 5;
    for (let i = 0; i < winCount; i++) {
        const win = toonMesh(new THREE.BoxGeometry(0.9, 0.8, 0.08), PALETTE.glass, { emissive: PALETTE.glass, emissiveIntensity: 0.12 });
        win.mesh.position.set(1.41, 1.8, -2.2 + i * 1.1);
        car.add(win.group);
    }

    if (isEngine) {
        const nose = toonMesh(new THREE.BoxGeometry(2.4, 2, 1.2), PALETTE.trainSilver);
        nose.mesh.position.set(0, 1.5, 3.8);
        car.add(nose.group);
    }

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 8);
    for (let i = 0; i < (isEngine ? 3 : 4); i++) {
        [-1.1, 1.1].forEach(x => {
            const w = toonMesh(wheelGeo, 0x3a3a3a);
            w.mesh.rotation.z = Math.PI / 2;
            w.mesh.position.set(x, 0.32, -2.2 + i * 1.7);
            car.add(w.group);
        });
    }
    return car;
}

export function createTrain() {
    const train = new THREE.Group();
    train.add(createTrainCar(true));
    const car1 = createTrainCar(false);
    car1.position.z = -7.8;
    train.add(car1);
    const car2 = createTrainCar(false);
    car2.position.z = -15.5;
    train.add(car2);
    return train;
}

export function createBusTerminal() {
    const g = new THREE.Group();

    const plaza = toonMesh(new THREE.BoxGeometry(28, 0.12, 20), PALETTE.concrete);
    plaza.mesh.position.y = 0.06;
    g.add(plaza.group);

    const roof = toonMesh(new THREE.BoxGeometry(26, 0.25, 16), 0x88a8c8);
    roof.mesh.position.y = 5;
    g.add(roof.group);

    for (let i = 0; i < 6; i++) {
        const pillar = toonMesh(new THREE.BoxGeometry(0.2, 5, 0.2), 0xf0f0f0);
        pillar.mesh.position.set(-10 + i * 4, 2.5, 6);
        g.add(pillar.group);
    }

    for (let i = 0; i < 3; i++) {
        const bench = toonMesh(new THREE.BoxGeometry(3, 0.2, 0.6), 0xc8a878);
        bench.mesh.position.set(-6 + i * 6, 0.4, -4);
        g.add(bench.group);
    }

    const mirror = toonMesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 12), 0x6a8ac8);
    mirror.mesh.rotation.x = Math.PI / 2;
    mirror.mesh.position.set(10, 2.5, 0);
    g.add(mirror.group);

    const board = toonMesh(new THREE.BoxGeometry(3, 2, 0.15), 0x4a6a9a);
    board.mesh.position.set(-10, 2, -6);
    g.add(board.group);

    return g;
}

export function createBusStop() {
    const g = new THREE.Group();
    const pole = toonMesh(new THREE.BoxGeometry(0.08, 3, 0.08), PALETTE.pole);
    pole.mesh.position.y = 1.5;
    g.add(pole.group);

    const sign = toonMesh(new THREE.BoxGeometry(1.6, 0.7, 0.08), 0x5a7aaa);
    sign.mesh.position.set(0, 2.7, 0);
    g.add(sign.group);

    const bench = toonMesh(new THREE.BoxGeometry(1.4, 0.15, 0.5), 0xc8a878);
    bench.mesh.position.set(0, 0.5, 0.8);
    g.add(bench.group);

    return g;
}

export function createTrainStation() {
    const g = new THREE.Group();

    const platform = toonMesh(new THREE.BoxGeometry(10, 0.2, 4), PALETTE.concrete);
    platform.mesh.position.y = 0.1;
    g.add(platform.group);

    const stationBox = toonMesh(new THREE.BoxGeometry(12, 4, 6), 0xf0ece4);
    stationBox.mesh.position.set(0, 6, -3);
    g.add(stationBox.group);

    for (let i = 0; i < 4; i++) {
        const glass = toonMesh(new THREE.PlaneGeometry(2.2, 2.5), PALETTE.frostGlass, { transparent: true, opacity: 0.92 });
        glass.mesh.position.set(-4.5 + i * 3, 6, -0.01);
        g.add(glass.group);
    }

    const signPole = toonMesh(new THREE.BoxGeometry(0.15, 5, 0.15), 0xd07050);
    signPole.mesh.position.set(0, 2.5, 3);
    g.add(signPole.group);

    const circleSign = toonMesh(new THREE.CylinderGeometry(1.2, 1.2, 0.15, 16), 0xf0ece4);
    circleSign.mesh.rotation.x = Math.PI / 2;
    circleSign.mesh.position.set(0, 4.8, 3);
    g.add(circleSign.group);

    const turnstile = toonMesh(new THREE.BoxGeometry(3, 1.2, 0.3), 0x8a9098);
    turnstile.mesh.position.set(0, 0.6, 2);
    g.add(turnstile.group);

    return g;
}

export function createElevatedTrack(x, zMin, zMax) {
    const g = new THREE.Group();
    const len = zMax - zMin;
    const pillarSpacing = 40;

    for (let z = zMin; z <= zMax; z += pillarSpacing) {
        const pillar = toonMesh(new THREE.BoxGeometry(1.8, 9, 1.8), PALETTE.retainingWall);
        pillar.mesh.position.set(x, 4.5, z);
        g.add(pillar.group);
    }

    const deck = toonMesh(new THREE.BoxGeometry(6, 0.5, len), PALETTE.concrete);
    deck.mesh.position.set(x, 9, (zMin + zMax) / 2);
    g.add(deck.group);

    const railL = toonMesh(new THREE.BoxGeometry(0.15, 0.2, len), 0x6a6a6a);
    railL.mesh.position.set(x - 1.2, 9.4, (zMin + zMax) / 2);
    g.add(railL.group);

    const railR = toonMesh(new THREE.BoxGeometry(0.15, 0.2, len), 0x6a6a6a);
    railR.mesh.position.set(x + 1.2, 9.4, (zMin + zMax) / 2);
    g.add(railR.group);

    return g;
}

export class TransitSystem {
    constructor(scene) {
        this.scene = scene;
        this.buses = [];
        this.trains = [];
        this.stops = [];
        this.elevatedTracks = [];
    }

    build() {
        this._elevatedMetro();
        this._busTerminal();
        this._spawnBuses();
        this._spawnTrains();
        this._spawnStops();
        return this.stops;
    }

    _elevatedMetro() {
        [-80, 80].forEach(x => {
            const track = createElevatedTrack(x, -260, 260);
            this.scene.add(track);
            this.elevatedTracks.push(track);
        });
    }

    _busTerminal() {
        const terminal = createBusTerminal();
        terminal.position.set(WORLD.riverX + 55, 0, -30);
        this.scene.add(terminal);
    }

    _spawnBuses() {
        const routes = [
            { axis: 'z', pos: 25, min: -280, max: 280, speed: 16, color: PALETTE.busCream, accent: PALETTE.busOrange, label: 'Route 7' },
            { axis: 'z', pos: 75, min: -280, max: 280, speed: -14, color: 0xf0e8d8, accent: 0xf0a888, label: 'Route 3' },
            { axis: 'x', pos: 55, min: -280, max: 280, speed: 15, color: PALETTE.busCream, accent: 0xe8c8a0, label: 'Route 12' },
            { axis: 'x', pos: -75, min: -280, max: 280, speed: -13, color: 0xf5f0e8, accent: PALETTE.busOrange, label: 'Route 5' },
        ];
        routes.forEach((r, i) => {
            const bus = createBus(r.color, r.accent);
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
            { x: -80, y: 9.5, min: -250, max: 250, speed: 20 },
            { x: 80, y: 9.5, min: 250, max: -250, speed: -18 },
        ].forEach((r, i) => {
            const train = createTrain();
            train.position.set(r.x, r.y, r.min);
            train.rotation.y = r.speed > 0 ? 0 : Math.PI;
            this.scene.add(train);
            this.trains.push({ mesh: train, ...r, phase: i * 0.3, elevated: true });
        });
    }

    _spawnStops() {
        const busStopData = [
            [35, 75], [-35, 75], [85, 25], [-85, -25], [110, -100], [-110, 100], [55, -150], [160, 0],
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
                content: `Catch the city bus here. Routes run north-south and east-west across the city. Route ${(i % 4) + 3} connects downtown to the outer districts.`,
                marker,
                destX: (i % 2 === 0 ? 1 : -1) * 100,
                destZ: (i % 3 === 0 ? 1 : -1) * 80,
            });
        });

        [
            { x: -80, z: -80, name: 'West Station', y: 9.5 },
            { x: -80, z: 120, name: 'West Terminal', y: 9.5 },
            { x: 80, z: -60, name: 'East Station', y: 9.5 },
            { x: 80, z: 140, name: 'East Terminal', y: 9.5 },
        ].forEach((st, i) => {
            const marker = createTrainStation();
            marker.position.set(st.x, st.y - 9.5, st.z);
            this.scene.add(marker);
            this.stops.push({
                id: `train-${i}`,
                type: 'train_station',
                position: new THREE.Vector3(st.x, st.y - 9.5, st.z),
                radius: 7,
                title: st.name,
                subtitle: 'METRO RAIL',
                content: `${st.name} — the elevated metro connects east and west districts. Press E while at the platform to board and ride to the next station.`,
                marker,
                trackX: st.x,
                destZ: st.z > 0 ? -120 : 120,
            });
        });
    }

    update(dt) {
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
            if (t.riding) return;
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