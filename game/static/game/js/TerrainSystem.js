import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh, getGradientMap } from './ToonStyle.js';

const MAX_STEP = 2.2;
const STAIR_MAX_STEP = 2.5;

/** Curved hills + stairs — height query & walkability for the residential slopes. */
export class TerrainSystem {
    constructor() {
        this.terraces = [];
        this.stairs = [];
        this.slopes = [];
        this.wallColliders = [];
        this.stairMeshes = [];
        this.grassMaterials = [];
        this.butterflies = [];
        this.time = 0;
        
        // Procedural rolling hills (submerged spheres matching the designs)
        this.hills = [
            { x: -65, z: -120, r: 46, hy: -36 },
            { x: 70, z: -100, r: 42, hy: -32 },
            { x: -80, z: 60, r: 52, hy: -41 },
            { x: 80, z: 90, r: 48, hy: -38 },
            { x: -130, z: -20, r: 60, hy: -49 },
            { x: 130, z: 110, r: 56, hy: -46 },
            { x: -50, z: -190, r: 42, hy: -32 },
            { x: 50, z: -170, r: 42, hy: -32 },
            { x: -45, z: 160, r: 36, hy: -27 },
            { x: 45, z: 150, r: 36, hy: -27 },
        ];
    }

    build(scene) {
        this._defineZones();
        this._buildCurvedHills(scene);
        this._buildStairs(scene);
        this._buildSteppingStones(scene);
        this._buildHedges(scene);
        this._buildWildflowers(scene);
        this._buildButterflies(scene);
        return this;
    }

    update(dt) {
        this.time += dt;

        // 1. Realistic Lawn Color Cycling (breeze/lighting wave) - Light Sage/Matcha Shades
        this.grassMaterials.forEach(mat => {
            if (mat.color) {
                const colA = new THREE.Color('#74c688');
                const colB = new THREE.Color('#83d596');
                const colC = new THREE.Color('#67b97b');
                
                const finalCol = new THREE.Color().lerpColors(colA, colB, (Math.sin(this.time * 0.5) + 1.0) / 2.0);
                finalCol.lerp(colC, (Math.cos(this.time * 0.3) + 1.0) / 4.0);
                mat.color.copy(finalCol);
            }
        });

        // 2. Animate Butterflies
        this.butterflies.forEach((b, idx) => {
            const angle = this.time * b.speed + idx;
            b.group.position.x = b.baseX + Math.sin(angle) * 4;
            b.group.position.z = b.baseZ + Math.cos(angle) * 4;
            b.group.position.y = b.baseY + Math.sin(angle * 2.5) * 1.5;

            // Wing flap animation
            b.wingL.rotation.y = Math.sin(this.time * 20) * 0.75;
            b.wingR.rotation.y = -Math.sin(this.time * 20) * 0.75;
        });
    }

    getHeightAt(x, z) {
        // Stairs override
        for (const s of this.stairs) {
            if (this._inRect(x, z, s)) {
                const t = s.axis === 'z'
                    ? (z - s.zMin) / (s.zMax - s.zMin)
                    : (x - s.xMin) / (s.xMax - s.xMin);
                return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(t, 0, 1));
            }
        }

        // Slopes override
        for (const sl of this.slopes) {
            const h = this._heightOnSlope(x, z, sl);
            if (h != null) return h;
        }

        // Calculate height based on overlapping submerged sphere hills
        let maxH = 0.15;
        for (const h of this.hills) {
            const dx = x - h.x;
            const dz = z - h.z;
            const distSq = dx * dx + dz * dz;
            const rSq = h.r * h.r;
            if (distSq < rSq) {
                const y = h.hy + Math.sqrt(rSq - distSq);
                if (y > maxH) {
                    maxH = y;
                }
            }
        }
        return maxH;
    }

    isOnStair(x, z) {
        return this.stairs.some(s => this._inRect(x, z, s));
    }

    canTraverse(fromX, fromZ, fromY, toX, toZ) {
        const toY = this.getHeightAt(toX, toZ);
        const dy = toY - fromY;
        if (Math.abs(dy) <= MAX_STEP) return true;
        if (this.isOnStair(fromX, fromZ) || this.isOnStair(toX, toZ)) {
            return Math.abs(dy) <= STAIR_MAX_STEP;
        }
        if (dy < 0 && Math.abs(dy) <= 1.2) return true;
        return false;
    }

    getWalkableHeight(x, z, currentY) {
        const target = this.getHeightAt(x, z);
        if (Math.abs(target - currentY) <= STAIR_MAX_STEP) return target;
        return currentY;
    }

    _defineZones() {
        const rw = WORLD.riverWidth / 2 + 21;
        const west = (edgeX, z0, z1, y0, y1) => ({ x: -edgeX, z0, z1, y0, y1 });
        const east = (edgeX, z0, z1, y0, y1) => ({ x: edgeX, z0, z1, y0, y1 });

        const stairDefs = [
            west(rw + 14, -170, -140, 1.2, 2.4),
            west(rw + 14, -55, -25, 1.2, 2.4),
            west(rw + 14, 35, 65, 1.2, 2.4),
            west(rw + 14, 140, 170, 1.2, 2.4),
            west(rw + 20, -130, -100, 2.4, 3.8),
            west(rw + 20, 0, 30, 2.4, 3.8),
            west(rw + 20, 100, 130, 2.4, 3.8),
            west(rw + 28, -95, -65, 3.8, 5.5),
            west(rw + 28, 55, 85, 3.8, 5.5),
            west(rw + 38, -75, -45, 5.5, 7.5),
            west(rw + 38, 70, 100, 5.5, 7.5),
            east(rw + 14, -160, -130, 1.2, 2.4),
            east(rw + 14, -45, -15, 1.2, 2.4),
            east(rw + 14, 45, 75, 1.2, 2.4),
            east(rw + 14, 150, 180, 1.2, 2.4),
            east(rw + 20, -110, -80, 2.4, 3.8),
            east(rw + 20, 15, 45, 2.4, 3.8),
            east(rw + 20, 110, 140, 2.4, 3.8),
            east(rw + 28, -85, -55, 3.8, 5.5),
            east(rw + 28, 60, 90, 3.8, 5.5),
            east(rw + 38, -65, -35, 5.5, 7.5),
            east(rw + 38, 75, 105, 5.5, 7.5),
        ];

        stairDefs.forEach(def => {
            const w = 3.2;
            this.stairs.push({
                xMin: def.x - w / 2, xMax: def.x + w / 2,
                zMin: Math.min(def.z0, def.z1), zMax: Math.max(def.z0, def.z1),
                y0: def.y0, y1: def.y1,
                axis: def.axis || 'z',
                x: def.x,
            });
        });

        this.slopes = [
            { pts: [[-200, -180, 7.5], [-160, -140, 6.2], [-120, -110, 4.8], [-80, -90, 3.2]], w: 9 },
            { pts: [[200, -170, 7.5], [165, -130, 6.2], [130, -100, 4.8], [95, -80, 3.2]], w: 9 },
            { pts: [[-190, 150, 7.5], [-150, 120, 6.2], [-110, 100, 4.8], [-70, 85, 3.2]], w: 8 },
            { pts: [[190, 140, 7.5], [155, 115, 6.2], [120, 95, 4.8], [85, 80, 3.2]], w: 8 },
        ];
    }

    _inRect(x, z, r) {
        return x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax;
    }

    _heightOnSlope(x, z, slope) {
        const { pts, w } = slope;
        let best = null, bestDist = w / 2 + 1;

        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, z1, h1] = pts[i];
            const [x2, z2, h2] = pts[i + 1];
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.hypot(dx, dz);
            if (len < 1) continue;
            const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / (len * len), 0, 1);
            const px = x1 + dx * t, pz = z1 + dz * t;
            const Math_dist = Math.hypot(x - px, z - pz);
            if (Math_dist < bestDist) {
                bestDist = Math_dist;
                best = THREE.MathUtils.lerp(h1, h2, t);
            }
        }
        return best;
    }

    _createNoiseTexture(color1, color2, size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                ctx.fillStyle = Math.random() > 0.45 ? color1 : color2;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    _buildCurvedHills(scene) {
        const grassTex = this._createNoiseTexture('#6fcf85', '#5ebf75');
        grassTex.repeat.set(50, 50);

        // 1. Build flat ground base (colored sand/shore in center, grass on sides)
        const groundGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 40, 40);
        groundGeo.rotateX(-Math.PI / 2);
        
        const pos = groundGeo.attributes.position;
        const colors = [];
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const d = Math.abs(vx);
            let colHex = PALETTE.grass;
            if (d < 45) {
                colHex = PALETTE.sand;
            }
            const c = new THREE.Color(colHex);
            colors.push(c.r, c.g, c.b);
        }
        groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const baseMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            map: grassTex,
            roughness: 0.9,
            metalness: 0.1
        });
        this.grassMaterials.push(baseMat);

        const baseMesh = new THREE.Mesh(groundGeo, baseMat);
        baseMesh.position.y = 0.15;
        baseMesh.receiveShadow = true;
        scene.add(baseMesh);

        // 2. Build submerged sphere rolling hills
        this.hills.forEach(h => {
            const hillGeo = new THREE.SphereGeometry(h.r, 32, 24);
            const hp = hillGeo.attributes.position;
            const hn = hillGeo.attributes.normal;
            const hillColors = [];

            for (let i = 0; i < hp.count; i++) {
                const ny = hn.getY(i);
                const vy = hp.getY(i) + h.hy;
                
                if (ny > 0.58 && vy > 0.25) {
                    const c = new THREE.Color(PALETTE.grass);
                    hillColors.push(c.r, c.g, c.b);
                } else {
                    const c = new THREE.Color(PALETTE.sand);
                    hillColors.push(c.r, c.g, c.b);
                }
            }
            hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3));

            const hillMat = new THREE.MeshStandardMaterial({
                vertexColors: true,
                map: grassTex,
                roughness: 0.9,
                metalness: 0.1
            });
            this.grassMaterials.push(hillMat);

            const hillMesh = new THREE.Mesh(hillGeo, hillMat);
            hillMesh.position.set(h.x, h.hy, h.z);
            hillMesh.castShadow = true;
            hillMesh.receiveShadow = true;
            scene.add(hillMesh);
        });
    }

    _buildSteppingStones(scene) {
        const stoneTex = this._createNoiseTexture('#9e9e9e', '#8a8a8a');
        stoneTex.repeat.set(2, 2);

        const stoneGeo = new THREE.BoxGeometry(2.0, 0.12, 1.5);
        const stoneMat = new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.8,
            metalness: 0.2
        });

        // Arrange stones along beautiful paths leading to central valley or main buildings
        const stonePaths = [
            // Center valley path
            { startZ: 80, endZ: -80, count: 18, offset: 0 },
            // Left hill path
            { startZ: 100, endZ: -40, count: 12, offset: -48 }
        ];

        stonePaths.forEach(path => {
            for (let i = 0; i < path.count; i++) {
                const t = i / (path.count - 1);
                const z = path.startZ + t * (path.endZ - path.startZ);
                const x = path.offset + Math.sin(z * 0.05) * 5;
                const y = this.getHeightAt(x, z) + 0.04;

                const stone = new THREE.Mesh(stoneGeo, stoneMat);
                stone.position.set(x, y, z);
                stone.rotation.y = (Math.sin(z * 0.1) * 0.3) + (Math.random() - 0.5) * 0.15;
                stone.castShadow = true;
                stone.receiveShadow = true;
                scene.add(stone);
            }
        });
    }

    _buildHedges(scene) {
        const hedgeTex = this._createNoiseTexture('#2d5a1e', '#1e3f13');
        hedgeTex.repeat.set(5, 5);
        const hedgeMat = new THREE.MeshStandardMaterial({
            map: hedgeTex,
            roughness: 0.95
        });

        // Hedges bordering different district sectors
        const hedgeBoxes = [
            { x: -50, z: -70, w: 25, h: 2.8, d: 2 },
            { x: 50, z: -50, w: 30, h: 2.8, d: 2 },
            { x: -80, z: 90, w: 20, h: 3.2, d: 2 },
            { x: 80, z: 60, w: 20, h: 3.2, d: 2 }
        ];

        hedgeBoxes.forEach(hb => {
            const geo = new THREE.BoxGeometry(hb.w, hb.h, hb.d);
            const hedge = new THREE.Mesh(geo, hedgeMat);
            const y = this.getHeightAt(hb.x, hb.z) + hb.h / 2;
            hedge.position.set(hb.x, y, hb.z);
            hedge.castShadow = true;
            hedge.receiveShadow = true;
            scene.add(hedge);
        });
    }

    _buildWildflowers(scene) {
        const flowerGeo = new THREE.IcosahedronGeometry(0.24, 1);
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.9, emissive: 0xffeb3b, emissiveIntensity: 0.1 });
        const purpleMat = new THREE.MeshStandardMaterial({ color: 0x9c27b0, roughness: 0.9, emissive: 0x9c27b0, emissiveIntensity: 0.1 });
        const magentaMat = new THREE.MeshStandardMaterial({ color: 0xd63693, roughness: 0.8, emissive: 0x4a0a2f, emissiveIntensity: 0.2 });

        const count = 180;
        const instancedYellow = new THREE.InstancedMesh(flowerGeo, yellowMat, count);
        const instancedPurple = new THREE.InstancedMesh(flowerGeo, purpleMat, count);
        const instancedMagenta = new THREE.InstancedMesh(flowerGeo, magentaMat, count);

        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            // Distribute across the hillsides
            const hill = this.hills[i % this.hills.length];
            const angle = (i * 2.39) % (Math.PI * 2);
            const r = (0.2 + Math.random() * 0.6) * hill.r;
            const x = hill.x + Math.cos(angle) * r;
            const z = hill.z + Math.sin(angle) * r;
            const y = this.getHeightAt(x, z) + 0.1;

            dummy.position.set(x, y, z);
            dummy.scale.setScalar(0.6 + Math.random() * 0.8);
            dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
            dummy.updateMatrix();

            if (i % 3 === 0) {
                instancedYellow.setMatrixAt(i, dummy.matrix);
            } else if (i % 3 === 1) {
                instancedPurple.setMatrixAt(i, dummy.matrix);
            } else {
                instancedMagenta.setMatrixAt(i, dummy.matrix);
            }
        }
        instancedYellow.castShadow = true;
        instancedPurple.castShadow = true;
        instancedMagenta.castShadow = true;
        scene.add(instancedYellow, instancedPurple, instancedMagenta);
    }

    _buildButterflies(scene) {
        // Build 12 animated butterfly groups
        for (let i = 0; i < 12; i++) {
            const bGroup = new THREE.Group();
            
            // Random colors (pink, blue, yellow)
            const colors = [0xff88cc, 0x88ccff, 0xffcc88];
            const col = colors[i % colors.length];

            const wingGeo = new THREE.PlaneGeometry(0.35, 0.45);
            wingGeo.translate(0.175, 0, 0); // pivot on edge
            const wingMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });

            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.rotation.y = 0.5;
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.scale.x = -1; // Mirror
            wingR.rotation.y = -0.5;

            bGroup.add(wingL);
            bGroup.add(wingR);

            // Position randomly in the valley / hills
            const baseX = (Math.random() - 0.5) * 80;
            const baseZ = (Math.random() - 0.5) * 80;
            const baseY = this.getHeightAt(baseX, baseZ) + 2.0 + Math.random() * 3.0;

            bGroup.position.set(baseX, baseY, baseZ);
            scene.add(bGroup);

            this.butterflies.push({
                group: bGroup,
                wingL,
                wingR,
                baseX,
                baseY,
                baseZ,
                speed: 1.0 + Math.random() * 0.8
            });
        }
    }

    _buildStairs(scene) {
        this.stairs.forEach(s => {
            const g = this._createStairMesh(s);
            scene.add(g);
            this.stairMeshes.push(g);
        });
    }

    _createStairMesh(s) {
        const g = new THREE.Group();
        const len = s.axis === 'z' ? (s.zMax - s.zMin) : (s.xMax - s.xMin);
        const steps = Math.max(8, Math.floor(len / 0.55));
        const stepRise = (s.y1 - s.y0) / steps;
        const stepRun = len / steps;
        const cx = (s.xMin + s.xMax) / 2;
        const cz = (s.zMin + s.zMax) / 2;

        for (let i = 0; i < steps; i++) {
            const rise = s.y0 + stepRise * i;
            const { group, mesh } = toonMesh(
                new THREE.BoxGeometry(2.8, stepRise + 0.02, stepRun + 0.04),
                i % 2 === 0 ? 0xe8e4dc : 0xd8d4cc
            );
            mesh.position.y = rise + stepRise / 2;
            if (s.axis === 'z') {
                mesh.position.set(cx, rise + stepRise / 2, s.zMin + stepRun * i + stepRun / 2);
            } else {
                mesh.position.set(s.xMin + stepRun * i + stepRun / 2, rise + stepRise / 2, cz);
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            g.add(group);
        }

        [-1.55, 1.55].forEach(side => {
            const railLen = len + 0.6;
            const rail = toonMesh(new THREE.BoxGeometry(0.1, 0.9, railLen), 0x8a9098);
            rail.mesh.position.set(
                cx + side,
                s.y0 + (s.y1 - s.y0) / 2 + 0.5,
                s.axis === 'z' ? cz : cz
            );
            if (s.axis === 'x') rail.mesh.position.set(cx, s.y0 + (s.y1 - s.y0) / 2 + 0.5, cz + side);
            g.add(rail.group);

            for (let i = 0; i <= 4; i++) {
                const post = toonMesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), 0x7a8088);
                const t = i / 4;
                post.mesh.position.set(
                    cx + side,
                    s.y0 + (s.y1 - s.y0) * t + 0.4,
                    s.axis === 'z' ? THREE.MathUtils.lerp(s.zMin, s.zMax, t) : cz + side
                );
                if (s.axis === 'x') {
                    post.mesh.position.set(
                        THREE.MathUtils.lerp(s.xMin, s.xMax, t),
                        s.y0 + (s.y1 - s.y0) * t + 0.4,
                        cz + side
                    );
                }
                g.add(post.group);
            }
        });

        return g;
    }
}