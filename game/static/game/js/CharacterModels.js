import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { PLAYER, CITIZEN } from './config.js';
import { toonMat } from './ToonStyle.js';

/** Single rig per gender — Quaternius CC0 GLB with full locomotion + emote clips. */
export const MODEL_CATALOG = {
    male: {
        file: 'models/quaternius_cc0-male-character-1354.glb',
        targetHeight: PLAYER.height,
        sizeMB: 1.2,
        slots: ['Skin', 'Eyes', 'Hair', 'Hair2', 'Shirt', 'Shirt2', 'Pants', 'Socks', 'Shoes'],
    },
    female: {
        file: 'models/quaternius_cc0-female-character-1350.glb',
        targetHeight: CITIZEN.heightDefault,
        sizeMB: 1.2,
        slots: ['Skin', 'Eyes', 'Hair', 'Dress', 'Shoes'],
    },
};

export const ALIEN_TINTS = [
    0x88ccaa, 0xaa88cc, 0xccaa88, 0x88aacc, 0xaacc88, 0xcc88aa,
];

/** Outfit presets — swap materials by GLB slot name for customization. */
export const OUTFIT_PRESETS = [
    { name: 'Classic', skin: 0xece9e1, hair: 0x3d3224, shirt: 0x4e90e8, shirt2: 0x3a78d8, pants: 0x2a2a3a, socks: 0xf0f0f0, shoes: 0x1a1a1a, dress: 0x4e90e8, eyes: 0x2a2a3a },
    { name: 'Mint', skin: 0xf5e6d8, hair: 0x1a1a28, shirt: 0x48d2c9, shirt2: 0x38b8b0, pants: 0x2d4a4a, socks: 0xffffff, shoes: 0x2a2a2a, dress: 0x48d2c9, eyes: 0x1a2838 },
    { name: 'Sunset', skin: 0xe8c4a8, hair: 0x5c3a20, shirt: 0xf59a45, shirt2: 0xd67a30, pants: 0x4a3020, socks: 0xf8f0e8, shoes: 0x3a2820, dress: 0xf59a45, eyes: 0x3a2010 },
    { name: 'Lavender', skin: 0xf0e0e8, hair: 0x2a1a38, shirt: 0x8c7ceb, shirt2: 0x6a5cc8, pants: 0x3a2a50, socks: 0xffffff, shoes: 0x2a2038, dress: 0x8c7ceb, eyes: 0x2a1830 },
    { name: 'Forest', skin: 0xd8c8a8, hair: 0x1a2818, shirt: 0x79b36a, shirt2: 0x5a9048, pants: 0x2a3820, socks: 0xe8e8e0, shoes: 0x1a2018, dress: 0x79b36a, eyes: 0x1a2818 },
    { name: 'Coral', skin: 0xf5d0c8, hair: 0x4a2020, shirt: 0xf2b0c5, shirt2: 0xd890a8, pants: 0x4a2838, socks: 0xffffff, shoes: 0x3a2830, dress: 0xf2b0c5, eyes: 0x3a1828 },
];

const FEMALE_NAMES = new Set([
    'Hana', 'Mio', 'Yuki', 'Aki', 'Riley', 'Taylor', 'Jamie', 'Quinn', 'Avery',
    'Nara', 'Eli', 'Oma', 'Kira', 'Luma', 'Sora',
    'Ami', 'Saki', 'Mika', 'Rina', 'Yui', 'Sara', 'Emma', 'Lina', 'Nina', 'Mila',
    'Aya', 'Emi', 'Nami', 'Sakura', 'Mei', 'Luna', 'Aria', 'Zoe', 'Maya',
]);

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

const HIDDEN_MESH = /collision|hitbox|placeholder|root\s*mesh/i;

function stripHelperMeshes(root) {
    const toRemove = [];
    root.traverse(obj => {
        if (obj.isMesh && HIDDEN_MESH.test(obj.name || '')) toRemove.push(obj);
    });
    toRemove.forEach(obj => obj.parent?.remove(obj));
}

function tagMaterials(root) {
    root.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
            if (!m.name && obj.name) m.name = obj.name;
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        });
    });
}

function prepareMeshes(root) {
    stripHelperMeshes(root);
    tagMaterials(root);
    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.visible = true;
        if (obj.isSkinnedMesh) obj.frustumCulled = false;
    });
}

function cloneMaterials(mesh) {
    if (!mesh.material) return;
    if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => {
            const c = m.clone();
            if (m.name) c.name = m.name;
            if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
            return c;
        });
    } else {
        const c = mesh.material.clone();
        if (mesh.material.name) c.name = mesh.material.name;
        if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
        mesh.material = c;
    }
}

/** Skinned GLB must use SkeletonUtils — plain .clone() leaves invisible bodies. */
function cloneSkinnedModel(source) {
    const model = cloneSkeleton(source);
    model.traverse(obj => {
        if (!obj.isMesh) return;
        cloneMaterials(obj);
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.visible = true;
        if (obj.isSkinnedMesh) {
            obj.frustumCulled = false;
            obj.skeleton?.update();
        }
    });
    model.visible = true;
    model.updateMatrixWorld(true);
    return model;
}

function countMeshes(root) {
    let n = 0;
    root.traverse(obj => { if (obj.isMesh && obj.visible) n += 1; });
    return n;
}

function createProceduralBody(gender = 'male', type = 'human') {
    const body = new THREE.Group();
    body.name = 'proceduralBody';
    const skin = toonMat(type === 'alien' ? 0x88ccaa : 0xece9e1);
    const shirt = toonMat(type === 'alien' ? 0x6a9a88 : 0x4e90e8);
    const pants = toonMat(0x2a2a3a);
    const hair = toonMat(0x3d3224);
    const dress = toonMat(0x8c7ceb);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), shirt);
    torso.position.y = gender === 'female' ? 1.05 : 1.08;
    torso.castShadow = true;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skin);
    head.position.y = gender === 'female' ? 1.42 : 1.45;
    head.castShadow = true;
    body.add(head);

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    hairMesh.position.y = gender === 'female' ? 1.48 : 1.5;
    body.add(hairMesh);

    if (gender === 'female') {
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.42, 8), dress);
        skirt.position.y = 0.78;
        skirt.castShadow = true;
        body.add(skirt);
    } else {
        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.22), pants);
        legs.position.y = 0.58;
        legs.castShadow = true;
        body.add(legs);
    }

    [-0.14, 0.14].forEach(x => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), pants);
        leg.position.set(x, 0.21, 0);
        leg.castShadow = true;
        body.add(leg);
    });

    return body;
}

function normalizeHeight(root, targetHeight) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    root.scale.setScalar(targetHeight / (size.y || 1));
    seatModelFeet(root);
}

/** Nudge the inner model so bind-pose feet sit near local y=0. */
export function seatModelFeet(model) {
    if (!model) return;
    model.updateMatrixWorld(true);
    model.traverse(obj => {
        if (obj.isSkinnedMesh) obj.skeleton?.update();
    });
    const box = new THREE.Box3().setFromObject(model);
    if (!Number.isFinite(box.min.y)) return;
    const inv = model.matrixWorld.clone().invert();
    const localMin = box.min.clone().applyMatrix4(inv);
    model.position.y -= localMin.y;
}

/**
 * Measure how far the avatar root must sit above the floor so feet touch ground.
 * Stored on userData.groundLift and scaled with avatar.scale.y at runtime.
 */
export function refreshGroundLift(avatar) {
    if (!avatar) return 0;
    avatar.updateMatrixWorld(true);
    avatar.traverse(obj => {
        if (obj.isSkinnedMesh) obj.skeleton?.update();
    });
    if (avatar.userData?.mixer) avatar.userData.mixer.update(0);

    const box = new THREE.Box3().setFromObject(avatar);
    const lift = Number.isFinite(box.min.y) ? avatar.position.y - box.min.y : 0;
    avatar.userData.groundLift = Math.max(0, lift);
    return avatar.userData.groundLift;
}

export function getGroundLift(avatar) {
    const base = avatar?.userData?.groundLift ?? 0;
    const scaleY = avatar?.scale?.y ?? 1;
    return base * scaleY;
}

export function floorYForAvatar(avatar, surfaceY) {
    return surfaceY + getGroundLift(avatar);
}

const BAD_POSE_CLIP = /stand|clap|punch|wave|tpose|t-pose/i;

function findClip(clips, kind) {
    const rules = {
        idle: [/Man_Idle/i, /Female_Idle/i, /_idle$/i],
        stand: [/Man_Standing/i, /Female_Standing/i, /_standing$/i],
        walk: [/Man_Walk/i, /Female_Walk/i, /_walk$/i],
        run: [/Man_Run/i, /Female_Run/i, /_run$/i],
        jump: [/Man_Jump/i, /Female_Jump/i, /_jump$/i, /runningjump/i],
        emote: [/Man_Clapping/i, /Female_Clapping/i, /clapping/i, /Man_Punch/i, /Female_Punch/i],
        climb: [/climb/i, /Man_Walk/i, /Female_Walk/i],
    };
    for (const pattern of rules[kind] || []) {
        const hit = clips.find(c => pattern.test(c.name) && !BAD_POSE_CLIP.test(c.name));
        if (hit) return hit;
    }
    return null;
}

function setupAnimator(root, clips) {
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    ['idle', 'stand', 'walk', 'run', 'jump', 'emote', 'climb'].forEach(kind => {
        const clip = findClip(clips, kind);
        if (clip) actions[kind] = mixer.clipAction(clip);
    });
    const pickClip = (pred) => clips.find(c => pred(c.name) && !BAD_POSE_CLIP.test(c.name));
    const idleClip = pickClip(n => /idle/i.test(n))
        ?? pickClip(n => /walk/i.test(n));
    const start = actions.idle
        ?? (idleClip ? mixer.clipAction(idleClip) : null)
        ?? actions.walk;
    if (start) {
        actions.idle = actions.idle ?? start;
        start.reset().setEffectiveWeight(1).play();
        mixer.update(0);
    }
    return { mixer, actions, clips: clips.map(c => c.name) };
}

/** Male body for male characters, female body for female characters. */
export function getBodyKeyForGender(gender = 'male') {
    return gender === 'female' ? 'female' : 'male';
}

export function inferGender(name = '', type = 'human') {
    if (type === 'alien') return 'male';
    if (FEMALE_NAMES.has(name)) return 'female';
    return 'male';
}

export function getBodyKeyForCitizen(name, type = 'human', variant = 0) {
    if (type === 'alien') return variant % 2 === 0 ? 'male' : 'female';
    return getBodyKeyForGender(inferGender(name, type));
}

const BODY_KEYS = ['male', 'female'];

/** @deprecated — use getBodyKeyForCitizen or getBodyKeyForGender */
export function getRandomBodyKey() {
    return BODY_KEYS[Math.random() < 0.5 ? 0 : 1];
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
                animationNames: (gltf.animations || []).map(c => c.name),
                targetHeight: cfg.targetHeight,
                slots: cfg.slots,
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
    return index % 2 === 0 ? 'male' : 'female';
}

export function isModelLoaded(key) {
    return _cache.has(`human:${key}`);
}

export function hasCriticalModels() {
    return isModelLoaded('male') || isModelLoaded('female');
}

const SLOT_ALIASES = {
    skin: 'Skin', eyes: 'Eyes', hair: 'Hair', hair2: 'Hair2',
    shirt: 'Shirt', shirt2: 'Shirt2', pants: 'Pants', socks: 'Socks',
    shoes: 'Shoes', dress: 'Dress',
};

/** Swap GLB material slots from a preset palette. */
export function applyOutfitPreset(avatar, presetIndex = 0) {
    const preset = OUTFIT_PRESETS[presetIndex % OUTFIT_PRESETS.length];
    const model = avatar.children.find(c => c.type === 'Group' || c.isMesh) ?? avatar.children[0];
    if (!model) return preset;

    model.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
            const slotName = m.name || '';
            for (const [key, slot] of Object.entries(SLOT_ALIASES)) {
                if (slotName === slot && preset[key] != null) {
                    m.color.setHex(preset[key]);
                }
            }
        });
    });

    avatar.userData.outfitPreset = presetIndex % OUTFIT_PRESETS.length;
    avatar.userData.outfitName = preset.name;
    return preset;
}

function applyTint(model, color, strength = 0.3) {
    const tint = new THREE.Color(color);
    model.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
            if (m.name === 'Skin' && m.color) m.color.lerp(tint, strength);
        });
    });
}

export function createCharacterInstance(type, modelKey, opts = {}) {
    let humanKey = modelKey === 'male' || modelKey === 'female'
        ? modelKey
        : getBodyKeyForGender('male');

    let cached = _cache.get(`human:${humanKey}`);
    if (!cached && humanKey === 'female') {
        humanKey = 'male';
        cached = _cache.get('human:male');
    }
    if (!cached && humanKey === 'male') {
        cached = _cache.get('human:female');
        if (cached) humanKey = 'female';
    }

    const root = new THREE.Group();
    root.name = `${type}Avatar`;
    root.userData.modelKey = humanKey;
    root.userData.gender = humanKey;
    root.userData.characterType = type;
    root.userData.isHuman = type === 'human';
    root.userData.isAlien = type === 'alien';

    if (!cached) {
        console.warn(`[CharacterModels] No GLB loaded — procedural body for ${humanKey}`);
        const fallback = createProceduralBody(humanKey, type);
        root.add(fallback);
        root.userData.isFallback = true;
        root.userData.isRigged = false;
        root.userData.isStaticModel = true;
        refreshGroundLift(root);
        return root;
    }

    const model = cloneSkinnedModel(cached.scene);
    root.add(model);

    // Attach procedural anime-style glasses matching the sketch
    addGlassesToHead(model);

    const appliedHeight = opts.targetHeight ?? cached.targetHeight;
    root.userData.targetHeight = appliedHeight;
    if (Math.abs(appliedHeight - cached.targetHeight) > 0.01) {
        model.scale.multiplyScalar(appliedHeight / cached.targetHeight);
        seatModelFeet(model);
    }

    const tint = opts.tint ?? (type === 'alien' ? ALIEN_TINTS[(opts.variant ?? 0) % ALIEN_TINTS.length] : null);
    if (tint) applyTint(model, tint, opts.tintStrength ?? (type === 'alien' ? 0.42 : 0));

    root.userData.isRigged = countMeshes(model) > 0;
    root.userData.isStaticModel = false;
    root.userData.isFallback = false;

    if (root.userData.isRigged && cached.animations.length) {
        const { mixer, actions } = setupAnimator(model, cached.animations);
        root.userData.mixer = mixer;
        root.userData.actions = actions;
        root.userData._activeAction = actions.idle ?? actions.stand ?? null;
    } else {
        console.warn(`[CharacterModels] Rig empty after clone — procedural body for ${humanKey}`);
        root.remove(model);
        root.add(createProceduralBody(humanKey, type));
        root.userData.isFallback = true;
        root.userData.isRigged = false;
        root.userData.isStaticModel = true;
    }

    const presetIdx = opts.outfitPreset ?? (opts.variant ?? 0) % OUTFIT_PRESETS.length;
    if (root.userData.isRigged) applyOutfitPreset(root, presetIdx);
    if (!root.userData.isFallback) seatModelFeet(model);
    refreshGroundLift(root);

    return root;
}

export function fadeCharacterAction(avatar, name, duration = 0.2) {
    const resolved = name === 'idle' ? 'idle' : name;
    const actions = avatar.userData.actions;
    if (!actions) return;
    const next = actions[resolved] ?? actions.idle ?? actions.walk;
    if (!next) return;
    const prev = avatar.userData._activeAction;
    if (prev === next) return;
    if (prev) prev.fadeOut(duration);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    avatar.userData._activeAction = next;
    avatar.userData.pose = resolved;
}

export function cycleOutfitPreset(avatar, delta = 1) {
    const next = ((avatar.userData.outfitPreset ?? 0) + delta + OUTFIT_PRESETS.length) % OUTFIT_PRESETS.length;
    return applyOutfitPreset(avatar, next);
}

export function updateCharacterAnimator(avatar, dt) {
    if (avatar.userData.mixer) avatar.userData.mixer.update(dt);
}

export function addGlassesToHead(model) {
    let headBone = null;
    model.traverse(obj => {
        if (obj.isBone && (obj.name === 'Head' || obj.name.toLowerCase().endsWith('head'))) {
            headBone = obj;
        }
    });

    if (!headBone) return;

    // Check if glasses already exist to avoid duplicates
    if (headBone.getObjectByName('characterGlasses')) return;

    const glassesGroup = new THREE.Group();
    glassesGroup.name = 'characterGlasses';

    const frameColor = 0x151518; // Black frames
    const frameMat = toonMat(frameColor);
    const lensMat = new THREE.MeshToonMaterial({
        color: 0xe0f7fc,
        transparent: true,
        opacity: 0.3,
    });

    // Make beautiful round glasses matching the sketches
    const rimRadius = 0.048;
    const rimTube = 0.006;
    const rimGeo = new THREE.TorusGeometry(rimRadius, rimTube, 8, 24);
    const lensGeo = new THREE.CircleGeometry(rimRadius, 24);

    // Left Rim & Lens
    const leftRim = new THREE.Mesh(rimGeo, frameMat);
    leftRim.position.set(-0.052, 0, 0);
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.052, 0, 0.002);
    glassesGroup.add(leftRim);
    glassesGroup.add(leftLens);

    // Right Rim & Lens
    const rightRim = new THREE.Mesh(rimGeo, frameMat);
    rightRim.position.set(0.052, 0, 0);
    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.052, 0, 0.002);
    glassesGroup.add(rightRim);
    glassesGroup.add(rightLens);

    // Bridge
    const bridgeGeo = new THREE.BoxGeometry(0.03, 0.008, 0.008);
    const bridge = new THREE.Mesh(bridgeGeo, frameMat);
    bridge.position.set(0, 0, 0);
    glassesGroup.add(bridge);

    // Temples (sides going back to ears)
    const templeLength = 0.1;
    const templeGeo = new THREE.BoxGeometry(0.005, 0.005, templeLength);
    
    const leftTemple = new THREE.Mesh(templeGeo, frameMat);
    leftTemple.position.set(-0.095, 0, -templeLength/2);
    leftTemple.rotation.y = 0.05;
    glassesGroup.add(leftTemple);

    const rightTemple = new THREE.Mesh(templeGeo, frameMat);
    rightTemple.position.set(0.095, 0, -templeLength/2);
    rightTemple.rotation.y = -0.05;
    glassesGroup.add(rightTemple);

    // Position glasses relative to the head bone.
    glassesGroup.position.set(0, 0.065, 0.075);
    glassesGroup.rotation.set(0.02, 0, 0);

    headBone.add(glassesGroup);
}