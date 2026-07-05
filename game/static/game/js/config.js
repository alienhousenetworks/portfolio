export const WORLD = {
    size: 700,
    groundY: 0,
    roadWidth: 10,
    roadSpacing: 50,
    bound: 320,
    parkX: 0,
    parkZ: 80,
    parkRadius: 30,
    riverX: 0,
    riverWidth: 42,
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

export const PALETTE = {
    sky: 0xc8d8e8,
    fog: 0xd4dce8,
    ground: 0x9ed46a,
    grass: 0xa8d86a,
    embankment: 0xb8e070,
    asphalt: 0x4a4a52,
    sidewalk: 0xe8e4dc,
    concrete: 0xb8b4ac,
    retainingWall: 0xa8a49c,
    river: 0xa8dcc8,
    mountain: [0xb8c8d8, 0xa0b8c8, 0x88a8b8, 0x78a0a8],
    bridge: 0xd89088,
    building: {
        wall: [0xf0ece4, 0xe8dcc8, 0xf5e8b8, 0xe0d8c8],
        roof: [0x3a4a6a, 0xc88870, 0x8aaa88, 0x5a6a7a],
    },
    awning: [0xf0b8c8, 0xb8d8f0, 0xf0e0a8, 0xc8b8e8],
    glass: 0xf0e8a8,
    frostGlass: 0xe8e4dc,
    vending: [0xa8e8b8, 0xb8d8f0],
    pole: 0x6a6a6a,
    wire: 0x1a1a22,
    palm: 0x6aaa5a,
    trunk: 0x8b6914,
    humanSkin: 0xf0d0b0,
    alienSkin: 0x7ec88a,
    accent: 0xe88870,
    trainSilver: 0xc0c4c8,
    trainPeach: 0xf0c0a8,
    busCream: 0xf0e8d8,
    busOrange: 0xf0b888,
    uniformNavy: 0x2a3a5a,
    trench: 0xe0d4c0,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    CONTACT: 'contact',
};