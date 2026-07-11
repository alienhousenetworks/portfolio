export const WORLD = {
    size: 620,
    groundY: 0.15,
    roadWidth: 15,
    roadSpacing: 70,
    bound: 280,
    /** Larger Japanese city footprint (concrete slab half-extents) */
    cityHalfX: 165,
    cityHalfZ: 145,
    /** Extra pad so hills/nature never clip the city slab */
    cityClearMargin: 28,
    parkX: 0,
    parkZ: 0,
    parkRadius: 18,
    parkLawnRadius: 22,
    riverX: -180,
    riverWidth: 28,
    riverLength: 500,
    mountainY: 0,
};

/** True if (x,z) is on the flat city slab (no hills / embankments). */
export function isCityFlat(x, z, margin = 0) {
    const hx = (WORLD.cityHalfX ?? 165) + margin;
    const hz = (WORLD.cityHalfZ ?? 145) + margin;
    return Math.abs(x) <= hx && Math.abs(z) <= hz;
}

/** River bridge decks — west of city, spanning the river only */
export const BRIDGES = [
    { x: -180, z: -130, deckY: 2.35, halfW: 18, halfD: 5.5 },
    { x: -180, z: -40, deckY: 2.35, halfW: 18, halfD: 5.5 },
    { x: -180, z: 65, deckY: 2.35, halfW: 18, halfD: 5.5 },
    { x: -180, z: 160, deckY: 2.35, halfW: 18, halfD: 5.5 },
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
    walkSpeed: 9.5,
    runSpeed: 16,
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

/** Japanese Anime Town palette — inspired by messenger.abeto.co */
export const PALETTE = {
    // Sky & atmosphere (teal anime sky)
    sky: 0x5dd8d0,
    skyTop: 0x3abcba,
    skyHorizon: 0x82e8e0,
    fog: 0x7adede,

    // Ground & nature (warm green)
    grass: 0x90c87a,
    grassLight: 0xa4d890,
    grassDark: 0x78b060,
    grassHighland: 0x7ab868,
    embankment: 0x88c070,
    sand: 0xd8d4c8,
    dirt: 0xb09870,

    // Roads & urban (muted slate)
    asphalt: 0x748088,
    asphaltDark: 0x606e72,
    asphaltLight: 0x7e9090,
    sidewalk: 0xbcc4c0,
    concrete: 0xb8c0bc,
    concreteLight: 0xc4ccc8,
    retainingWall: 0xaab4b0,

    // Water (kept)
    river: 0x4E90E8,
    riverShallow: 0x48D2C9,
    waterDeep: 0x4E90E8,
    waterFoam: 0xB5F1F9,

    // Hills – soft green layers
    mountain: [
        0x70a458,  // near
         0x88c070, // mid
        0x6a9848,  // far
        0x588040,  // deep far
    ],
    mountainSnow: 0xd8e0d0,
    mountainRock: 0xa8b4b0,
    mountainDeep: 0x4a6050,

    // Bridges
    bridge: 0xDDD8CF,
    bridgeStone: 0xC8C5BE,
    bridgeRail: 0x9C7554,

    // Wood
    wood: [0x9C7554, 0xB98A67, 0x9C7554],

    // Buildings (Japanese concrete palette)
    building: {
        wall: [0xc0c4bc, 0xb8beba, 0xc4c0b8, 0xa8b8b4, 0xd4cec8],
        roof: [0x7a8888, 0x6e7c7a, 0x5a6a68, 0x7c8880],
    },
    awning: [0x48d2c9, 0xd08080, 0xf5c842, 0x88c4c8],
    glass: 0x7ac4d0,
    frostGlass: 0xDDD8CF,

    // Props
    vending: [0x48D2C9, 0x4E90E8, 0xF2B0C5],
    pole: 0x7A8488,
    wire: 0x1e1e28,
    lamp: 0xFFD966,

    // Trees & plants (anime warm greens)
    blossom: 0xf8b0c0,
    blossomTrunk: 0x8a7058,
    foliage: [0x5ab860, 0x78cc68, 0x9ad080, 0x48a840],
    pineGreen: 0x58a850,
    pineDark: 0x3a7838,
    willowGreen: 0x70bc58,

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