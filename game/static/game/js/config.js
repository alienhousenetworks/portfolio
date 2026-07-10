export const WORLD = {
    size: 540,
    groundY: 0.15,
    roadWidth: 10,
    roadSpacing: 50,
    bound: 240,
    parkX: 0,
    parkZ: 80,
    parkRadius: 38,
    parkLawnRadius: 55,
    riverX: 0,
    riverWidth: 38,
    riverLength: 500,
    mountainY: 0,
};

/** River bridge decks — keep in sync with WorldBuilder._buildBridge */
export const BRIDGES = [
    { x: 0, z: -130, deckY: 2.35, halfW: 27, halfD: 5.5 },
    { x: 0, z: -40, deckY: 2.35, halfW: 27, halfD: 5.5 },
    { x: 0, z: 65, deckY: 2.35, halfW: 27, halfD: 5.5 },
    { x: 0, z: 170, deckY: 2.35, halfW: 27, halfD: 5.5 },
];

/** NPC / citizen stature — compact scale for the toon city */
export const CITIZEN = {
    heightMin: 0.8,
    heightMax: 0.9,
    heightDefault: 0.85,
};

export function citizenHeight(variant = 0) {
    const span = CITIZEN.heightMax - CITIZEN.heightMin;
    return CITIZEN.heightMin + ((variant % 5) / 4) * span;
}

export const PLAYER = {
    height: CITIZEN.heightDefault,
    radius: 0.22,
    walkSpeed: 7,
    runSpeed: 13,
    maxStepHeight: 1.2,
    bridgeStepHeight: 2.6, // max step onto bridge deck / ramps
};

export const PHYSICS = {
    gravity: 28,
    jumpForce: 10,
    terminalVelocity: -40,
    groundSnap: 0.08,      // distance from ground before snapping
};

export const CAMERA = {
    defaultDistance: 9,
    minDistance: 4,
    maxDistance: 22,
    defaultPitch: 0.4,
    minPitch: -1.2,
    maxPitch: 1.35,
    yawSpeed: 0.004,
    pitchSpeed: 0.003,
    lookHeight: 0.78,
    heightBoost: 0.65,
    positionDamp: 10,
};

/** Cohesive natural-world palette */
export const PALETTE = {
    // Sky & atmosphere (Soft Ghibli Blue gradients)
    sky: 0x91E5F2,
    skyTop: 0x72D8E5,
    skyHorizon: 0xB5F1F9,
    fog: 0xB5F1F9,

    // Ground & nature (soft pastel lawn)
    grass: 0xB8E6C8,
    grassLight: 0xC8EDD6,
    grassDark: 0xA8DFC0,
    grassHighland: 0xB0E4CC,
    embankment: 0xB8E6C8,
    sand: 0xECE9E1,
    dirt: 0xB98A67,

    // Roads & urban
    asphalt: 0x6C777B,
    asphaltDark: 0x6C777B,
    asphaltLight: 0x7A8488,
    sidewalk: 0xD0CDC7,
    concrete: 0xC8C5BE,
    concreteLight: 0xD0CDC7,
    retainingWall: 0xC8C5BE,

    // Water
    river: 0x4E90E8,
    riverShallow: 0x48D2C9,
    waterDeep: 0x4E90E8,
    waterFoam: 0xB5F1F9,

    // Mountains – layered depth
    mountain: [
        0x79B36A,  // near slope
        0x8CC97D,  // slope mid
        0x7A8488,  // grey slope
        0x6C777B,  // far mountain
    ],
    mountainSnow: 0xECE9E1,
    mountainRock: 0xC8C5BE,
    mountainDeep: 0x6C777B,

    // Bridges
    bridge: 0xDDD8CF,
    bridgeStone: 0xC8C5BE,
    bridgeRail: 0x9C7554,

    // Wood
    wood: [0x9C7554, 0xB98A67, 0x9C7554],

    // Buildings
    building: {
        wall: [0xECE9E1, 0xDDD8CF, 0xD2CCC2],
        roof: [0x6C777B, 0xD66565, 0x79B36A, 0x4E90E8, 0xB98A67],
    },
    awning: [0xF2B0C5, 0xFFD966, 0x48D2C9, 0x8C7CEB],
    glass: 0xB5F1F9,
    frostGlass: 0xDDD8CF,

    // Props
    vending: [0x48D2C9, 0x4E90E8, 0xF2B0C5],
    pole: 0x7A8488,
    wire: 0x1e1e28,
    lamp: 0xFFD966,

    // Trees & plants
    blossom: 0xF2B0C5,
    blossomTrunk: 0x9C7554,
    foliage: [0x79B36A, 0x8CC97D, 0xA4D68B],
    pineGreen: 0x79B36A,
    pineDark: 0x6C777B,
    willowGreen: 0x8CC97D,

    // Characters
    humanSkin: 0xECE9E1,
    alienSkin: 0x8CC97D,
    accent: 0xF59A45,

    // UI colors
    mint: 0x48D2C9,
    orange: 0xF59A45,
    red: 0xD66565,
    blue: 0x4E90E8,
    yellow: 0xFFD966,
    pink: 0xF2B0C5,
    purple: 0x8C7CEB,

    // Transit
    trainSilver: 0xDDD8CF,
    trainPeach: 0xF59A45,
    busCream: 0xECE9E1,
    busOrange: 0xF59A45,
    uniformNavy: 0x4E90E8,
    trench: 0xDDD8CF,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    CONTACT: 'contact',
};