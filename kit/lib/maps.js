// Map projection at compile time: turns {region, highlight, pins, routes, labels} into SVG paths.
import fs from 'node:fs';
import path from 'node:path';
import { geoNaturalEarth1, geoMercator, geoAlbersUsa, geoPath, geoCentroid, geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import { KIT_ROOT } from './util.js';

const cache = {};
function topo(file, obj) {
  const key = file + obj;
  if (!cache[key]) {
    const t = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, 'node_modules', file), 'utf8'));
    cache[key] = feature(t, t.objects[obj]).features;
  }
  return cache[key];
}

// [west, south, east, north]
export const REGIONS = {
  world: null,
  usa: 'albers',
  'north-america': [-170, 10, -50, 72], 'south-america': [-85, -56, -33, 13], europe: [-12, 34, 42, 71],
  africa: [-20, -36, 53, 38], 'middle-east': [24, 10, 64, 42], asia: [40, -10, 150, 60], 'east-asia': [95, 15, 150, 50],
  'south-asia': [60, 5, 98, 37], 'southeast-asia': [92, -11, 142, 24], oceania: [110, -48, 180, -8], russia: [25, 40, 180, 78],
  'latin-america': [-118, -56, -33, 33], caribbean: [-88, 9, -59, 27], china: [72, 17, 136, 54], arctic: [-180, 55, 180, 85],
};

const ALIAS = { usa: 'United States of America', us: 'United States of America', america: 'United States of America', 'united states': 'United States of America', uk: 'United Kingdom', britain: 'United Kingdom', 'south korea': 'South Korea', korea: 'South Korea', 'north korea': 'North Korea', drc: 'Dem. Rep. Congo', 'czech republic': 'Czechia', uae: 'United Arab Emirates', 'ivory coast': "Côte d'Ivoire" };

export function compileMap(e, R, issues, sid) {
  const usa = e.region === 'usa';
  const detail = e.detail || (usa ? '10m' : (e.region && e.region !== 'world') || e.focus ? '50m' : '110m');
  const feats = usa ? topo('us-atlas/states-10m.json', 'states') : topo(`world-atlas/countries-${detail}.json`, 'countries');
  const byName = new Map(feats.map((f) => [String(f.properties.name).toLowerCase(), f]));
  const find = (n) => { const k = String(n).toLowerCase(); return byName.get(k) || byName.get(String(ALIAS[k] || '').toLowerCase()) || null; };

  const pad = e.padding ?? 80;
  const ext = [[pad, pad], [1920 - pad, 1080 - pad]];
  let proj;
  if (usa) proj = geoAlbersUsa().fitExtent(ext, { type: 'FeatureCollection', features: feats });
  else if (e.focus) {
    const fs_ = [].concat(e.focus).map((n) => { const f = find(n); if (!f) issues.push(`scene ${sid}: map focus "${n}" not found`); return f; }).filter(Boolean);
    const zoomOut = e.zoomOut ?? 1.8;
    proj = geoMercator().fitExtent(ext, { type: 'FeatureCollection', features: fs_ });
    const s = proj.scale(); proj.scale(s / zoomOut); const c = geoCentroid({ type: 'FeatureCollection', features: fs_ }); proj.center([0, 0]).translate([960, 540]); const p = proj(c); proj.translate([960 + (960 - p[0]), 540 + (540 - p[1])]);
  } else if (e.bounds || (e.region && REGIONS[e.region])) {
    const [w, s, ea, n] = e.bounds || REGIONS[e.region];
    proj = geoMercator().fitExtent(ext, { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[w, s], [ea, n], [w, n], [ea, s]] } });
  } else proj = geoNaturalEarth1().fitExtent([[20, 20], [1900, 1060]], { type: 'Sphere' });
  const gp = geoPath(proj).digits(1);

  e._paths = [];
  for (const f of feats) { const d = gp(f); if (!d) continue; e._paths.push({ name: String(f.properties.name).toLowerCase(), d }); }
  if (e.highlight) {
    const list = Array.isArray(e.highlight) ? e.highlight : Object.entries(e.highlight).map(([name, v]) => Object.assign({ name }, typeof v === 'string' ? { color: v } : v));
    e.highlight = list.map((h) => { const f = find(h.name); if (!f) issues.push(`scene ${sid}: map highlight "${h.name}" not found`); return Object.assign({}, h, { _name: f ? String(f.properties.name).toLowerCase() : null, at: R(h.at ?? 0, 'map.highlight.at') }); });
  }
  const pt = (p) => { if (Array.isArray(p)) return proj(p); const f = find(p); if (!f) { issues.push(`scene ${sid}: map place "${p}" not found`); return [960, 540]; } return proj(geoCentroid(f)) || gp.centroid(f); };
  const lonlat = (p) => (Array.isArray(p) ? p : (find(p) ? geoCentroid(find(p)) : [0, 0]));
  e._pins = (e.pins || []).map((p) => Object.assign({}, p, { xy: pt(p.at_ll || p.ll || p.place || [p.lon, p.lat]), at: R(p.at ?? 0, 'map.pins.at') }));
  e._labels = (e.labels || []).map((l) => Object.assign({}, l, { xy: pt(l.ll || l.place || [l.lon, l.lat]), at: R(l.at ?? 0, 'map.labels.at') }));
  e._routes = (e.routes || []).map((r) => {
    let pts = [];
    if (r.greatCircle) { const ip = geoInterpolate(lonlat(r.from), lonlat(r.to)); for (let i = 0; i <= 48; i++) { const q = proj(ip(i / 48)); if (q) pts.push(q); } }
    else { // cartoon arc in screen space — never wraps around the map edge
      const a = pt(r.from), b = pt(r.to); const bend = r.bend ?? 0.22;
      const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * bend * (b[0] >= a[0] ? 1 : -1), my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * bend;
      for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1]]); }
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return Object.assign({}, r, { d, end: pts[pts.length - 1] || [0, 0], at: R(r.at ?? 0, 'map.routes.at') });
  });
  delete e.pins; delete e.labels; delete e.routes;
}
