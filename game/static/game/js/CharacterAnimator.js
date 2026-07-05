/**
 * Drives GLB skeletal clips: stand (idle), walk, run, jump.
 * Only works on rigged models with embedded animations (Quaternius).
 */

const STATE_SPEED = { stand: 1, walk: 1, run: 1.35, jump: 1, climb: 1.1 };

export function isRiggedAvatar(avatar) {
    return !!(avatar?.userData?.mixer && avatar.userData.actions);
}

export function setCharacterPose(avatar, state, fade = 0.18) {
    if (!isRiggedAvatar(avatar)) return false;
    const actions = avatar.userData.actions;
    const resolved = state === 'idle' ? 'stand' : state;
    const next = actions[resolved] ?? actions.stand ?? actions.idle ?? actions.walk;
    if (!next) return false;

    const prev = avatar.userData._activeAction;
    if (prev === next) return true;
    if (prev) prev.fadeOut(fade);
    next.reset().setEffectiveTimeScale(STATE_SPEED[resolved] ?? 1).setEffectiveWeight(1).fadeIn(fade).play();
    avatar.userData._activeAction = next;
    avatar.userData.pose = resolved;
    return true;
}

/** Pick stand / walk / run from movement */
export function updateLocomotionPose(avatar, { moving, running, onGround, climbing, fade = 0.18 }) {
    if (!isRiggedAvatar(avatar)) return;

    let state = 'stand';
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