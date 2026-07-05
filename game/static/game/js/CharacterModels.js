import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER } from './config.js';

/** Only two lightweight rigged humans — all characters use these (~2.4 MB total). */
export const MODEL_CATALOG = {
    male: {
        file: 'models/quaternius_cc0-male-character-1354.glb',
        targetHeight: PLAYER.height,
        sizeMB: 1.2,
    },
    female: {
        file: 'models/quaternius_cc0-female-character-1350.glb',
        targetHeight: 1.65,
        sizeMB: 1.2,
    },
};

export const ALIEN_TINTS = [
    0x88ccaa, 0xaa88cc, 0xccaa88, 0x88aacc, 0xaacc88, 0xcc88aa,
];

const MODEL_KEYS = Object.keys(MODEL_CATALOG);
const _cache = new Map();
const _loader = new GLTFLoader();

function resolveUrl(base, file) {
    const root = base.endsWith('/') ? base : `${base}/`;
    return `${root}${file}`;
}

function glbLoadError(url, buffer) {
    const bytes = new Uint8Array(buffer);
    const magic = String.fromCharCode(bytes[0] || 0, bytes[1] || 0, bytes[2] || 0, bytes[3] || 0);
    if (magic === 'glTF') return null;
    const preview = new TextDecoder().decode(bytes.slice(0, 160));
    if (preview.startsWith('version https://git-lfs')) {
        return new Error(`Git LFS pointer at ${url} — rsync models from Mac to VPS`);
    }
    if (preview.trimStart().startsWith('<!DOCTYPE') || preview.trimStart().startsWith('<html')) {
        return new Error(`HTML error page at ${url}`);
    }
    return new Error(`Invalid GLB at ${url}`);
}

async function fetchAndParseGlb(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const bad = glbLoadError(url, buffer);
    if (bad) throw bad;
    return new Promise((resolve, reject) => {
        _loader.parse(buffer, url, resolve, reject);
    });
}

const HIDDEN_MESH = /collision|hitbox|cube|box|placeholder|root\s*mesh/i;

function stripHelperMeshes(root) {
    const toRemove = [];
    root.traverse(obj => {
        if (obj.isMesh && HIDDEN_MESH.test(obj.name || '')) toRemove.push(obj);
    });
    toRemove.forEach(obj => obj.parent?.remove(obj));
}

function prepareMeshes(root) {
    stripHelperMeshes(root);
    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(m => { if (m.map) m.map.colorSpace = THREE.SRGBColorSpace; });
        }
    });
}

function normalizeHeight(root, targetHeight) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    root.scale.setScalar(targetHeight / (size.y || 1));
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
}

function findClip(clips, kind) {
    const rules = {
        stand: [/_standing$/i, /_idle$/i],
        walk: [/_walk$/i],
        run: [/_run$/i, /\|man_run$/i, /\|female_run$/i],
        jump: [/_jump$/i, /runningjump/i],
        climb: [/climb/i, /_walk$/i],
    };
    for (const pattern of rules[kind] || []) {
        const hit = clips.find(c => pattern.test(c.name));
        if (hit) return hit;
    }
    return null;
}

function setupAnimator(root, clips) {
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    ['stand', 'walk', 'run', 'jump', 'climb'].forEach(kind => {
        const clip = findClip(clips, kind);
        if (clip) actions[kind] = mixer.clipAction(clip);
    });
    if (!actions.stand && clips[0]) actions.stand = mixer.clipAction(clips[0]);
    actions.idle = actions.stand;
    if (actions.stand) actions.stand.play();
    return { mixer, actions };
}

export async function preloadCharacterModels(baseUrl, onProgress) {
    const entries = MODEL_KEYS.map(key => ({ key, cfg: MODEL_CATALOG[key] }));
    const errors = [];
    let done = 0;

    await Promise.all(entries.map(async ({ key, cfg }) => {
        const id = `human:${key}`;
        if (_cache.has(id)) { done += 1; onProgress?.(done / entries.length, key, null); return; }

        const url = resolveUrl(baseUrl, cfg.file);
        onProgress?.(done / entries.length, key, `Loading ${key} (~${cfg.sizeMB}MB)…`);
        try {
            const gltf = await fetchAndParseGlb(url);
            prepareMeshes(gltf.scene);
            normalizeHeight(gltf.scene, cfg.targetHeight);
            _cache.set(id, {
                scene: gltf.scene,
                animations: gltf.animations || [],
                targetHeight: cfg.targetHeight,
            });
        } catch (err) {
            console.error(`[CharacterModels] ${key}:`, err.message || err);
            errors.push({ key, error: err });
        } finally {
            done += 1;
            onProgress?.(done / entries.length, key, null);
        }
    }));

    return { loaded: _cache.size, total: entries.length, errors };
}

/** @deprecated alias */
export const preloadCriticalModels = preloadCharacterModels;
export function preloadLazyModels() {
    return Promise.resolve({ loaded: _cache.size, total: 0, errors: [] });
}

export function getAnimatedHumanKey(index = 0) {
    return index % 2 === 0 ? 'male' : 'female';
}

export function getHumanModelKey(index = 0) {
    return getAnimatedHumanKey(index);
}

export function getAlienModelKey(index = 0) {
    return getAnimatedHumanKey(index + 1);
}

export function isModelLoaded(key) {
    return _cache.has(`human:${key}`);
}

export function hasCriticalModels() {
    return isModelLoaded('male');
}

function applyTint(model, color, strength = 0.3) {
    const tint = new THREE.Color(color);
    model.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.color) m.color.lerp(tint, strength); });
    });
}

export function createCharacterInstance(type, modelKey, opts = {}) {
    const humanKey = modelKey === 'male' || modelKey === 'female'
        ? modelKey
        : getAnimatedHumanKey(opts.variant ?? 0);

    const cached = _cache.get(`human:${humanKey}`);
    if (!cached) {
        console.warn(`[CharacterModels] Model not loaded: ${humanKey}`);
        const g = new THREE.Group();
        g.userData.isFallback = true;
        return g;
    }

    const root = new THREE.Group();
    root.name = `${type}Avatar`;
    const model = cached.scene.clone(true);
    root.add(model);

    if (opts.targetHeight && Math.abs(opts.targetHeight - cached.targetHeight) > 0.01) {
        model.scale.multiplyScalar(opts.targetHeight / cached.targetHeight);
    }

    const tint = opts.tint ?? (type === 'alien' ? ALIEN_TINTS[(opts.variant ?? 0) % ALIEN_TINTS.length] : null);
    if (tint) applyTint(model, tint, opts.tintStrength ?? (type === 'alien' ? 0.38 : 0.2));

    root.userData.modelKey = humanKey;
    root.userData.characterType = type;
    root.userData.isHuman = type === 'human';
    root.userData.isAlien = type === 'alien';
    root.userData.isRigged = true;
    root.userData.isStaticModel = false;

    if (cached.animations.length) {
        const { mixer, actions } = setupAnimator(model, cached.animations);
        root.userData.mixer = mixer;
        root.userData.actions = actions;
        root.userData._activeAction = actions.stand ?? null;
    }

    return root;
}

export function fadeCharacterAction(avatar, name, duration = 0.2) {
    const resolved = name === 'idle' ? 'stand' : name;
    const actions = avatar.userData.actions;
    if (!actions) return;
    const next = actions[resolved] ?? actions.stand ?? actions.walk;
    if (!next) return;
    const prev = avatar.userData._activeAction;
    if (prev === next) return;
    if (prev) prev.fadeOut(duration);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    avatar.userData._activeAction = next;
    avatar.userData.pose = resolved;
}

export function updateCharacterAnimator(avatar, dt) {
    if (avatar.userData.mixer) avatar.userData.mixer.update(dt);
}