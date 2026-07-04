export const DISTRICT_DEFS = {
    software: {
        id: 'software',
        label: 'Software Dev',
        shortLabel: 'DEV',
        x: -170,
        z: -90,
        radius: 75,
        color: '#4488cc',
        groundColor: 0x4a6a8a,
    },
    marketing: {
        id: 'marketing',
        label: 'Marketing',
        shortLabel: 'MKT',
        x: 170,
        z: -90,
        radius: 75,
        color: '#cc6644',
        groundColor: 0x8a5a4a,
    },
    innovation: {
        id: 'innovation',
        label: 'Projects',
        shortLabel: 'PRJ',
        x: -130,
        z: 165,
        radius: 65,
        color: '#88aa44',
        groundColor: 0x5a7a4a,
    },
    hq: {
        id: 'hq',
        label: 'HQ',
        shortLabel: 'HQ',
        x: 0,
        z: -120,
        radius: 45,
        color: '#00cc44',
        groundColor: 0x4a6a5a,
    },
    park: {
        id: 'park',
        label: 'Park',
        shortLabel: 'PARK',
        x: 0,
        z: 80,
        radius: 35,
        color: '#6b8e4e',
        groundColor: 0x6b8e4e,
    },
    downtown: {
        id: 'downtown',
        label: 'Downtown',
        shortLabel: 'DT',
        x: 0,
        z: 0,
        radius: 90,
        color: '#aaaaaa',
        groundColor: 0x5a6a5a,
    },
};

export const MAP_LEGEND = [
    { type: 'hq', label: 'HQ', color: '#00cc44' },
    { type: 'service', label: 'Services', color: '#66aaff' },
    { type: 'project', label: 'Projects', color: '#88aa44' },
    { type: 'team', label: 'Team', color: '#cc88ff' },
    { type: 'contact', label: 'Contact', color: '#ffaa66' },
    { type: 'bus_stop', label: 'Bus', color: '#d4a020' },
    { type: 'train_station', label: 'Metro', color: '#4488cc' },
    { type: 'district', label: 'Districts', color: '#888888' },
];

export function getDistrictAt(x, z) {
    for (const d of Object.values(DISTRICT_DEFS)) {
        if (d.id === 'downtown') continue;
        if (Math.hypot(x - d.x, z - d.z) < d.radius) return d;
    }
    return DISTRICT_DEFS.downtown;
}

export const POI_MAP_COLORS = {
    hq: '#00cc44',
    service: '#66aaff',
    project: '#88aa44',
    team: '#cc88ff',
    contact: '#ffaa66',
    bus_stop: '#d4a020',
    train_station: '#4488cc',
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