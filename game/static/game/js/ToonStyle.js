import * as THREE from 'three';
import { PALETTE } from './config.js';

let _gradientMap = null;

export function getGradientMap() {
    if (_gradientMap) return _gradientMap;
    // Use robust DataTexture for toon shading ramp (4-step cell shading)
    const data = new Uint8Array([
        60, 60, 60, 255,      // dark shadow
        120, 120, 120, 255,   // mid shadow
        200, 200, 200, 255,   // light/body
        255, 255, 255, 255    // highlight
    ]);
    _gradientMap = new THREE.DataTexture(data, 4, 1);
    _gradientMap.minFilter = THREE.NearestFilter;
    _gradientMap.magFilter = THREE.NearestFilter;
    _gradientMap.generateMipmaps = false;
    _gradientMap.needsUpdate = true;
    return _gradientMap;
}

export const INK = 0x1e1e28;

export function toonMat(color, opts = {}) {
    const p = { color: new THREE.Color(color), gradientMap: getGradientMap() };
    if (opts.transparent) {
        p.transparent = true;
        p.opacity = opts.opacity ?? 0.88;
    }
    if (opts.emissive != null) {
        p.emissive = new THREE.Color(opts.emissive);
        p.emissiveIntensity = opts.emissiveIntensity ?? 0.1;
    }
    return new THREE.MeshToonMaterial(p);
}

export function addInkOutline(mesh, scale = 1.04) {
    if (!mesh.geometry) return null;

    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    size.x *= Math.abs(mesh.scale.x);
    size.y *= Math.abs(mesh.scale.y);
    size.z *= Math.abs(mesh.scale.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    // Skip only micro-details and huge terrain slabs — keep crisp anime outlines on most props
    if (maxDim < 0.45 || size.x > 28 || size.y > 28 || size.z > 28) {
        return null;
    }

    const outline = mesh.clone();
    outline.material = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    outline.scale.multiplyScalar(scale);
    outline.name = 'inkOutline';
    outline.castShadow = false;
    outline.receiveShadow = false;

    while (outline.children.length > 0) {
        outline.remove(outline.children[0]);
    }

    mesh.parent.add(outline);
    return outline;
}

/**
 * Toon mesh helper — high visual quality defaults with smart skips for micro-geo.
 * - castShadow: on for larger pieces (or opts.castShadow === true)
 * - ink outline: on unless outline:false or geometry is tiny
 */
export function toonMesh(geometry, color, opts = {}) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, toonMat(color, opts));

    // Estimate size for shadow casting without full world matrix
    if (!geometry.boundingBox) geometry.computeBoundingBox?.();
    let maxDim = 2;
    if (geometry.boundingBox) {
        const s = new THREE.Vector3();
        geometry.boundingBox.getSize(s);
        maxDim = Math.max(s.x, s.y, s.z);
    }

    if (opts.castShadow === true) mesh.castShadow = true;
    else if (opts.castShadow === false) mesh.castShadow = false;
    else mesh.castShadow = maxDim >= 1.4; // auto for windows/doors/bodies

    mesh.receiveShadow = opts.receiveShadow !== false && maxDim >= 0.8;
    g.add(mesh);

    if (opts.outline !== false) {
        addInkOutline(mesh, opts.outlineScale ?? 1.035);
    }
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

/** Soft cozy anime-inspired ambient lighting (handles for EnvironmentSystem) */
export function setupCityLighting(scene) {
    const ambient = new THREE.AmbientLight(0xfff5e4, 0.75);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x91E5F2, 0x8CC97D, 0.45);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0c8, 1.8);
    sun.position.set(-80, 160, 70);
    sun.castShadow = true;
    // Soft quality shadows (1024 + wider frustum) without going full 2048 cost
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 340;
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 2;
    const s = 140;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.autoUpdate = true;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc8e8ff, 0.45);
    fill.position.set(80, 60, -100);
    scene.add(fill);

    // City night fill — plaza + avenues (EnvironmentSystem toggles intensity)
    const nightGlow = new THREE.PointLight(0xffb070, 0, 220, 1.2);
    nightGlow.position.set(0, 14, 0);
    nightGlow.visible = false;
    scene.add(nightGlow);

    // Extra warm fills so the city is readable at night (not pitch black)
    const nightGlow2 = new THREE.PointLight(0xffc888, 0, 160, 1.3);
    nightGlow2.position.set(0, 10, 55);
    nightGlow2.visible = false;
    scene.add(nightGlow2);

    const nightGlow3 = new THREE.PointLight(0xffc888, 0, 160, 1.3);
    nightGlow3.position.set(0, 10, -55);
    nightGlow3.visible = false;
    scene.add(nightGlow3);

    const nightHemi = new THREE.HemisphereLight(0x4a6088, 0xffaa66, 0);
    nightHemi.visible = false;
    scene.add(nightHemi);

    const handles = { ambient, hemi, sun, fill, nightGlow, nightGlow2, nightGlow3, nightHemi };
    scene.userData.envLights = handles;
    return handles;
}