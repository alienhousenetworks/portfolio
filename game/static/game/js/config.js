export const WORLD = {
    size: 700,
    groundY: 0,
    roadWidth: 10,
    roadSpacing: 50,
    bound: 320,
    parkX: 0,
    parkZ: 80,
    parkRadius: 38,
    riverX: 0,
    riverWidth: 38,
    riverLength: 620,
    mountainY: 0,
};

export const PLAYER = {
    height: 1.75,
    radius: 0.38,
    walkSpeed: 7,
    runSpeed: 13,
    maxStepHeight: 1.2,   // max height player can auto-step onto a block top
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
    lookHeight: 1.5,
    heightBoost: 1.2,
    positionDamp: 10,
};

/** Cohesive natural-world palette */
export const PALETTE = {
    // Sky & atmosphere
    sky: 0x87ceeb,
    skyTop: 0x3a82c4,
    skyHorizon: 0xb8ddf5,
    fog: 0xc8e8f5,

    // Ground & nature
    grass: 0x7ab869,
    grassLight: 0x98cc7f,
    grassDark: 0x5a9450,
    grassHighland: 0x6d9e5a,
    embankment: 0x8aab72,
    sand: 0xe2d4b0,
    dirt: 0xb8936a,

    // Roads & urban
    asphalt: 0x6e7b82,
    asphaltDark: 0x5c6a70,
    asphaltLight: 0x8a9599,
    sidewalk: 0xcfcdc5,
    concrete: 0xbebdb7,
    concreteLight: 0xe6e4dc,
    retainingWall: 0xbebdb7,

    // Water
    river: 0x4abfce,
    riverShallow: 0x6ed4e0,
    waterDeep: 0x2e6faa,
    waterFoam: 0xe8f4f8,

    // Mountains – layered depth
    mountain: [
        0x4a6741,  // near — forested dark green
        0x6a7f60,  // near — lighter green slope
        0x8a9e80,  // mid — greyish green
        0x9eaaa0,  // far — atmospheric grey-blue
    ],
    mountainSnow: 0xf4f0eb,
    mountainRock: 0x8a8278,
    mountainDeep: 0x6a7868,

    // Bridges
    bridge: 0xc8beaa,
    bridgeStone: 0xa89880,
    bridgeRail: 0x8a8278,

    // Wood
    wood: [0x8b684d, 0xa57958, 0xc3926d],

    // Buildings
    building: {
        wall: [0xe8e6dd, 0xdbd7ce, 0xcfcbc2],
        roof: [0x6e7c80, 0xc45252, 0x7ab869, 0x4a8fd0, 0x8b684d],
    },
    awning: [0xe0a0b0, 0xf5cc50, 0x48ccc0, 0x8870d0],
    glass: 0xa8e4ee,
    frostGlass: 0xd8d4cc,

    // Props
    vending: [0x48ccc0, 0x4a8fd0, 0xe0a0b0],
    pole: 0x6e7b82,
    wire: 0x28282e,
    lamp: 0xf5cc50,

    // Trees & plants
    blossom: 0xe0a0b2,
    blossomTrunk: 0x8b684d,
    foliage: [0x5a9450, 0x7ab869, 0x98cc7f],
    pineGreen: 0x3d7040,
    pineDark: 0x2e5530,
    willowGreen: 0x7ab060,

    // Characters
    humanSkin: 0xf0d0b0,
    alienSkin: 0x7ab869,
    accent: 0xf08b3a,

    // UI colors
    mint: 0x48ccc0,
    orange: 0xf08b3a,
    red: 0xc45252,
    blue: 0x4a8fd0,
    yellow: 0xf5cc50,
    pink: 0xe0a0b2,
    purple: 0x8870d0,

    // Transit
    trainSilver: 0xdbd7ce,
    trainPeach: 0xf08b3a,
    busCream: 0xe8e6dd,
    busOrange: 0xf08b3a,
    uniformNavy: 0x4a8fd0,
    trench: 0xdbd7ce,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    CONTACT: 'contact',
};