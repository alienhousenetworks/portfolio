import * as THREE from 'three';

export class ProceduralCharacter {
    public mesh: THREE.Group;

    private pelvis!: THREE.Group;
    private torso!: THREE.Mesh;
    private head!: THREE.Group;
    private leftLeg!: THREE.Mesh;
    private rightLeg!: THREE.Mesh;
    private leftArm!: THREE.Mesh;
    private rightArm!: THREE.Mesh;

    private materials = {
        skin: new THREE.MeshStandardMaterial({ color: '#dcd1c4', roughness: 0.6 }),
        shirt: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5 }),
        stripe: new THREE.MeshStandardMaterial({ color: '#fab134', roughness: 0.4 }),
        shorts: new THREE.MeshStandardMaterial({ color: '#a63a3a', roughness: 0.7 }),
        shoes: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.8 }),
        headphones: new THREE.MeshStandardMaterial({ color: '#e2e2e2', roughness: 0.3 }),
        hair: new THREE.MeshStandardMaterial({ color: '#2c2c35', roughness: 0.9 }),
    };

    constructor() {
        this.mesh = new THREE.Group();
        this.buildCharacter();
    }

    private buildCharacter(): void {
        this.pelvis = new THREE.Group();
        this.pelvis.position.y = 0.9;
        this.mesh.add(this.pelvis);

        const torsoGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.5, 12);
        this.torso = new THREE.Mesh(torsoGeo, this.materials.shirt);
        this.torso.position.y = 0.25;
        this.torso.castShadow = true;
        this.torso.receiveShadow = true;
        this.pelvis.add(this.torso);

        const trimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12);
        const trimLeft = new THREE.Mesh(trimGeo, this.materials.stripe);
        trimLeft.position.set(-0.25, 0.2, 0);
        trimLeft.rotation.z = 0.4;
        this.torso.add(trimLeft);

        const trimRight = trimLeft.clone();
        trimRight.position.x = 0.25;
        trimRight.rotation.z = -0.4;
        this.torso.add(trimRight);

        this.head = new THREE.Group();
        this.head.position.y = 0.4;
        this.torso.add(this.head);

        const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const headMesh = new THREE.Mesh(headGeo, this.materials.skin);
        headMesh.castShadow = true;
        this.head.add(headMesh);

        const hairGeo = new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hair = new THREE.Mesh(hairGeo, this.materials.hair);
        hair.rotation.x = -0.3;
        hair.position.set(0, 0.02, -0.01);
        this.head.add(hair);

        const bandGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 24, Math.PI);
        const band = new THREE.Mesh(bandGeo, this.materials.headphones);
        band.rotation.z = -Math.PI / 2;
        this.head.add(band);

        const cupGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
        const leftCup = new THREE.Mesh(cupGeo, this.materials.headphones);
        leftCup.position.set(-0.18, 0, 0);
        leftCup.rotation.z = Math.PI / 2;
        this.head.add(leftCup);

        const rightCup = leftCup.clone();
        rightCup.position.x = 0.18;
        this.head.add(rightCup);

        const shortsGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.35, 12);
        const shorts = new THREE.Mesh(shortsGeo, this.materials.shorts);
        shorts.position.y = -0.15;
        shorts.castShadow = true;
        this.pelvis.add(shorts);

        const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 12);

        this.leftLeg = new THREE.Mesh(legGeo, this.materials.skin);
        this.leftLeg.position.set(-0.12, -0.55, 0);
        this.leftLeg.castShadow = true;
        this.pelvis.add(this.leftLeg);

        this.rightLeg = this.leftLeg.clone() as THREE.Mesh;
        this.rightLeg.position.x = 0.12;
        this.pelvis.add(this.rightLeg);

        const shoeGeo = new THREE.BoxGeometry(0.14, 0.15, 0.28);
        const leftShoe = new THREE.Mesh(shoeGeo, this.materials.shoes);
        leftShoe.position.set(0, -0.25, 0.05);
        leftShoe.castShadow = true;
        this.leftLeg.add(leftShoe);

        const rightShoe = leftShoe.clone();
        this.rightLeg.add(rightShoe);

        const armGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.45, 12);

        this.leftArm = new THREE.Mesh(armGeo, this.materials.skin);
        this.leftArm.position.set(-0.32, 0.1, 0);
        this.leftArm.castShadow = true;
        this.torso.add(this.leftArm);

        this.rightArm = this.leftArm.clone() as THREE.Mesh;
        this.rightArm.position.x = 0.32;
        this.torso.add(this.rightArm);
    }

    public animateJoints(time: number, speed: number, state: string): void {
        if (state === 'IDLE') {
            this.torso.position.y = 0.25 + Math.sin(time * 2) * 0.01;
            this.head.rotation.x = Math.sin(time) * 0.03;
            this.leftArm.rotation.x = Math.sin(time * 2) * 0.05;
            this.rightArm.rotation.x = -Math.sin(time * 2) * 0.05;
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
        } else if (state === 'WALK') {
            const angle = Math.sin(time * speed * 1.5);
            this.leftLeg.rotation.x = angle * 0.4;
            this.rightLeg.rotation.x = -angle * 0.4;
            this.leftArm.rotation.x = -angle * 0.3;
            this.rightArm.rotation.x = angle * 0.3;
            this.torso.position.y = 0.25 + Math.abs(Math.sin(time * speed * 3)) * 0.03;
            this.head.rotation.y = Math.sin(time * speed * 1.5) * 0.05;
        }
    }
}