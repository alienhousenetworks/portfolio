import * as THREE from 'three';

let _gradientMap = null;

export function getGradientMap() {
    if (_gradientMap) return _gradientMap;
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 1;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4, 0);
    g.addColorStop(0.0, '#6a6a6a');
    g.addColorStop(0.45, '#b0b0b0');
    g.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 1);
    _gradientMap = new THREE.CanvasTexture(c);
    _gradientMap.minFilter = THREE.NearestFilter;
    _gradientMap.magFilter = THREE.NearestFilter;
    _gradientMap.generateMipmaps = false;
    return _gradientMap;
}

export const INK = 0x1a1a22;

export function toonMat(color, opts = {}) {
    const p = {
        color,
        gradientMap: getGradientMap(),
    };
    if (opts.transparent) {
        p.transparent = true;
        p.opacity = opts.opacity ?? 0.85;
    }
    if (opts.emissive != null) {
        p.emissive = opts.emissive;
        p.emissiveIntensity = opts.emissiveIntensity ?? 0.15;
    }
    return new THREE.MeshToonMaterial(p);
}

export function flatMat(color) {
    return new THREE.MeshBasicMaterial({ color });
}

export function addInkOutline(mesh, scale = 1.025) {
    const outline = mesh.clone();
    outline.material = new THREE.MeshBasicMaterial({
        color: INK,
        side: THREE.BackSide,
    });
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
    if (opts.outline !== false) addInkOutline(mesh, opts.outlineScale ?? 1.025);
    return { group: g, mesh };
}

export function sketchLines(parent, points, color = INK, opacity = 0.35) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    parent.add(line);
    return line;
}