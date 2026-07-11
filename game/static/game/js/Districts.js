/**
 * Districts, named roads, and map legend for the city minimap / HUD.
 * Japanese areas use JP-style names; Bengali colonies use Bangla names.
 */

export const DISTRICT_DEFS = {
    software: {
        id: 'software',
        label: 'Gakuen District',
        shortLabel: 'GAKUEN',
        mapLabel: '学園',
        mapSub: 'Gakuen',
        x: -90,
        z: -30,
        radius: 55,
        color: '#4c8fe3',
        groundColor: 0xaeeef8,
    },
    marketing: {
        id: 'marketing',
        label: 'Shōtengai',
        shortLabel: 'SHOP',
        mapLabel: '商店街',
        mapSub: 'Shōtengai',
        x: 90,
        z: 54,
        radius: 55,
        color: '#f08b3a',
        groundColor: 0xf7d55c,
    },
    innovation: {
        id: 'innovation',
        label: 'Geijutsu-gai',
        shortLabel: 'ARTS',
        mapLabel: '芸術街',
        mapSub: 'Arts Lane',
        x: -18,
        z: 30,
        radius: 45,
        color: '#8a78d8',
        groundColor: 0xe8a6b7,
    },
    hq: {
        id: 'hq',
        label: 'Mahapalika Bhavan',
        shortLabel: 'HALL',
        mapLabel: 'HALL',
        mapSub: 'Civic',
        x: 0,
        z: -150,
        radius: 40,
        color: '#c2af9e',
        groundColor: 0x937c68,
    },
    park: {
        id: 'park',
        label: 'Sakura Kōen',
        shortLabel: 'PARK',
        mapLabel: '桜公園',
        mapSub: 'Sakura Park',
        x: 0,
        z: 78,
        radius: 35,
        color: '#e8a6b7',
        groundColor: 0xa6d58f,
        mapLabelY: 4,
    },
    downtown: {
        id: 'downtown',
        label: 'Chūō',
        shortLabel: 'CHUO',
        mapLabel: '中央',
        mapSub: 'Downtown',
        x: 0,
        z: 0,
        radius: 175,
        color: '#7a878c',
        groundColor: 0xd6d4cc,
        hideOnMap: true, // too large; roads carry the map
    },
    ridge: {
        id: 'ridge',
        label: 'Pastel Ridge',
        shortLabel: 'RIDGE',
        mapLabel: 'RIDGE',
        mapSub: 'Explore',
        x: 20,
        z: -255,
        radius: 100,
        color: '#c4a86a',
        groundColor: 0x5aad62,
    },
    gorge: {
        id: 'gorge',
        label: 'River Gorge',
        shortLabel: 'GORGE',
        mapLabel: 'GORGE',
        mapSub: 'Explore',
        x: -280,
        z: 15,
        radius: 110,
        color: '#8fc7d9',
        groundColor: 0x99cad5,
    },
    /** Bengali colony — tall multi-storey alley */
    thakur: {
        id: 'thakur',
        label: 'ঠাকুর কলোনী',
        shortLabel: 'THAKUR',
        mapLabel: 'ঠাকুর',
        mapSub: 'Thakur Colony',
        x: 55,
        z: 0,
        radius: 48,
        color: '#c87860',
        groundColor: 0xc8b8a0,
    },
    /** Bengali colony — low residential lane */
    bose: {
        id: 'bose',
        label: 'বোস কলোনী',
        shortLabel: 'BOSE',
        mapLabel: 'বোস',
        mapSub: 'Bose Colony',
        x: -55,
        z: 0,
        radius: 48,
        color: '#d49868',
        groundColor: 0xc4a890,
    },
    /** Bengali colony — white Kolkata colonial heritage (Sukumar Roy) */
    sukumar: {
        id: 'sukumar',
        label: 'সুকুমার রায় কলোনী',
        shortLabel: 'SUKUMAR',
        mapLabel: 'সুকুমার',
        mapSub: 'Sukumar Roy',
        x: 115,
        z: 0,
        radius: 55,
        color: '#f5f2ec',
        groundColor: 0xdcd6cc,
    },
};

/**
 * Named roads drawn on the minimap (geometry matches WorldBuilder ROAD).
 * Japanese-style avenues + Bengali colony lanes.
 */
export const MAP_ROADS = [
    {
        id: 'main',
        name: 'Sakura Dōri',
        mapLabel: '桜通り',
        mapSub: 'Sakura Dori',
        axis: 'ns',
        x: 0,
        w: 15,
        z1: -160,
        z2: 160,
        labelX: 0,
        labelZ: -55,
        color: '#4a4e54',
        showWalk: true,
    },
    {
        id: 'cross',
        name: 'Chūō Dōri',
        mapLabel: '中央通り',
        mapSub: 'Chuo Dori',
        axis: 'ew',
        z: 0,
        w: 13,
        x1: -185,
        x2: 185,
        labelX: 100,
        labelZ: -12,
        color: '#4a4e54',
        showWalk: true,
    },
    {
        id: 'north',
        name: 'Kita-machi',
        mapLabel: '北町',
        mapSub: 'Kita Lane',
        axis: 'ew',
        z: -105,
        w: 11,
        x1: -175,
        x2: 175,
        labelX: 0,
        labelZ: -118,
        color: '#525860',
        showWalk: true,
    },
    {
        id: 'south',
        name: 'Minami-dōri',
        mapLabel: '南通り',
        mapSub: 'Minami Dori',
        axis: 'ew',
        z: 105,
        w: 11,
        x1: -175,
        x2: 175,
        labelX: 0,
        labelZ: 118,
        color: '#525860',
        showWalk: true,
    },
    {
        id: 'thakur',
        name: 'Thakur Colony',
        mapLabel: 'ঠাকুর',
        mapSub: 'Colony Rd',
        axis: 'ns',
        x: 55,
        w: 6,
        z1: -135,
        z2: 135,
        labelX: 72,
        labelZ: 40,
        color: '#5a5048',
        showWalk: false,
    },
    {
        id: 'bose',
        name: 'Bose Colony',
        mapLabel: 'বোস',
        mapSub: 'Colony Rd',
        axis: 'ns',
        x: -55,
        w: 5.6,
        z1: -135,
        z2: 135,
        labelX: -72,
        labelZ: -40,
        color: '#5a5048',
        showWalk: false,
    },
    {
        id: 'sukumar',
        name: 'Sukumar Roy Colony',
        mapLabel: 'সুকুমার',
        mapSub: 'Roy Colony',
        axis: 'ns',
        x: 115,
        w: 7.2,
        z1: -120,
        z2: 120,
        labelX: 132,
        labelZ: 25,
        color: '#5a5854',
        showWalk: true,
    },
];

export const MAP_LEGEND = [
    { type: 'road', label: 'Roads', color: '#4a4e54' },
    { type: 'hq', label: 'Hall', color: '#c2af9e' },
    { type: 'service', label: 'Services', color: '#4c8fe3' },
    { type: 'project', label: 'Projects', color: '#6ea56b' },
    { type: 'team', label: 'Team', color: '#8a78d8' },
    { type: 'contact', label: 'Contact', color: '#f08b3a' },
    { type: 'explore', label: 'Explore', color: '#c4a86a' },
    { type: 'colony', label: 'Colonies', color: '#c87860' },
];

export function getDistrictAt(x, z) {
    // Prefer smaller / special districts over huge downtown
    const ordered = Object.values(DISTRICT_DEFS)
        .filter(d => d.id !== 'downtown')
        .sort((a, b) => a.radius - b.radius);
    for (const d of ordered) {
        if (Math.hypot(x - d.x, z - d.z) < d.radius) return d;
    }
    return DISTRICT_DEFS.downtown;
}

/** Human-readable area name for HUD (includes JP / BN dual labels) */
export function getAreaDisplayName(x, z) {
    const d = getDistrictAt(x, z);
    if (d.id === 'thakur') return 'ঠাকুর কলোনী · Thakur Colony';
    if (d.id === 'bose') return 'বোস কলোনী · Bose Colony';
    if (d.id === 'sukumar') return 'সুকুমার রায় কলোনী · Sukumar Roy Colony';
    if (d.mapLabel && d.mapSub) return `${d.mapLabel} · ${d.mapSub}`;
    if (d.mapLabel) return d.mapLabel;
    return d.label;
}

export const POI_MAP_COLORS = {
    hq: '#c2af9e',
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
