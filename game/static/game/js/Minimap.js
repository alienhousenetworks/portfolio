/**
 * Minimap.js — game-style city map renderer
 * Draws named roads, Bengali/Japanese districts, POIs, player.
 */
import { WORLD } from './config.js';
import { DISTRICT_DEFS, POI_MAP_COLORS, MAP_ROADS } from './Districts.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts
 * @param {{x:number,z:number,rotationY?:number}} opts.player
 * @param {Array} opts.pois
 * @param {number} [opts.worldSpan] world units shown on map width
 */
export function drawMinimap(ctx, { player, pois = [], worldSpan = 520 }) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const sc = w / worldSpan;
    const cx = w / 2;
    const cy = h / 2;
    const hx = WORLD.cityHalfX ?? 200;
    const hz = WORLD.cityHalfZ ?? 175;

    // ── Background parchment / game card ──────────────────────────────
    // Outer border frame
    ctx.fillStyle = '#2a3540';
    ctx.fillRect(0, 0, w, h);

    // Inner map field (soft grass outside)
    const pad = 4;
    ctx.fillStyle = '#7cb86a';
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 8);
    ctx.fill();

    // Soft vignette edge
    const vignette = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(20,40,30,0.18)');
    ctx.fillStyle = vignette;
    ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);

    // ── City concrete slab ────────────────────────────────────────────
    const slabX = cx - hx * sc;
    const slabY = cy - hz * sc;
    const slabW = hx * 2 * sc;
    const slabH = hz * 2 * sc;
    ctx.fillStyle = '#b0aca4';
    roundRect(ctx, slabX, slabY, slabW, slabH, 4);
    ctx.fill();
    // Subtle inner border
    ctx.strokeStyle = 'rgba(30,42,56,0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, slabX, slabY, slabW, slabH, 4);
    ctx.stroke();

    // ── River ─────────────────────────────────────────────────────────
    const riverX = cx + (WORLD.riverX ?? -230) * sc;
    const riverW = Math.max(6, (WORLD.riverWidth ?? 28) * sc);
    ctx.fillStyle = '#5eb8d0';
    ctx.fillRect(riverX - riverW / 2, pad, riverW, h - pad * 2);
    // Water shimmer line
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(riverX, pad);
    ctx.lineTo(riverX, h - pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Roads (dark asphalt) + names ──────────────────────────────────
    MAP_ROADS.forEach(road => {
        ctx.fillStyle = road.color || '#4a4e54';
        if (road.axis === 'ns') {
            const rw = Math.max(2.5, road.w * sc);
            const x0 = cx + road.x * sc - rw / 2;
            const y0 = cy + road.z1 * sc;
            const rh = (road.z2 - road.z1) * sc;
            ctx.fillRect(x0, y0, rw, rh);
            // Sidewalk edges (light)
            if (road.showWalk) {
                ctx.fillStyle = '#d0ccc4';
                const ww = Math.max(1, 1.4 * sc);
                ctx.fillRect(x0 - ww, y0, ww, rh);
                ctx.fillRect(x0 + rw, y0, ww, rh);
                ctx.fillStyle = road.color || '#4a4e54';
            }
        } else {
            const rh = Math.max(2.5, road.w * sc);
            const x0 = cx + road.x1 * sc;
            const y0 = cy + road.z * sc - rh / 2;
            const rw = (road.x2 - road.x1) * sc;
            ctx.fillRect(x0, y0, rw, rh);
            if (road.showWalk) {
                ctx.fillStyle = '#d0ccc4';
                const ww = Math.max(1, 1.4 * sc);
                ctx.fillRect(x0, y0 - ww, rw, ww);
                ctx.fillRect(x0, y0 + rh, rw, ww);
                ctx.fillStyle = road.color || '#4a4e54';
            }
        }
    });

    // ── Central plaza ─────────────────────────────────────────────────
    ctx.fillStyle = '#d4d0c8';
    ctx.beginPath();
    ctx.arc(cx, cy, 12 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78b060';
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5 * sc, 0, Math.PI * 2);
    ctx.fill();

    // ── District / colony fills ───────────────────────────────────────
    Object.values(DISTRICT_DEFS).forEach(d => {
        if (d.id === 'downtown') return;
        if (d.hideOnMap) return;
        const dx = cx + d.x * sc;
        const dy = cy + d.z * sc;
        const r = Math.max(8, d.radius * sc * 0.85);

        // Soft fill
        ctx.fillStyle = hexAlpha(d.color, 0.22);
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = hexAlpha(d.color, 0.75);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center pin
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,42,56,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // ── Labels (roads + districts) ────────────────────────────────────
    // Road names first (smaller, along roads)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    MAP_ROADS.forEach(road => {
        if (!road.mapLabel) return;
        const lx = cx + (road.labelX ?? road.x ?? 0) * sc;
        const ly = cy + (road.labelZ ?? road.z ?? 0) * sc;
        drawLabel(ctx, road.mapLabel, lx, ly, {
            font: `bold ${Math.max(7, 7.5 * sc)}px Nunito, sans-serif`,
            fill: '#f8f4ec',
            stroke: 'rgba(30,42,56,0.85)',
            strokeWidth: 2.5,
        });
        if (road.mapSub) {
            drawLabel(ctx, road.mapSub, lx, ly + 9, {
                font: `${Math.max(6, 6.2 * sc)}px Nunito, sans-serif`,
                fill: 'rgba(248,244,236,0.9)',
                stroke: 'rgba(30,42,56,0.7)',
                strokeWidth: 2,
            });
        }
    });

    // District labels
    Object.values(DISTRICT_DEFS).forEach(d => {
        if (d.id === 'downtown' || d.hideOnMap) return;
        const dx = cx + d.x * sc;
        const dy = cy + d.z * sc + (d.mapLabelY ?? 0);
        const main = d.mapLabel || d.shortLabel || d.label;
        drawLabel(ctx, main, dx, dy - 6, {
            font: `bold ${Math.max(7, 7.8 * sc)}px Nunito, sans-serif`,
            fill: '#1e2a38',
            stroke: 'rgba(255,255,255,0.92)',
            strokeWidth: 3,
        });
        if (d.mapSub) {
            drawLabel(ctx, d.mapSub, dx, dy + 5, {
                font: `${Math.max(6, 6.5 * sc)}px Nunito, sans-serif`,
                fill: d.color,
                stroke: 'rgba(255,255,255,0.9)',
                strokeWidth: 2.5,
            });
        }
    });

    // ── POI markers ───────────────────────────────────────────────────
    pois.forEach(item => {
        if (!item?.position) return;
        const mx = cx + item.position.x * sc;
        const my = cy + item.position.z * sc;
        if (mx < 8 || mx > w - 8 || my < 8 || my > h - 8) return;

        const col = POI_MAP_COLORS[item.type] || '#4a8';
        const r = item.type === 'hq' ? 5.5 : item.type === 'explore' ? 4.5 : 3.2;

        // Glow
        ctx.fillStyle = hexAlpha(col, 0.35);
        ctx.beginPath();
        ctx.arc(mx, my, r + 3, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,42,56,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (item.mapLabel && ['hq', 'service', 'project', 'contact', 'explore'].includes(item.type)) {
            drawLabel(ctx, item.mapLabel, mx + 7, my + 1, {
                font: `bold 6.5px Nunito, sans-serif`,
                fill: '#1e2a38',
                stroke: 'rgba(255,255,255,0.85)',
                strokeWidth: 2,
                align: 'left',
            });
        }
    });

    // ── Player (arrow facing movement) ────────────────────────────────
    if (player) {
        const px = cx + player.x * sc;
        const py = cy + player.z * sc;
        const yaw = player.rotationY ?? 0;

        ctx.save();
        ctx.translate(px, py);
        // Canvas: +Y is down; avatar yaw 0 faces +Z (down on map if z increases down)
        ctx.rotate(yaw);

        // Outer ring
        ctx.fillStyle = '#1e2a38';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // Direction triangle
        ctx.fillStyle = '#f5c842';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5.5, 5);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(-5.5, 5);
        ctx.closePath();
        ctx.fill();

        // Center white
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Title ribbon ──────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(30,42,56,0.88)';
    roundRect(ctx, w / 2 - 52, 6, 104, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#f5c842';
    ctx.font = 'bold 8px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ CITY MAP ★', w / 2, 14);
}

function drawLabel(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.font = opts.font || 'bold 8px sans-serif';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    if (opts.stroke) {
        ctx.lineWidth = opts.strokeWidth || 3;
        ctx.strokeStyle = opts.stroke;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = opts.fill || '#1e2a38';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function hexAlpha(hex, a) {
    const h = (hex || '#888888').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}
