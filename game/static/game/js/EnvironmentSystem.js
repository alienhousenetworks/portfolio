/**
 * EnvironmentSystem — location-based day/night + Japan-style seasons.
 * Uses browser geolocation (Tokyo fallback) + solar elevation math (no external lib).
 */
import * as THREE from 'three';

/** Default: Tokyo, Japan */
export const DEFAULT_LOCATION = {
    lat: 35.6762,
    lng: 139.6503,
    label: 'Tokyo',
    source: 'default',
};

const SEASONS = ['winter', 'spring', 'summer', 'autumn'];

/** Japan-facing seasonal look (northern hemisphere calendar) */
export function getSeasonFromDate(date = new Date(), lat = 35) {
    // Southern hemisphere flips seasons
    let month = date.getMonth(); // 0–11
    if (lat < 0) month = (month + 6) % 12;
    if (month === 11 || month <= 1) return 'winter';
    if (month <= 4) return 'spring';
    if (month <= 7) return 'summer';
    return 'autumn';
}

/**
 * Approximate solar altitude (degrees) & azimuth for lat/lng/Date.
 * Based on simplified NOAA / astronomical formulas.
 */
export function getSunPosition(lat, lng, date = new Date()) {
    const rad = Math.PI / 180;
    const day = julianDay(date);
    const n = day - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * rad;
    const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
    const epsilon = (23.439 - 0.0000004 * n) * rad;
    const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
    const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

    const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
    const lst = (gmst + lng / 15) * 15 * rad;
    const h = lst - alpha;

    const latR = lat * rad;
    const sinAlt = Math.sin(latR) * Math.sin(delta) + Math.cos(latR) * Math.cos(delta) * Math.cos(h);
    const altitude = Math.asin(Math.min(1, Math.max(-1, sinAlt))) / rad;

    const cosAz = (Math.sin(delta) - Math.sin(latR) * sinAlt)
        / (Math.cos(latR) * Math.cos(altitude * rad));
    let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz))) / rad;
    if (Math.sin(h) > 0) azimuth = 360 - azimuth;

    return { altitude, azimuth };
}

function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
}

/** Map solar altitude + hour to a named time-of-day phase */
export function getTimeOfDay(altitude, date = new Date()) {
    const hour = date.getHours() + date.getMinutes() / 60;
    const morning = hour < 12;

    if (altitude < -12) return 'night';
    if (altitude < -4) return morning ? 'dawn' : 'dusk';
    if (altitude < 8) return morning ? 'sunrise' : 'sunset';
    if (altitude < 18) return morning ? 'morning' : 'golden';
    return 'day';
}

/** Visual recipes: sky gradient (horizon→zenith), fog, lights, exposure, particles */
const TOD_LOOK = {
    night: {
        // City night — deep blue sky but warm lit streets (not pitch black)
        horizon: new THREE.Color(0x2a2848),
        zenith: new THREE.Color(0x0c1028),
        fog: new THREE.Color(0x1a1e38),
        fogNear: 90, fogFar: 320,
        ambient: { color: 0x3a4868, intensity: 0.55 },
        hemi: { sky: 0x3a5078, ground: 0x403020, intensity: 0.42 },
        sun: { color: 0xb0c8ff, intensity: 0.22 },
        fill: { color: 0xffb070, intensity: 0.45 },
        exposure: 0.98,
        particle: 'stars',
    },
    dawn: {
        horizon: new THREE.Color(0xffb080),
        zenith: new THREE.Color(0x2a3060),
        fog: new THREE.Color(0xc898a8),
        fogNear: 80, fogFar: 280,
        ambient: { color: 0xffd0c0, intensity: 0.4 },
        hemi: { sky: 0xffa090, ground: 0x506040, intensity: 0.35 },
        sun: { color: 0xff8860, intensity: 0.55 },
        fill: { color: 0x8899cc, intensity: 0.25 },
        exposure: 0.88,
        particle: null,
    },
    sunrise: {
        horizon: new THREE.Color(0xffc090),
        zenith: new THREE.Color(0x5aa8d0),
        fog: new THREE.Color(0xe8c0a8),
        fogNear: 90, fogFar: 300,
        ambient: { color: 0xffe8d0, intensity: 0.55 },
        hemi: { sky: 0xffb080, ground: 0x70a050, intensity: 0.4 },
        sun: { color: 0xffd0a0, intensity: 1.1 },
        fill: { color: 0xa0c0e8, intensity: 0.35 },
        exposure: 0.98,
        particle: null,
    },
    morning: {
        horizon: new THREE.Color(0xa8e8e0),
        zenith: new THREE.Color(0x48c0c8),
        fog: new THREE.Color(0x8ad8d0),
        fogNear: 110, fogFar: 340,
        ambient: { color: 0xfff5e4, intensity: 0.7 },
        hemi: { sky: 0x91e5f2, ground: 0x8cc97d, intensity: 0.42 },
        sun: { color: 0xfff0c8, intensity: 1.55 },
        fill: { color: 0xc8e8ff, intensity: 0.4 },
        exposure: 1.05,
        particle: null,
    },
    day: {
        horizon: new THREE.Color(0x82e8e0),
        zenith: new THREE.Color(0x3abcba),
        fog: new THREE.Color(0x7adede),
        fogNear: 110, fogFar: 360,
        ambient: { color: 0xfff5e4, intensity: 0.75 },
        hemi: { sky: 0x91e5f2, ground: 0x8cc97d, intensity: 0.45 },
        sun: { color: 0xfff0c8, intensity: 1.8 },
        fill: { color: 0xc8e8ff, intensity: 0.45 },
        exposure: 1.05,
        particle: null,
    },
    golden: {
        horizon: new THREE.Color(0xffc878),
        zenith: new THREE.Color(0x5890c0),
        fog: new THREE.Color(0xe8b888),
        fogNear: 95, fogFar: 300,
        ambient: { color: 0xffe0b0, intensity: 0.6 },
        hemi: { sky: 0xffb060, ground: 0x789050, intensity: 0.4 },
        sun: { color: 0xffc070, intensity: 1.35 },
        fill: { color: 0x88a0d0, intensity: 0.3 },
        exposure: 1.0,
        particle: null,
    },
    sunset: {
        horizon: new THREE.Color(0xff7050),
        zenith: new THREE.Color(0x304070),
        fog: new THREE.Color(0xd08070),
        fogNear: 80, fogFar: 260,
        ambient: { color: 0xffb090, intensity: 0.45 },
        hemi: { sky: 0xff8060, ground: 0x506040, intensity: 0.32 },
        sun: { color: 0xff6040, intensity: 0.85 },
        fill: { color: 0x6070a0, intensity: 0.28 },
        exposure: 0.9,
        particle: null,
    },
    dusk: {
        horizon: new THREE.Color(0x604080),
        zenith: new THREE.Color(0x101828),
        fog: new THREE.Color(0x403858),
        fogNear: 80, fogFar: 280,
        ambient: { color: 0x8090c0, intensity: 0.48 },
        hemi: { sky: 0x5060a0, ground: 0x403028, intensity: 0.35 },
        sun: { color: 0xffa080, intensity: 0.35 },
        fill: { color: 0xffa070, intensity: 0.35 },
        exposure: 0.9,
        particle: null,
    },
};

const SEASON_TINT = {
    winter: {
        fogMix: new THREE.Color(0xd0e0f0),
        fogMixAmt: 0.35,
        grass: 0xc8d8c8,
        foliage: [0xc0c8c0, 0xe8f0f8, 0xb0b8b0],
        ambientBoost: 0.05,
        label: 'Winter',
        emoji: '❄️',
        particle: 'snow',
    },
    spring: {
        fogMix: new THREE.Color(0xf8d0e0),
        fogMixAmt: 0.2,
        grass: 0x98d888,
        foliage: [0x70c868, 0xf8b0c0, 0x9ad080],
        ambientBoost: 0,
        label: 'Spring',
        emoji: '🌸',
        particle: 'sakura',
    },
    summer: {
        fogMix: new THREE.Color(0xa0e8d0),
        fogMixAmt: 0.12,
        grass: 0x68b048,
        foliage: [0x3a9838, 0x58b050, 0x78cc68],
        ambientBoost: 0.04,
        label: 'Summer',
        emoji: '☀️',
        particle: null,
    },
    autumn: {
        fogMix: new THREE.Color(0xe8c090),
        fogMixAmt: 0.25,
        grass: 0xb0a060,
        foliage: [0xd87830, 0xc05028, 0xe8a040],
        ambientBoost: 0,
        label: 'Autumn',
        emoji: '🍁',
        particle: 'leaves',
    },
};

const TOD_LABEL = {
    night: 'Night',
    dawn: 'Dawn',
    sunrise: 'Sunrise',
    morning: 'Morning',
    day: 'Day',
    golden: 'Golden Hour',
    sunset: 'Sunset',
    dusk: 'Dusk',
};

const TOD_EMOJI = {
    night: '🌙',
    dawn: '🌆',
    sunrise: '🌅',
    morning: '🌤️',
    day: '☀️',
    golden: '🌇',
    sunset: '🌇',
    dusk: '🌃',
};

export class EnvironmentSystem {
    /**
     * @param {THREE.Scene} scene
     * @param {object} opts
     * @param {THREE.WebGLRenderer} [opts.renderer]
     * @param {object} [opts.handles] world handles: skyMesh, lights, groundGrass
     */
    constructor(scene, opts = {}) {
        this.scene = scene;
        this.renderer = opts.renderer || null;
        this.handles = opts.handles || {};
        this.location = { ...DEFAULT_LOCATION };
        this.season = 'summer';
        this.timeOfDay = 'day';
        this.sun = { altitude: 45, azimuth: 180 };
        this._ready = false;
        this._timer = 0;
        this._refreshSec = 90; // recompute sun every 90s
        this._particles = null;
        this._particleKind = null;
        this._statusEl = null;
        this._cityLightMeshes = null;
        this._streetPointLights = null;
        this._cityLightsOn = null;
    }

    /** Resolve geolocation then apply first look. Safe if permission denied. */
    async init() {
        this.location = await resolveUserLocation();
        this.refresh(true);
        this._ready = true;
        this._bindStatusUi();
        this._updateStatusUi();
        return this.getState();
    }

    getState() {
        return {
            location: this.location,
            season: this.season,
            timeOfDay: this.timeOfDay,
            sun: this.sun,
            label: this._statusText(),
        };
    }

    /** Recompute sun/season and push to scene */
    refresh(force = false) {
        const now = new Date();
        const { lat, lng } = this.location;
        this.sun = getSunPosition(lat, lng, now);
        this.timeOfDay = getTimeOfDay(this.sun.altitude, now);
        this.season = getSeasonFromDate(now, lat);
        this.applyLook();
        this._updateStatusUi();
        if (force) this._timer = 0;
    }

    update(dt) {
        if (!this._ready) return;
        this._timer += dt;
        if (this._timer >= this._refreshSec) {
            this._timer = 0;
            this.refresh();
        }
        this._tickParticles(dt);
    }

    applyLook() {
        const tod = TOD_LOOK[this.timeOfDay] || TOD_LOOK.day;
        const season = SEASON_TINT[this.season] || SEASON_TINT.summer;
        const { altitude, azimuth } = this.sun;

        // ── Sky dome vertex colors ──────────────────────────────────────
        const sky = this.handles.skyMesh;
        if (sky?.geometry?.attributes?.color) {
            this._paintSky(sky, tod.horizon, tod.zenith);
        }

        // ── Fog + background ────────────────────────────────────────────
        const fogCol = tod.fog.clone().lerp(season.fogMix, season.fogMixAmt);
        if (this.scene.fog) {
            this.scene.fog.color.copy(fogCol);
            this.scene.fog.near = tod.fogNear;
            this.scene.fog.far = tod.fogFar;
        } else {
            this.scene.fog = new THREE.Fog(fogCol.getHex(), tod.fogNear, tod.fogFar);
        }
        this.scene.background = fogCol.clone();

        // ── Lights ──────────────────────────────────────────────────────
        const L = this.handles.lights || {};
        if (L.ambient) {
            L.ambient.color.setHex(tod.ambient.color);
            L.ambient.intensity = tod.ambient.intensity + season.ambientBoost;
        }
        if (L.hemi) {
            L.hemi.color.setHex(tod.hemi.sky);
            L.hemi.groundColor.setHex(tod.hemi.ground);
            L.hemi.intensity = tod.hemi.intensity;
        }
        if (L.sun) {
            L.sun.color.setHex(tod.sun.color);
            // Dim sun below horizon; keep tiny moonlight at night
            const dayFactor = THREE.MathUtils.clamp((altitude + 6) / 40, 0.05, 1);
            L.sun.intensity = tod.sun.intensity * (this.timeOfDay === 'night' ? 0.35 : dayFactor);
            // Place sun from azimuth/altitude (Y-up)
            const az = (azimuth - 180) * (Math.PI / 180);
            const altRad = Math.max(altitude, this.timeOfDay === 'night' ? 25 : altitude) * (Math.PI / 180);
            const r = 200;
            L.sun.position.set(
                Math.sin(az) * Math.cos(altRad) * r,
                Math.sin(altRad) * r,
                Math.cos(az) * Math.cos(altRad) * r
            );
            L.sun.castShadow = this.timeOfDay !== 'night' && altitude > 2;
        }
        if (L.fill) {
            L.fill.color.setHex(tod.fill.color);
            L.fill.intensity = tod.fill.intensity;
        }
        // Warm city glow at night / dusk (readable streets + plaza)
        const cityNight = this.timeOfDay === 'night' || this.timeOfDay === 'dusk';
        const nightAmt = this.timeOfDay === 'night' ? 1 : this.timeOfDay === 'dusk' ? 0.55 : 0;
        if (L.nightGlow) {
            L.nightGlow.intensity = 3.2 * nightAmt;
            L.nightGlow.visible = nightAmt > 0;
            L.nightGlow.distance = 280;
            L.nightGlow.color.setHex(0xffb070);
        }
        if (L.nightGlow2) {
            L.nightGlow2.intensity = 2.4 * nightAmt;
            L.nightGlow2.visible = nightAmt > 0;
            L.nightGlow2.distance = 200;
        }
        if (L.nightGlow3) {
            L.nightGlow3.intensity = 2.4 * nightAmt;
            L.nightGlow3.visible = nightAmt > 0;
            L.nightGlow3.distance = 200;
        }
        if (L.nightHemi) {
            L.nightHemi.intensity = 0.7 * nightAmt;
            L.nightHemi.visible = nightAmt > 0;
        }
        // Warmer fill from below at night so buildings read clearly
        if (L.fill && cityNight) {
            L.fill.color.setHex(0xffc090);
            L.fill.intensity = Math.max(L.fill.intensity, 0.5 * nightAmt + 0.2);
            L.fill.position.set(40, 30, 20);
        }

        if (this.renderer) {
            this.renderer.toneMappingExposure = tod.exposure;
        }

        // Building windows + street lamps + avenue point lights
        this._setCityNightLights(cityNight, nightAmt);

        // ── Ground grass seasonal tint ──────────────────────────────────
        if (this.handles.groundGrass?.material?.color) {
            // Night: slightly desaturate / darken grass
            if (cityNight) {
                const gCol = new THREE.Color(season.grass).multiplyScalar(0.45);
                this.handles.groundGrass.material.color.copy(gCol);
            } else {
                this.handles.groundGrass.material.color.setHex(season.grass);
            }
        }

        // ── Particles (Japan-style season + time of day) ────────────────
        let kind = null;
        if (this.season === 'winter') kind = 'snow';
        else if (this.season === 'spring' && this.timeOfDay !== 'night') kind = 'sakura';
        else if (this.season === 'autumn' && this.timeOfDay !== 'night') kind = 'leaves';
        else if (this.season === 'summer' && this.timeOfDay === 'night') kind = 'fireflies';

        this._setParticles(kind);
    }

    /** Collect window / lamp meshes once, then toggle emissive + street PointLights */
    _collectCityLights() {
        this._cityLightMeshes = [];
        this.scene.traverse((obj) => {
            if (!obj.isMesh) return;
            const tag = obj.userData?.cityLight || obj.material?.userData?.cityLight;
            if (tag === 'window' || tag === 'shop' || tag === 'lamp' || tag === 'lampGlow') {
                this._cityLightMeshes.push(obj);
            }
        });
    }

    _ensureStreetPointLights() {
        if (this._streetPointLights) return;
        this._streetPointLights = [];
        // Few wide warm pools only (many PointLights kill FPS)
        const spots = [
            [0, 8, 0],
            [0, 7, 50],
            [0, 7, -50],
            [0, 7, 100],
            [0, 7, -100],
            [55, 7, 0],
            [-55, 7, 0],
            [100, 7, 0],
            [-100, 7, 0],
            [0, 6.5, 90],
            [0, 6.5, -90],
            [40, 6.5, 40],
            [-40, 6.5, -40],
        ];

        spots.forEach(([x, y, z], i) => {
            const col = i % 2 === 0 ? 0xffe0a0 : 0xffc070;
            const pl = new THREE.PointLight(col, 0, 55, 1.4);
            pl.position.set(x, y, z);
            pl.visible = false;
            pl.castShadow = false;
            this.scene.add(pl);
            this._streetPointLights.push(pl);
        });
    }

    _setCityNightLights(on, amount = 1) {
        const key = on ? amount : 0;
        if (this._cityLightsOn === key) return;
        this._cityLightsOn = key;

        if (!this._cityLightMeshes) this._collectCityLights();
        this._ensureStreetPointLights();

        const winIntensity = on ? 0.95 * amount : 0;
        const shopIntensity = on ? 1.15 * amount : 0;
        const lampIntensity = on ? 1.4 * amount : 0.18;
        const glowOpacity = on ? 0.45 * amount : 0.1;

        this._cityLightMeshes.forEach((mesh) => {
            const tag = mesh.userData?.cityLight || mesh.material?.userData?.cityLight;
            const lit = mesh.userData.litAtNight !== false;
            const mat = mesh.material;
            if (!mat) return;

            if (tag === 'window') {
                if (mat.emissive) {
                    if (on && lit) {
                        mat.emissiveIntensity = winIntensity * (0.7 + (Math.abs(mesh.id * 17) % 5) * 0.08);
                        mat.opacity = 0.92;
                    } else if (on && !lit) {
                        mat.emissiveIntensity = 0.05;
                        mat.opacity = 0.55;
                    } else {
                        mat.emissiveIntensity = 0;
                        mat.opacity = 0.72;
                    }
                    mat.needsUpdate = true;
                }
            } else if (tag === 'shop') {
                if (mat.emissive) {
                    mat.emissiveIntensity = on ? shopIntensity : 0;
                    mat.opacity = on ? 0.85 : 0.55;
                    mat.needsUpdate = true;
                }
            } else if (tag === 'lamp') {
                if (mat.emissive) {
                    mat.emissiveIntensity = lampIntensity;
                    mat.needsUpdate = true;
                }
            } else if (tag === 'lampGlow') {
                mat.opacity = glowOpacity;
                mat.needsUpdate = true;
            } else if (tag === 'sign') {
                // Pastel neon kanban / billboards (Shinjuku strip)
                if (mat.emissive) {
                    mat.emissiveIntensity = on ? 0.95 * amount : 0.2;
                    mat.needsUpdate = true;
                }
            }
        });

        // Few wide avenue point lights (emissive windows carry most of the look)
        const plIntensity = on ? 2.4 * amount : 0;
        this._streetPointLights.forEach((pl, i) => {
            pl.intensity = plIntensity * (0.9 + (i % 3) * 0.05);
            pl.visible = on && amount > 0.05;
            pl.distance = on ? 60 : 1;
        });
    }

    _paintSky(skyMesh, horizon, zenith) {
        const geo = skyMesh.geometry;
        const pos = geo.attributes.position;
        const col = geo.attributes.color;
        const radius = geo.boundingSphere?.radius || 620;
        for (let i = 0; i < pos.count; i++) {
            const t = Math.max(0, Math.min(1, pos.getY(i) / radius));
            const c = horizon.clone().lerp(zenith, t);
            col.setXYZ(i, c.r, c.g, c.b);
        }
        col.needsUpdate = true;
    }

    _setParticles(kind) {
        if (kind === this._particleKind) return;
        if (this._particles) {
            this.scene.remove(this._particles);
            this._particles.geometry?.dispose();
            this._particles.material?.dispose();
            this._particles = null;
        }
        this._particleKind = kind;
        if (!kind) return;

        const count = kind === 'fireflies' ? 18 : kind === 'snow' ? 90 : 70;
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 280;
            positions[i * 3 + 1] = 2 + Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 280;
            speeds[i] = 0.4 + Math.random() * 1.2;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.userData.speeds = speeds;

        let color = 0xffffff;
        let size = 0.55;
        let opacity = 0.75;
        if (kind === 'sakura') { color = 0xffb0c8; size = 0.45; opacity = 0.8; }
        if (kind === 'leaves') { color = 0xe07030; size = 0.5; opacity = 0.75; }
        if (kind === 'snow') { color = 0xffffff; size = 0.4; opacity = 0.85; }
        if (kind === 'fireflies') { color = 0xd0ff80; size = 0.35; opacity = 0.9; }

        const mat = new THREE.PointsMaterial({
            color,
            size,
            transparent: true,
            opacity,
            depthWrite: false,
            sizeAttenuation: true,
        });
        this._particles = new THREE.Points(geo, mat);
        this._particles.frustumCulled = false;
        this._particles.userData.kind = kind;
        this.scene.add(this._particles);
    }

    _tickParticles(dt) {
        if (!this._particles) return;
        // Throttle particle CPU work (~20fps updates feel fine for snow/petals)
        this._particleAcc = (this._particleAcc || 0) + dt;
        if (this._particleAcc < 0.05) return;
        const step = this._particleAcc;
        this._particleAcc = 0;

        const pos = this._particles.geometry.attributes.position;
        const speeds = this._particles.geometry.userData.speeds;
        const kind = this._particles.userData.kind;
        const arr = pos.array;
        for (let i = 0; i < pos.count; i++) {
            const i3 = i * 3;
            let x = arr[i3];
            let y = arr[i3 + 1];
            let z = arr[i3 + 2];
            const sp = speeds[i] || 1;
            if (kind === 'snow') {
                y -= sp * 4.5 * step;
                x += Math.sin(y * 0.1 + i) * 0.8 * step;
            } else if (kind === 'sakura' || kind === 'leaves') {
                y -= sp * 2.2 * step;
                x += Math.sin(y * 0.15 + i) * 1.4 * step;
                z += Math.cos(y * 0.1 + i) * 0.6 * step;
            } else if (kind === 'fireflies') {
                const t = performance.now() * 0.001;
                x += Math.sin(t * sp + i) * 2 * step;
                y += Math.cos(t * 1.2 * sp + i * 0.7) * 1.5 * step;
                z += Math.sin(t * 0.9 * sp + i) * 2 * step;
                y = THREE.MathUtils.clamp(y, 1.5, 12);
            }
            if (y < 0.5) {
                y = 35 + Math.random() * 20;
                x = (Math.random() - 0.5) * 280;
                z = (Math.random() - 0.5) * 280;
            }
            if (x > 150) x = -150;
            if (x < -150) x = 150;
            if (z > 150) z = -150;
            if (z < -150) z = 150;
            arr[i3] = x;
            arr[i3 + 1] = y;
            arr[i3 + 2] = z;
        }
        pos.needsUpdate = true;
    }

    _statusText() {
        const s = SEASON_TINT[this.season];
        const loc = this.location.label || 'Local';
        const src = this.location.source === 'gps' ? '' : ' · default';
        return `${TOD_EMOJI[this.timeOfDay] || ''} ${TOD_LABEL[this.timeOfDay] || this.timeOfDay} · ${s?.emoji || ''} ${s?.label || this.season} · ${loc}${src}`;
    }

    _bindStatusUi() {
        this._statusEl = document.getElementById('env-status');
        if (!this._statusEl) {
            // Create lightweight badge if template missing it
            const el = document.createElement('div');
            el.id = 'env-status';
            el.className = 'env-status';
            document.body.appendChild(el);
            this._statusEl = el;
        }
    }

    _updateStatusUi() {
        const text = this._statusText();
        if (this._statusEl) {
            this._statusEl.textContent = text;
            this._statusEl.dataset.tod = this.timeOfDay;
            this._statusEl.dataset.season = this.season;
            this._statusEl.classList.add('visible');
        }
        const hud = document.getElementById('env-status-hud');
        if (hud) {
            const s = SEASON_TINT[this.season];
            hud.textContent = `${TOD_EMOJI[this.timeOfDay] || ''} ${TOD_LABEL[this.timeOfDay] || ''} · ${s?.emoji || ''} ${s?.label || ''}`;
        }
    }
}

/** Browser geolocation with Tokyo fallback */
export function resolveUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ ...DEFAULT_LOCATION, source: 'default' });
            return;
        }
        const done = (loc) => resolve(loc);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                done({
                    lat,
                    lng,
                    label: approxPlaceLabel(lat, lng),
                    source: 'gps',
                });
            },
            () => done({ ...DEFAULT_LOCATION, source: 'default' }),
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
        );
    });
}

/** Coarse region label — Japan cities when near, else lat/lng */
function approxPlaceLabel(lat, lng) {
    // Japan bounding box-ish
    if (lat > 24 && lat < 46 && lng > 123 && lng < 146) {
        if (Math.hypot(lat - 35.68, lng - 139.65) < 0.8) return 'Tokyo';
        if (Math.hypot(lat - 34.69, lng - 135.50) < 0.6) return 'Osaka';
        if (Math.hypot(lat - 35.01, lng - 135.77) < 0.5) return 'Kyoto';
        if (Math.hypot(lat - 43.06, lng - 141.35) < 0.8) return 'Sapporo';
        if (Math.hypot(lat - 33.59, lng - 130.40) < 0.6) return 'Fukuoka';
        return 'Japan';
    }
    return `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
}
