/**
 * @file tidechart.js
 * @description Tide Chart Module — Addu City, Maldives (0.629°N, 73.099°E)
 * Displays daily and weekly tide charts with moon phase overlay,
 * interactive hover, smooth bezier curves, and illustrated decorations.
 */

// ============================================================================
// TIDE DATA ENGINE — Harmonic model for Addu City, Maldives
// Primary tidal constituents tuned to Addu Atoll (Gan Station) observations.
// ============================================================================

const TIDE_LAT = 0.629;
const TIDE_LON = 73.099;
const TIDE_TZ  = 5; // UTC+5 (Maldives Standard Time)

// Tidal harmonic constituents for Addu City (Gan), Maldives
// Based on IHO/UHSLC data for the region.
// Format: { name, amplitude_m, speed_deg_per_hour, phase_deg }
const TIDAL_CONSTITUENTS = [
  { name: "M2",  amplitude: 0.52, speed: 28.9841042, phase: 142.3 }, // Principal lunar semidiurnal
  { name: "S2",  amplitude: 0.18, speed: 30.0000000, phase: 165.7 }, // Principal solar semidiurnal
  { name: "N2",  amplitude: 0.11, speed: 28.4397295, phase: 118.4 }, // Larger lunar elliptic
  { name: "K1",  amplitude: 0.09, speed: 15.0410686, phase:  72.1 }, // Lunar diurnal
  { name: "O1",  amplitude: 0.07, speed: 13.9430356, phase:  48.9 }, // Lunar diurnal
  { name: "M4",  amplitude: 0.03, speed: 57.9682084, phase: 210.5 }, // Shallow water overtide
  { name: "MS4", amplitude: 0.02, speed: 58.9841042, phase: 195.3 }, // Shallow water
  { name: "K2",  amplitude: 0.05, speed: 30.0821372, phase: 168.2 }, // Lunisolar semidiurnal
  { name: "P1",  amplitude: 0.03, speed: 14.9589314, phase:  69.8 }, // Solar diurnal
  { name: "MF",  amplitude: 0.02, speed:  1.0980331, phase:  22.5 }, // Lunisolar fortnightly
];

// Mean sea level above chart datum for Addu City
const MSL = 1.35; // meters

/**
 * Compute tide height (metres) at a given Date.
 * Uses epoch hours from J2000 (2000-01-01 00:00:00 UTC) as reference.
 */
function computeTideHeight(date) {
  const J2000 = Date.UTC(2000, 0, 1, 0, 0, 0);
  const hoursFromJ2000 = (date.getTime() - J2000) / 3600000;

  let height = MSL;
  for (const c of TIDAL_CONSTITUENTS) {
    const angleRad = (c.speed * hoursFromJ2000 - c.phase) * Math.PI / 180;
    height += c.amplitude * Math.cos(angleRad);
  }
  return height;
}

/**
 * Find all high/low tide events in a given time range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} resolutionMinutes - sampling resolution
 * @returns {Array<{time: Date, height: number, type: 'high'|'low'}>}
 */
function findTideExtremes(startDate, endDate, resolutionMinutes = 10) {
  const events = [];
  const step = resolutionMinutes * 60 * 1000;
  let t = startDate.getTime();
  const end = endDate.getTime();

  let prevH = computeTideHeight(new Date(t));
  let prevSlope = 0;

  while (t <= end) {
    t += step;
    const h = computeTideHeight(new Date(t));
    const slope = h - prevH;

    // Slope reversal = extremum
    if (prevSlope > 0.001 && slope < -0.001) {
      // Refine with bisection
      const refined = refineExtreme(t - step * 2, t, 'high');
      events.push({ time: new Date(refined.time), height: refined.height, type: 'high' });
    } else if (prevSlope < -0.001 && slope > 0.001) {
      const refined = refineExtreme(t - step * 2, t, 'low');
      events.push({ time: new Date(refined.time), height: refined.height, type: 'low' });
    }
    prevH = h;
    prevSlope = slope;
  }
  return events;
}

function refineExtreme(t0, t1, type) {
  let lo = t0, hi = t1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const hm = computeTideHeight(new Date(mid));
    const hm1 = computeTideHeight(new Date(mid + 60000));
    const slope = hm1 - hm;
    if (type === 'high') {
      if (slope > 0) lo = mid; else hi = mid;
    } else {
      if (slope < 0) lo = mid; else hi = mid;
    }
  }
  const t = (lo + hi) / 2;
  return { time: t, height: computeTideHeight(new Date(t)) };
}

/**
 * Generate tide curve data points for a time range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} intervalMinutes
 * @returns {Array<{time: Date, height: number, hour: number}>}
 */
function generateTideCurve(startDate, endDate, intervalMinutes = 15) {
  const points = [];
  let t = startDate.getTime();
  const end = endDate.getTime();
  while (t <= end) {
    const d = new Date(t);
    const localHour = (d.getUTCHours() + TIDE_TZ) % 24 + d.getUTCMinutes() / 60;
    points.push({ time: d, height: computeTideHeight(d), hour: localHour });
    t += intervalMinutes * 60 * 1000;
  }
  return points;
}

// ============================================================================
// MOON PHASE (re-uses the same algorithm from utilities.js moon module)
// ============================================================================

function getTideMoonPhase(date) {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const KNOWN_NEW = 2451549.755;
  const SYNODIC = 29.53058867;
  const d = (date.getTime() - J2000) / 86400000;
  const JD = d + 2451545.0;
  const age = ((JD - KNOWN_NEW) % SYNODIC + SYNODIC) % SYNODIC;
  const phase = age / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  const phases = [
    { max: 0.0334, emoji: "🌑", name: "New Moon" },
    { max: 0.25,   emoji: "🌒", name: "Waxing Crescent" },
    { max: 0.2834, emoji: "🌓", name: "First Quarter" },
    { max: 0.50,   emoji: "🌔", name: "Waxing Gibbous" },
    { max: 0.5334, emoji: "🌕", name: "Full Moon" },
    { max: 0.75,   emoji: "🌖", name: "Waning Gibbous" },
    { max: 0.7834, emoji: "🌗", name: "Last Quarter" },
    { max: 1.00,   emoji: "🌘", name: "Waning Crescent" },
  ];
  const ph = phases.find(p => phase <= p.max) || phases[phases.length - 1];
  return { phase, illumination, emoji: ph.emoji, name: ph.name, age };
}

// ============================================================================
// STATE
// ============================================================================

let _tideView    = 'daily';   // 'daily' | 'weekly'
let _tideDate    = null;      // currently displayed date (local midnight MST)
let _tideCanvas  = null;
let _tideTooltip = null;
let _tideInitialized = false;
let _tidePoints  = [];        // current rendered data points
let _tideExtremes = [];
let _tideHoverIdx = -1;
let _tideAnimRAF  = null;
let _tideLiveTimer = null;    // setInterval handle for live clock tick

// ============================================================================
// HELPERS
// ============================================================================

function tideLocalMidnight(date = new Date()) {
  // Return a Date representing local midnight (UTC+5) for the given date
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    19, 0, 0, 0  // 19:00 UTC = 00:00 MST (UTC+5)
  );
  // Adjust for local date offset
  const localDate = new Date(date.getTime() + TIDE_TZ * 3600000);
  return new Date(Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate()
  ) - TIDE_TZ * 3600000);
}

function tideFormatTime(date) {
  const local = new Date(date.getTime() + TIDE_TZ * 3600000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}

function tideFormatDateShort(date) {
  const local = new Date(date.getTime() + TIDE_TZ * 3600000);
  return local.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tideFormatDateLong(date) {
  const local = new Date(date.getTime() + TIDE_TZ * 3600000);
  return local.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function tideFormatDateWeekday(date) {
  const local = new Date(date.getTime() + TIDE_TZ * 3600000);
  return local.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function tideAddDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

// ============================================================================
// CANVAS RENDERING
// ============================================================================

const TIDE_COLORS = {
  high:         '#3b82f6',
  low:          '#60a5fa',
  gradient_top: 'rgba(59,130,246,0.85)',
  gradient_mid: 'rgba(96,165,250,0.45)',
  gradient_bot: 'rgba(186,230,253,0.08)',
  curve:        '#3b82f6',
  annotation:   '#1d4ed8',
  grid:         'rgba(148,163,184,0.18)',
  text:         '#64748b',
  hover_line:   'rgba(99,102,241,0.7)',
  hover_dot:    '#6366f1',
  sun:          '#fbbf24',
  night:        'rgba(15,23,42,0.28)',
  wave_fill:    'rgba(186,230,253,0.18)',
};

/**
 * Main render function — draws the full tide chart onto canvas.
 */
function renderTideCanvas() {
  const canvas = _tideCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Hi-DPI
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, W, H);

  if (!_tidePoints.length) return;

  // Layout margins
  const ML = 58, MR = 24, MT = 52, MB = 56;
  const cW = W - ML - MR;
  const cH = H - MT - MB;

  // Data ranges
  const heights = _tidePoints.map(p => p.height);
  const minH = Math.min(...heights) - 0.15;
  const maxH = Math.max(...heights) + 0.15;
  const hRange = maxH - minH || 1;

  // Time ranges
  const times  = _tidePoints.map(p => p.time.getTime());
  const minT   = times[0];
  const maxT   = times[times.length - 1];
  const tRange = maxT - minT || 1;

  // Coordinate mappers
  const xOf = (t) => ML + ((t - minT) / tRange) * cW;
  const yOf = (h) => MT + cH - ((h - minH) / hRange) * cH;

  // ── Night/Day shading ─────────────────────────────────────────────────────
  drawDayNightBackground(ctx, ML, MT, cW, cH, minT, tRange, xOf);

  // ── Grid lines ────────────────────────────────────────────────────────────
  drawGrid(ctx, ML, MR, MT, MB, W, H, cW, cH, minH, maxH, hRange, minT, tRange, xOf, yOf);

  // ── Filled area under curve ───────────────────────────────────────────────
  drawTideFill(ctx, ML, MT, cW, cH, minT, tRange, xOf, yOf, MB);

  // ── Wave decorations at baseline ──────────────────────────────────────────
  drawWaveDecoration(ctx, ML, MT + cH, cW, W, H);

  // ── Tide curve ────────────────────────────────────────────────────────────
  drawTideCurve(ctx, xOf, yOf);

  // ── High/Low annotations ──────────────────────────────────────────────────
  drawAnnotations(ctx, xOf, yOf, ML, MT, cH, MB, minH, maxH, W, H);

  // ── Sun position arc ──────────────────────────────────────────────────────
  drawSunArc(ctx, ML, MT, cW, cH, minT, tRange);

  // ── Hover indicator ───────────────────────────────────────────────────────
  if (_tideHoverIdx >= 0 && _tideHoverIdx < _tidePoints.length) {
    drawHoverIndicator(ctx, _tideHoverIdx, xOf, yOf, ML, MT, cH, W, H);
  }

  // ── Live "Now" marker ─────────────────────────────────────────────────────
  drawNowMarker(ctx, xOf, yOf, ML, MT, cH, W);

  // ── Axes & labels ─────────────────────────────────────────────────────────
  drawAxes(ctx, ML, MR, MT, MB, W, H, cW, cH, minH, maxH, hRange, minT, tRange, xOf, yOf);
}

function drawDayNightBackground(ctx, ML, MT, cW, cH, minT, tRange, xOf) {
  // Shade 18:00–06:00 local time as night
  const dayMs = 86400000;
  const startLocal = new Date(minT + TIDE_TZ * 3600000);
  const startDayUTC = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate());

  for (let offset = -1; offset <= Math.ceil(tRange / dayMs) + 1; offset++) {
    const dayStart = startDayUTC + offset * dayMs;
    // Sunset: ~18:00 local = 13:00 UTC
    const sunsetUTC  = dayStart + (18 - TIDE_TZ) * 3600000;
    // Sunrise: ~06:00 local = 01:00 UTC
    const sunriseUTC = dayStart + dayMs + (6 - TIDE_TZ) * 3600000;

    const x1 = xOf(Math.max(sunsetUTC, minT));
    const x2 = xOf(Math.min(sunriseUTC, minT + tRange));
    if (x2 > x1 && x2 > ML && x1 < ML + cW) {
      const ng = ctx.createLinearGradient(0, MT, 0, MT + cH);
      ng.addColorStop(0, 'rgba(15,23,42,0.22)');
      ng.addColorStop(1, 'rgba(30,41,59,0.08)');
      ctx.fillStyle = ng;
      ctx.fillRect(Math.max(x1, ML), MT, Math.min(x2, ML + cW) - Math.max(x1, ML), cH);
    }
  }
}

function drawGrid(ctx, ML, MR, MT, MB, W, H, cW, cH, minH, maxH, hRange, minT, tRange, xOf, yOf) {
  ctx.save();
  ctx.strokeStyle = TIDE_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Horizontal: every 0.5m
  const step = hRange <= 2 ? 0.25 : 0.5;
  for (let h = Math.ceil(minH / step) * step; h <= maxH; h += step) {
    const y = yOf(h);
    ctx.beginPath();
    ctx.moveTo(ML, y);
    ctx.lineTo(ML + cW, y);
    ctx.stroke();
  }

  // Vertical: every 3 hours (daily) or every day (weekly)
  const isWeekly = _tideView === 'weekly';
  const vStep = isWeekly ? 86400000 : 3 * 3600000;
  const dayMs = 86400000;
  const startLocal = new Date(minT + TIDE_TZ * 3600000);
  let alignT;
  if (isWeekly) {
    alignT = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate())
             - TIDE_TZ * 3600000;
  } else {
    // align to nearest 3h
    alignT = Math.floor(minT / vStep) * vStep;
  }

  for (let t = alignT; t <= minT + tRange; t += vStep) {
    if (t < minT) continue;
    const x = xOf(t);
    ctx.beginPath();
    ctx.moveTo(x, MT);
    ctx.lineTo(x, MT + cH);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawTideFill(ctx, ML, MT, cW, cH, minT, tRange, xOf, yOf, MB) {
  const pts = _tidePoints;
  if (!pts.length) return;

  // Build path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].time.getTime()), yOf(pts[0].height));

  // Smooth bezier through points
  for (let i = 1; i < pts.length; i++) {
    const x0 = xOf(pts[i-1].time.getTime());
    const y0 = yOf(pts[i-1].height);
    const x1 = xOf(pts[i].time.getTime());
    const y1 = yOf(pts[i].height);
    const cpx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
  }

  const lastX = xOf(pts[pts.length-1].time.getTime());
  const baseY = MT + cH;
  ctx.lineTo(lastX, baseY);
  ctx.lineTo(xOf(pts[0].time.getTime()), baseY);
  ctx.closePath();

  // Gradient fill: rising tide = deep blue, overall ocean feel
  const grad = ctx.createLinearGradient(0, MT, 0, MT + cH);
  grad.addColorStop(0,   TIDE_COLORS.gradient_top);
  grad.addColorStop(0.5, TIDE_COLORS.gradient_mid);
  grad.addColorStop(1,   TIDE_COLORS.gradient_bot);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawWaveDecoration(ctx, ML, baseY, cW, W, H) {
  // Subtle animated-style wave at the baseline
  ctx.save();
  ctx.beginPath();
  const waveH = 6;
  ctx.moveTo(ML, baseY);
  const waveCount = Math.ceil(cW / 28);
  for (let i = 0; i <= waveCount; i++) {
    const wx = ML + (i / waveCount) * cW;
    const wy = baseY + Math.sin(i * 2.3) * waveH;
    i === 0 ? ctx.moveTo(wx, wy) : ctx.quadraticCurveTo(wx - 14, baseY + Math.sin((i - 0.5) * 2.3) * waveH * 1.4, wx, wy);
  }
  ctx.lineTo(ML + cW, baseY + 20);
  ctx.lineTo(ML, baseY + 20);
  ctx.closePath();
  ctx.fillStyle = TIDE_COLORS.wave_fill;
  ctx.fill();
  ctx.restore();
}

function drawTideCurve(ctx, xOf, yOf) {
  const pts = _tidePoints;
  if (!pts.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].time.getTime()), yOf(pts[0].height));

  for (let i = 1; i < pts.length; i++) {
    const x0 = xOf(pts[i-1].time.getTime());
    const y0 = yOf(pts[i-1].height);
    const x1 = xOf(pts[i].time.getTime());
    const y1 = yOf(pts[i].height);
    const cpx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
  }

  ctx.strokeStyle = TIDE_COLORS.curve;
  ctx.lineWidth = 2.5;
  ctx.lineJoin  = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawAnnotations(ctx, xOf, yOf, ML, MT, cH, MB, minH, maxH, W, H) {
  const extremes = _tideExtremes;
  if (!extremes.length) return;

  const minT = _tidePoints[0].time.getTime();
  const maxT = _tidePoints[_tidePoints.length - 1].time.getTime();

  extremes.forEach(ev => {
    const t = ev.time.getTime();
    if (t < minT || t > maxT) return;

    const x = xOf(t);
    const y = yOf(ev.height);
    const isHigh = ev.type === 'high';

    // Dot
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = isHigh ? '#1d4ed8' : '#7dd3fc';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Label box
    const labelY = isHigh ? y - 38 : y + 14;
    const label  = `${isHigh ? '▲' : '▼'} ${ev.height.toFixed(2)}m`;
    const timeLabel = tideFormatTime(ev.time);

    ctx.save();
    ctx.font = 'bold 11px system-ui, sans-serif';
    const tw = ctx.measureText(label).width;
    const bx = Math.max(ML + 2, Math.min(x - tw/2 - 6, W - tw - 18));
    const by = labelY;

    // Pill background
    ctx.beginPath();
    ctx.roundRect(bx, by, tw + 12, 20, 6);
    ctx.fillStyle   = isHigh ? 'rgba(29,78,216,0.92)' : 'rgba(125,211,252,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur  = 6;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle  = isHigh ? '#fff' : '#0c4a6e';
    ctx.fillText(label, bx + 6, by + 14);
    ctx.restore();

    // Time below dot
    ctx.save();
    ctx.font      = '10px system-ui, sans-serif';
    ctx.fillStyle = TIDE_COLORS.text;
    ctx.textAlign = 'center';
    const timeY = isHigh ? y - 12 : y + 36;
    ctx.fillText(timeLabel, x, timeY);
    ctx.restore();

    // Dotted line to baseline annotation
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = isHigh ? 'rgba(29,78,216,0.3)' : 'rgba(125,211,252,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, isHigh ? y - 6 : y + 6);
    ctx.lineTo(x, isHigh ? y - 14 : y + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });
}

function drawSunArc(ctx, ML, MT, cW, cH, minT, tRange) {
  // Draw a stylised sun arc across the top — sunrise ~06:00, sunset ~18:00 local
  const isWeekly = _tideView === 'weekly';
  if (isWeekly) return; // skip on weekly view — too cluttered

  const startLocal = new Date(minT + TIDE_TZ * 3600000);
  const dayStartLocal = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate());
  const sunriseT = dayStartLocal + (6 - TIDE_TZ) * 3600000 - TIDE_TZ * 3600000 + TIDE_TZ * 3600000;
  // Simpler: sunrise = today 06:00 local time
  const riseT   = new Date(minT + TIDE_TZ * 3600000);
  riseT.setUTCHours(1, 0, 0, 0); // 06:00 local = 01:00 UTC
  const setT    = new Date(riseT.getTime() + 12 * 3600000); // 18:00 local

  const xRise = ML + ((riseT.getTime() - minT) / tRange) * cW;
  const xSet  = ML + ((setT.getTime()  - minT) / tRange) * cW;
  const midX  = (xRise + xSet) / 2;
  const arcY  = MT - 20; // above chart area
  const arcRadius = (xSet - xRise) / 2;

  if (arcRadius < 10) return;

  // Arc path
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = 'rgba(251,191,36,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(midX, MT + cH / 2, arcRadius, -Math.PI, 0, false);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sun icon
  const now = new Date();
  const localH = (now.getUTCHours() + TIDE_TZ) % 24 + now.getUTCMinutes() / 60;
  if (localH >= 6 && localH <= 18) {
    const progress = (localH - 6) / 12; // 0 at rise, 1 at set
    const angle = Math.PI * (1 - progress);
    const sx = midX + arcRadius * Math.cos(angle);
    const sy = (MT + cH / 2) - arcRadius * Math.abs(Math.sin(angle));

    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    const sunGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.6, '#fbbf24');
    sunGrad.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Rays
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = 1.2;
    for (let r = 0; r < 8; r++) {
      const a = r * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sx + 9 * Math.cos(a), sy + 9 * Math.sin(a));
      ctx.lineTo(sx + 12 * Math.cos(a), sy + 12 * Math.sin(a));
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHoverIndicator(ctx, idx, xOf, yOf, ML, MT, cH, W, H) {
  const pt = _tidePoints[idx];
  if (!pt) return;

  const x = xOf(pt.time.getTime());
  const y = yOf(pt.height);

  // Vertical line
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = TIDE_COLORS.hover_line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, MT);
  ctx.lineTo(x, MT + cH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Glow dot
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99,102,241,0.2)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = TIDE_COLORS.hover_dot;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawAxes(ctx, ML, MR, MT, MB, W, H, cW, cH, minH, maxH, hRange, minT, tRange, xOf, yOf) {
  ctx.save();

  // Y-axis label: Height (m)
  ctx.save();
  ctx.translate(13, MT + cH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font      = '11px system-ui, sans-serif';
  ctx.fillStyle = TIDE_COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('Height (m)', 0, 0);
  ctx.restore();

  // Y-axis ticks
  const step = hRange <= 2 ? 0.25 : 0.5;
  ctx.font      = '11px system-ui, sans-serif';
  ctx.fillStyle = TIDE_COLORS.text;
  ctx.textAlign = 'right';
  for (let h = Math.ceil(minH / step) * step; h <= maxH; h += step) {
    const y = yOf(h);
    ctx.fillText(h.toFixed(2), ML - 6, y + 4);
    ctx.beginPath();
    ctx.moveTo(ML - 3, y);
    ctx.lineTo(ML, y);
    ctx.strokeStyle = TIDE_COLORS.text;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // X-axis ticks & labels
  const isWeekly = _tideView === 'weekly';
  ctx.textAlign = 'center';
  ctx.font      = '11px system-ui, sans-serif';
  ctx.fillStyle = TIDE_COLORS.text;

  if (isWeekly) {
    // One label per day
    const dayMs = 86400000;
    const startLocal = new Date(minT + TIDE_TZ * 3600000);
    let t = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate())
            - TIDE_TZ * 3600000 + dayMs / 2; // midday
    while (t <= minT + tRange) {
      if (t >= minT) {
        const x = xOf(t);
        ctx.fillText(tideFormatDateWeekday(new Date(t)), x, MT + cH + 18);
        ctx.beginPath();
        ctx.moveTo(x, MT + cH);
        ctx.lineTo(x, MT + cH + 4);
        ctx.strokeStyle = TIDE_COLORS.text;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      t += dayMs;
    }
  } else {
    // Labels every 3 hours
    const h3 = 3 * 3600000;
    let t = Math.ceil(minT / h3) * h3;
    while (t <= minT + tRange) {
      const x = xOf(t);
      const localDate = new Date(t + TIDE_TZ * 3600000);
      const hr = localDate.getUTCHours();
      const ampm = hr < 12 ? 'AM' : 'PM';
      const hh = hr % 12 || 12;
      ctx.fillText(`${hh}${ampm}`, x, MT + cH + 18);
      ctx.beginPath();
      ctx.moveTo(x, MT + cH);
      ctx.lineTo(x, MT + cH + 4);
      ctx.strokeStyle = TIDE_COLORS.text;
      ctx.lineWidth = 1;
      ctx.stroke();
      t += h3;
    }
  }

  // Axis lines
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ML, MT);
  ctx.lineTo(ML, MT + cH);
  ctx.lineTo(ML + cW, MT + cH);
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// TOOLTIP UPDATE
// ============================================================================

function updateTideTooltip(idx) {
  if (!_tideTooltip) return;
  if (idx < 0 || idx >= _tidePoints.length) {
    _tideTooltip.style.display = 'none';
    return;
  }
  const pt = _tidePoints[idx];
  const canvas = _tideCanvas;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  const heights = _tidePoints.map(p => p.height);
  const minH  = Math.min(...heights) - 0.15;
  const maxH  = Math.max(...heights) + 0.15;
  const ML = 58, MR = 24, MT = 52, MB = 56;
  const cH = H - MT - MB;
  const cW = W - ML - MR;
  const tRange = _tidePoints[_tidePoints.length-1].time.getTime() - _tidePoints[0].time.getTime() || 1;
  const minT = _tidePoints[0].time.getTime();
  const xOf = (t) => ML + ((t - minT) / tRange) * cW;

  const x = xOf(pt.time.getTime());
  const tooltip = _tideTooltip;
  tooltip.style.display = 'block';

  // Determine nearest extreme
  let tideLabel = '';
  const nearest = _tideExtremes.reduce((best, ev) => {
    const d = Math.abs(ev.time.getTime() - pt.time.getTime());
    return d < best.d ? { d, ev } : best;
  }, { d: Infinity, ev: null });
  if (nearest.ev && nearest.d < 2 * 3600000) {
    tideLabel = nearest.ev.type === 'high' ? ' 🔼 High Tide' : ' 🔽 Low Tide';
  }

  const moon = getTideMoonPhase(pt.time);

  tooltip.innerHTML = `
    <div class="tide-tooltip-time">${tideFormatTime(pt.time)}</div>
    <div class="tide-tooltip-height">${pt.height.toFixed(3)} m${tideLabel}</div>
    <div class="tide-tooltip-moon">${moon.emoji} ${moon.name}</div>
  `;

  // Position tooltip
  const rect = canvas.getBoundingClientRect();
  const tw = tooltip.offsetWidth || 150;
  const th = tooltip.offsetHeight || 70;
  let tx = x + rect.left - tw / 2;
  let ty = rect.top + MT - th - 10;
  tx = Math.max(rect.left + 4, Math.min(tx, rect.right - tw - 4));
  ty = Math.max(rect.top + 4, ty);
  tooltip.style.left = tx + 'px';
  tooltip.style.top  = (ty + window.scrollY) + 'px';
}

// ============================================================================
// MOUSE / TOUCH INTERACTION
// ============================================================================

// ============================================================================
// LIVE "NOW" MARKER
// ============================================================================

/**
 * Draw the live current-time marker on the tide chart.
 * Shows a pulsing vertical line + annotated bubble with current height,
 * rising/falling arrow, and the live local time.
 */
function drawNowMarker(ctx, xOf, yOf, ML, MT, cH, W) {
  const now = new Date();
  const nowT = now.getTime();
  const minT = _tidePoints[0].time.getTime();
  const maxT = _tidePoints[_tidePoints.length - 1].time.getTime();

  // Only draw if "now" falls within the visible time range
  if (nowT < minT || nowT > maxT) return;

  const nowH  = computeTideHeight(now);
  const x     = xOf(nowT);
  const y     = yOf(nowH);

  // Determine rising or falling by comparing to 2 min ahead
  const futureH = computeTideHeight(new Date(nowT + 2 * 60000));
  const isRising = futureH > nowH;

  // ── Vertical "now" line — solid vivid line ────────────────────────────────
  ctx.save();
  const lineGrad = ctx.createLinearGradient(0, MT, 0, MT + cH);
  lineGrad.addColorStop(0,   'rgba(239,68,68,0.0)');
  lineGrad.addColorStop(0.15,'rgba(239,68,68,0.7)');
  lineGrad.addColorStop(0.5, 'rgba(239,68,68,0.9)');
  lineGrad.addColorStop(0.85,'rgba(239,68,68,0.7)');
  lineGrad.addColorStop(1,   'rgba(239,68,68,0.0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, MT);
  ctx.lineTo(x, MT + cH);
  ctx.stroke();
  ctx.restore();

  // ── Pulsing glow ring around the dot ────────────────────────────────────
  // Outer soft glow
  ctx.save();
  const glowR = ctx.createRadialGradient(x, y, 2, x, y, 18);
  glowR.addColorStop(0,   'rgba(239,68,68,0.35)');
  glowR.addColorStop(0.5, 'rgba(239,68,68,0.12)');
  glowR.addColorStop(1,   'rgba(239,68,68,0)');
  ctx.fillStyle = glowR;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dot with white ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle   = '#ef4444';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = 'rgba(239,68,68,0.6)';
  ctx.shadowBlur  = 10;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

}

// ── Live status bar below the canvas ────────────────────────────────────────

function updateLiveStatusBar() {
  const el = document.getElementById('tide-live-status');
  if (!el) return;

  const now = new Date();
  // Only show status when viewing today's data
  const todayMidnight = tideLocalMidnight(new Date());
  const viewMidnight  = tideLocalMidnight(_tideDate);
  const isToday = todayMidnight.getTime() === viewMidnight.getTime();

  if (!isToday || _tideView === 'weekly') {
    el.style.display = 'none';
    return;
  }

  const nowH    = computeTideHeight(now);
  const futureH = computeTideHeight(new Date(now.getTime() + 2 * 60000));
  const isRising = futureH > nowH;

  // Find next extreme
  const nextEv = _tideExtremes.find(ev => ev.time > now);

  // Minutes until next event
  let etaStr = '';
  if (nextEv) {
    const diffMs  = nextEv.time.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    etaStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  el.style.display = 'flex';
  el.innerHTML = `
    <span class="tide-live-dot"></span>
    <span class="tide-live-label">LIVE</span>
    <span class="tide-live-time">${tideFormatTime(now)}</span>
    <span class="tide-live-sep">·</span>
    <span class="tide-live-height">${nowH.toFixed(2)} m</span>
    <span class="tide-live-trend ${isRising ? 'rising' : 'falling'}">${isRising ? '▲ Rising' : '▼ Falling'}</span>
    ${nextEv ? `
    <span class="tide-live-sep">·</span>
    <span class="tide-live-next">
      Next ${nextEv.type === 'high' ? 'High' : 'Low'}: ${tideFormatTime(nextEv.time)} (${nextEv.height.toFixed(2)} m) — in ${etaStr}
    </span>` : ''}
  `;
}

function tideCanvasMouseMove(e) {
  if (!_tideCanvas || !_tidePoints.length) return;
  const rect = _tideCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const mx = clientX - rect.left;

  const W = _tideCanvas.clientWidth;
  const ML = 58, MR = 24;
  const cW = W - ML - MR;
  const minT = _tidePoints[0].time.getTime();
  const maxT = _tidePoints[_tidePoints.length-1].time.getTime();
  const tRange = maxT - minT || 1;

  if (mx < ML || mx > ML + cW) {
    _tideHoverIdx = -1;
    updateTideTooltip(-1);
    renderTideCanvas();
    return;
  }

  // Find nearest data point
  const fraction = (mx - ML) / cW;
  const targetT = minT + fraction * tRange;
  let best = -1, bestD = Infinity;
  _tidePoints.forEach((p, i) => {
    const d = Math.abs(p.time.getTime() - targetT);
    if (d < bestD) { bestD = d; best = i; }
  });

  if (best !== _tideHoverIdx) {
    _tideHoverIdx = best;
    renderTideCanvas();
    updateTideTooltip(best);
  }
}

function tideCanvasMouseLeave() {
  _tideHoverIdx = -1;
  if (_tideTooltip) _tideTooltip.style.display = 'none';
  renderTideCanvas();
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadTideData() {
  const start = tideLocalMidnight(_tideDate);
  let end;

  if (_tideView === 'weekly') {
    end = tideAddDays(start, 7);
  } else {
    end = tideAddDays(start, 1);
  }

  _tidePoints  = generateTideCurve(start, end, _tideView === 'weekly' ? 30 : 15);
  _tideExtremes = findTideExtremes(
    tideAddDays(start, -0.5),
    tideAddDays(end, 0.5)
  );
}

// ============================================================================
// INFO PANEL UPDATE
// ============================================================================

function updateTideInfoPanel() {
  const el = id => document.getElementById(id);

  // Date title
  const titleEl = el('tide-chart-title');
  if (titleEl) {
    if (_tideView === 'daily') {
      titleEl.textContent = tideFormatDateLong(_tideDate);
    } else {
      const end = tideAddDays(_tideDate, 6);
      titleEl.textContent = `${tideFormatDateShort(_tideDate)} — ${tideFormatDateShort(end)}`;
    }
  }

  // Moon phase badge
  const moon = getTideMoonPhase(_tideDate);
  const moonEl = el('tide-moon-badge');
  if (moonEl) {
    moonEl.innerHTML = `${moon.emoji} <span class="tide-moon-label">${moon.name}</span>
      <span class="tide-moon-illum">${Math.round(moon.illumination * 100)}% illuminated</span>`;
  }

  // Next high/low tides (today only)
  const now = new Date();
  const upcoming = _tideExtremes
    .filter(ev => ev.time >= now)
    .slice(0, 4);

  const nextEl = el('tide-next-events');
  if (nextEl) {
    if (!upcoming.length) {
      nextEl.innerHTML = '<span class="tide-no-events">No upcoming tides in range</span>';
    } else {
      nextEl.innerHTML = upcoming.map(ev => `
        <div class="tide-event-item tide-event-${ev.type}">
          <span class="tide-event-icon">${ev.type === 'high' ? '🔼' : '🔽'}</span>
          <div class="tide-event-info">
            <span class="tide-event-type">${ev.type === 'high' ? 'High Tide' : 'Low Tide'}</span>
            <span class="tide-event-time">${tideFormatTime(ev.time)}</span>
          </div>
          <span class="tide-event-height">${ev.height.toFixed(2)} m</span>
        </div>
      `).join('');
    }
  }

  // Today's extremes summary
  const todayStart = tideLocalMidnight(now);
  const todayEnd   = tideAddDays(todayStart, 1);
  const todayExtremes = _tideExtremes.filter(ev =>
    ev.time >= todayStart && ev.time <= todayEnd
  );

  const summaryEl = el('tide-daily-summary');
  if (summaryEl) {
    const highs = todayExtremes.filter(e => e.type === 'high');
    const lows  = todayExtremes.filter(e => e.type === 'low');
    const maxHigh = highs.length ? Math.max(...highs.map(e => e.height)) : null;
    const minLow  = lows.length  ? Math.min(...lows.map(e => e.height))  : null;

    summaryEl.innerHTML = `
      <div class="tide-summary-item">
        <span class="tide-summary-icon">🔵</span>
        <span class="tide-summary-label">Highest today</span>
        <span class="tide-summary-val">${maxHigh !== null ? maxHigh.toFixed(2) + ' m' : '—'}</span>
      </div>
      <div class="tide-summary-item">
        <span class="tide-summary-icon">⚪</span>
        <span class="tide-summary-label">Lowest today</span>
        <span class="tide-summary-val">${minLow !== null ? minLow.toFixed(2) + ' m' : '—'}</span>
      </div>
      <div class="tide-summary-item">
        <span class="tide-summary-icon">📍</span>
        <span class="tide-summary-label">Location</span>
        <span class="tide-summary-val">Addu City, Maldives</span>
      </div>
      <div class="tide-summary-item">
        <span class="tide-summary-icon">🌊</span>
        <span class="tide-summary-label">Tidal range</span>
        <span class="tide-summary-val">${maxHigh !== null && minLow !== null ? (maxHigh - minLow).toFixed(2) + ' m' : '—'}</span>
      </div>
    `;
  }
}

// ============================================================================
// NAVIGATION CONTROLS
// ============================================================================

function tideNavigate(delta) {
  if (_tideView === 'daily') {
    _tideDate = tideAddDays(_tideDate, delta);
  } else {
    _tideDate = tideAddDays(_tideDate, delta * 7);
  }
  refreshTideChart();
}

function tideGoToToday() {
  _tideDate = tideLocalMidnight();
  refreshTideChart();
}

function refreshTideChart() {
  loadTideData();
  updateTideInfoPanel();
  updateLiveStatusBar();
  renderTideCanvas();
}

// ============================================================================
// INIT
// ============================================================================

function initTideChart() {
  if (_tideInitialized) {
    // Re-visit: just re-render
    refreshTideChart();
    return;
  }
  _tideInitialized = true;
  _tideDate = tideLocalMidnight();
  _tideView = 'daily';

  // Canvas
  _tideCanvas = document.getElementById('tide-chart-canvas');
  _tideTooltip = document.getElementById('tide-tooltip');

  if (!_tideCanvas) return;

  // View toggle buttons
  const btnDaily  = document.getElementById('tide-view-daily');
  const btnWeekly = document.getElementById('tide-view-weekly');

  btnDaily?.addEventListener('click', () => {
    _tideView = 'daily';
    btnDaily.classList.add('active');
    btnWeekly.classList.remove('active');
    refreshTideChart();
  });

  btnWeekly?.addEventListener('click', () => {
    _tideView = 'weekly';
    btnWeekly.classList.add('active');
    btnDaily.classList.remove('active');
    refreshTideChart();
  });

  // Navigation
  document.getElementById('tide-prev-btn')?.addEventListener('click', () => tideNavigate(-1));
  document.getElementById('tide-next-btn')?.addEventListener('click', () => tideNavigate(+1));
  document.getElementById('tide-today-btn')?.addEventListener('click', tideGoToToday);

  // Mouse interaction
  _tideCanvas.addEventListener('mousemove',  tideCanvasMouseMove);
  _tideCanvas.addEventListener('mouseleave', tideCanvasMouseLeave);
  _tideCanvas.addEventListener('touchmove',  tideCanvasMouseMove, { passive: true });
  _tideCanvas.addEventListener('touchend',   tideCanvasMouseLeave);

  // Resize observer for responsive canvas
  const ro = new ResizeObserver(() => renderTideCanvas());
  ro.observe(_tideCanvas);

  // ── Live ticker — redraw every 30 seconds to advance the "now" marker ──
  if (_tideLiveTimer) clearInterval(_tideLiveTimer);
  _tideLiveTimer = setInterval(() => {
    // If viewing today, just redraw the canvas (now marker moves)
    renderTideCanvas();
    updateLiveStatusBar();
    // At midnight, reload data for the new day automatically
    const nowMidnight  = tideLocalMidnight(new Date());
    const viewMidnight = tideLocalMidnight(_tideDate);
    if (nowMidnight.getTime() !== viewMidnight.getTime() && _tideView === 'daily') {
      // We've crossed midnight — silently advance to today
      _tideDate = nowMidnight;
      loadTideData();
      updateTideInfoPanel();
    }
  }, 30000); // every 30 seconds

  loadTideData();
  updateTideInfoPanel();
  updateLiveStatusBar();
  renderTideCanvas();
}