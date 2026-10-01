import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  CircleDot,
  Crosshair,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  Ship,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';

type Point = { lat: number; lng: number };

type WaypointStatus = 'PENDING' | 'DETECTED' | 'ACTIVE' | 'COMPLETED';

type Waypoint = {
  id: string;
  type: string;
  confidence: number;
  area: number;
  lat: number;
  lng: number;
};

const WAYPOINTS: Waypoint[] = [
  { id: 'WP-01', type: 'Plastic Waste', confidence: 94, area: 18.5, lat: 13.0528, lng: 80.2132 },
  { id: 'WP-02', type: 'Mixed Floating Waste', confidence: 89, area: 32.7, lat: 13.0534, lng: 80.2141 },
  { id: 'WP-03', type: 'Bottle Waste', confidence: 91, area: 11.2, lat: 13.0540, lng: 80.2118 },
];

const DRONE_ROUTE: Point[] = [
  { lat: 13.0505, lng: 80.2104 },
  { lat: 13.0510, lng: 80.2122 },
  { lat: 13.0516, lng: 80.2138 },
  { lat: 13.0525, lng: 80.2148 },
  { lat: 13.0534, lng: 80.2141 },
  { lat: 13.0543, lng: 80.2144 },
  { lat: 13.0547, lng: 80.2122 },
  { lat: 13.0540, lng: 80.2108 },
  { lat: 13.0528, lng: 80.2102 },
  { lat: 13.0516, lng: 80.2108 },
  { lat: 13.0505, lng: 80.2104 },
];

const USV_BASE: Point = { lat: 13.0525, lng: 80.2125 };

const USV_ROUTES: Point[][] = [
  [
    USV_BASE,
    { lat: 13.0526, lng: 80.2128 },
    { lat: 13.0527, lng: 80.2130 },
    { lat: 13.0528, lng: 80.2132 },
  ],
  [
    { lat: 13.0528, lng: 80.2132 },
    { lat: 13.0530, lng: 80.2136 },
    { lat: 13.0532, lng: 80.2139 },
    { lat: 13.0534, lng: 80.2141 },
  ],
  [
    { lat: 13.0534, lng: 80.2141 },
    { lat: 13.0530, lng: 80.2134 },
    { lat: 13.0524, lng: 80.2126 },
    { lat: 13.0520, lng: 80.2120 },
    { lat: 13.0530, lng: 80.2119 },
    { lat: 13.0540, lng: 80.2118 },
  ],
];

const VERIFICATION_ROUTE: Point[] = [
  { lat: 13.0539, lng: 80.2117 },
  { lat: 13.0537, lng: 80.2121 },
  { lat: 13.0535, lng: 80.2125 },
  { lat: 13.0537, lng: 80.2129 },
  { lat: 13.0540, lng: 80.2124 },
];

const LAKE = {
  minLat: 13.0498,
  maxLat: 13.0552,
  minLng: 80.2097,
  maxLng: 80.2155,
};

const PHASES = [
  'SCANNING',
  'WP1_NAVIGATING',
  'WP1_COLLECTING',
  'WP2_NAVIGATING',
  'WP2_COLLECTING',
  'WP3_NAVIGATING',
  'WP3_COLLECTING',
  'VERIFYING',
  'COMPLETED',
] as const;

type Phase = (typeof PHASES)[number];

function phaseAt(progress: number): Phase {
  if (progress >= 0.965) return 'COMPLETED';
  if (progress >= 0.88) return 'VERIFYING';
  if (progress >= 0.78) return 'WP3_COLLECTING';
  if (progress >= 0.68) return 'WP3_NAVIGATING';
  if (progress >= 0.57) return 'WP2_COLLECTING';
  if (progress >= 0.47) return 'WP2_NAVIGATING';
  if (progress >= 0.34) return 'WP1_COLLECTING';
  if (progress >= 0.14) return 'WP1_NAVIGATING';
  return 'SCANNING';
}

function project(point: Point) {
  return {
    x: Math.max(3, Math.min(97, ((point.lng - LAKE.minLng) / (LAKE.maxLng - LAKE.minLng)) * 100)),
    y: Math.max(4, Math.min(96, 100 - ((point.lat - LAKE.minLat) / (LAKE.maxLat - LAKE.minLat)) * 100)),
  };
}

function interpolate(a: Point, b: Point, t: number): Point {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

function pathPosition(path: Point[], progress: number): Point {
  if (progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const scaled = progress * (path.length - 1);
  const i = Math.floor(scaled);
  return interpolate(path[i], path[i + 1], scaled - i);
}

function routePath(points: Point[]) {
  return points
    .map((p, i) => {
      const q = project(p);
      return `${i === 0 ? 'M' : 'L'} ${q.x} ${q.y}`;
    })
    .join(' ');
}

function distance(a: Point, b: Point) {
  const dy = (b.lat - a.lat) * 111000;
  const dx = (b.lng - a.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

function statusFor(index: number, progress: number): WaypointStatus {
  const detectedAt = [0.14, 0.39, 0.67][index];
  const activeRange = [
    [0.14, 0.34],
    [0.39, 0.57],
    [0.67, 0.78],
  ][index];

  if (progress < detectedAt) return 'PENDING';
  if (progress >= activeRange[1]) return 'COMPLETED';
  if (progress >= activeRange[0]) return progress >= activeRange[0] + 0.015 ? 'ACTIVE' : 'DETECTED';
  return 'PENDING';
}

function targetIndex(phase: Phase) {
  if (phase.includes('WP1')) return 0;
  if (phase.includes('WP2')) return 1;
  if (phase.includes('WP3')) return 2;
  return -1;
}

function phaseTitle(phase: Phase) {
  switch (phase) {
    case 'WP1_NAVIGATING': return 'USV NAVIGATING WP-01';
    case 'WP1_COLLECTING': return 'USV OPERATING WP-01';
    case 'WP2_NAVIGATING': return 'USV NAVIGATING WP-02';
    case 'WP2_COLLECTING': return 'USV OPERATING WP-02';
    case 'WP3_NAVIGATING': return 'USV NAVIGATING WP-03';
    case 'WP3_COLLECTING': return 'USV OPERATING WP-03';
    case 'VERIFYING': return 'CLEANUP VERIFICATION';
    case 'COMPLETED': return 'MISSION COMPLETE';
    default: return 'DRONE AERIAL SCAN';
  }
}

function statusColor(status: WaypointStatus) {
  if (status === 'COMPLETED') return '#35e69b';
  if (status === 'ACTIVE') return '#ff6b6b';
  if (status === 'DETECTED') return '#ffd166';
  return '#64748b';
}

export default function LiveMap() {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!running || progress >= 1) return;

    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.0016 * speed));
    }, 100);

    return () => window.clearInterval(timer);
  }, [running, speed, progress]);

  const phase = phaseAt(progress);

  const statuses = useMemo(
    () => WAYPOINTS.map((_, index) => statusFor(index, progress)),
    [progress],
  );

  const detectedCount = statuses.filter((s) => s !== 'PENDING').length;
  const completedCount = statuses.filter((s) => s === 'COMPLETED').length;
  const activeIndex = statuses.findIndex((s) => s === 'ACTIVE' || s === 'DETECTED');
  const currentIndex = targetIndex(phase);

  const droneProgress = Math.min(progress / 0.88, 1);
  const dronePosition = pathPosition(DRONE_ROUTE, droneProgress);

  const usvPosition = useMemo(() => {
    if (phase === 'VERIFYING' || phase === 'COMPLETED') {
      return pathPosition(VERIFICATION_ROUTE, Math.min(Math.max((progress - 0.88) / 0.12, 0), 1));
    }

    if (currentIndex < 0) return USV_BASE;

    const start = currentIndex === 0 ? 0.24 : currentIndex === 1 ? 0.47 : 0.68;
    const end = currentIndex === 0 ? 0.34 : currentIndex === 1 ? 0.57 : 0.78;
    const local = Math.min(Math.max((progress - start) / (end - start), 0), 1);

    if (phase.includes('NAVIGATING')) {
      return pathPosition(USV_ROUTES[currentIndex], local);
    }

    const route = USV_ROUTES[currentIndex];
    return pathPosition(route, 1);
  }, [phase, progress, currentIndex]);

  const droneXY = project(dronePosition);
  const usvXY = project(usvPosition);

  const currentTarget = currentIndex >= 0 ? WAYPOINTS[currentIndex] : activeIndex >= 0 ? WAYPOINTS[activeIndex] : null;
  const targetDistance = currentTarget ? distance(usvPosition, currentTarget) : 0;
  const eta = phase.includes('NAVIGATING') ? Math.max(0, Math.round(targetDistance / 1.5)) : 0;

  const droneCoverage = Math.min(100, Math.round(8 + progress * 86));
  const collectedKg = Math.min(23.55, completedCount * 7.85 + (phase.includes('COLLECTING') ? 3.1 : 0));
  const beforeArea = 51.2;
  const afterArea = phase === 'COMPLETED' ? 6.14 : Math.max(6.14, beforeArea - collectedKg / 23.55 * (beforeArea - 6.14));
  const reduction = ((beforeArea - afterArea) / beforeArea) * 100;

  const workflow = [
    { n: 1, title: 'Drone Scans', detail: 'Aerial sensing', state: phase === 'WP1_NAVIGATING' || phase === 'WP1_COLLECTING' ? 'done' : 'active' },
    { n: 2, title: 'Waypoint Identified', detail: 'AI geo-location', state: detectedCount > 0 ? 'done' : 'active' },
    { n: 3, title: 'USV Navigates', detail: currentTarget ? `Move to ${currentTarget.id}` : 'Waiting for target', state: phase.includes('NAVIGATING') ? 'active' : completedCount > 0 ? 'done' : 'idle' },
    { n: 4, title: 'USV Operates', detail: 'Collect floating waste', state: phase.includes('COLLECTING') ? 'active' : completedCount > 0 ? 'done' : 'idle' },
    { n: 5, title: 'Drone Continues', detail: `Next detection ${Math.min(3, detectedCount + 1)}/3`, state: detectedCount < 3 ? 'active' : 'done' },
    { n: 6, title: 'Verify', detail: 'Re-scan cleaned zones', state: phase === 'VERIFYING' ? 'active' : phase === 'COMPLETED' ? 'done' : 'idle' },
  ];

  const reset = () => {
    setProgress(0);
    setRunning(true);
  };

  const primaryAction = () => {
    if (progress >= 1) {
      reset();
      return;
    }
    setRunning((v) => !v);
  };

  const css = `
    .nk-live{min-height:calc(100vh - 96px);background:#050b12;color:#e8f3f7;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .nk-shell{max-width:1800px;margin:0 auto;padding:18px}
    .nk-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .nk-title h1{font-size:20px;line-height:1.2;margin:0;font-weight:750;letter-spacing:-.02em}
    .nk-title p{margin:4px 0 0;color:#6f8494;font-size:12px}
    .nk-live-grid{display:grid;grid-template-columns:270px minmax(0,1fr);gap:14px}
    .nk-rail{display:flex;flex-direction:column;gap:10px}
    .nk-card{background:linear-gradient(180deg,rgba(10,27,39,.96),rgba(6,18,27,.96));border:1px solid rgba(103,190,224,.13);border-radius:13px;box-shadow:0 12px 35px rgba(0,0,0,.18)}
    .nk-card-pad{padding:14px}
    .nk-label{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#617888}
    .nk-muted{color:#728897}
    .nk-kpi{font-size:23px;font-weight:800;letter-spacing:-.03em}
    .nk-map-wrap{overflow:hidden}
    .nk-map-head{padding:12px 15px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:12px}
    .nk-map-head strong{font-size:14px}
    .nk-map-head span{font-size:11px;color:#708694}
    .nk-controls{display:flex;gap:6px;align-items:center}
    .nk-btn{border:1px solid rgba(255,255,255,.1);background:#0b1d29;color:#bcd0da;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:700;cursor:pointer}
    .nk-btn:hover{background:#102a39}
    .nk-btn-primary{background:#19d3a2;color:#03130f;border-color:#19d3a2}
    .nk-speed{display:flex;border:1px solid rgba(255,255,255,.1);border-radius:7px;overflow:hidden}
    .nk-speed button{border:0;border-right:1px solid rgba(255,255,255,.08);background:#091722;color:#718896;padding:7px 9px;font-size:10px;cursor:pointer}
    .nk-speed button:last-child{border-right:0}
    .nk-speed .on{background:rgba(46,224,174,.14);color:#55e9bd}
    .nk-map{position:relative;min-height:600px;height:min(68vh,680px);overflow:hidden;background:
      radial-gradient(ellipse at 53% 48%,rgba(17,123,155,.42),rgba(4,35,51,.92) 58%,#03131d 100%);
    }
    .nk-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(117,194,220,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(117,194,220,.055) 1px,transparent 1px);background-size:32px 32px}
    .nk-water{position:absolute;left:7%;right:6%;top:7%;bottom:7%;border:1px solid rgba(76,204,235,.38);border-radius:46% 54% 50% 48%/48% 45% 55% 52%;background:radial-gradient(ellipse at 52% 47%,rgba(10,107,139,.42),rgba(3,44,62,.48) 58%,rgba(2,24,35,.18));box-shadow:inset 0 0 100px rgba(42,188,226,.08)}
    .nk-water2{position:absolute;left:11%;right:10%;top:12%;bottom:12%;border:1px solid rgba(100,207,229,.08);border-radius:48% 52% 45% 55%}
    .nk-lake-name{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);font-size:25px;font-weight:800;letter-spacing:.16em;color:rgba(164,228,242,.12);white-space:nowrap}
    .nk-sector{position:absolute;border:1px dashed rgba(79,198,226,.15);border-radius:15px}
    .nk-sector span{position:absolute;top:8px;left:10px;font-size:9px;letter-spacing:.1em;color:rgba(142,214,232,.46)}
    .nk-path{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .nk-drone-path{stroke:#50baff;stroke-width:.8;stroke-dasharray:2 1.4;fill:none;filter:drop-shadow(0 0 3px rgba(80,186,255,.4))}
    .nk-usv-path{stroke:#3be4a5;stroke-width:.95;stroke-dasharray:2 1.5;fill:none;filter:drop-shadow(0 0 4px rgba(59,228,165,.35))}
    .nk-device{position:absolute;transform:translate(-50%,-50%);z-index:10}
    .nk-device-core{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.25);box-shadow:0 0 28px rgba(50,220,255,.18)}
    .nk-drone-core{background:#092b42;color:#65c9ff}
    .nk-usv-core{background:#07382f;color:#55e9b5}
    .nk-device-label{position:absolute;left:31px;top:-5px;white-space:nowrap;background:rgba(3,13,21,.94);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 7px;font-size:9px;box-shadow:0 8px 18px rgba(0,0,0,.2)}
    .nk-wp{position:absolute;transform:translate(-50%,-50%);z-index:8}
    .nk-wp-ring{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;border:1px solid currentColor;background:rgba(3,15,23,.72);box-shadow:0 0 26px currentColor}
    .nk-wp-label{position:absolute;left:33px;top:-5px;white-space:nowrap;background:rgba(3,13,21,.96);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:6px 8px}
    .nk-wp-label strong{display:block;font-size:10px}
    .nk-wp-label small{display:block;font-size:8px;margin-top:2px;color:#7e93a0}
    .nk-legend{position:absolute;right:14px;top:14px;width:190px;background:rgba(4,15,24,.92);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px;z-index:12}
    .nk-legend h4{margin:0 0 9px;font-size:11px}
    .nk-legend-row{display:flex;align-items:center;gap:8px;font-size:9px;color:#8095a2;margin-top:7px}
    .nk-live-telemetry{position:absolute;left:14px;bottom:14px;width:205px;background:rgba(4,15,24,.92);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px;z-index:12}
    .nk-telemetry-row{display:flex;justify-content:space-between;font-size:9px;margin-top:7px}
    .nk-flow{padding:13px;border-top:1px solid rgba(255,255,255,.08);background:#06121b}
    .nk-flow-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
    .nk-flow-title{font-size:12px;font-weight:750}
    .nk-flow-sub{font-size:9px;color:#657b88;margin-top:3px}
    .nk-flow-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}
    .nk-flow-item{min-height:92px;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:10px;background:rgba(255,255,255,.015)}
    .nk-flow-item.active{border-color:rgba(40,220,180,.5);background:rgba(32,220,170,.07)}
    .nk-flow-item.done{border-color:rgba(48,222,158,.22);background:rgba(48,222,158,.035)}
    .nk-step{width:25px;height:25px;border-radius:7px;display:grid;place-items:center;font-size:10px;font-weight:800;background:#10232e;color:#718996}
    .nk-flow-item.active .nk-step{background:#24d9a5;color:#03130f}
    .nk-flow-item.done .nk-step{background:rgba(49,226,160,.13);color:#4fe5b0}
    .nk-flow-name{font-size:10px;font-weight:700;margin-top:8px}
    .nk-flow-detail{font-size:8px;color:#6e8490;margin-top:6px}
    .nk-bottom{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;margin-top:12px}
    .nk-queue-row{display:grid;grid-template-columns:65px 1fr auto;gap:10px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.018);margin-top:7px}
    .nk-queue-id{font-size:11px;font-weight:800}
    .nk-queue-name{font-size:10px;font-weight:650}
    .nk-queue-meta{font-size:8px;color:#657b88;margin-top:3px}
    .nk-status{font-size:8px;font-weight:800;border-radius:20px;padding:4px 7px}
    .nk-section-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:750}
    .nk-ver-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .nk-ver-box{padding:10px;border-radius:8px;background:rgba(255,255,255,.025)}
    .nk-ver-value{font-size:18px;font-weight:800;margin-top:3px}
    .nk-bar{height:6px;border-radius:20px;background:#12232e;overflow:hidden;margin-top:12px}
    .nk-bar > div{height:100%;background:#35e69b}
    .nk-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
    .nk-mini{padding:13px}
    .nk-mini-value{font-size:13px;font-weight:750;margin-top:8px}
    .nk-pulse{animation:nkPulse 1.5s ease-in-out infinite}
    @keyframes nkPulse{0%,100%{transform:scale(.9);opacity:.45}50%{transform:scale(1.08);opacity:1}}
    @media(max-width:1150px){.nk-live-grid{grid-template-columns:1fr}.nk-rail{display:grid;grid-template-columns:repeat(2,1fr)}.nk-flow-grid{grid-template-columns:repeat(3,1fr)}.nk-bottom{grid-template-columns:1fr}}
    @media(max-width:760px){.nk-shell{padding:10px}.nk-rail{grid-template-columns:1fr}.nk-flow-grid{grid-template-columns:repeat(2,1fr)}.nk-map{min-height:500px}.nk-legend{width:155px}.nk-lake-name{font-size:16px}.nk-mini-grid{grid-template-columns:1fr}}
  `;

  const routeSegments = useMemo(() => {
    return WAYPOINTS.slice(0, detectedCount).map((wp, index) => {
      const from = index === 0 ? USV_BASE : WAYPOINTS[index - 1];
      return `M ${project(from).x} ${project(from).y} L ${project(wp).x} ${project(wp).y}`;
    });
  }, [detectedCount]);

  return (
    <div className="nk-live">
      <style>{css}</style>

      <div className="nk-shell">
        <div className="nk-title">
          <div>
            <h1>Live Operations Map</h1>
            <p>NeerKaavalan / Autonomous Water Intelligence</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#6f8494' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#35e69b', display: 'inline-block', boxShadow: '0 0 12px #35e69b' }} />
            DIGITAL TWIN ONLINE
          </div>
        </div>

        <div className="nk-live-grid">
          <aside className="nk-rail">
            <section className="nk-card nk-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nk-section-title"><Activity size={14} color="#50caff" /> Mission Status</div>
                <span className="nk-label">Live</span>
              </div>
              <div style={{ marginTop: 15, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(53,230,155,.08)', border: '1px solid rgba(53,230,155,.2)', display: 'grid', placeItems: 'center' }}>
                  {phase === 'COMPLETED' ? <CheckCircle2 size={23} color="#35e69b" /> : <CircleDot size={23} color="#35e69b" />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#35e69b' }}>{phaseTitle(phase)}</div>
                  <div className="nk-muted" style={{ fontSize: 9, marginTop: 3 }}>Drone intelligence · USV execution</div>
                </div>
              </div>
              <div className="nk-bar"><div style={{ width: `${progress * 100}%`, background: '#36cfff' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: '#748995' }}>
                <span>{completedCount}/3 waypoints completed</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </section>

            <section className="nk-card nk-card-pad">
              <div className="nk-section-title"><Bot size={14} color="#50caff" /> Drone D-01 <span style={{ marginLeft: 'auto', color: '#50caff', fontSize: 8 }}>SCANNING</span></div>
              <div style={{ marginTop: 11 }}>
                <div className="nk-label">Aerial Intelligence</div>
                <div className="nk-kpi" style={{ color: '#54caff', marginTop: 4 }}>{droneCoverage}%</div>
                <div style={{ fontSize: 9, color: '#708694', marginTop: 2 }}>survey coverage</div>
                <div style={{ marginTop: 9, fontSize: 9, color: '#8ba0aa' }}>{detectedCount}/3 actionable detections released</div>
              </div>
            </section>

            <section className="nk-card nk-card-pad">
              <div className="nk-section-title"><Ship size={14} color="#49e5ae" /> USV U-01 <span style={{ marginLeft: 'auto', color: '#49e5ae', fontSize: 8 }}>{phase.includes('WP') ? 'OPERATING' : 'STANDBY'}</span></div>
              <div style={{ marginTop: 11, display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}><span className="nk-muted">Target</span><b>{currentTarget?.id ?? 'Waiting'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}><span className="nk-muted">Distance</span><b>{targetDistance} m</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}><span className="nk-muted">ETA</span><b>{eta}s</b></div>
              </div>
            </section>

            <section className="nk-card nk-card-pad">
              <div className="nk-label">Current Target</div>
              {currentTarget ? (
                <>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,100,100,.08)', border: '1px solid rgba(255,100,100,.25)', display: 'grid', placeItems: 'center' }}>
                      <Target size={18} color="#ff7474" />
                    </div>
                    <div>
                      <b style={{ fontSize: 12 }}>{currentTarget.id}</b>
                      <div className="nk-muted" style={{ fontSize: 9, marginTop: 2 }}>{currentTarget.type}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
                    <div className="nk-ver-box"><div className="nk-label">AI confidence</div><b style={{ color: '#54caff', fontSize: 12 }}>{currentTarget.confidence}%</b></div>
                    <div className="nk-ver-box"><div className="nk-label">Waste area</div><b style={{ color: '#54caff', fontSize: 12 }}>{currentTarget.area} m²</b></div>
                  </div>
                </>
              ) : <div className="nk-muted" style={{ fontSize: 10, marginTop: 10 }}>Drone is searching for the next actionable detection.</div>}
            </section>

            <section className="nk-card nk-card-pad">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><div className="nk-label">Waste collected</div><div className="nk-kpi" style={{ color: '#48e3ad', marginTop: 4 }}>{collectedKg.toFixed(1)} kg</div></div>
                <div><div className="nk-label">Coverage</div><div className="nk-kpi" style={{ color: '#54caff', marginTop: 4 }}>{droneCoverage}%</div></div>
              </div>
            </section>
          </aside>

          <section className="nk-card nk-map-wrap">
            <div className="nk-map-head">
              <div>
                <strong>Live Autonomous Operations</strong>
                <div><span>Drone scans continuously while each detection releases the next USV target</span></div>
              </div>
              <div className="nk-controls">
                <button className="nk-btn nk-btn-primary" onClick={primaryAction}>
                  {progress >= 1 ? <RotateCcw size={12} /> : running ? <Pause size={12} /> : <Play size={12} />}
                  {progress >= 1 ? 'Replay' : running ? 'Pause' : 'Start Demo'}
                </button>
                <button className="nk-btn" onClick={reset}><RotateCcw size={12} /></button>
                <div className="nk-speed">
                  {[1, 2, 4].map((v) => <button key={v} className={speed === v ? 'on' : ''} onClick={() => setSpeed(v)}>{v}×</button>)}
                </div>
              </div>
            </div>

            <div className="nk-map">
              <div className="nk-grid" />
              <div className="nk-water" />
              <div className="nk-water2" />
              <div className="nk-lake-name">NEERKAVALAN LAKE</div>

              <div className="nk-sector" style={{ left: '7%', top: '16%', width: '31%', height: '38%' }}><span>SECTOR 01 · AERIAL SURVEY</span></div>
              <div className="nk-sector" style={{ left: '39%', top: '11%', width: '39%', height: '43%' }}><span>SECTOR 02 · ACTIVE DETECTION</span></div>
              <div className="nk-sector" style={{ left: '25%', top: '58%', width: '48%', height: '29%' }}><span>SECTOR 03 · CONTINUOUS SURVEY</span></div>

              <svg className="nk-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="nk-drone-path" d={routePath(DRONE_ROUTE)} />
                {routeSegments.map((d, i) => <path key={i} className="nk-usv-path" d={d} opacity={statuses[i] === 'PENDING' ? .08 : .9} />)}
                {currentTarget && phase.includes('COLLECTING') && (
                  <circle cx={project(currentTarget).x} cy={project(currentTarget).y} r="5.5" fill="rgba(255,209,102,.07)" stroke="#ffd166" strokeDasharray="1.2 1" />
                )}
              </svg>

              {WAYPOINTS.map((wp, index) => {
                const status = statuses[index];
                if (status === 'PENDING') return null;
                const p = project(wp);
                const color = statusColor(status);
                return (
                  <div className="nk-wp" key={wp.id} style={{ left: `${p.x}%`, top: `${p.y}%`, color }}>
                    <div className={`nk-wp-ring ${status === 'ACTIVE' ? 'nk-pulse' : ''}`}>
                      {status === 'COMPLETED' ? <Check size={18} /> : <Target size={18} />}
                    </div>
                    <div className="nk-wp-label">
                      <strong>{wp.id} <span style={{ color, marginLeft: 4 }}>{status}</span></strong>
                      <small>{wp.type} · {wp.confidence}% AI</small>
                    </div>
                  </div>
                );
              })}

              <div className="nk-device" style={{ left: `${droneXY.x}%`, top: `${droneXY.y}%` }}>
                <div className="nk-device-core nk-drone-core"><Bot size={20} /></div>
                <div className="nk-device-label"><b style={{ color: '#58c9ff' }}>NK-D01</b> <span className="nk-muted">SCANNING</span></div>
              </div>

              <div className="nk-device" style={{ left: `${usvXY.x}%`, top: `${usvXY.y}%` }}>
                <div className="nk-device-core nk-usv-core"><Ship size={21} /></div>
                <div className="nk-device-label"><b style={{ color: '#52e8b0' }}>NK-U01</b> <span className="nk-muted">{phase.includes('COLLECTING') ? 'COLLECTING' : phase.includes('WP') ? 'NAVIGATING' : 'READY'}</span></div>
              </div>

              <div className="nk-legend">
                <h4>Operational Legend</h4>
                <div className="nk-legend-row"><span style={{ width: 25, borderTop: '2px dashed #50baff' }} /> Drone path · scanning</div>
                <div className="nk-legend-row"><span style={{ width: 25, borderTop: '2px dashed #3be4a5' }} /> USV path · execution</div>
                <div className="nk-legend-row"><span style={{ width: 9, height: 9, borderRadius: 99, background: '#ff6b6b' }} /> Active target</div>
                <div className="nk-legend-row"><span style={{ width: 9, height: 9, borderRadius: 99, background: '#ffd166' }} /> Newly detected</div>
                <div className="nk-legend-row"><span style={{ width: 9, height: 9, borderRadius: 99, background: '#35e69b' }} /> Cleaned</div>
              </div>

              <div className="nk-live-telemetry">
                <div className="nk-label">Live Telemetry</div>
                <div className="nk-telemetry-row"><span className="nk-muted">Drone</span><b style={{ color: '#54caff' }}>{dronePosition.lat.toFixed(4)}, {dronePosition.lng.toFixed(4)}</b></div>
                <div className="nk-telemetry-row"><span className="nk-muted">USV</span><b style={{ color: '#4ee5ae' }}>{usvPosition.lat.toFixed(4)}, {usvPosition.lng.toFixed(4)}</b></div>
                <div className="nk-telemetry-row"><span className="nk-muted">USV speed</span><b>{phase.includes('NAVIGATING') ? '1.5' : '0.0'} m/s</b></div>
                <div className="nk-telemetry-row"><span className="nk-muted">Target ETA</span><b>{eta}s</b></div>
              </div>
            </div>

            <div className="nk-flow">
              <div className="nk-flow-head">
                <div><div className="nk-flow-title">Mission Flow · Real-time Sequence</div><div className="nk-flow-sub">Each AI detection becomes a GPS waypoint while the drone keeps surveying the next area.</div></div>
                <span className="nk-label">{phaseTitle(phase)}</span>
              </div>
              <div className="nk-flow-grid">
                {workflow.map((item) => (
                  <div className={`nk-flow-item ${item.state}`} key={item.n}>
                    <div className="nk-step">{item.state === 'done' ? <Check size={12} /> : item.n}</div>
                    <div className="nk-flow-name">{item.title}</div>
                    <div className="nk-flow-detail">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="nk-bottom">
          <section className="nk-card nk-card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="nk-section-title"><ScanSearch size={14} color="#50caff" /> Progressive AI → USV Queue</div>
              <span className="nk-label">{detectedCount}/3 RELEASED</span>
            </div>

            {WAYPOINTS.map((wp, index) => {
              const status = statuses[index];
              const color = statusColor(status);
              return (
                <div className="nk-queue-row" key={wp.id}>
                  <div className="nk-queue-id">{wp.id}</div>
                  <div>
                    <div className="nk-queue-name">{wp.type}</div>
                    <div className="nk-queue-meta">{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)} · {wp.area} m² · {wp.confidence}% AI</div>
                  </div>
                  <span className="nk-status" style={{ color, background: `${color}16` }}>{status}</span>
                </div>
              );
            })}
          </section>

          <section className="nk-card nk-card-pad">
            <div className="nk-section-title"><Sparkles size={14} color="#ffd166" /> Cleanup Verification</div>
            <div className="nk-ver-grid">
              <div className="nk-ver-box"><div className="nk-label">Before</div><div className="nk-ver-value">51.2 m²</div></div>
              <div className="nk-ver-box"><div className="nk-label">After</div><div className="nk-ver-value" style={{ color: '#35e69b' }}>{afterArea.toFixed(2)} m²</div></div>
            </div>
            <div className="nk-bar"><div style={{ width: `${Math.min(100, Math.max(0, reduction))}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 9 }}><span className="nk-muted">Waste reduction</span><b style={{ color: '#35e69b' }}>{reduction.toFixed(1)}%</b></div>
          </section>
        </div>

        <div className="nk-mini-grid">
          <section className="nk-card nk-mini">
            <div className="nk-section-title"><Crosshair size={14} color="#50caff" /> Decision Engine</div>
            <div className="nk-mini-value">AI → GPS → USV</div>
            <div className="nk-muted" style={{ fontSize: 9, lineHeight: 1.6, marginTop: 5 }}>The USV only receives a target after the drone detects and geo-locates it.</div>
          </section>

          <section className="nk-card nk-mini">
            <div className="nk-section-title"><Gauge size={14} color="#49e5ae" /> Current Operation</div>
            <div className="nk-mini-value">{phaseTitle(phase)}</div>
            <div className="nk-muted" style={{ fontSize: 9, marginTop: 5 }}>Continuous digital-twin execution</div>
          </section>

          <section className="nk-card nk-mini">
            <div className="nk-section-title"><Timer size={14} color="#ffd166" /> Demo Controls</div>
            <div className="nk-mini-value">{speed}× playback</div>
            <div className="nk-muted" style={{ fontSize: 9, marginTop: 5 }}>Start, pause, replay or accelerate the deterministic mission.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
