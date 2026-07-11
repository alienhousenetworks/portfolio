export const DISTRICT_DEFS = {
    software: {
        id: 'software',
        label: 'Campus',
        shortLabel: 'EDU',
        x: -90,
        z: -30,
        radius: 55,
        color: '#4c8fe3',
        groundColor: 0xaeeef8,
    },
    marketing: {
        id: 'marketing',
        label: 'Shopping',
        shortLabel: 'SHOP',
        x: 90,
        z: 54,
        radius: 55,
        color: '#f08b3a',
        groundColor: 0xf7d55c,
    },
    innovation: {
        id: 'innovation',
        label: 'Arts',
        shortLabel: 'ART',
        x: -18,
        z: 30,
        radius: 45,
        color: '#8a78d8',
        groundColor: 0xe8a6b7,
    },
    hq: {
        id: 'hq',
        label: 'HQ',
        shortLabel: 'HQ',
        x: 0,
        z: -78,
        radius: 35,
        color: '#4ed2c8',
        groundColor: 0x8ce7f4,
    },
    park: {
        id: 'park',
        label: 'Sakura Park',
        shortLabel: 'PARK',
        x: 0,
        z: 78,
        radius: 35,
        color: '#e8a6b7',
        groundColor: 0xa6d58f,
    },
    downtown: {
        id: 'downtown',
        label: 'Downtown',
        shortLabel: 'DT',
        x: 0,
        z: 0,
        radius: 175,
        color: '#7a878c',
        groundColor: 0xd6d4cc,
    },
    /** Explore: pastel mountain ridge (north of city) */
    ridge: {
        id: 'ridge',
        label: 'Pastel Ridge',
        shortLabel: 'RIDGE',
        x: 20,
        z: -255,
        radius: 100,
        color: '#c4a86a',
        groundColor: 0x5aad62,
    },
    /** Explore: pastel river gorge (west of river) */
    gorge: {
        id: 'gorge',
        label: 'River Gorge',
        shortLabel: 'GORGE',
        x: -255,
        z: 15,
        radius: 110,
        color: '#8fc7d9',
        groundColor: 0x99cad5,
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
    { type: 'explore', label: 'Explore', color: '#c4a86a' },
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
    explore: '#c4a86a',
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