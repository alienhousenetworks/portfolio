export const WORLD = {
    size: 320,
    groundY: 0,
    roadWidth: 10,
    blockSize: 36,
};

export const PLAYER = {
    height: 1.75,
    radius: 0.35,
    walkSpeed: 5,
    runSpeed: 9,
};

export const PALETTE = {
    sky: 0x87ceeb,
    ground: 0x5a7a42,
    grass: 0x6b8e4e,
    asphalt: 0x3a3a40,
    sidewalk: 0xb8b4ac,
    concrete: 0xd4d0c8,
    building: [0xe8e0d0, 0xd8d0c0, 0xc8c0b0, 0xf0e8d8, 0xe0d8c8, 0xd0c8b8],
    glass: 0x6a8aaa,
    palm: 0x4a7a3a,
    trunk: 0x8b6914,
    humanSkin: 0xe0b090,
    alienSkin: 0x7ec88a,
    accent: 0x00cc44,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    CONTACT: 'contact',
};