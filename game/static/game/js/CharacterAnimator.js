import * as THREE from 'three';

/**
 * Drives GLB skeletal clips: idle, walk, run, emote, jump.
 * Works on rigged Quaternius models with embedded animations.
 */

const STATE_SPEED = { idle: 1, stand: 1, walk: 1, run: 1.35, jump: 1, emote: 1, climb: 1.1 };

export function isRiggedAvatar(avatar) {
    return !!(avatar?.userData?.mixer && avatar.userData.actions);
}

export function setCharacterPose(avatar, state, fade = 0.18) {
    if (!isRiggedAvatar(avatar)) return false;
    const actions = avatar.userData.actions;
    const resolved = state === 'stand' ? 'idle' : state;
    const next = actions[resolved] ?? actions.idle ?? actions.stand ?? actions.walk;
    if (!next) return false;

    const prev = avatar.userData._activeAction;
    if (prev === next) return true;
    if (prev) prev.fadeOut(fade);
    next.reset().setEffectiveTimeScale(STATE_SPEED[resolved] ?? 1).setEffectiveWeight(1).fadeIn(fade).play();
    avatar.userData._activeAction = next;
    avatar.userData.pose = resolved;
    return true;
}

/** Play a one-shot emote (clapping) then return to idle. */
export function playEmote(avatar, fade = 0.2) {
    if (!isRiggedAvatar(avatar)) return false;
    const emote = avatar.userData.actions?.emote;
    if (!emote) return setCharacterPose(avatar, 'idle', fade);

    const prev = avatar.userData._activeAction;
    if (prev && prev !== emote) prev.fadeOut(fade);
    emote.reset().setLoop(THREE.LoopOnce, 1);
    emote.clampWhenFinished = true;
    emote.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    avatar.userData._activeAction = emote;
    avatar.userData.pose = 'emote';

    const clip = emote.getClip();
    const duration = clip?.duration ?? 2;
    if (avatar.userData._emoteTimer) clearTimeout(avatar.userData._emoteTimer);
    avatar.userData._emoteTimer = setTimeout(() => {
        setCharacterPose(avatar, 'idle', fade);
    }, duration * 1000 + 200);
    return true;
}

/** Pick idle / walk / run from movement */
export function updateLocomotionPose(avatar, { moving, running, onGround, climbing, fade = 0.18 }) {
    if (!isRiggedAvatar(avatar)) return;
    if (avatar.userData.pose === 'emote') return;

    let state = 'idle';
    if (climbing && avatar.userData.actions?.climb) {
        state = 'climb';
    } else if (!onGround && avatar.userData.actions?.jump) {
        state = 'jump';
    } else if (moving) {
        state = running && avatar.userData.actions?.run ? 'run' : 'walk';
    }

    setCharacterPose(avatar, state, fade);
}

export function tickAnimator(avatar, dt) {
    if (avatar?.userData?.mixer) avatar.userData.mixer.update(dt);
}