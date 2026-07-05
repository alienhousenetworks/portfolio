import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER } from './config.js';

/** GLB character catalog — files live in static/game/models/ */
export const MODEL_CATALOG = {
    humans: {
        male: {
            file: 'models/quaternius_cc0-male-character-1354.glb',
            animated: true,
            targetHeight: PLAYER.height,
        },
        female: {
            file: 'models/quaternius_cc0-female-character-1350.glb',
            animated: true,
            targetHeight: 1.65,
        },
        dezyne: {
            file: 'models/dezyne_3d-man-462.glb',
            animated: false,
            targetHeight: PLAYER.height,
        },
    },
    aliens: {
        fantasy: {
            file: 'models/pixellabs-dark-fantasy-3330.glb',
            animated: false,
            targetHeight: 1.9,
        },
        creature: {
            file: 'models/pixellabs-glb-3347.glb',
            animated: false,
            targetHeight: 1.85,
        },
    },
};

const HUMAN_KEYS = Object.keys(MODEL_CATALOG.humans);
const ALIEN_KEYS = Object.keys(MODEL_CATALOG.aliens);

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
        return new Error(
            `Git LFS pointer at ${url} — on VPS run: git lfs install && git lfs pull && collectstatic`
        );
    }
    if (preview.trimStart().startsWith('<!DOCTYPE') || preview.trimStart().startsWith('<html')) {
        return new Error(`HTML error page returned for ${url} — check static file path on server`);
    }
    return new Error(`Invalid GLB at ${url} (expected glTF magic, got "${magic}")`);
}

async function fetchAndParseGlb(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    }
    const buffer = await res.arrayBuffer();
    const bad = glbLoadError(url, buffer);
    if (bad) throw bad;
    return new Promise((resolve, reject) => {
        _loader.parse(buffer, url, resolve, reject);
    });
}

function prepareMeshes(root) {
    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(m => {
                if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            });
        }
    });
}

function normalizeHeight(root, targetHeight) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y || 1;
    const scale = targetHeight / h;
    root.scale.setScalar(scale);

    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
    return scale;
}

function findClip(clips, kind) {
    const rules = {
        idle: [/idle/i, /standing/i],
        walk: [/_walk$/i, /\|man_walk$/i, /\|female_walk$/i],
        run: [/_run$/i, /\|man_run$/i, /\|female_run$/i],
        jump: [/_jump$/i, /\|man_jump$/i, /\|female_jump$/i],
        climb: [/climb/i],
    };
    const patterns = rules[kind] || [];
    for (const pattern of patterns) {
        const hit = clips.find(c => pattern.test(c.name));
        if (hit) return hit;
    }
    return null;
}

function setupAnimator(root, clips) {
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    const kinds = ['idle', 'walk', 'run', 'jump', 'climb'];
    kinds.forEach(kind => {
        const clip = findClip(clips, kind);
        if (clip) actions[kind] = mixer.clipAction(clip);
    });
    if (!actions.idle && clips[0]) {
        actions.idle = mixer.clipAction(clips[0]);
    }
    if (actions.idle) actions.idle.play();
    return { mixer, actions };
}

export function getHumanModelKey(index = 0) {
    return HUMAN_KEYS[index % HUMAN_KEYS.length];
}

export function getAlienModelKey(index = 0) {
    return ALIEN_KEYS[index % ALIEN_KEYS.length];
}

export async function preloadCharacterModels(baseUrl, onProgress) {
    const entries = [
        ...Object.entries(MODEL_CATALOG.humans).map(([id, cfg]) => ({ id: `human:${id}`, cfg })),
        ...Object.entries(MODEL_CATALOG.aliens).map(([id, cfg]) => ({ id: `alien:${id}`, cfg })),
    ];
    let done = 0;
    const total = entries.length;
    const errors = [];

    await Promise.all(entries.map(async ({ id, cfg }) => {
        if (_cache.has(id)) {
            done += 1;
            onProgress?.(done / total, id);
            return;
        }
        const url = resolveUrl(baseUrl, cfg.file);
        try {
            const gltf = await fetchAndParseGlb(url);
            const scene = gltf.scene;
            prepareMeshes(scene);
            normalizeHeight(scene, cfg.targetHeight);
            _cache.set(id, {
                scene,
                animations: gltf.animations || [],
                animated: cfg.animated,
                targetHeight: cfg.targetHeight,
            });
        } catch (err) {
            console.error(`[CharacterModels] ${id}:`, err.message || err);
            errors.push({ id, url, error: err });
        } finally {
            done += 1;
            onProgress?.(done / total, id);
        }
    }));

    return { loaded: _cache.size, total, errors };
}

export function createCharacterInstance(type, modelKey, opts = {}) {
    const cacheKey = `${type}:${modelKey}`;
    const cached = _cache.get(cacheKey);
    if (!cached) {
        console.warn(`[CharacterModels] Model not loaded: ${cacheKey}`);
        return createFallbackMarker();
    }

    const root = new THREE.Group();
    root.name = `${type}Avatar`;
    const model = cached.scene.clone(true);
    root.add(model);

    const targetH = opts.targetHeight ?? cached.targetHeight;
    if (opts.targetHeight && Math.abs(opts.targetHeight - cached.targetHeight) > 0.01) {
        const ratio = opts.targetHeight / cached.targetHeight;
        model.scale.multiplyScalar(ratio);
    }

    root.userData.modelKey = modelKey;
    root.userData.characterType = type;
    root.userData.isHuman = type === 'human';
    root.userData.isAlien = type === 'alien';
    root.userData.isStaticModel = !cached.animated || cached.animations.length === 0;

    if (!root.userData.isStaticModel && cached.animations.length) {
        const { mixer, actions } = setupAnimator(model, cached.animations);
        root.userData.mixer = mixer;
        root.userData.actions = actions;
        root.userData._activeAction = actions.idle ?? null;
    }

    return root;
}

function createFallbackMarker() {
    const g = new THREE.Group();
    g.userData.isFallback = true;
    return g;
}

export function fadeCharacterAction(avatar, name, duration = 0.2) {
    const actions = avatar.userData.actions;
    if (!actions || !actions[name]) return;
    const prev = avatar.userData._activeAction;
    const next = actions[name];
    if (prev === next) return;
    if (prev) prev.fadeOut(duration);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    avatar.userData._activeAction = next;
}

export function updateCharacterAnimator(avatar, dt) {
    if (avatar.userData.mixer) avatar.userData.mixer.update(dt);
}

export function animateStaticWalk(avatar, walkT, intensity = 1) {
    if (!avatar.userData.isStaticModel) return;
    const baseY = avatar.userData._baseY ?? avatar.position.y;
    if (avatar.userData._baseY == null) avatar.userData._baseY = baseY;
    avatar.position.y = baseY + Math.sin(walkT * 10) * 0.025 * intensity;
    const body = avatar.children[0];
    if (body) body.rotation.z = Math.sin(walkT * 5) * 0.04 * intensity;
}