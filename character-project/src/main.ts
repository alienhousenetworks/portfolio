import * as THREE from 'three';
import GUI from 'lil-gui';
import { EngineRenderer } from './engine/Renderer';
import { ProceduralCharacter } from './character/Character';
import { AnimationController, MotionState } from './character/AnimationController';

class Application {
    private engine: EngineRenderer;
    private character: ProceduralCharacter;
    private animController: AnimationController;
    private clock: THREE.Clock;

    constructor() {
        this.engine = new EngineRenderer('canvas-container');
        this.character = new ProceduralCharacter();
        this.animController = new AnimationController();
        this.clock = new THREE.Clock();

        this.engine.scene.add(this.character.mesh);
        this.initDebugUI();
        this.animate();
    }

    private initDebugUI(): void {
        const gui = new GUI({ title: 'Engine Configuration' });
        const config = {
            state: this.animController.currentState,
            speed: this.animController.motionSpeed,
        };

        gui.add(config, 'state', ['IDLE', 'WALK']).onChange((val: MotionState) => {
            this.animController.currentState = val;
        });

        gui.add(config, 'speed', 1.0, 10.0, 0.1).onChange((val: number) => {
            this.animController.motionSpeed = val;
        });
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        const elapsedTime = this.clock.getElapsedTime();

        this.character.animateJoints(
            elapsedTime,
            this.animController.motionSpeed,
            this.animController.currentState
        );

        this.engine.renderer.render(this.engine.scene, this.engine.camera);
    };
}

window.addEventListener('DOMContentLoaded', () => {
    new Application();
});