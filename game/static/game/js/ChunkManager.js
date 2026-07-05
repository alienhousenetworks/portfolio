import { WORLD } from './config.js';

/** Chunk-based visibility — only nearby districts stay active for performance. */
export class ChunkManager {
    constructor(chunkSize = 70, loadRadius = 3) {
        this.chunkSize = chunkSize;
        this.loadRadius = loadRadius;
        this.chunks = new Map();
        this.alwaysVisible = new Set();
        this._playerChunk = null;
    }

    /** Objects that must stay visible (sky, lights, player, transit). */
    markAlwaysVisible(obj) {
        this.alwaysVisible.add(obj);
        obj.traverse?.(child => { child.visible = true; });
        obj.visible = true;
    }

    register(obj, x, z, opts = {}) {
        if (!obj) return;
        const key = this._key(x, z);
        if (!this.chunks.has(key)) {
            this.chunks.set(key, { objects: [], active: false, x: parseInt(key.split(',')[0], 10), z: parseInt(key.split(',')[1], 10) });
        }
        const entry = { obj, always: !!opts.always };
        this.chunks.get(key).objects.push(entry);
        if (!opts.always) {
            obj.visible = false;
            obj.traverse?.(child => { if (child.isMesh || child.isGroup) child.visible = false; });
        }
    }

    registerGroup(group, cx, cz, footprint = 1) {
        for (let dx = -footprint; dx <= footprint; dx++) {
            for (let dz = -footprint; dz <= footprint; dz++) {
                const x = cx + dx * this.chunkSize * 0.5;
                const z = cz + dz * this.chunkSize * 0.5;
                this.register(group, x, z);
            }
        }
    }

    update(playerX, playerZ) {
        const pcx = Math.floor(playerX / this.chunkSize);
        const pcz = Math.floor(playerZ / this.chunkSize);
        const playerKey = `${pcx},${pcz}`;
        if (playerKey === this._playerChunk) return;
        this._playerChunk = playerKey;

        for (const [, chunk] of this.chunks) {
            const dist = Math.max(Math.abs(chunk.x - pcx), Math.abs(chunk.z - pcz));
            const active = dist <= this.loadRadius;
            if (active === chunk.active) continue;
            chunk.active = active;
            chunk.objects.forEach(({ obj, always }) => {
                if (always) return;
                obj.visible = active;
                obj.traverse?.(child => {
                    if (child.isMesh || child.isGroup || child.isLight) child.visible = active;
                });
            });
        }
    }

    /** Force-load chunks around a point (cinematic intro, transit arrival). */
    preloadAround(x, z, radius = this.loadRadius) {
        const pcx = Math.floor(x / this.chunkSize);
        const pcz = Math.floor(z / this.chunkSize);
        for (const [, chunk] of this.chunks) {
            const dist = Math.max(Math.abs(chunk.x - pcx), Math.abs(chunk.z - pcz));
            if (dist > radius) continue;
            chunk.active = true;
            chunk.objects.forEach(({ obj, always }) => {
                if (always) return;
                obj.visible = true;
                obj.traverse?.(child => {
                    if (child.isMesh || child.isGroup || child.isLight) child.visible = true;
                });
            });
        }
    }

    getActiveCount() {
        let n = 0;
        for (const [, c] of this.chunks) if (c.active) n += c.objects.length;
        return n;
    }

    _key(x, z) {
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        const bx = Math.max(-Math.ceil(WORLD.bound / this.chunkSize), Math.min(Math.ceil(WORLD.bound / this.chunkSize), cx));
        const bz = Math.max(-Math.ceil(WORLD.bound / this.chunkSize), Math.min(Math.ceil(WORLD.bound / this.chunkSize), cz));
        return `${bx},${bz}`;
    }
}