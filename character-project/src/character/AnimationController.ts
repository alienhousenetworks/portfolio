export type MotionState = 'IDLE' | 'WALK';

const MOVE_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export class AnimationController {
    public currentState: MotionState = 'IDLE';
    public motionSpeed = 4.0;
    private keysHeld = 0;

    constructor() {
        this.initInputListeners();
    }

    private initInputListeners(): void {
        window.addEventListener('keydown', (e) => {
            if (MOVE_KEYS.has(e.code)) {
                this.keysHeld++;
                this.currentState = 'WALK';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (MOVE_KEYS.has(e.code)) {
                this.keysHeld = Math.max(0, this.keysHeld - 1);
                if (this.keysHeld === 0) this.currentState = 'IDLE';
            }
        });
    }
}