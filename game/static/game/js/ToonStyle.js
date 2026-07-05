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
    
    // Auto-calculate bounding box size to prevent outlining large terrain / water objects
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Multiply by local scale to check actual world size of the mesh
    size.x *= Math.abs(mesh.scale.x);
    size.y *= Math.abs(mesh.scale.y);
    size.z *= Math.abs(mesh.scale.z);
    
    // If the mesh is large (e.g. landscape grass, water, sand, mountains), skip outlines
    if (size.x > 25 || size.y > 25 || size.z > 25) {
        return null;
    }

    const outline = mesh.clone();
    // Use simple, fast BasicMaterial for backface rendering of outlines
    outline.material = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    outline.scale.multiplyScalar(scale);
    outline.name = 'inkOutline';
    
    // Clear children on the cloned outline to prevent bloated double outlines on sub-parts
    while (outline.children.length > 0) {
        outline.remove(outline.children[0]);
    }

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

/** Soft cozy anime-inspired ambient lighting */
export function setupCityLighting(scene) {
    scene.add(new THREE.AmbientLight(0xfff5e4, 0.75));
    scene.add(new THREE.HemisphereLight(0x91E5F2, 0x8CC97D, 0.45));

    const sun = new THREE.DirectionalLight(0xfff0c8, 1.8);
    sun.position.set(-80, 160, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.001;
    sun.shadow.radius = 2.5;
    const s = 250;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc8e8ff, 0.45);
    fill.position.set(80, 60, -100);
    scene.add(fill);

    return { sun, fill };
}