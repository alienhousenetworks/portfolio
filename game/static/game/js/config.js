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
    riverWidth: 40,
    riverLength: 620,
    mountainY: 0,
};

export const PLAYER = {
    height: 1.75,
    radius: 0.35,
    walkSpeed: 7,
    runSpeed: 13,
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

/** Cohesive anime neighborhood palette — cheerful but not oversaturated */
export const PALETTE = {
    sky: 0x8ce7f4,
    skyTop: 0x72d8e5,
    fog: 0xaeeef8,

    grass: 0x8fc47d,
    grassLight: 0xa6d58f,
    grassDark: 0x6ea56b,
    embankment: 0xa6d58f,
    sand: 0xe8dcc8,

    asphalt: 0x7a878c,
    asphaltDark: 0x6e7c80,
    asphaltLight: 0x8b969a,
    sidewalk: 0xd6d4cc,
    concrete: 0xc8c7c1,
    concreteLight: 0xeae8df,
    retainingWall: 0xc8c7c1,

    river: 0x4ed2c8,
    waterDeep: 0x4c8fe3,
    mountain: [0xaeeef8, 0x8ce7f4, 0x72d8e5, 0x8b969a],

    bridge: 0xc95757,
    wood: [0x8b684d, 0xa57958, 0xc3926d],

    building: {
        wall: [0xeae8df, 0xddd9d0, 0xcfcbc1],
        roof: [0x6e7c80, 0xc95757, 0x8fc47d, 0x4c8fe3, 0x8b684d],
    },
    awning: [0xe8a6b7, 0xf7d55c, 0x4ed2c8, 0x8a78d8],
    glass: 0xaeeef8,
    frostGlass: 0xddd9d0,

    vending: [0x4ed2c8, 0x4c8fe3, 0xe8a6b7],
    pole: 0x7a878c,
    wire: 0x2a2a30,
    lamp: 0xf7d55c,

    blossom: 0xe8a6b7,
    blossomTrunk: 0x8b684d,
    foliage: [0x6ea56b, 0x8fc47d, 0xa6d58f],

    humanSkin: 0xf0d0b0,
    alienSkin: 0x8fc47d,
    accent: 0xf08b3a,

    mint: 0x4ed2c8,
    orange: 0xf08b3a,
    red: 0xc95757,
    blue: 0x4c8fe3,
    yellow: 0xf7d55c,
    pink: 0xe8a6b7,
    purple: 0x8a78d8,

    trainSilver: 0xddd9d0,
    trainPeach: 0xf08b3a,
    busCream: 0xeae8df,
    busOrange: 0xf08b3a,
    uniformNavy: 0x4c8fe3,
    trench: 0xddd9d0,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    CONTACT: 'contact',
};