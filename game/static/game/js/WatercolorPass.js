import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Light bright color pass — soft painted shades, no flow/bleed effects */
export class WatercolorPass {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));

        const brightShader = {
            uniforms: {
                tDiffuse: { value: null },
                uBrightness: { value: 1.12 },
                uSaturation: { value: 1.08 },
                uWarmth: { value: 0.03 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uBrightness;
                uniform float uSaturation;
                uniform float uWarmth;
                varying vec2 vUv;

                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    color.rgb *= uBrightness;
                    color.rgb += vec3(uWarmth, uWarmth * 0.6, 0.0);

                    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    color.rgb = mix(vec3(gray), color.rgb, uSaturation);

                    color.rgb = clamp(color.rgb, 0.0, 1.0);
                    gl_FragColor = color;
                }
            `,
        };

        this.brightPass = new ShaderPass(brightShader);
        this.brightPass.renderToScreen = true;
        this.composer.addPass(this.brightPass);
    }

    setSize(w, h) {
        this.composer.setSize(w, h);
    }

    render() {
        this.composer.render();
    }
}