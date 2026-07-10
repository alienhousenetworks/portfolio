import { WORLD } from './config.js';

/**
 * Neighborhood zones — each area gets a distinct architectural identity.
 * Game POI districts (software, marketing, etc.) are preserved as overlays.
 */
export const ZONE_TYPES = {
    WATERFRONT: 'waterfront',
    DOWNTOWN: 'downtown',
    SHOPPING: 'shopping',
    TRADITIONAL: 'traditional',
    KOREAN: 'korean',
    HILLSIDE: 'hillside',
    UNIVERSITY: 'university',
    ARTIST: 'artist',
    PARK: 'park',
    INDUSTRIAL: 'industrial',
    BEACH: 'beach',
    BAMBOO: 'bamboo',
    SCANDI: 'scandi',
    MEDITERRANEAN: 'mediterranean',
    EUROPEAN: 'european',
};

const ZONE_BUILDINGS = {
    [ZONE_TYPES.WATERFRONT]: ['cafe', 'ramen', 'boba', 'convenience', 'flower', 'japaneseModern'],
    [ZONE_TYPES.DOWNTOWN]: ['cafe', 'bakery', 'bookstore', 'fashion', 'electronics', 'glassTower', 'convenience'],
    [ZONE_TYPES.SHOPPING]: ['fashion', 'bakery', 'boba', 'dessert', 'arcade', 'music', 'furniture', 'retail'],
    [ZONE_TYPES.TRADITIONAL]: ['japaneseTraditional', 'japaneseModern', 'tinyHome', 'residential'],
    [ZONE_TYPES.KOREAN]: ['koreanTownhouse', 'apartment', 'boba', 'convenience', 'studentHousing'],
    [ZONE_TYPES.HILLSIDE]: ['residential', 'japaneseModern', 'tinyHome', 'villa'],
    [ZONE_TYPES.UNIVERSITY]: ['studentHousing', 'library', 'school', 'cafe', 'bookstore', 'glassTower'],
    [ZONE_TYPES.ARTIST]: ['gallery', 'cafe', 'music', 'retail', 'mediterranean'],
    [ZONE_TYPES.PARK]: [],
    [ZONE_TYPES.INDUSTRIAL]: ['warehouse', 'workshop', 'industrial'],
    [ZONE_TYPES.BEACH]: ['cafe', 'iceCream', 'residential'],
    [ZONE_TYPES.BAMBOO]: ['japaneseTraditional', 'teaHouse'],
    [ZONE_TYPES.SCANDI]: ['scandinavian', 'cafe', 'bookstore'],
    [ZONE_TYPES.MEDITERRANEAN]: ['mediterranean', 'flower', 'cafe'],
    [ZONE_TYPES.EUROPEAN]: ['european', 'bakery', 'flower', 'bookstore'],
};

const GAME_DISTRICT_ZONE = {
    software: ZONE_TYPES.UNIVERSITY,
    marketing: ZONE_TYPES.SHOPPING,
    innovation: ZONE_TYPES.ARTIST,
    hq: ZONE_TYPES.DOWNTOWN,
    park: ZONE_TYPES.PARK,
};

export function getZoneAt(x, z) {
    const ax = Math.abs(x), az = Math.abs(z);
    const dist = Math.hypot(x, z);

    // Small central plaza
    if (Math.hypot(x - WORLD.parkX, z - WORLD.parkZ) < WORLD.parkRadius + 6) return ZONE_TYPES.PARK;
    // River on far west of expanded city
    if (x < (WORLD.riverX ?? -155) + 18 && az < 160) return ZONE_TYPES.WATERFRONT;
    if (z > 220 && ax < 100) return ZONE_TYPES.BEACH;
    if (z < -220 && x < -80) return ZONE_TYPES.BAMBOO;
    if (z < -220 && x > 80) return ZONE_TYPES.INDUSTRIAL;
    if (x < -100 && z > 20 && z < 140) return ZONE_TYPES.SCANDI;
    if (x > 100 && z > 20 && z < 140) return ZONE_TYPES.MEDITERRANEAN;
    if (x > 80 && z < -20 && z > -140) return ZONE_TYPES.EUROPEAN;
    if (x < -80 && z < -20 && z > -140) return ZONE_TYPES.TRADITIONAL;
    if (x > 80 && z < -20 && z > -140) return ZONE_TYPES.KOREAN;
    if (ax > 40 && ax < 150 && az > 20) return ZONE_TYPES.HILLSIDE;
    if (x < -90 && z < -50) return ZONE_TYPES.UNIVERSITY;
    if (x > 90 && z < -50) return ZONE_TYPES.ARTIST;
    // Near main avenue / cross — shopping feel
    if (ax < 50 && az < 50) return ZONE_TYPES.SHOPPING;
    if (dist > 220) return ZONE_TYPES.INDUSTRIAL;
    return ZONE_TYPES.DOWNTOWN;
}

export function getZoneLabel(zone) {
    const labels = {
        waterfront: 'Waterfront', downtown: 'Downtown', shopping: 'Shopping St',
        traditional: 'Old Quarter', korean: 'K-Town', hillside: 'Hillside',
        university: 'Campus', artist: 'Arts District', park: 'Sakura Park',
        industrial: 'Industrial', beach: 'Harbor Beach', bamboo: 'Bamboo Grove',
        scandi: 'Nordic Lane', mediterranean: 'Sun Terrace', european: 'Old Europe',
    };
    return labels[zone] || 'City';
}

export function pickBuildingType(x, z, seed, gameDistrict = null) {
    if (gameDistrict && GAME_DISTRICT_ZONE[gameDistrict]) {
        const gz = GAME_DISTRICT_ZONE[gameDistrict];
        if (gz !== ZONE_TYPES.PARK) {
            const pool = ZONE_BUILDINGS[gz];
            return pool[seed % pool.length];
        }
    }

    const zone = getZoneAt(x, z);
    const pool = ZONE_BUILDINGS[zone];
    if (!pool || !pool.length) return 'residential';
    return pool[seed % pool.length];
}

export function propDensity(zone) {
    const dense = new Set([
        ZONE_TYPES.SHOPPING, ZONE_TYPES.DOWNTOWN, ZONE_TYPES.WATERFRONT,
        ZONE_TYPES.KOREAN, ZONE_TYPES.TRADITIONAL, ZONE_TYPES.EUROPEAN,
    ]);
    const sparse = new Set([ZONE_TYPES.INDUSTRIAL, ZONE_TYPES.BAMBOO, ZONE_TYPES.BEACH]);
    if (dense.has(zone)) return 1;
    if (sparse.has(zone)) return 0.35;
    return 0.65;
}