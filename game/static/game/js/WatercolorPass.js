import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class WatercolorPass {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));

        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.35,
            0.45,
            0.92
        );
        this.composer.addPass(bloom);

        const watercolorShader = {
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uPaperStrength: { value: 0.04 },
                uBleedStrength: { value: 0.015 },
                uSaturation: { value: 0.85 },
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
                uniform float uTime;
                uniform float uPaperStrength;
                uniform float uBleedStrength;
                uniform float uSaturation;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv;
                    float paper = hash(uv * 400.0 + uTime * 0.01) * uPaperStrength;
                    vec2 bleed = vec2(
                        sin(uv.y * 80.0 + uTime) * uBleedStrength,
                        cos(uv.x * 80.0 + uTime) * uBleedStrength
                    );

                    vec4 color = texture2D(tDiffuse, uv + bleed);
                    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    color.rgb = mix(vec3(gray), color.rgb, uSaturation);
                    color.rgb += vec3(0.0, paper * 0.5, paper * 0.3);
                    color.rgb = mix(color.rgb, color.rgb * vec3(0.9, 1.05, 0.95), 0.3);

                    gl_FragColor = color;
                }
            `,
        };

        this.watercolorPass = new ShaderPass(watercolorShader);
        this.watercolorPass.renderToScreen = true;
        this.composer.addPass(this.watercolorPass);
    }

    setSize(w, h) {
        this.composer.setSize(w, h);
    }

    render(time) {
        this.watercolorPass.uniforms.uTime.value = time;
        this.composer.render();
    }
}