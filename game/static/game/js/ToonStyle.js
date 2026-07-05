import * as THREE from 'three';
import { PALETTE } from './config.js';

let _gradientMap = null;

export function getGradientMap() {
    if (_gradientMap) return _gradientMap;
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 1;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4, 0);
    g.addColorStop(0.0, '#9aa8ac');
    g.addColorStop(0.5, '#d0d4d8');
    g.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 1);
    _gradientMap = new THREE.CanvasTexture(c);
    _gradientMap.minFilter = THREE.NearestFilter;
    _gradientMap.magFilter = THREE.NearestFilter;
    _gradientMap.generateMipmaps = false;
    return _gradientMap;
}

export const INK = 0x1e1e28;

export function toonMat(color, opts = {}) {
    const p = { color, gradientMap: getGradientMap() };
    if (opts.transparent) {
        p.transparent = true;
        p.opacity = opts.opacity ?? 0.88;
    }
    if (opts.emissive != null) {
        p.emissive = opts.emissive;
        p.emissiveIntensity = opts.emissiveIntensity ?? 0.1;
    }
    return new THREE.MeshToonMaterial(p);
}

export function addInkOutline(mesh, scale = 1.04) {
    const outline = mesh.clone();
    outline.material = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    outline.scale.multiplyScalar(scale);
    outline.name = 'inkOutline';
    mesh.parent.add(outline);
    return outline;
}

export function toonMesh(geometry, color, opts = {}) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, toonMat(color, opts));
    if (opts.castShadow !== false) mesh.castShadow = true;
    if (opts.receiveShadow) mesh.receiveShadow = true;
    g.add(mesh);
    if (opts.outline !== false) addInkOutline(mesh, opts.outlineScale ?? 1.04);
    return { group: g, mesh };
}

export function sketchLines(parent, points, color = INK, opacity = 0.3) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    parent.add(line);
    return line;
}

/** Soft golden-hour ambient lighting — no harsh shadows */
export function setupCityLighting(scene) {
    scene.add(new THREE.AmbientLight(0xfff8f0, 0.78));
    scene.add(new THREE.HemisphereLight(PALETTE.skyTop, PALETTE.grassDark, 0.42));

    const sun = new THREE.DirectionalLight(0xfff0d8, 0.72);
    sun.position.set(-50, 85, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.001;
    sun.shadow.radius = 2;
    const s = 220;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xaeeef8, 0.28);
    fill.position.set(60, 40, -80);
    scene.add(fill);

    return { sun, fill };
}