import * as THREE from 'three';
import { toonMat } from './ToonStyle.js';

/** GTA-style human proportions (~1.75 m). Bones drive mesh segments. */
export function buildHumanRig(opts = {}) {
    const skin = opts.skinTone ?? 0xffdbac;
    const skinMat = () => toonMat(skin);
    const skinDark = () => toonMat(new THREE.Color(skin).multiplyScalar(0.82).getHex());

    const outfit = {
        jacket: opts.jacketColor ?? 0x3b4d36,
        vest: opts.vestColor ?? 0x2d3436,
        shirt: opts.shirtColor ?? 0xffffff,
        pants: opts.pantsColor ?? 0x232b38,
        shoes: opts.shoeColor ?? 0x111111,
        hair: opts.hairColor ?? 0x224466,
        bag: opts.bagColor ?? 0x3b5998,
        strap: opts.strapColor ?? 0x8b5a2b,
    };

    const mat = (c) => toonMat(c);
    const root = new THREE.Group();
    root.name = 'humanRig';

    const bones = {};
    const addBone = (name, parent, pos) => {
        const b = new THREE.Bone();
        b.name = name;
        b.position.set(...pos);
        (parent || root).add(b);
        bones[name] = b;
        return b;
    };

    // ── Skeleton hierarchy ─────────────────────────────────────
    const hips = addBone('hips', null, [0, 0.92, 0]);
    const spine = addBone('spine', hips, [0, 0.12, 0]);
    const chest = addBone('chest', spine, [0, 0.22, 0]);
    const neck = addBone('neck', chest, [0, 0.18, 0]);
    const head = addBone('head', neck, [0, 0.14, 0]);

    const shoulderL = addBone('shoulderL', chest, [-0.2, 0.14, 0]);
    const upperArmL = addBone('upperArmL', shoulderL, [-0.06, -0.04, 0]);
    const lowerArmL = addBone('lowerArmL', upperArmL, [0, -0.28, 0]);
    const handL = addBone('handL', lowerArmL, [0, -0.26, 0]);

    const shoulderR = addBone('shoulderR', chest, [0.2, 0.14, 0]);
    const upperArmR = addBone('upperArmR', shoulderR, [0.06, -0.04, 0]);
    const lowerArmR = addBone('lowerArmR', upperArmR, [0, -0.28, 0]);
    const handR = addBone('handR', lowerArmR, [0, -0.26, 0]);

    const upperLegL = addBone('upperLegL', hips, [-0.1, -0.06, 0]);
    const lowerLegL = addBone('lowerLegL', upperLegL, [0, -0.42, 0]);
    const footL = addBone('footL', lowerLegL, [0, -0.4, 0.04]);

    const upperLegR = addBone('upperLegR', hips, [0.1, -0.06, 0]);
    const lowerLegR = addBone('lowerLegR', upperLegR, [0, -0.42, 0]);
    const footR = addBone('footR', lowerLegR, [0, -0.4, 0.04]);

    const meshOn = (bone, geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(...pos);
        m.rotation.set(...rot);
        m.castShadow = true;
        bone.add(m);
        return m;
    };

    // ── Pelvis / hips ──────────────────────────────────────────
    meshOn(hips, new THREE.BoxGeometry(0.3, 0.18, 0.2), mat(outfit.pants), [0, -0.04, 0]);

    // ── Torso ──────────────────────────────────────────────────
    meshOn(chest, new THREE.BoxGeometry(0.38, 0.48, 0.22), mat(outfit.jacket), [0, 0.1, 0]);
    meshOn(chest, new THREE.BoxGeometry(0.22, 0.44, 0.23), mat(outfit.vest), [0, 0.08, 0.01]);
    meshOn(chest, new THREE.BoxGeometry(0.1, 0.1, 0.04), mat(outfit.shirt), [-0.07, 0.28, 0.12], [0, 0, -0.35]);
    meshOn(chest, new THREE.BoxGeometry(0.1, 0.1, 0.04), mat(outfit.shirt), [0.07, 0.28, 0.12], [0, 0, 0.35]);

    // ── Head & face ────────────────────────────────────────────
    meshOn(neck, new THREE.CylinderGeometry(0.055, 0.065, 0.1, 8), skinMat(), [0, 0.04, 0]);
    meshOn(head, new THREE.BoxGeometry(0.19, 0.22, 0.2), skinMat(), [0, 0.12, 0.02]);

    // Hair — undercut + spikes (reference character)
    meshOn(head, new THREE.BoxGeometry(0.2, 0.12, 0.2), mat(outfit.hair), [0, 0.24, -0.01]);
    const spikes = [
        [0.09, 0.16, 0.1, 0.2, 0, -0.3],
        [0.01, 0.13, 0.1, 0.25, 0.1, -0.15],
        [-0.08, 0.17, 0.09, 0.18, 0, 0.3],
        [0.08, 0.17, 0.09, 0.18, 0.2, 0.2],
        [0, 0.08, -0.1, -0.3, 0, 0],
    ];
    spikes.forEach(([x, y, z, rx, ry, rz]) => {
        meshOn(head, new THREE.BoxGeometry(0.07, 0.12, 0.07), mat(outfit.hair), [x, y, z], [rx, ry, rz]);
    });

    // Glasses
    meshOn(head, new THREE.BoxGeometry(0.17, 0.05, 0.02), mat(0xcccccc), [0, 0.1, 0.11]);
    [-0.06, 0.06].forEach(x => {
        meshOn(head, new THREE.BoxGeometry(0.04, 0.035, 0.015), skinMat(), [x, 0.1, 0.115]);
        meshOn(head, new THREE.BoxGeometry(0.018, 0.022, 0.012), mat(0x1a1a2a), [x, 0.1, 0.125]);
    });

    // Earbuds
    [-0.1, 0.1].forEach(x => {
        meshOn(head, new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), mat(0xffffff), [x, 0.08, 0.02], [0.2, 0, 0]);
    });

    // ── Arms ───────────────────────────────────────────────────
    meshOn(upperArmL, new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), mat(outfit.jacket), [0, -0.14, 0]);
    meshOn(lowerArmL, new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), skinDark(), [0, -0.14, 0]);
    meshOn(handL, new THREE.BoxGeometry(0.07, 0.08, 0.05), skinMat(), [0, -0.04, 0]);

    meshOn(upperArmR, new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), mat(outfit.jacket), [0, -0.14, 0]);
    meshOn(lowerArmR, new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), skinDark(), [0, -0.14, 0]);
    meshOn(handR, new THREE.BoxGeometry(0.07, 0.08, 0.05), skinMat(), [0, -0.04, 0]);

    // Messenger bag + strap
    meshOn(chest, new THREE.BoxGeometry(0.14, 0.22, 0.08), mat(outfit.strap), [0.05, 0.02, 0.08], [0, 0, -0.65]);
    meshOn(chest, new THREE.BoxGeometry(0.14, 0.2, 0.26), mat(outfit.bag), [0.2, -0.08, 0.06], [0, 0.15, 0]);

    // ── Legs ───────────────────────────────────────────────────
    meshOn(upperLegL, new THREE.CapsuleGeometry(0.07, 0.34, 4, 8), mat(outfit.pants), [0, -0.2, 0]);
    meshOn(lowerLegL, new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), mat(outfit.pants), [0, -0.2, 0]);
    meshOn(footL, new THREE.BoxGeometry(0.1, 0.07, 0.24), mat(outfit.shoes), [0, -0.04, 0.04]);

    meshOn(upperLegR, new THREE.CapsuleGeometry(0.07, 0.34, 4, 8), mat(outfit.pants), [0, -0.2, 0]);
    meshOn(lowerLegR, new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), mat(outfit.pants), [0, -0.2, 0]);
    meshOn(footR, new THREE.BoxGeometry(0.1, 0.07, 0.24), mat(outfit.shoes), [0, -0.04, 0.04]);

    return { root, bones };
}

/** Keyframed bone animations compatible with THREE.AnimationMixer */
export function createHumanAnimations(rigRoot) {
    const times2 = [0, 0.5, 1];
    const times4 = [0, 0.25, 0.5, 0.75, 1];

    const idle = new THREE.AnimationClip('idle', 2, [
        new THREE.VectorKeyframeTrack('hips.spine.chest.rotation', [0, 1, 2], [0, 0, 0, 0.02, 0, 0, 0, 0, 0]),
    ]);

    const walk = new THREE.AnimationClip('walk', 0.8, [
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times2, [0.45, 0, 0, -0.45, 0, 0, 0.45, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times2, [-0.45, 0, 0, 0.45, 0, 0, -0.45, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.lowerLegL.rotation', times2, [0.1, 0, 0, 0.5, 0, 0, 0.1, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.lowerLegR.rotation', times2, [0.5, 0, 0, 0.1, 0, 0, 0.5, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times2, [-0.35, 0, 0.1, 0.35, 0, 0.1, -0.35, 0, 0.1]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times2, [0.35, 0, -0.1, -0.35, 0, -0.1, 0.35, 0, -0.1]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.lowerArmL.rotation', times2, [-0.15, 0, 0, -0.15, 0, 0, -0.15, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.lowerArmR.rotation', times2, [-0.15, 0, 0, -0.15, 0, 0, -0.15, 0, 0]),
    ]);

    const run = new THREE.AnimationClip('run', 0.45, [
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times2, [0.75, 0, 0, -0.75, 0, 0, 0.75, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times2, [-0.75, 0, 0, 0.75, 0, 0, -0.75, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.lowerLegL.rotation', times2, [0.2, 0, 0, 0.7, 0, 0, 0.2, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.lowerLegR.rotation', times2, [0.7, 0, 0, 0.2, 0, 0, 0.7, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times2, [-0.65, 0, 0.15, 0.65, 0, 0.15, -0.65, 0, 0.15]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times2, [0.65, 0, -0.15, -0.65, 0, -0.15, 0.65, 0, -0.15]),
    ]);

    const jump = new THREE.AnimationClip('jump', 0.6, [
        new THREE.VectorKeyframeTrack('hips.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.15, 0, 0, 0.1, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.5, 0, 0, 0.3, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.5, 0, 0, 0.3, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', [0, 0.2, 0.6], [-0.8, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', [0, 0.2, 0.6], [-0.8, 0, 0, 0, 0, 0]),
    ]);

    const climb = new THREE.AnimationClip('climb', 0.7, [
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times4, [-1.2, 0, 0.2, -0.4, 0, 0.2, -1.2, 0, 0.2, -0.4, 0, 0.2, -1.2, 0, 0.2]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times4, [-0.4, 0, -0.2, -1.2, 0, -0.2, -0.4, 0, -0.2, -1.2, 0, -0.2, -0.4, 0, -0.2]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times4, [0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times4, [0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0]),
    ]);

    return { idle, walk, run, jump, climb };
}

export function setupHumanAnimator(rigRoot) {
    const mixer = new THREE.AnimationMixer(rigRoot);
    const clips = createHumanAnimations(rigRoot);
    const actions = {};
    Object.entries(clips).forEach(([name, clip]) => {
        actions[name] = mixer.clipAction(clip);
        if (name === 'jump' || name === 'climb') {
            actions[name].setLoop(THREE.LoopRepeat);
        }
    });
    if (actions.idle) actions.idle.play();
    return { mixer, actions, clips };
}