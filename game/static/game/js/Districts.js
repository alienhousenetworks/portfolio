export const DISTRICT_DEFS = {
    software: {
        id: 'software',
        label: 'Tech Hub',
        shortLabel: 'TECH',
        x: 80,
        z: 0,
        radius: 55,
        color: '#4c8fe3',
        groundColor: 0xaeeef8,
    },
    marketing: {
        id: 'marketing',
        label: 'Market & Bazaar',
        shortLabel: 'MKT',
        x: 0,
        z: 55,
        radius: 45,
        color: '#f08b3a',
        groundColor: 0xf7d55c,
    },
    innovation: {
        id: 'innovation',
        label: 'Residential Hub',
        shortLabel: 'RES',
        x: -25,
        z: 20,
        radius: 45,
        color: '#8a78d8',
        groundColor: 0xe8a6b7,
    },
    hq: {
        id: 'hq',
        label: 'Showrooms',
        shortLabel: 'SHOW',
        x: 0,
        z: -75,
        radius: 40,
        color: '#4ed2c8',
        groundColor: 0x8ce7f4,
    },
    park: {
        id: 'park',
        label: 'Atrium Park',
        shortLabel: 'PARK',
        x: 0,
        z: 0,
        radius: 43,
        color: '#e8a6b7',
        groundColor: 0xa6d58f,
    },
    downtown: {
        id: 'downtown',
        label: 'Downtown',
        shortLabel: 'DT',
        x: 0,
        z: 0,
        radius: 140,
        color: '#7a878c',
        groundColor: 0xd6d4cc,
    },
};

export const MAP_LEGEND = [
    { type: 'hq', label: 'HQ', color: '#4ed2c8' },
    { type: 'service', label: 'Services', color: '#4c8fe3' },
    { type: 'project', label: 'Projects', color: '#6ea56b' },
    { type: 'team', label: 'Team', color: '#8a78d8' },
    { type: 'contact', label: 'Contact', color: '#f08b3a' },
    { type: 'bus_stop', label: 'Bus', color: '#f7d55c' },
    { type: 'train_station', label: 'Metro', color: '#4c8fe3' },
    { type: 'district', label: 'Districts', color: '#7a878c' },
];

export function getDistrictAt(x, z) {
    for (const d of Object.values(DISTRICT_DEFS)) {
        if (d.id === 'downtown') continue;
        if (Math.hypot(x - d.x, z - d.z) < d.radius) return d;
    }
    return DISTRICT_DEFS.downtown;
}

export const POI_MAP_COLORS = {
    hq: '#4ed2c8',
    service: '#4c8fe3',
    project: '#6ea56b',
    team: '#8a78d8',
    contact: '#f08b3a',
    bus_stop: '#f7d55c',
    train_station: '#4c8fe3',
};

export function districtSlots(districtId) {
    const offsets = {
        software: [
            [-28, -28], [0, -28], [28, -28],
            [-28, 0], [0, 0], [28, 0],
            [-28, 28], [0, 28], [28, 28],
        ],
        marketing: [
            [-28, -28], [0, -28], [28, -28],
            [-28, 0], [0, 0], [28, 0],
            [-28, 28], [0, 28], [28, 28],
        ],
        innovation: [
            [-24, -20], [0, -20], [24, -20],
            [-24, 8], [0, 8], [24, 8],
        ],
    };
    const d = DISTRICT_DEFS[districtId];
    if (!d) return [];
    return (offsets[districtId] || []).map(([ox, oz]) => ({ x: d.x + ox, z: d.z + oz }));
}