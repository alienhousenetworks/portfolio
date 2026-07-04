export const COLORS = {
    alien: 0x00ff41,
    alienDim: 0x44dd66,
    alienGlow: 0x66ff88,
    alienCyan: 0x66eeff,
    skyTop: 0x5eb8f0,
    skyBottom: 0xd8eeff,
    fog: 0xeaf6ff,
    grass: 0x7ec850,
    grassLight: 0xa8e06a,
    earthBrown: 0xb8956a,
    asphalt: 0x5a5a62,
    sidewalk: 0xc8c4bc,
    concrete: 0xe8e4dc,
    ufoHull: 0xd8dde5,
    ufoGlow: 0x66eeff,
    alienSkin: 0x8fdf9a,
    humanSkin: 0xf0c8a8,
    buildingPalette: [
        0xf2ebe0, 0xe8dcc8, 0xdce8f2, 0xf5d5b8,
        0xe0e8f0, 0xf0e8d8, 0xd8e8d8, 0xf5e0d0,
        0xc8d8e8, 0xf8f0e0, 0xe8f0e8, 0xf0d8c8,
    ],
    windowGlass: 0x88bbdd,
};

export const WORLD_SIZE = 400;
export const PLAYER = {
    height: 1.8,
    radius: 0.4,
    walkSpeed: 6,
    runSpeed: 12,
    turnSpeed: 3,
};

export const POI_TYPES = {
    HQ: 'hq',
    SERVICE: 'service',
    TEAM: 'team',
    PROJECT: 'project',
    TACTIC: 'tactic',
    CONTACT: 'contact',
};