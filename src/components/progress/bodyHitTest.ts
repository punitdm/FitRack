import type { BodyPart, Slug } from 'react-native-body-highlighter';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFemaleFront } from 'react-native-body-highlighter/dist/assets/bodyFemaleFront';
import { bodyFemaleBack } from 'react-native-body-highlighter/dist/assets/bodyFemaleBack';

/**
 * Reliable tap → muscle lookup for the anatomy figure.
 *
 * Each muscle's SVG paths are flattened into polygons once. A tap is mapped
 * into the figure's viewBox and tested against them; if it lands just outside
 * every muscle, the nearest one within a small radius wins. This avoids the
 * hit-and-miss of tapping thin SVG shapes directly inside scroll views.
 */

type Pt = [number, number];
interface Region {
  slug: Slug;
  polys: Pt[][];
  area: number;
}

/** The figure's viewBox per gender/side (matches the library's wrappers). */
const VIEWBOX = {
  male: { front: [0, 0, 724, 1448], back: [724, 0, 724, 1448] },
  female: { front: [-50, -40, 734, 1538], back: [756, 0, 774, 1448] },
} as const;

const SKIP = new Set(['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles']);

/** Flatten an SVG path into polygon(s), sampling curves. Handles all path commands. */
export function flatten(d: string): Pt[][] {
  const polys: Pt[][] = [];
  let poly: Pt[] = [];
  let i = 0; // cursor into d
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lcx = 0; // last control point (for S/T)
  let lcy = 0;
  // Character scanner: SVG allows "1.5.5" (two numbers) and squashed arc flags ("01").
  const skip = () => {
    while (i < d.length && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\t')) i++;
  };
  const isNum = () => {
    skip();
    return i < d.length && /[-+.\d]/.test(d[i]);
  };
  const num = () => {
    skip();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/i.exec(d.slice(i, i + 32));
    if (!m) {
      i++;
      return NaN;
    }
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => {
    skip();
    return d[i++] === '1' ? 1 : 0;
  };
  const push = (px: number, py: number) => poly.push([px, py]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    for (let t = 0.2; t <= 1.0001; t += 0.2) {
      const u = 1 - t;
      push(
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey
      );
    }
  };
  const quad = (x1: number, y1: number, ex: number, ey: number) => {
    for (let t = 0.25; t <= 1.0001; t += 0.25) {
      const u = 1 - t;
      push(u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey);
    }
  };

  for (skip(); i < d.length; skip()) {
    if (!isNum()) cmd = d[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        if (poly.length > 2) polys.push(poly);
        poly = [];
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        push(x, y);
        cmd = rel ? 'l' : 'L'; // extra pairs are line-tos
        lcx = x;
        lcy = y;
        break;
      }
      case 'L':
        x = ox + num();
        y = oy + num();
        push(x, y);
        lcx = x;
        lcy = y;
        break;
      case 'H':
        x = ox + num();
        push(x, y);
        lcx = x;
        lcy = y;
        break;
      case 'V':
        y = oy + num();
        push(x, y);
        lcx = x;
        lcy = y;
        break;
      case 'C': {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x1, y1, x2, y2, ex, ey);
        lcx = x2;
        lcy = y2;
        x = ex;
        y = ey;
        break;
      }
      case 'S': {
        const x1 = 2 * x - lcx, y1 = 2 * y - lcy, x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x1, y1, x2, y2, ex, ey);
        lcx = x2;
        lcy = y2;
        x = ex;
        y = ey;
        break;
      }
      case 'Q': {
        const x1 = ox + num(), y1 = oy + num(), ex = ox + num(), ey = oy + num();
        quad(x1, y1, ex, ey);
        lcx = x1;
        lcy = y1;
        x = ex;
        y = ey;
        break;
      }
      case 'T': {
        const x1 = 2 * x - lcx, y1 = 2 * y - lcy, ex = ox + num(), ey = oy + num();
        quad(x1, y1, ex, ey);
        lcx = x1;
        lcy = y1;
        x = ex;
        y = ey;
        break;
      }
      case 'A': {
        num(); num(); num(); flag(); flag(); // rx ry rotation large-arc sweep (arc approximated)
        const ex = ox + num(), ey = oy + num();
        push((x + ex) / 2, (y + ey) / 2);
        x = ex;
        y = ey;
        push(x, y);
        lcx = x;
        lcy = y;
        break;
      }
      case 'Z':
        x = sx;
        y = sy;
        if (poly.length > 2) polys.push(poly);
        poly = [];
        lcx = x;
        lcy = y;
        break;
      default:
        i++; // unknown token: skip
    }
  }
  if (poly.length > 2) polys.push(poly);
  return polys;
}

function polyArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return Math.abs(a / 2);
}

function inside(p: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distToSegment(x: number, y: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function build(parts: BodyPart[]): Region[] {
  const out: Region[] = [];
  for (const part of parts) {
    if (!part.slug || SKIP.has(part.slug)) continue;
    const paths = [...(part.path?.common ?? []), ...(part.path?.left ?? []), ...(part.path?.right ?? [])];
    const polys = paths.flatMap(flatten);
    if (polys.length) out.push({ slug: part.slug, polys, area: polys.reduce((a, p) => a + polyArea(p), 0) });
  }
  return out;
}

const cache = new Map<string, Region[]>();
function regions(gender: 'male' | 'female', side: 'front' | 'back'): Region[] {
  const key = `${gender}-${side}`;
  let r = cache.get(key);
  if (!r) {
    const src = gender === 'female' ? (side === 'front' ? bodyFemaleFront : bodyFemaleBack) : side === 'front' ? bodyFront : bodyBack;
    r = build(src);
    cache.set(key, r);
  }
  return r;
}

/**
 * Which muscle a tap at (px, py), in points within a figure of size (w, h),
 * landed on. Returns null if it's nowhere near a muscle.
 */
export function hitTestBody(
  gender: 'male' | 'female',
  side: 'front' | 'back',
  px: number,
  py: number,
  w: number,
  h: number,
  tolerancePx = 10
): Slug | null {
  const [vx, vy, vw, vh] = VIEWBOX[gender][side];
  const s = Math.min(w / vw, h / vh); // preserveAspectRatio: xMidYMid meet
  const x = vx + (px - (w - vw * s) / 2) / s;
  const y = vy + (py - (h - vh * s) / 2) / s;
  const rs = regions(gender, side);

  // 1) Direct hit: the smallest muscle containing the point (so small ones on top win).
  let best: Region | null = null;
  for (const r of rs) {
    if (r.polys.some((p) => inside(p, x, y)) && (!best || r.area < best.area)) best = r;
  }
  if (best) return best.slug;

  // 2) Near miss: the closest muscle edge within the tolerance.
  const tol = tolerancePx / s;
  let nearest: Slug | null = null;
  let nd = tol;
  for (const r of rs) {
    for (const p of r.polys) {
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const d = distToSegment(x, y, p[j], p[i]);
        if (d < nd) {
          nd = d;
          nearest = r.slug;
        }
      }
    }
  }
  return nearest;
}

/** Warm the polygon cache (call once so the first tap is instant). */
export function prepareBodyHitTest(gender: 'male' | 'female'): void {
  regions(gender, 'front');
  regions(gender, 'back');
}
