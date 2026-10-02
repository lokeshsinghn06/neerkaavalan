import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Bot,
  Check,
  CheckCircle2,
  CircleDot,
  Crosshair,
  Gauge,
  Home,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

type Point = { lat: number; lng: number };

type WaypointStatus = 'PENDING' | 'DETECTED' | 'ACTIVE' | 'DEFERRED' | 'COMPLETED';

type Waypoint = {
  id: string;
  type: string;
  confidence: number;
  area: number;
  lat: number;
  lng: number;
};

const WAYPOINTS: Waypoint[] = [
  { id: 'WP-01', type: 'Plastic Waste Clustered', confidence: 95, area: 18.5, lat: 13.0514, lng: 80.2138 },
  { id: 'WP-02', type: 'Mixed Floating Debris', confidence: 91, area: 28.4, lat: 13.0536, lng: 80.2144 },
  { id: 'WP-03', type: 'Bottle & Packaging Waste', confidence: 89, area: 15.2, lat: 13.0544, lng: 80.2120 },
  { id: 'WP-04', type: 'Bio-Fouling & Microplastics', confidence: 93, area: 22.8, lat: 13.0528, lng: 80.2106 },
];

// Coordinated Drone Aerial Reconnaissance Routes (Scouts each sector ahead of USV)
const ROUTE_DRONE_BASE_TO_WP1: Point[] = [
  { lat: 13.0508, lng: 80.2106 },
  { lat: 13.0510, lng: 80.2122 },
  { lat: 13.0514, lng: 80.2138 },
];
const ROUTE_DRONE_WP1_TO_WP2: Point[] = [
  { lat: 13.0514, lng: 80.2138 },
  { lat: 13.0525, lng: 80.2142 },
  { lat: 13.0536, lng: 80.2144 },
];
const ROUTE_DRONE_WP2_TO_WP3: Point[] = [
  { lat: 13.0536, lng: 80.2144 },
  { lat: 13.0542, lng: 80.2132 },
  { lat: 13.0544, lng: 80.2120 },
];
const ROUTE_DRONE_WP3_TO_WP4: Point[] = [
  { lat: 13.0544, lng: 80.2120 },
  { lat: 13.0538, lng: 80.2110 },
  { lat: 13.0528, lng: 80.2106 },
];
const ROUTE_DRONE_AUDIT: Point[] = [
  { lat: 13.0528, lng: 80.2106 },
  { lat: 13.0538, lng: 80.2122 },
  { lat: 13.0530, lng: 80.2135 },
  { lat: 13.0516, lng: 80.2126 },
  { lat: 13.0508, lng: 80.2106 },
];

// Full drone flight patrol path for the SVG display
const DRONE_ROUTE: Point[] = [
  { lat: 13.0508, lng: 80.2106 },
  { lat: 13.0510, lng: 80.2122 },
  { lat: 13.0514, lng: 80.2138 },
  { lat: 13.0525, lng: 80.2142 },
  { lat: 13.0536, lng: 80.2144 },
  { lat: 13.0542, lng: 80.2132 },
  { lat: 13.0544, lng: 80.2120 },
  { lat: 13.0538, lng: 80.2110 },
  { lat: 13.0528, lng: 80.2106 },
  { lat: 13.0520, lng: 80.2115 },
  { lat: 13.0508, lng: 80.2106 },
];

// Home Dock & Fast Charging Station (South-West Corner Shoreline Jetty)
const USV_BASE: Point = { lat: 13.0508, lng: 80.2106 };

// Segment Navigation Routes
// 1. Base (SW Corner) to WP1 (SE Bay)
const ROUTE_BASE_TO_WP1: Point[] = [
  USV_BASE,
  { lat: 13.0509, lng: 80.2118 },
  { lat: 13.0511, lng: 80.2128 },
  { lat: 13.0514, lng: 80.2138 },
];

// 2. WP1 (SE Bay) to WP2 (NE Cove)
const ROUTE_WP1_TO_WP2: Point[] = [
  { lat: 13.0514, lng: 80.2138 },
  { lat: 13.0524, lng: 80.2142 },
  { lat: 13.0536, lng: 80.2144 },
];

// 3. WP2 (NE Cove) to WP3 (North Cove)
const ROUTE_WP2_TO_WP3: Point[] = [
  { lat: 13.0536, lng: 80.2144 },
  { lat: 13.0542, lng: 80.2134 },
  { lat: 13.0544, lng: 80.2120 },
];

// 4. Return to Home (RTH) from WP3 back to Base (SW Corner Shoreline Dock)
const ROUTE_RTH_FROM_WP3: Point[] = [
  { lat: 13.0544, lng: 80.2120 },
  { lat: 13.0532, lng: 80.2116 },
  { lat: 13.0518, lng: 80.2110 },
  USV_BASE,
];

// 5. Resume from Base (SW Corner) to deferred WP4 (West Channel)
const ROUTE_RESUME_TO_WP4: Point[] = [
  USV_BASE,
  { lat: 13.0518, lng: 80.2106 },
  { lat: 13.0528, lng: 80.2106 },
];

// 6. Return from WP4 to Base (SW Corner)
const ROUTE_WP4_TO_BASE: Point[] = [
  { lat: 13.0528, lng: 80.2106 },
  { lat: 13.0518, lng: 80.2106 },
  USV_BASE,
];

// Routes for AFTER_WP2 mode:
// RTH from WP2 back to Base (SW Corner)
const ROUTE_RTH_FROM_WP2: Point[] = [
  { lat: 13.0536, lng: 80.2144 },
  { lat: 13.0522, lng: 80.2126 },
  { lat: 13.0512, lng: 80.2114 },
  USV_BASE,
];

// Resumption from Base to WP3
const ROUTE_RESUME_TO_WP3: Point[] = [
  USV_BASE,
  { lat: 13.0520, lng: 80.2112 },
  { lat: 13.0535, lng: 80.2116 },
  { lat: 13.0544, lng: 80.2120 },
];

// WP3 to WP4
const ROUTE_WP3_TO_WP4: Point[] = [
  { lat: 13.0544, lng: 80.2120 },
  { lat: 13.0536, lng: 80.2110 },
  { lat: 13.0528, lng: 80.2106 },
];

// Direct continuous routes
const NOMINAL_ROUTES: Point[][] = [
  ROUTE_BASE_TO_WP1,
  ROUTE_WP1_TO_WP2,
  ROUTE_WP2_TO_WP3,
  ROUTE_WP3_TO_WP4,
  ROUTE_WP4_TO_BASE,
];

const LAKE = {
  minLat: 13.0498,
  maxLat: 13.0552,
  minLng: 80.2097,
  maxLng: 80.2155,
};

// Propulsion and collection energy constants
const PROPULSION_ENERGY_PER_METER = 0.075; // % per meter
const COLLECTION_ENERGY_PER_SQ_M = 0.22;   // % per m²
const SAFETY_BUFFER_PERCENT = 15.0;        // Minimum 15% reserve

export type RecoveryMode = 'AFTER_WP3' | 'AFTER_WP2' | 'DIRECT';

export default function LiveMap() {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<RecoveryMode>('AFTER_WP3');

  useEffect(() => {
    if (!running || progress >= 1) return;

    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.0016 * speed));
    }, 100);

    return () => window.clearInterval(timer);
  }, [running, speed, progress]);

  // Phase computation
  const phaseInfo = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      if (progress >= 0.97) return { phase: 'COMPLETED', title: 'MISSION COMPLETE · 100% CLEARED', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.93) return { phase: 'VERIFYING', title: 'POST-CLEANUP DRONE AUDIT · USV DOCKING', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.86) return { phase: 'WP4_COLLECTING', title: 'USV OPERATING WP-04 · CLEARING MICROPLASTICS', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.77) return { phase: 'RESUMING_WP4', title: 'USV RESUMING TO DETECTED WP-04', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.67) return { phase: 'CHARGING', title: 'SHORELINE DOCK FAST CHARGING (45W)', isRTH: false, isCharging: true, droneScanning: false };
      if (progress >= 0.57) return { phase: 'RTH_NAVIGATING', title: 'LOW BATTERY · RETURN TO SHORELINE DOCK (RTH)', isRTH: true, isCharging: false, droneScanning: false };
      if (progress >= 0.49) return { phase: 'WP3_COLLECTING', title: 'USV OPERATING WP-03 · DRONE SCANNED WP-04', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.41) return { phase: 'WP3_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-03', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.33) return { phase: 'WP2_COLLECTING', title: 'USV OPERATING WP-02 · DRONE SCANNED WP-03', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.25) return { phase: 'WP2_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-02', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.17) return { phase: 'WP1_COLLECTING', title: 'USV OPERATING WP-01 · DRONE SCANNED WP-02', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.09) return { phase: 'WP1_NAVIGATING', title: 'USV DISPATCHED → NAVIGATING WP-01', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.05) return { phase: 'DRONE_DETECTED_WP1', title: '🎯 DRONE DETECTED WP-01 · DISPATCHING USV', isRTH: false, isCharging: false, droneScanning: true };
      return { phase: 'DRONE_SCOUT_WP1', title: 'DRONE AERIAL SURVEY · SCANNING SECTOR 01', isRTH: false, isCharging: false, droneScanning: true };
    }

    if (mode === 'AFTER_WP2') {
      if (progress >= 0.98) return { phase: 'COMPLETED', title: 'MISSION COMPLETE · 100% CLEARED', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.94) return { phase: 'VERIFYING', title: 'POST-CLEANUP DRONE AUDIT · USV DOCKING', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.88) return { phase: 'WP4_COLLECTING', title: 'USV OPERATING WP-04 · CLEARING MICROPLASTICS', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.80) return { phase: 'WP4_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-04', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.72) return { phase: 'WP3_COLLECTING', title: 'USV OPERATING WP-03 · CLEARING BOTTLE WASTE', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.62) return { phase: 'RESUMING_WP3', title: 'USV RESUMING TO DETECTED WP-03', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.50) return { phase: 'CHARGING', title: 'SHORELINE DOCK FAST CHARGING (45W)', isRTH: false, isCharging: true, droneScanning: false };
      if (progress >= 0.40) return { phase: 'RTH_NAVIGATING', title: 'LOW BATTERY · RETURN TO SHORELINE DOCK (RTH)', isRTH: true, isCharging: false, droneScanning: false };
      if (progress >= 0.32) return { phase: 'WP2_COLLECTING', title: 'USV OPERATING WP-02 · DRONE SCANNED WP-03', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.24) return { phase: 'WP2_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-02', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.16) return { phase: 'WP1_COLLECTING', title: 'USV OPERATING WP-01 · DRONE SCANNED WP-02', isRTH: false, isCharging: false, droneScanning: true };
      if (progress >= 0.08) return { phase: 'WP1_NAVIGATING', title: 'USV DISPATCHED → NAVIGATING WP-01', isRTH: false, isCharging: false, droneScanning: false };
      if (progress >= 0.05) return { phase: 'DRONE_DETECTED_WP1', title: '🎯 DRONE DETECTED WP-01 · DISPATCHING USV', isRTH: false, isCharging: false, droneScanning: true };
      return { phase: 'DRONE_SCOUT_WP1', title: 'DRONE AERIAL SURVEY · SCANNING SECTOR 01', isRTH: false, isCharging: false, droneScanning: true };
    }

    // Direct continuous mode
    if (progress >= 0.98) return { phase: 'COMPLETED', title: 'MISSION COMPLETE · 100% CLEARED', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.94) return { phase: 'VERIFYING', title: 'POST-CLEANUP DRONE AUDIT · USV DOCKING', isRTH: false, isCharging: false, droneScanning: true };
    if (progress >= 0.86) return { phase: 'WP4_COLLECTING', title: 'USV OPERATING WP-04', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.72) return { phase: 'WP4_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-04', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.64) return { phase: 'WP3_COLLECTING', title: 'USV OPERATING WP-03 · DRONE SCANNED WP-04', isRTH: false, isCharging: false, droneScanning: true };
    if (progress >= 0.50) return { phase: 'WP3_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-03', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.42) return { phase: 'WP2_COLLECTING', title: 'USV OPERATING WP-02 · DRONE SCANNED WP-03', isRTH: false, isCharging: false, droneScanning: true };
    if (progress >= 0.28) return { phase: 'WP2_NAVIGATING', title: 'USV NAVIGATING TO DETECTED WP-02', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.20) return { phase: 'WP1_COLLECTING', title: 'USV OPERATING WP-01 · DRONE SCANNED WP-02', isRTH: false, isCharging: false, droneScanning: true };
    if (progress >= 0.08) return { phase: 'WP1_NAVIGATING', title: 'USV DISPATCHED → NAVIGATING WP-01', isRTH: false, isCharging: false, droneScanning: false };
    if (progress >= 0.05) return { phase: 'DRONE_DETECTED_WP1', title: '🎯 DRONE DETECTED WP-01 · DISPATCHING USV', isRTH: false, isCharging: false, droneScanning: true };
    return { phase: 'DRONE_SCOUT_WP1', title: 'DRONE AERIAL SURVEY · SCANNING SECTOR 01', isRTH: false, isCharging: false, droneScanning: true };
  }, [mode, progress]);

  // Battery percentage model
  const batteryLevel = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      if (progress < 0.09) return 98; // Standby at dock while drone scouts WP1
      if (progress < 0.17) {
        const t = (progress - 0.09) / 0.08;
        return Math.round(98 - t * 9); // 98 -> 89% (transit to WP1)
      }
      if (progress < 0.25) {
        const t = (progress - 0.17) / 0.08;
        return Math.round(89 - t * 11); // 89 -> 78% (WP1 cleared)
      }
      if (progress < 0.33) {
        const t = (progress - 0.25) / 0.08;
        return Math.round(78 - t * 12); // 78 -> 66% (transit to WP2)
      }
      if (progress < 0.41) {
        const t = (progress - 0.33) / 0.08;
        return Math.round(66 - t * 14); // 66 -> 52% (WP2 cleared)
      }
      if (progress < 0.49) {
        const t = (progress - 0.41) / 0.08;
        return Math.round(52 - t * 10); // 52 -> 42% (transit to WP3)
      }
      if (progress < 0.57) {
        const t = (progress - 0.49) / 0.08;
        return Math.round(42 - t * 10); // 42 -> 32% (WP3 cleared!)
      }
      if (progress < 0.67) {
        const t = (progress - 0.57) / 0.10;
        return Math.max(19, Math.round(32 - t * 13)); // 32 -> 19% (RTH to Dock)
      }
      if (progress < 0.77) {
        const t = (progress - 0.67) / 0.10;
        return Math.min(96, Math.round(19 + t * 77)); // 19 -> 96% (Rapid Shore Charge)
      }
      if (progress < 0.86) {
        const t = (progress - 0.77) / 0.09;
        return Math.round(96 - t * 15); // 96 -> 81% (Resume to WP4)
      }
      if (progress < 0.93) {
        const t = (progress - 0.86) / 0.07;
        return Math.round(81 - t * 11); // 81 -> 70% (WP4 cleared)
      }
      return Math.max(65, Math.round(70 - ((progress - 0.93) / 0.07) * 5));
    }

    if (mode === 'AFTER_WP2') {
      if (progress < 0.08) return 98; // Standby at dock while drone scouts WP1
      if (progress < 0.24) {
        const t = (progress - 0.08) / 0.16;
        return Math.round(98 - t * 24); // 98 -> 74% (WP1 cleared)
      }
      if (progress < 0.40) {
        const t = (progress - 0.24) / 0.16;
        return Math.round(74 - t * 34); // 74 -> 40% (WP2 cleared)
      }
      if (progress < 0.50) {
        const t = (progress - 0.40) / 0.10;
        return Math.max(22, Math.round(40 - t * 18)); // 40 -> 22% (RTH to Dock)
      }
      if (progress < 0.62) {
        const t = (progress - 0.50) / 0.12;
        return Math.min(96, Math.round(22 + t * 74)); // 22 -> 96% (Charging)
      }
      if (progress < 0.80) {
        const t = (progress - 0.62) / 0.18;
        return Math.round(96 - t * 22); // 96 -> 74% (WP3 cleared)
      }
      if (progress < 0.94) {
        const t = (progress - 0.80) / 0.14;
        return Math.round(74 - t * 20); // 74 -> 54% (WP4 cleared)
      }
      return Math.max(50, Math.round(54 - ((progress - 0.94) / 0.06) * 4));
    }

    // Direct mode
    if (progress < 0.08) return 98;
    return Math.max(18, Math.round(98 - ((progress - 0.08) / 0.92) * 78));
  }, [mode, progress]);

  // Waypoint statuses: Only marked DETECTED after Drone scans, then ACTIVE when USV arrives
  const statuses = useMemo<WaypointStatus[]>(() => {
    if (mode === 'AFTER_WP3') {
      const wp1: WaypointStatus =
        progress < 0.07 ? 'PENDING' : progress < 0.09 ? 'DETECTED' : progress < 0.25 ? 'ACTIVE' : 'COMPLETED';
      const wp2: WaypointStatus =
        progress < 0.20 ? 'PENDING' : progress < 0.25 ? 'DETECTED' : progress < 0.41 ? 'ACTIVE' : 'COMPLETED';
      const wp3: WaypointStatus =
        progress < 0.35 ? 'PENDING' : progress < 0.41 ? 'DETECTED' : progress < 0.57 ? 'ACTIVE' : 'COMPLETED';
      const wp4: WaypointStatus =
        progress < 0.51
          ? 'PENDING'
          : progress < 0.57
            ? 'DETECTED'
            : progress < 0.77
              ? 'DEFERRED' // Skipped for RTH recharge after WP3
              : progress < 0.93
                ? 'ACTIVE'
                : 'COMPLETED';
      return [wp1, wp2, wp3, wp4];
    }

    if (mode === 'AFTER_WP2') {
      const wp1: WaypointStatus =
        progress < 0.06 ? 'PENDING' : progress < 0.08 ? 'DETECTED' : progress < 0.24 ? 'ACTIVE' : 'COMPLETED';
      const wp2: WaypointStatus =
        progress < 0.18 ? 'PENDING' : progress < 0.24 ? 'DETECTED' : progress < 0.40 ? 'ACTIVE' : 'COMPLETED';
      const wp3: WaypointStatus =
        progress < 0.34
          ? 'PENDING'
          : progress < 0.40
            ? 'DETECTED'
            : progress < 0.62
              ? 'DEFERRED' // Skipped for RTH recharge after WP2
              : progress < 0.80
                ? 'ACTIVE'
                : 'COMPLETED';
      const wp4: WaypointStatus =
        progress < 0.55 ? 'PENDING' : progress < 0.80 ? 'DETECTED' : progress < 0.94 ? 'ACTIVE' : 'COMPLETED';
      return [wp1, wp2, wp3, wp4];
    }

    // Direct
    const wp1: WaypointStatus =
      progress < 0.06 ? 'PENDING' : progress < 0.08 ? 'DETECTED' : progress < 0.28 ? 'ACTIVE' : 'COMPLETED';
    const wp2: WaypointStatus =
      progress < 0.20 ? 'PENDING' : progress < 0.28 ? 'DETECTED' : progress < 0.50 ? 'ACTIVE' : 'COMPLETED';
    const wp3: WaypointStatus =
      progress < 0.44 ? 'PENDING' : progress < 0.50 ? 'DETECTED' : progress < 0.72 ? 'ACTIVE' : 'COMPLETED';
    const wp4: WaypointStatus =
      progress < 0.66 ? 'PENDING' : progress < 0.72 ? 'DETECTED' : progress < 0.94 ? 'ACTIVE' : 'COMPLETED';
    return [wp1, wp2, wp3, wp4];
  }, [mode, progress]);

  // Geometry projection
  function project(point: Point) {
    return {
      x: Math.max(3, Math.min(97, ((point.lng - LAKE.minLng) / (LAKE.maxLng - LAKE.minLng)) * 100)),
      y: Math.max(4, Math.min(96, 100 - ((point.lat - LAKE.minLat) / (LAKE.maxLat - LAKE.minLat)) * 100)),
    };
  }

  function interpolate(a: Point, b: Point, t: number): Point {
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  }

  function pathPosition(path: Point[], p: number): Point {
    if (!path.length) return USV_BASE;
    if (p <= 0) return path[0];
    if (p >= 1) return path[path.length - 1];

    const scaled = p * (path.length - 1);
    const i = Math.floor(scaled);
    return interpolate(path[i], path[i + 1], scaled - i);
  }

  function routePath(points: Point[]) {
    return points
      .map((pt, i) => {
        const q = project(pt);
        return `${i === 0 ? 'M' : 'L'} ${q.x} ${q.y}`;
      })
      .join(' ');
  }

  function distance(a: Point, b: Point) {
    const dy = (b.lat - a.lat) * 111000;
    const dx = (b.lng - a.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180);
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  // Active USV Position calculation: USV waits in STANDBY at dock until drone detects WP-01!
  const usvPosition = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      if (progress < 0.09) {
        // Moored in STANDBY at shoreline dock awaiting drone detection of WP-01
        return USV_BASE;
      }
      if (progress < 0.17) {
        // Dispatched to WP-01
        const local = (progress - 0.09) / 0.08;
        return pathPosition(ROUTE_BASE_TO_WP1, local);
      }
      if (progress < 0.25) {
        // Operating at WP-01
        return WAYPOINTS[0];
      }
      if (progress < 0.33) {
        // Navigating to detected WP-02
        const local = (progress - 0.25) / 0.08;
        return pathPosition(ROUTE_WP1_TO_WP2, local);
      }
      if (progress < 0.41) {
        // Operating at WP-02
        return WAYPOINTS[1];
      }
      if (progress < 0.49) {
        // Navigating to detected WP-03
        const local = (progress - 0.41) / 0.08;
        return pathPosition(ROUTE_WP2_TO_WP3, local);
      }
      if (progress < 0.57) {
        // Operating at WP-03
        return WAYPOINTS[2];
      }
      if (progress < 0.67) {
        // RTH from WP-03 back to Base Dock
        const local = (progress - 0.57) / 0.10;
        return pathPosition(ROUTE_RTH_FROM_WP3, local);
      }
      if (progress < 0.77) {
        // Docked at Base for Rapid Charging
        return USV_BASE;
      }
      if (progress < 0.86) {
        // Resuming from Base to deferred WP-04
        const local = (progress - 0.77) / 0.09;
        return pathPosition(ROUTE_RESUME_TO_WP4, local);
      }
      if (progress < 0.93) {
        // Operating at WP-04
        return WAYPOINTS[3];
      }
      if (progress < 0.97) {
        const local = (progress - 0.93) / 0.04;
        return pathPosition(ROUTE_WP4_TO_BASE, local);
      }
      return USV_BASE;
    }

    if (mode === 'AFTER_WP2') {
      if (progress < 0.08) {
        // Moored in STANDBY at shoreline dock awaiting drone detection of WP-01
        return USV_BASE;
      }
      if (progress < 0.16) {
        const local = (progress - 0.08) / 0.08;
        return pathPosition(ROUTE_BASE_TO_WP1, local);
      }
      if (progress < 0.24) return WAYPOINTS[0];
      if (progress < 0.32) {
        const local = (progress - 0.24) / 0.08;
        return pathPosition(ROUTE_WP1_TO_WP2, local);
      }
      if (progress < 0.40) return WAYPOINTS[1];
      if (progress < 0.50) {
        const local = (progress - 0.40) / 0.10;
        return pathPosition(ROUTE_RTH_FROM_WP2, local);
      }
      if (progress < 0.62) {
        return USV_BASE;
      }
      if (progress < 0.72) {
        const local = (progress - 0.62) / 0.10;
        return pathPosition(ROUTE_RESUME_TO_WP3, local);
      }
      if (progress < 0.80) return WAYPOINTS[2];
      if (progress < 0.88) {
        const local = (progress - 0.80) / 0.08;
        return pathPosition(ROUTE_WP3_TO_WP4, local);
      }
      if (progress < 0.94) return WAYPOINTS[3];
      if (progress < 0.98) {
        const local = (progress - 0.94) / 0.04;
        return pathPosition(ROUTE_WP4_TO_BASE, local);
      }
      return USV_BASE;
    }

    // Direct mode
    if (progress < 0.08) {
      return USV_BASE;
    }
    if (progress < 0.20) {
      const local = (progress - 0.08) / 0.12;
      return pathPosition(ROUTE_BASE_TO_WP1, local);
    }
    if (progress < 0.28) return WAYPOINTS[0];
    if (progress < 0.42) {
      const local = (progress - 0.28) / 0.14;
      return pathPosition(ROUTE_WP1_TO_WP2, local);
    }
    if (progress < 0.50) return WAYPOINTS[1];
    if (progress < 0.64) {
      const local = (progress - 0.50) / 0.14;
      return pathPosition(ROUTE_WP2_TO_WP3, local);
    }
    if (progress < 0.72) return WAYPOINTS[2];
    if (progress < 0.86) {
      const local = (progress - 0.72) / 0.14;
      return pathPosition(ROUTE_WP3_TO_WP4, local);
    }
    if (progress < 0.94) return WAYPOINTS[3];
    if (progress < 0.98) {
      const local = (progress - 0.94) / 0.04;
      return pathPosition(ROUTE_WP4_TO_BASE, local);
    }
    return USV_BASE;
  }, [mode, progress]);

  // Coordinated Drone Position: Flies to sectors and scans hotspots ahead of USV
  const dronePosition = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      if (progress < 0.05) {
        const local = progress / 0.05;
        return pathPosition(ROUTE_DRONE_BASE_TO_WP1, local);
      }
      if (progress < 0.09) {
        // Hovers over WP-01 scanning and detecting garbage hotspot
        return WAYPOINTS[0];
      }
      if (progress < 0.17) {
        // En route from WP-01 to WP-02 while USV moves to WP-01
        const local = (progress - 0.09) / 0.08;
        return pathPosition(ROUTE_DRONE_WP1_TO_WP2, local);
      }
      if (progress < 0.25) {
        // Hovers over WP-02 scanning and detecting debris cove
        return WAYPOINTS[1];
      }
      if (progress < 0.33) {
        // En route from WP-02 to WP-03 while USV moves to WP-02
        const local = (progress - 0.25) / 0.08;
        return pathPosition(ROUTE_DRONE_WP2_TO_WP3, local);
      }
      if (progress < 0.41) {
        // Hovers over WP-03 scanning and detecting packaging zone
        return WAYPOINTS[2];
      }
      if (progress < 0.49) {
        // En route from WP-03 to WP-04 while USV moves to WP-03
        const local = (progress - 0.41) / 0.08;
        return pathPosition(ROUTE_DRONE_WP3_TO_WP4, local);
      }
      if (progress < 0.57) {
        // Hovers over WP-04 scanning and detecting microplastics channel
        return WAYPOINTS[3];
      }
      if (progress < 0.77) {
        // Surveillance over lake center while USV conducts RTH and fast charging
        return { lat: 13.0528, lng: 80.2125 };
      }
      if (progress < 0.93) {
        // High-altitude observation over Sector 04 as USV cleans deferred hotspot
        return { lat: 13.0532, lng: 80.2110 };
      }
      const local = Math.min(1, Math.max(0, (progress - 0.93) / 0.07));
      return pathPosition(ROUTE_DRONE_AUDIT, local);
    }

    if (mode === 'AFTER_WP2') {
      if (progress < 0.05) {
        const local = progress / 0.05;
        return pathPosition(ROUTE_DRONE_BASE_TO_WP1, local);
      }
      if (progress < 0.08) return WAYPOINTS[0];
      if (progress < 0.16) {
        const local = (progress - 0.08) / 0.08;
        return pathPosition(ROUTE_DRONE_WP1_TO_WP2, local);
      }
      if (progress < 0.24) return WAYPOINTS[1];
      if (progress < 0.32) {
        const local = (progress - 0.24) / 0.08;
        return pathPosition(ROUTE_DRONE_WP2_TO_WP3, local);
      }
      if (progress < 0.40) return WAYPOINTS[2];
      if (progress < 0.62) {
        const local = Math.min(1, (progress - 0.40) / 0.15);
        return pathPosition(ROUTE_DRONE_WP3_TO_WP4, local);
      }
      if (progress < 0.80) return WAYPOINTS[3];
      if (progress < 0.94) return { lat: 13.0530, lng: 80.2115 };
      const local = Math.min(1, (progress - 0.94) / 0.06);
      return pathPosition(ROUTE_DRONE_AUDIT, local);
    }

    // Direct mode
    if (progress < 0.05) {
      const local = progress / 0.05;
      return pathPosition(ROUTE_DRONE_BASE_TO_WP1, local);
    }
    if (progress < 0.08) return WAYPOINTS[0];
    if (progress < 0.20) {
      const local = (progress - 0.08) / 0.12;
      return pathPosition(ROUTE_DRONE_WP1_TO_WP2, local);
    }
    if (progress < 0.28) return WAYPOINTS[1];
    if (progress < 0.42) {
      const local = (progress - 0.28) / 0.14;
      return pathPosition(ROUTE_DRONE_WP2_TO_WP3, local);
    }
    if (progress < 0.50) return WAYPOINTS[2];
    if (progress < 0.64) {
      const local = (progress - 0.50) / 0.14;
      return pathPosition(ROUTE_DRONE_WP3_TO_WP4, local);
    }
    if (progress < 0.72) return WAYPOINTS[3];
    const local = Math.min(1, Math.max(0, (progress - 0.72) / 0.26));
    return pathPosition(ROUTE_DRONE_AUDIT, local);
  }, [mode, progress]);

  const droneXY = project(dronePosition);
  const usvXY = project(usvPosition);
  const baseXY = project(USV_BASE);

  // Targets and distance calculation
  const currentTarget = useMemo(() => {
    if (phaseInfo.isRTH || phaseInfo.isCharging) return null;
    if (statuses[0] === 'ACTIVE') return WAYPOINTS[0];
    if (statuses[1] === 'ACTIVE') return WAYPOINTS[1];
    if (statuses[2] === 'ACTIVE') return WAYPOINTS[2];
    if (statuses[3] === 'ACTIVE') return WAYPOINTS[3];
    return null;
  }, [phaseInfo, statuses]);

  const targetDistance = currentTarget ? distance(usvPosition, currentTarget) : 0;

  // Real-time Energy Feasibility Budget calculation
  const evaluatedWaypoint = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      if (statuses[3] === 'DEFERRED' || statuses[3] === 'ACTIVE' || progress >= 0.52) {
        return WAYPOINTS[3];
      }
      if (statuses[2] === 'ACTIVE' || progress >= 0.40) {
        return WAYPOINTS[2];
      }
      if (statuses[1] === 'ACTIVE' || progress >= 0.24) {
        return WAYPOINTS[1];
      }
      return WAYPOINTS[0];
    }

    if (mode === 'AFTER_WP2') {
      if (statuses[2] === 'DEFERRED' || statuses[2] === 'ACTIVE' || progress >= 0.36) {
        return WAYPOINTS[2];
      }
      if (statuses[1] === 'ACTIVE' || progress >= 0.20) {
        return WAYPOINTS[1];
      }
      return WAYPOINTS[0];
    }

    if (statuses[3] === 'ACTIVE' || progress >= 0.64) return WAYPOINTS[3];
    if (statuses[2] === 'ACTIVE' || progress >= 0.42) return WAYPOINTS[2];
    if (statuses[1] === 'ACTIVE' || progress >= 0.22) return WAYPOINTS[1];
    return WAYPOINTS[0];
  }, [mode, statuses, progress]);

  const evalDistToWp = distance(usvPosition, evaluatedWaypoint);
  const evalDistHome = distance(evaluatedWaypoint, USV_BASE);
  const energyNav = Math.round(evalDistToWp * PROPULSION_ENERGY_PER_METER);
  const energyCollect = Math.round(evaluatedWaypoint.area * COLLECTION_ENERGY_PER_SQ_M);
  const energyReturnHome = Math.round(evalDistHome * PROPULSION_ENERGY_PER_METER);
  const totalEnergyRequired = energyNav + energyCollect + energyReturnHome + SAFETY_BUFFER_PERCENT;
  const isBudgetSufficient = batteryLevel >= totalEnergyRequired;

  const completedCount = statuses.filter((s) => s === 'COMPLETED').length;
  const detectedCount = statuses.filter((s) => s !== 'PENDING').length;

  const droneCoverage = Math.min(100, Math.round(8 + progress * 92));
  const collectedKg = Math.min(
    32.8,
    (statuses[0] === 'COMPLETED' ? 7.85 : phaseInfo.phase.includes('WP1_COLLECTING') ? 4.0 : 0) +
      (statuses[1] === 'COMPLETED' ? 10.45 : phaseInfo.phase.includes('WP2_COLLECTING') ? 5.2 : 0) +
      (statuses[2] === 'COMPLETED' ? 5.65 : phaseInfo.phase.includes('WP3_COLLECTING') ? 2.8 : 0) +
      (statuses[3] === 'COMPLETED' ? 8.85 : phaseInfo.phase.includes('WP4_COLLECTING') ? 4.4 : 0)
  );

  const beforeArea = 84.9;
  const afterArea = phaseInfo.phase === 'COMPLETED' ? 1.2 : Math.max(1.2, beforeArea - (collectedKg / 32.8) * (beforeArea - 1.2));
  const reduction = ((beforeArea - afterArea) / beforeArea) * 100;

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

  const statusColor = (status: WaypointStatus) => {
    if (status === 'COMPLETED') return '#35e69b';
    if (status === 'ACTIVE') return '#ff6b6b';
    if (status === 'DEFERRED') return '#f59e0b';
    if (status === 'DETECTED') return '#ffd166';
    return '#64748b';
  };

  // Workflow cards representation highlighting Drone Scout & USV Dispatch
  const workflow = useMemo(() => {
    if (mode === 'AFTER_WP3') {
      return [
        {
          n: 1,
          title: 'Drone Scout → WP-01 Locked',
          detail: 'Drone detects plastic; USV dispatched from dock',
          state: statuses[0] === 'COMPLETED' ? 'done' : statuses[0] === 'ACTIVE' || statuses[0] === 'DETECTED' ? 'active' : 'idle',
        },
        {
          n: 2,
          title: 'WP-01 Cleared · Drone Scouts WP-02',
          detail: 'Plastic collected; WP-02 AI detected ahead',
          state: statuses[1] === 'COMPLETED' ? 'done' : statuses[1] === 'ACTIVE' || statuses[1] === 'DETECTED' ? 'active' : 'idle',
        },
        {
          n: 3,
          title: 'WP-02 Cleared · Drone Scouts WP-03',
          detail: 'Floating debris cleared; WP-03 detected',
          state: statuses[2] === 'COMPLETED' ? 'done' : statuses[2] === 'ACTIVE' || statuses[2] === 'DETECTED' ? 'active' : 'idle',
        },
        {
          n: 4,
          title: phaseInfo.isRTH ? 'RTH Triggered' : phaseInfo.isCharging ? 'Rapid Charging' : 'WP-04 Energy Deficit',
          detail: phaseInfo.isRTH ? 'WP-04 skipped (32% < 38% budget)' : phaseInfo.isCharging ? 'Shore power active at jetty' : 'Round-trip budget evaluated',
          state: phaseInfo.isRTH || phaseInfo.isCharging ? 'active' : progress >= 0.77 ? 'done' : progress >= 0.57 ? 'active' : 'idle',
        },
        {
          n: 5,
          title: 'Dock Shore Power & Resume',
          detail: 'Battery 19% → 96%; USV resumes WP-04',
          state: statuses[3] === 'COMPLETED' ? 'done' : statuses[3] === 'ACTIVE' ? 'active' : phaseInfo.isCharging ? 'active' : 'idle',
        },
        {
          n: 6,
          title: 'Mission Verification',
          detail: 'Post-cleanup drone aerial audit (100%)',
          state: phaseInfo.phase === 'VERIFYING' ? 'active' : phaseInfo.phase === 'COMPLETED' ? 'done' : 'idle',
        },
      ];
    }

    if (mode === 'AFTER_WP2') {
      return [
        {
          n: 1,
          title: 'Drone Scout → WP-01 Locked',
          detail: 'Drone detects plastic; USV dispatched',
          state: statuses[0] === 'COMPLETED' ? 'done' : statuses[0] === 'ACTIVE' || statuses[0] === 'DETECTED' ? 'active' : 'idle',
        },
        {
          n: 2,
          title: 'WP-01 Cleared · Drone Scouts WP-02',
          detail: 'Collect debris; WP-02 AI detected ahead',
          state: statuses[1] === 'COMPLETED' ? 'done' : statuses[1] === 'ACTIVE' || statuses[1] === 'DETECTED' ? 'active' : 'idle',
        },
        {
          n: 3,
          title: phaseInfo.isRTH ? 'RTH Triggered' : phaseInfo.isCharging ? 'Rapid Charging' : 'WP-03 Energy Deficit',
          detail: phaseInfo.isRTH ? 'Low battery: Skip WP-03 to base' : phaseInfo.isCharging ? 'Shore power dock' : 'Round-trip budget evaluated',
          state: phaseInfo.isRTH || phaseInfo.isCharging ? 'active' : progress >= 0.62 ? 'done' : progress >= 0.40 ? 'active' : 'idle',
        },
        {
          n: 4,
          title: 'Resume WP-03',
          detail: 'Re-engage skipped target with full power',
          state: statuses[2] === 'COMPLETED' ? 'done' : statuses[2] === 'ACTIVE' ? 'active' : 'idle',
        },
        {
          n: 5,
          title: 'Clear WP-04',
          detail: 'Bio-Fouling & Microplastics',
          state: statuses[3] === 'COMPLETED' ? 'done' : statuses[3] === 'ACTIVE' ? 'active' : 'idle',
        },
        {
          n: 6,
          title: 'Mission Verification',
          detail: 'Post-cleanup drone aerial survey',
          state: phaseInfo.phase === 'VERIFYING' ? 'active' : phaseInfo.phase === 'COMPLETED' ? 'done' : 'idle',
        },
      ];
    }

    // Direct
    return [
      { n: 1, title: 'Drone Scout → WP-01 Locked', detail: 'Drone detects; USV dispatched', state: statuses[0] === 'COMPLETED' ? 'done' : statuses[0] === 'ACTIVE' ? 'active' : 'idle' },
      { n: 2, title: 'WP-02 Cleared', detail: 'Floating Debris', state: statuses[1] === 'COMPLETED' ? 'done' : statuses[1] === 'ACTIVE' ? 'active' : 'idle' },
      { n: 3, title: 'WP-03 Cleared', detail: 'Packaging Waste', state: statuses[2] === 'COMPLETED' ? 'done' : statuses[2] === 'ACTIVE' ? 'active' : 'idle' },
      { n: 4, title: 'WP-04 Cleared', detail: 'Microplastics', state: statuses[3] === 'COMPLETED' ? 'done' : statuses[3] === 'ACTIVE' ? 'active' : 'idle' },
      { n: 5, title: 'All Targets Cleared', detail: '4 of 4 Hotspots 100%', state: completedCount >= 4 ? 'done' : 'idle' },
      { n: 6, title: 'Verification', detail: 'Post-cleanup re-scan by drone', state: phaseInfo.phase === 'VERIFYING' ? 'active' : phaseInfo.phase === 'COMPLETED' ? 'done' : 'idle' },
    ];
  }, [mode, phaseInfo, statuses, progress, completedCount]);

  return (
    <div className="nk-live">
      <div className="nk-shell">
        {/* Header */}
        <div className="nk-title">
          <div>
            <h1>Live Operations Map</h1>
            <p>NeerKaavalan / Autonomous Water Intelligence & Battery-Recovery System</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="nk-mode-pills">
              <button
                className={`nk-mode-pill ${mode === 'AFTER_WP3' ? 'active' : ''}`}
                onClick={() => {
                  setMode('AFTER_WP3');
                  reset();
                }}
                title="Clears 1st, 2nd, and 3rd waypoints, skips WP-04 due to energy deficit, returns to dock, recharges, and finishes WP-04"
              >
                <Zap size={13} />
                <span>RTH after 2nd & 3rd WP</span>
              </button>

              <button
                className={`nk-mode-pill ${mode === 'AFTER_WP2' ? 'active' : ''}`}
                onClick={() => {
                  setMode('AFTER_WP2');
                  reset();
                }}
                title="Clears 1st and 2nd waypoints, skips WP-03 for dock recharge, then finishes WP-03 & WP-04"
              >
                <Zap size={13} />
                <span>RTH after 2nd WP</span>
              </button>

              <button
                className={`nk-mode-pill ${mode === 'DIRECT' ? 'active' : ''}`}
                onClick={() => {
                  setMode('DIRECT');
                  reset();
                }}
                title="Nominal continuous run without mid-mission recharge"
              >
                <Gauge size={13} />
                <span>Standard Run (Direct)</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#738997' }}>
              <span className="nk-live-dot" />
              DIGITAL TWIN ONLINE
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="nk-live-grid">
          {/* Left Rail: Status & Battery Engine */}
          <aside className="nk-rail">
            {/* Mission Phase Card */}
            <section className="nk-card nk-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nk-section-title">
                  <Activity size={14} color="#50caff" /> Mission Status
                </div>
                <span className="nk-label">Active Phase</span>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: phaseInfo.isRTH
                      ? 'rgba(245,158,11,.14)'
                      : phaseInfo.isCharging
                        ? 'rgba(53,230,155,.14)'
                        : 'rgba(53,230,155,.08)',
                    border: `1px solid ${
                      phaseInfo.isRTH
                        ? 'rgba(245,158,11,.4)'
                        : phaseInfo.isCharging
                          ? 'rgba(53,230,155,.5)'
                          : 'rgba(53,230,155,.2)'
                    }`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {phaseInfo.isCharging ? (
                    <Zap size={22} color="#35e69b" className="nk-charge-pulse" />
                  ) : phaseInfo.isRTH ? (
                    <BatteryWarning size={22} color="#f59e0b" />
                  ) : phaseInfo.phase === 'COMPLETED' ? (
                    <CheckCircle2 size={22} color="#35e69b" />
                  ) : (
                    <CircleDot size={22} color="#35e69b" />
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: phaseInfo.isRTH ? '#f59e0b' : phaseInfo.isCharging ? '#35e69b' : '#35e69b',
                    }}
                  >
                    {phaseInfo.title}
                  </div>
                  <div className="nk-muted" style={{ fontSize: 9, marginTop: 2 }}>
                    {phaseInfo.isRTH
                      ? mode === 'AFTER_WP3'
                        ? 'WP-04 skipped · Returning to dock'
                        : 'WP-03 skipped · Returning to dock'
                      : phaseInfo.isCharging
                        ? 'Rapid Shore Power Active (45W)'
                        : phaseInfo.phase === 'COMPLETED'
                          ? 'All 4 targets cleared & verified'
                          : 'Drone AI Sensing · USV Collection'}
                  </div>
                </div>
              </div>

              <div className="nk-bar">
                <div style={{ width: `${progress * 100}%`, background: phaseInfo.isRTH ? '#f59e0b' : '#36cfff' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: '#748995' }}>
                <span>{completedCount}/4 hotspots cleared</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </section>

            {/* BATTERY & ENERGY RECOVERY SYSTEM CARD */}
            <section className="nk-card nk-card-pad nk-battery-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nk-section-title">
                  {phaseInfo.isCharging ? (
                    <BatteryCharging size={15} color="#35e69b" />
                  ) : batteryLevel < 35 ? (
                    <BatteryWarning size={15} color="#f59e0b" />
                  ) : (
                    <Battery size={15} color="#55e9bd" />
                  )}
                  <span>Battery-Recovery Engine</span>
                </div>
                <span
                  className="nk-badge-status"
                  style={{
                    color: phaseInfo.isCharging ? '#35e69b' : batteryLevel < 35 ? '#f59e0b' : '#55e9bd',
                    background: phaseInfo.isCharging ? 'rgba(53,230,155,.15)' : 'rgba(255,255,255,.05)',
                  }}
                >
                  {phaseInfo.isCharging ? 'CHARGING' : phaseInfo.isRTH ? 'RTH ACTIVE' : 'MONITORED'}
                </span>
              </div>

              {/* Battery Meter */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div className="nk-kpi" style={{ color: phaseInfo.isCharging ? '#35e69b' : batteryLevel < 35 ? '#f59e0b' : '#55e9bd' }}>
                    {batteryLevel}%
                  </div>
                  <span style={{ fontSize: 10, color: '#889ea8' }}>
                    {phaseInfo.isCharging ? '+1.2% / sec' : 'Discharge: 1.8A'}
                  </span>
                </div>

                <div className="nk-battery-bar-wrap">
                  <div
                    className={`nk-battery-bar-fill ${phaseInfo.isCharging ? 'charging' : ''}`}
                    style={{
                      width: `${batteryLevel}%`,
                      background: phaseInfo.isCharging
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : batteryLevel < 30
                          ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                          : 'linear-gradient(90deg, #0ea5e9, #10b981)',
                    }}
                  />
                </div>
              </div>

              {/* Power Budget Feasibility Display */}
              <div className="nk-power-budget">
                <div className="nk-label" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>ROUND-TRIP ENERGY BUDGET</span>
                  <span>{evaluatedWaypoint.id}</span>
                </div>

                <div className="nk-budget-row">
                  <span>Navigation to target ({evalDistToWp}m)</span>
                  <b>{energyNav}%</b>
                </div>
                <div className="nk-budget-row">
                  <span>Skimmer Operation ({evaluatedWaypoint.area}m²)</span>
                  <b>{energyCollect}%</b>
                </div>
                <div className="nk-budget-row">
                  <span>Return to Home Base ({evalDistHome}m)</span>
                  <b>{energyReturnHome}%</b>
                </div>
                <div className="nk-budget-row">
                  <span>Mandatory Safety Reserve</span>
                  <b>{SAFETY_BUFFER_PERCENT}%</b>
                </div>

                <div className="nk-budget-divider" />

                <div className="nk-budget-row total">
                  <span>Total Round-Trip Required</span>
                  <b style={{ color: isBudgetSufficient ? '#55e9bd' : '#f59e0b' }}>{totalEnergyRequired}%</b>
                </div>

                <div className="nk-budget-verdict" style={{ borderColor: isBudgetSufficient ? 'rgba(53,230,155,.25)' : 'rgba(245,158,11,.3)' }}>
                  {isBudgetSufficient ? (
                    <>
                      <ShieldCheck size={14} color="#35e69b" />
                      <span style={{ color: '#35e69b' }}>CLEARED · Safe Round-Trip Guaranteed</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} color="#f59e0b" />
                      <span style={{ color: '#f59e0b' }}>DEFICIT DETECTED · Target Skipped for RTH</span>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Drone Sentinel Card */}
            <section className="nk-card nk-card-pad">
              <div className="nk-section-title">
                <Bot size={14} color="#50caff" /> Drone NK-D01
                <span style={{ marginLeft: 'auto', color: '#50caff', fontSize: 8 }}>SURVEILLANCE</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="nk-label">Aerial Sentinel Survey</div>
                <div className="nk-kpi" style={{ color: '#54caff', marginTop: 3 }}>
                  {droneCoverage}%
                </div>
                <div style={{ fontSize: 9, color: '#708694', marginTop: 2 }}>surface area inspected</div>
                <div style={{ marginTop: 8, fontSize: 9, color: '#8ba0aa' }}>
                  {detectedCount}/4 actionable hotspots published
                </div>
              </div>
            </section>

            {/* USV Card */}
            <section className="nk-card nk-card-pad">
              <div className="nk-section-title">
                <Ship size={14} color="#49e5ae" /> USV NK-U01
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 8,
                    color: phaseInfo.isCharging ? '#35e69b' : phaseInfo.isRTH ? '#f59e0b' : '#49e5ae',
                  }}
                >
                  {phaseInfo.isCharging
                    ? 'CHARGING'
                    : phaseInfo.isRTH
                      ? 'RETURNING HOME'
                      : phaseInfo.phase.includes('WP')
                        ? 'COLLECTING'
                        : 'STANDBY'}
                </span>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span className="nk-muted">Target</span>
                  <b>{phaseInfo.isRTH ? 'Home Station' : currentTarget?.id ?? 'Docked'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span className="nk-muted">Target Dist</span>
                  <b>{phaseInfo.isRTH ? `${distance(usvPosition, USV_BASE)} m` : `${targetDistance} m`}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span className="nk-muted">Home Station Dist</span>
                  <b>{distance(usvPosition, USV_BASE)} m</b>
                </div>
              </div>
            </section>
          </aside>

          {/* Center Map Canvas */}
          <section className="nk-card nk-map-wrap">
            <div className="nk-map-head">
              <div>
                <strong>Autonomous Lake Digital Twin · Velachery Lake</strong>
                <div>
                  <span style={{ fontSize: 11, color: '#7a92a0' }}>
                    {mode === 'AFTER_WP3'
                      ? 'Clears 1st, 2nd & 3rd waypoints, detects round-trip deficit for 4th target, returns to dock to recharge, and resumes'
                      : mode === 'AFTER_WP2'
                        ? 'Clears 1st & 2nd waypoints, detects round-trip deficit for 3rd target, returns to dock to recharge, and finishes remaining'
                        : 'Direct continuous sweep across all 4 lake hotspots without mid-mission recharge'}
                  </span>
                </div>
              </div>

              <div className="nk-controls">
                <button className="nk-btn nk-btn-primary" onClick={primaryAction}>
                  {progress >= 1 ? <RotateCcw size={12} /> : running ? <Pause size={12} /> : <Play size={12} />}
                  {progress >= 1 ? 'Replay' : running ? 'Pause' : 'Start Simulation'}
                </button>
                <button className="nk-btn" onClick={reset} title="Restart Simulation">
                  <RotateCcw size={12} />
                </button>
                <div className="nk-speed">
                  {[1, 2, 4].map((v) => (
                    <button key={v} className={speed === v ? 'on' : ''} onClick={() => setSpeed(v)}>
                      {v}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="nk-map">
              <div className="nk-grid" />
              <div className="nk-water" />
              <div className="nk-water2" />
              <div className="nk-lake-name">VELACHERY LAKE · DIGITAL TWIN</div>

              {/* DUAL-AGENT RECONNAISSANCE & DISPATCH BANNER */}
              <div className="nk-recon-banner">
                <div className="nk-recon-tag">
                  <ScanSearch size={12} color="#58c9ff" />
                  <span>AI RECON & DISPATCH PIPELINE</span>
                </div>
                <div className="nk-recon-msg">
                  {progress < 0.05 ? (
                    <span>
                      <strong>STEP 1:</strong> Drone NK-D01 scanning Sector 01 (SE Bay) · USV on standby at Shoreline Jetty.
                    </span>
                  ) : progress < 0.09 ? (
                    <span style={{ color: '#ffd166' }}>
                      <strong>TARGET DETECTED:</strong> WP-01 confirmed (95% AI) · GPS locked · USV dispatched to point!
                    </span>
                  ) : progress < 0.17 ? (
                    <span>
                      <strong>TRANSIT:</strong> USV sailing to WP-01 · Drone advancing to scan Sector 02 (NE Cove).
                    </span>
                  ) : progress < 0.25 ? (
                    <span>
                      <strong>COLLECTION & SCOUT:</strong> USV skimming WP-01 · Drone scanning & detecting WP-02 ahead.
                    </span>
                  ) : progress < 0.33 ? (
                    <span>
                      <strong>TRANSIT:</strong> WP-01 cleared · USV sailing to detected WP-02 · Drone scouting WP-03.
                    </span>
                  ) : progress < 0.41 ? (
                    <span>
                      <strong>COLLECTION & SCOUT:</strong> USV skimming WP-02 · Drone scanning & detecting WP-03.
                    </span>
                  ) : progress < 0.49 ? (
                    <span>
                      <strong>TRANSIT:</strong> WP-02 cleared · USV sailing to detected WP-03 · Drone scouting WP-04.
                    </span>
                  ) : progress < 0.57 ? (
                    <span>
                      <strong>COLLECTION & SCOUT:</strong> USV skimming WP-03 · Drone scanning & detecting WP-04.
                    </span>
                  ) : phaseInfo.isRTH ? (
                    <span style={{ color: '#f59e0b' }}>
                      <strong>BATTERY ALERT:</strong> WP-04 needs 38% (USV has 32%) · WP-04 deferred · USV returning to dock!
                    </span>
                  ) : phaseInfo.isCharging ? (
                    <span style={{ color: '#35e69b' }}>
                      <strong>SHORELINE RECHARGE:</strong> USV connected to 45W fast charger (19% → 96%) · Ready to resume WP-04.
                    </span>
                  ) : progress < 0.86 ? (
                    <span>
                      <strong>RESUMPTION:</strong> Fully charged USV dispatched to collect deferred WP-04.
                    </span>
                  ) : progress < 0.93 ? (
                    <span>
                      <strong>FINAL COLLECTION:</strong> USV skimming WP-04 microplastics · Drone monitoring from air.
                    </span>
                  ) : progress < 0.97 ? (
                    <span>
                      <strong>POST-CLEANUP AUDIT:</strong> All 4 hotspots cleared · USV returning to dock · Drone verifying.
                    </span>
                  ) : (
                    <span style={{ color: '#35e69b' }}>
                      <strong>MISSION COMPLETE:</strong> 100% Lake Restoration Verified · Both agents secure at base.
                    </span>
                  )}
                </div>
              </div>

              {/* Lake Sectors */}
              <div className="nk-sector" style={{ left: '52%', top: '56%', width: '38%', height: '32%' }}>
                <span>SECTOR 01 · SOUTH-EAST PLASTIC BAY</span>
              </div>
              <div className="nk-sector" style={{ left: '58%', top: '10%', width: '36%', height: '36%' }}>
                <span>SECTOR 02 · NORTH-EAST DEBRIS COVE</span>
              </div>
              <div className="nk-sector" style={{ left: '26%', top: '8%', width: '36%', height: '28%' }}>
                <span>SECTOR 03 · NORTH PACKAGING ZONE</span>
              </div>
              <div className="nk-sector" style={{ left: '8%', top: '30%', width: '34%', height: '36%' }}>
                <span>SECTOR 04 · WEST MICROPLASTICS CHANNEL</span>
              </div>

              {/* Trajectories SVG */}
              <svg className="nk-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="droneConeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#50baff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#50baff" stopOpacity="0.04" />
                  </linearGradient>
                  <radialGradient id="droneFootprintGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#50baff" stopOpacity="0.35" />
                    <stop offset="60%" stopColor="#50baff" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#50baff" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Drone flight path */}
                <path className="nk-drone-path" d={routePath(DRONE_ROUTE)} />

                {/* Shoreline Pier connecting the South-West lake bank to the charging berth */}
                <line
                  x1="5"
                  y1="94"
                  x2={baseXY.x}
                  y2={baseXY.y}
                  stroke="#35e69b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <circle cx="5" cy="94" r="2.8" fill="#35e69b" />
                <circle cx={baseXY.x} cy={baseXY.y} r="3.2" fill="#35e69b" opacity="0.6" />

                {/* DRONE AERIAL SCANNER BEAM CONE (Scans and reveals hotspots) */}
                <g className="nk-drone-scanner-beam">
                  <polygon
                    points={`${droneXY.x},${droneXY.y} ${Math.max(0, droneXY.x - 7.5)},${Math.min(100, droneXY.y + 6.5)} ${Math.min(100, droneXY.x + 7.5)},${Math.min(100, droneXY.y + 6.5)}`}
                    fill="url(#droneConeGrad)"
                    opacity={phaseInfo.droneScanning ? 0.9 : 0.25}
                  />
                  <ellipse
                    cx={droneXY.x}
                    cy={Math.min(100, droneXY.y + 6.5)}
                    rx="7.5"
                    ry="3.4"
                    fill="url(#droneFootprintGrad)"
                    stroke="#50baff"
                    strokeWidth="0.7"
                    strokeDasharray={phaseInfo.droneScanning ? '1.5 1' : '1 2'}
                  />
                  {phaseInfo.droneScanning && (
                    <ellipse
                      cx={droneXY.x}
                      cy={Math.min(100, droneXY.y + 6.5)}
                      rx="10"
                      ry="4.5"
                      fill="none"
                      stroke="#50baff"
                      strokeWidth="0.5"
                      opacity="0.6"
                      className="nk-drone-scanner-wave"
                    />
                  )}
                </g>

                {/* Trajectories based on mode */}
                {mode === 'AFTER_WP3' ? (
                  <>
                    {/* WP1 Path */}
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_BASE_TO_WP1)}
                      opacity={statuses[0] === 'PENDING' ? 0.1 : 0.85}
                    />

                    {/* WP1 to WP2 Path */}
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP1_TO_WP2)}
                      opacity={statuses[1] === 'PENDING' ? 0.1 : 0.85}
                    />

                    {/* WP2 to WP3 Path */}
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP2_TO_WP3)}
                      opacity={statuses[2] === 'PENDING' ? 0.1 : 0.85}
                    />

                    {/* Return To Home (RTH) Path from WP3 back to Base */}
                    <path
                      className="nk-rth-path"
                      d={routePath(ROUTE_RTH_FROM_WP3)}
                      opacity={progress >= 0.57 ? 0.95 : 0.15}
                    />

                    {/* Resumed Path from Base to WP4 */}
                    <path
                      className="nk-resume-path"
                      d={routePath(ROUTE_RESUME_TO_WP4)}
                      opacity={progress >= 0.77 ? 0.95 : 0.1}
                    />

                    {/* Return home verification path */}
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP4_TO_BASE)}
                      opacity={progress >= 0.93 ? 0.9 : 0.1}
                    />
                  </>
                ) : mode === 'AFTER_WP2' ? (
                  <>
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_BASE_TO_WP1)}
                      opacity={statuses[0] === 'PENDING' ? 0.1 : 0.85}
                    />
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP1_TO_WP2)}
                      opacity={statuses[1] === 'PENDING' ? 0.1 : 0.85}
                    />
                    <path
                      className="nk-rth-path"
                      d={routePath(ROUTE_RTH_FROM_WP2)}
                      opacity={progress >= 0.40 ? 0.95 : 0.15}
                    />
                    <path
                      className="nk-resume-path"
                      d={routePath(ROUTE_RESUME_TO_WP3)}
                      opacity={progress >= 0.62 ? 0.95 : 0.1}
                    />
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP3_TO_WP4)}
                      opacity={progress >= 0.80 ? 0.9 : 0.1}
                    />
                    <path
                      className="nk-usv-path"
                      d={routePath(ROUTE_WP4_TO_BASE)}
                      opacity={progress >= 0.94 ? 0.9 : 0.1}
                    />
                  </>
                ) : (
                  NOMINAL_ROUTES.map((route, i) => (
                    <path
                      key={i}
                      className="nk-usv-path"
                      d={routePath(route)}
                      opacity={statuses[i] === 'PENDING' ? 0.1 : 0.9}
                    />
                  ))
                )}

                {/* Collection halo on active target */}
                {currentTarget && phaseInfo.phase.includes('COLLECTING') && (
                  <circle
                    cx={project(currentTarget).x}
                    cy={project(currentTarget).y}
                    r="5.5"
                    fill="rgba(255,209,102,.08)"
                    stroke="#ffd166"
                    strokeDasharray="1.2 1"
                  />
                )}
              </svg>

              {/* SHORELINE CORNER CHARGING JETTY & DOCK */}
              <div
                className={`nk-home-dock ${phaseInfo.isCharging ? 'charging-dock-active' : ''}`}
                style={{ left: `${baseXY.x}%`, top: `${baseXY.y}%` }}
              >
                <div className="nk-dock-ring">
                  <Home size={16} />
                </div>
                <div className="nk-dock-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={11} color="#35e69b" />
                    <strong>SHORELINE CHARGING JETTY</strong>
                  </div>
                  <small>South-West Bank · 45W Shore Power Berth</small>
                </div>
              </div>

              {/* Waypoints Render: Only appears after Drone scans & detects it */}
              {WAYPOINTS.map((wp, index) => {
                const status = statuses[index];
                if (status === 'PENDING') return null;
                const p = project(wp);
                const color = statusColor(status);

                return (
                  <div className="nk-wp" key={wp.id} style={{ left: `${p.x}%`, top: `${p.y}%`, color }}>
                    <div
                      className={`nk-wp-ring ${status === 'ACTIVE' ? 'nk-pulse' : ''} ${
                        status === 'DEFERRED' ? 'nk-deferred-ring' : ''
                      } ${status === 'DETECTED' ? 'nk-detected-ring' : ''}`}
                    >
                      {status === 'COMPLETED' ? (
                        <Check size={18} />
                      ) : status === 'DEFERRED' ? (
                        <BatteryWarning size={16} color="#f59e0b" />
                      ) : status === 'DETECTED' ? (
                        <ScanSearch size={18} color="#ffd166" />
                      ) : (
                        <Target size={18} />
                      )}
                    </div>
                    <div className="nk-wp-label">
                      <strong>
                        {wp.id} <span style={{ color, marginLeft: 4 }}>{status}</span>
                      </strong>
                      <small>
                        {status === 'DETECTED'
                          ? `DRONE DETECTED · ${wp.type} (${wp.confidence}% AI)`
                          : status === 'DEFERRED'
                            ? 'LOW BATTERY · RTH RECHARGE QUEUED'
                            : `${wp.type} · ${wp.confidence}% AI`}
                      </small>
                    </div>
                  </div>
                );
              })}

              {/* Aerial Drone Marker */}
              <div className="nk-device" style={{ left: `${droneXY.x}%`, top: `${droneXY.y}%` }}>
                <div className="nk-device-core nk-drone-core">
                  <Bot size={20} />
                </div>
                <div className="nk-device-label">
                  <b style={{ color: '#58c9ff' }}>NK-D01</b>{' '}
                  <span className="nk-muted">{phaseInfo.droneScanning ? 'AI SCANNING' : 'AIR PATROL'}</span>
                </div>
              </div>

              {/* Surface Vehicle Marker */}
              <div
                className={`nk-device ${phaseInfo.isRTH ? 'nk-usv-rth' : ''} ${
                  phaseInfo.isCharging ? 'nk-usv-charging' : ''
                }`}
                style={{ left: `${usvXY.x}%`, top: `${usvXY.y}%` }}
              >
                <div
                  className="nk-device-core nk-usv-core"
                  style={{
                    borderColor: phaseInfo.isRTH ? '#f59e0b' : phaseInfo.isCharging ? '#35e69b' : 'rgba(255,255,255,.25)',
                    boxShadow: phaseInfo.isCharging
                      ? '0 0 25px rgba(53,230,155,.8)'
                      : phaseInfo.isRTH
                        ? '0 0 25px rgba(245,158,11,.6)'
                        : '0 0 20px rgba(50,220,255,.18)',
                  }}
                >
                  <Ship size={21} />
                </div>
                <div className="nk-device-label">
                  <b style={{ color: phaseInfo.isRTH ? '#f59e0b' : '#52e8b0' }}>NK-U01</b>{' '}
                  <span className="nk-muted">
                    {progress < (mode === 'AFTER_WP3' ? 0.09 : mode === 'AFTER_WP2' ? 0.08 : 0.08)
                      ? 'STANDBY (AWAITING DRONE)'
                      : phaseInfo.isCharging
                        ? 'DOCK CHARGING'
                        : phaseInfo.isRTH
                          ? 'RTH ACTIVE'
                          : phaseInfo.phase.includes('COLLECTING')
                            ? 'COLLECTING'
                            : phaseInfo.phase.includes('NAVIGATING')
                              ? 'NAVIGATING'
                              : 'STANDBY'}
                  </span>
                </div>
              </div>



              {/* Live Telemetry Box */}
              <div className="nk-live-telemetry">
                <div className="nk-label">Telemetry & Battery Stream</div>
                <div className="nk-telemetry-row">
                  <span className="nk-muted">Drone Recon</span>
                  <b style={{ color: '#58c9ff' }}>{phaseInfo.droneScanning ? 'AI SCANNING WATER' : 'AIR PATROL'}</b>
                </div>
                <div className="nk-telemetry-row">
                  <span className="nk-muted">USV State</span>
                  <b style={{ color: phaseInfo.isCharging ? '#35e69b' : phaseInfo.isRTH ? '#f59e0b' : '#55e9bd' }}>
                    {progress < (mode === 'AFTER_WP3' ? 0.09 : mode === 'AFTER_WP2' ? 0.08 : 0.08)
                      ? 'STANDBY AT DOCK'
                      : phaseInfo.isCharging
                        ? 'DOCK CHARGING'
                        : phaseInfo.isRTH
                          ? 'RTH TRANSIT'
                          : phaseInfo.phase.includes('NAV')
                            ? 'DISPATCHED'
                            : 'COLLECTING'}
                  </b>
                </div>
                <div className="nk-telemetry-row">
                  <span className="nk-muted">USV Coordinates</span>
                  <b style={{ color: '#4ee5ae' }}>
                    {usvPosition.lat.toFixed(4)}, {usvPosition.lng.toFixed(4)}
                  </b>
                </div>
                <div className="nk-telemetry-row">
                  <span className="nk-muted">USV Battery</span>
                  <b style={{ color: phaseInfo.isCharging ? '#35e69b' : batteryLevel < 35 ? '#f59e0b' : '#55e9bd' }}>
                    {batteryLevel}%
                  </b>
                </div>
                <div className="nk-telemetry-row">
                  <span className="nk-muted">Home Jetty Distance</span>
                  <b>{distance(usvPosition, USV_BASE)} m</b>
                </div>
              </div>
            </div>

            {/* Mission Flow Cards */}
            <div className="nk-flow">
              <div className="nk-flow-head">
                <div>
                  <div className="nk-flow-title">Autonomous Sequence · Battery Safety Architecture</div>
                  <div className="nk-flow-sub">
                    {mode === 'AFTER_WP3'
                      ? 'Clears WP-01, WP-02 & WP-03, evaluates WP-04 deficit, returns to dock, rapid charges, and resumes WP-04.'
                      : mode === 'AFTER_WP2'
                        ? 'Clears WP-01 & WP-02, evaluates WP-03 deficit, returns to dock, rapid charges, and resumes WP-03 & WP-04.'
                        : 'Nominal continuous sweep across all 4 lake hotspots.'}
                  </div>
                </div>
                <span className="nk-label">{phaseInfo.title}</span>
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

        {/* Bottom Cards: Waypoint Queue & Verification */}
        <div className="nk-bottom">
          <section className="nk-card nk-card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="nk-section-title">
                <ScanSearch size={14} color="#50caff" /> Progressive Waypoint Queue & Energy Feasibility
              </div>
              <span className="nk-label">{detectedCount}/4 DETECTED</span>
            </div>

            {WAYPOINTS.map((wp, index) => {
              const status = statuses[index];
              const color = statusColor(status);
              const distFromBase = distance(wp, USV_BASE);
              const totalCost = Math.round(
                distFromBase * 2 * PROPULSION_ENERGY_PER_METER + wp.area * COLLECTION_ENERGY_PER_SQ_M + SAFETY_BUFFER_PERCENT
              );

              return (
                <div className="nk-queue-row" key={wp.id}>
                  <div className="nk-queue-id">{wp.id}</div>
                  <div>
                    <div className="nk-queue-name">
                      {wp.type}
                      {status === 'DEFERRED' && (
                        <span style={{ marginLeft: 8, fontSize: 8, color: '#f59e0b', fontWeight: 800 }}>
                          [SKIPPED FOR RECHARGE]
                        </span>
                      )}
                    </div>
                    <div className="nk-queue-meta">
                      {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)} · {wp.area} m² · Required Energy Budget: ~{totalCost}%
                    </div>
                  </div>
                  <span className="nk-status" style={{ color, background: `${color}16` }}>
                    {status}
                  </span>
                </div>
              );
            })}
          </section>

          <section className="nk-card nk-card-pad">
            <div className="nk-section-title">
              <Sparkles size={14} color="#ffd166" /> Cleanup Verification & Reduction
            </div>
            <div className="nk-ver-grid">
              <div className="nk-ver-box">
                <div className="nk-label">Initial Waste Area</div>
                <div className="nk-ver-value">84.9 m²</div>
              </div>
              <div className="nk-ver-box">
                <div className="nk-label">Remaining Area</div>
                <div className="nk-ver-value" style={{ color: '#35e69b' }}>
                  {afterArea.toFixed(1)} m²
                </div>
              </div>
            </div>
            <div className="nk-bar">
              <div style={{ width: `${Math.min(100, Math.max(0, reduction))}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 9 }}>
              <span className="nk-muted">Surface waste reduction</span>
              <b style={{ color: '#35e69b' }}>{reduction.toFixed(1)}%</b>
            </div>
          </section>
        </div>

        {/* Feature summary cards */}
        <div className="nk-mini-grid">
          <section className="nk-card nk-mini">
            <div className="nk-section-title">
              <Crosshair size={14} color="#50caff" /> Pre-Dispatch Feasibility
            </div>
            <div className="nk-mini-value">
              {mode === 'AFTER_WP3' ? 'WP1, WP2 & WP3 Cleared First' : 'WP1 & WP2 Cleared First'}
            </div>
            <div className="nk-muted" style={{ fontSize: 9, lineHeight: 1.6, marginTop: 5 }}>
              USV calculates round-trip energy (transit + skimming + return + 15% reserve) before attempting every hotspot.
            </div>
          </section>

          <section className="nk-card nk-mini">
            <div className="nk-section-title">
              <Zap size={14} color="#f59e0b" /> Mid-Mission RTH & Recharge
            </div>
            <div className="nk-mini-value">
              {mode === 'AFTER_WP3' ? 'Defers WP-04 → Docks → Resumes' : 'Defers WP-03 → Docks → Resumes'}
            </div>
            <div className="nk-muted" style={{ fontSize: 9, lineHeight: 1.6, marginTop: 5 }}>
              Prevents battery depletion by skipping unfeasible points, rapid-charging to 96% at home dock, then finishing the mission.
            </div>
          </section>

          <section className="nk-card nk-mini">
            <div className="nk-section-title">
              <Timer size={14} color="#35e69b" /> Zero-Stranding Guarantee
            </div>
            <div className="nk-mini-value">15% Safety Buffer Maintained</div>
            <div className="nk-muted" style={{ fontSize: 9, lineHeight: 1.6, marginTop: 5 }}>
              Guarantees the autonomous vessel always has enough reserve power to return against lake surface currents.
            </div>
          </section>
        </div>
      </div>

      {/* Embedded High-Fidelity CSS */}
      <style>{`
        .nk-live {
          min-height: calc(100vh - 96px);
          background: #050b12;
          color: #e8f3f7;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .nk-shell {
          max-width: 1800px;
          margin: 0 auto;
          padding: 18px;
        }
        .nk-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .nk-title h1 {
          font-size: 20px;
          line-height: 1.2;
          margin: 0;
          font-weight: 750;
          letter-spacing: -0.02em;
        }
        .nk-title p {
          margin: 4px 0 0;
          color: #6f8494;
          font-size: 12px;
        }
        .nk-mode-pills {
          display: flex;
          gap: 6px;
          background: #091722;
          padding: 3px;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,.09);
        }
        .nk-mode-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 0;
          background: transparent;
          color: #7b92a2;
          padding: 6px 11px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 650;
          cursor: pointer;
          transition: all .15s ease;
        }
        .nk-mode-pill:hover {
          color: #e2f1f8;
        }
        .nk-mode-pill.active {
          background: rgba(53,230,155,.12);
          color: #35e69b;
          border: 1px solid rgba(53,230,155,.3);
          box-shadow: 0 0 14px rgba(53,230,155,.15);
        }
        .nk-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 99px;
          background: #35e69b;
          display: inline-block;
          box-shadow: 0 0 12px #35e69b;
          animation: nkPulseDot 2s infinite ease-in-out;
        }
        @keyframes nkPulseDot {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .nk-live-grid {
          display: grid;
          grid-template-columns: 295px minmax(0, 1fr);
          gap: 14px;
        }
        .nk-rail {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nk-card {
          background: linear-gradient(180deg, rgba(10,27,39,.96), rgba(6,18,27,.96));
          border: 1px solid rgba(103,190,224,.13);
          border-radius: 13px;
          box-shadow: 0 12px 35px rgba(0,0,0,.18);
        }
        .nk-card-pad {
          padding: 14px;
        }
        .nk-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .15em;
          color: #617888;
        }
        .nk-muted {
          color: #728897;
        }
        .nk-kpi {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .nk-badge-status {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
          padding: 3px 7px;
          border-radius: 6px;
        }
        .nk-battery-bar-wrap {
          height: 8px;
          background: #081a26;
          border-radius: 99px;
          border: 1px solid rgba(255,255,255,.08);
          overflow: hidden;
          margin-top: 8px;
        }
        .nk-battery-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width .3s ease;
        }
        .nk-battery-bar-fill.charging {
          box-shadow: 0 0 14px #35e69b;
          animation: nkChargeBarPulse 1s infinite alternate;
        }
        @keyframes nkChargeBarPulse {
          from { filter: brightness(1); }
          to { filter: brightness(1.3); }
        }
        .nk-power-budget {
          margin-top: 12px;
          background: rgba(4,16,25,.65);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 9px;
          padding: 10px;
        }
        .nk-budget-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #8da4b0;
          margin-top: 4px;
        }
        .nk-budget-row.total {
          font-size: 10px;
          font-weight: 800;
          color: #e2f1f8;
          margin-top: 6px;
        }
        .nk-budget-divider {
          height: 1px;
          background: rgba(255,255,255,.08);
          margin: 6px 0;
        }
        .nk-budget-verdict {
          margin-top: 9px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 750;
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,.02);
          border: 1px solid transparent;
        }
        .nk-map-wrap {
          overflow: hidden;
        }
        .nk-map-head {
          padding: 12px 15px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .nk-map-head strong {
          font-size: 14px;
        }
        .nk-map-head span {
          font-size: 11px;
          color: #708694;
        }
        .nk-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .nk-btn {
          border: 1px solid rgba(255,255,255,.1);
          background: #0b1d29;
          color: #bcd0da;
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .nk-btn:hover {
          background: #102a39;
        }
        .nk-btn-primary {
          background: #19d3a2;
          color: #03130f;
          border-color: #19d3a2;
        }
        .nk-speed {
          display: flex;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 7px;
          overflow: hidden;
        }
        .nk-speed button {
          border: 0;
          border-right: 1px solid rgba(255,255,255,.08);
          background: #091722;
          color: #718896;
          padding: 7px 9px;
          font-size: 10px;
          cursor: pointer;
        }
        .nk-speed button:last-child {
          border-right: 0;
        }
        .nk-speed .on {
          background: rgba(46,224,174,.14);
          color: #55e9bd;
        }
        .nk-map {
          position: relative;
          min-height: 600px;
          height: min(68vh, 690px);
          overflow: hidden;
          background: radial-gradient(ellipse at 53% 48%, rgba(17,123,155,.42), rgba(4,35,51,.92) 58%, #03131d 100%);
        }
        .nk-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(117,194,220,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(117,194,220,.055) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .nk-water {
          position: absolute;
          left: 7%;
          right: 6%;
          top: 7%;
          bottom: 7%;
          border: 1px solid rgba(76,204,235,.38);
          border-radius: 46% 54% 50% 48% / 48% 45% 55% 52%;
          background: radial-gradient(ellipse at 52% 47%, rgba(10,107,139,.42), rgba(3,44,62,.48) 58%, rgba(2,24,35,.18));
          box-shadow: inset 0 0 100px rgba(42,188,226,.08);
        }
        .nk-water2 {
          position: absolute;
          left: 11%;
          right: 10%;
          top: 12%;
          bottom: 12%;
          border: 1px solid rgba(100,207,229,.08);
          border-radius: 48% 52% 45% 55%;
        }
        .nk-lake-name {
          position: absolute;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%);
          font-size: 25px;
          font-weight: 800;
          letter-spacing: .16em;
          color: rgba(164,228,242,.12);
          white-space: nowrap;
        }
        .nk-sector {
          position: absolute;
          border: 1px dashed rgba(79,198,226,.15);
          border-radius: 15px;
        }
        .nk-sector span {
          position: absolute;
          top: 8px;
          left: 10px;
          font-size: 9px;
          letter-spacing: .1em;
          color: rgba(142,214,232,.46);
        }
        .nk-path {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .nk-drone-path {
          stroke: #50baff;
          stroke-width: .3;
          stroke-dasharray: 1 1;
          fill: none;
          filter: drop-shadow(0 0 2px rgba(80,186,255,.4));
        }
        .nk-usv-path {
          stroke: #3be4a5;
          stroke-width: .4;
          stroke-dasharray: 1 1;
          fill: none;
          filter: drop-shadow(0 0 2px rgba(59,228,165,.35));
        }
        .nk-rth-path {
          stroke: #f59e0b;
          stroke-width: .5;
          stroke-dasharray: 1.5 1;
          fill: none;
          filter: drop-shadow(0 0 3px rgba(245,158,11,.6));
        }
        .nk-resume-path {
          stroke: #38bdf8;
          stroke-width: .5;
          stroke-dasharray: 1.5 1;
          fill: none;
          filter: drop-shadow(0 0 3px rgba(56,189,248,.6));
        }
        .nk-home-dock {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 9;
        }
        .nk-dock-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(3,19,29,.85);
          border: 2px solid #35e69b;
          color: #35e69b;
          box-shadow: 0 0 20px rgba(53,230,155,.3);
        }
        .charging-dock-active .nk-dock-ring {
          box-shadow: 0 0 32px rgba(53,230,155,.8);
          animation: nkDockPulse 1.2s infinite alternate;
        }
        @keyframes nkDockPulse {
          from { transform: scale(1); border-color: #35e69b; }
          to { transform: scale(1.15); border-color: #55e9bd; }
        }
        .nk-dock-label {
          position: absolute;
          left: 48px;
          top: -3px;
          white-space: nowrap;
          background: rgba(3,13,21,.94);
          border: 1px solid rgba(53,230,155,.3);
          border-radius: 7px;
          padding: 5px 8px;
          box-shadow: 0 8px 18px rgba(0,0,0,.3);
        }
        .nk-dock-label strong {
          font-size: 10px;
          color: #35e69b;
        }
        .nk-dock-label small {
          display: block;
          font-size: 8px;
          color: #7d94a2;
          margin-top: 1px;
        }
        .nk-device {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
        }
        .nk-device-core {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.25);
          box-shadow: 0 0 28px rgba(50,220,255,.18);
        }
        .nk-drone-core {
          background: #092b42;
          color: #65c9ff;
        }
        .nk-usv-core {
          background: #07382f;
          color: #55e9b5;
        }
        .nk-device-label {
          position: absolute;
          left: 31px;
          top: -5px;
          white-space: nowrap;
          background: rgba(3,13,21,.94);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 6px;
          padding: 5px 7px;
          font-size: 9px;
          box-shadow: 0 8px 18px rgba(0,0,0,.2);
        }
        .nk-wp {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 8;
        }
        .nk-wp-ring {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid currentColor;
          background: rgba(3,15,23,.72);
          box-shadow: 0 0 26px currentColor;
        }
        .nk-deferred-ring {
          border-style: dashed;
          animation: nkDeferredPulse 1.8s infinite;
        }
        @keyframes nkDeferredPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; transform: scale(1.06); }
        }
        .nk-detected-ring {
          border-color: #ffd166 !important;
          color: #ffd166 !important;
          box-shadow: 0 0 24px rgba(255, 209, 102, 0.6) !important;
          animation: nkDetectedPulse 1.4s infinite alternate;
        }
        @keyframes nkDetectedPulse {
          0% { transform: scale(0.96); box-shadow: 0 0 14px rgba(255, 209, 102, 0.4); }
          100% { transform: scale(1.1); box-shadow: 0 0 28px rgba(255, 209, 102, 0.85); }
        }
        .nk-recon-banner {
          position: absolute;
          top: 14px;
          left: 14px;
          max-width: 440px;
          background: rgba(3, 14, 23, 0.94);
          border: 1px solid rgba(88, 201, 255, 0.35);
          border-radius: 9px;
          padding: 8px 12px;
          z-index: 12;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
        }
        .nk-recon-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #58c9ff;
          margin-bottom: 3px;
        }
        .nk-recon-msg {
          font-size: 10.5px;
          line-height: 1.4;
          color: #e2f1f8;
        }
        @keyframes nkScannerWave {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .nk-drone-scanner-wave {
          transform-origin: center;
          animation: nkScannerWave 1.6s infinite ease-out;
        }
        .nk-wp-label {
          position: absolute;
          left: 33px;
          top: -5px;
          white-space: nowrap;
          background: rgba(3,13,21,.96);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 6px;
          padding: 6px 8px;
        }
        .nk-wp-label strong {
          display: block;
          font-size: 10px;
        }
        .nk-wp-label small {
          display: block;
          font-size: 8px;
          margin-top: 2px;
          color: #7e93a0;
        }
        .nk-legend {
          position: absolute;
          right: 14px;
          bottom: 165px;
          width: 205px;
          background: rgba(4,15,24,.92);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 11px;
          z-index: 12;
        }
        .nk-legend h4 {
          margin: 0 0 9px;
          font-size: 11px;
        }
        .nk-legend-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          color: #8095a2;
          margin-top: 7px;
        }
        .nk-live-telemetry {
          position: absolute;
          right: 14px;
          bottom: 14px;
          width: 215px;
          background: rgba(4,15,24,.92);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 11px;
          z-index: 12;
        }
        .nk-telemetry-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin-top: 7px;
        }
        .nk-flow {
          padding: 13px;
          border-top: 1px solid rgba(255,255,255,.08);
          background: #06121b;
        }
        .nk-flow-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 9px;
        }
        .nk-flow-title {
          font-size: 12px;
          font-weight: 750;
        }
        .nk-flow-sub {
          font-size: 9px;
          color: #657b88;
          margin-top: 3px;
        }
        .nk-flow-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 7px;
        }
        .nk-flow-item {
          min-height: 92px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          padding: 10px;
          background: rgba(255,255,255,.015);
        }
        .nk-flow-item.active {
          border-color: rgba(40,220,180,.5);
          background: rgba(32,220,170,.07);
        }
        .nk-flow-item.done {
          border-color: rgba(48,222,158,.22);
          background: rgba(48,222,158,.035);
        }
        .nk-step {
          width: 25px;
          height: 25px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 800;
          background: #10232e;
          color: #718996;
        }
        .nk-flow-item.active .nk-step {
          background: #24d9a5;
          color: #03130f;
        }
        .nk-flow-item.done .nk-step {
          background: rgba(49,226,160,.13);
          color: #4fe5b0;
        }
        .nk-flow-name {
          font-size: 10px;
          font-weight: 700;
          margin-top: 8px;
        }
        .nk-flow-detail {
          font-size: 8px;
          color: #6e8490;
          margin-top: 6px;
        }
        .nk-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 12px;
          margin-top: 12px;
        }
        .nk-queue-row {
          display: grid;
          grid-template-columns: 65px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 9px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px;
          background: rgba(255,255,255,.018);
          margin-top: 7px;
        }
        .nk-queue-id {
          font-size: 11px;
          font-weight: 800;
        }
        .nk-queue-name {
          font-size: 10px;
          font-weight: 650;
        }
        .nk-queue-meta {
          font-size: 8px;
          color: #657b88;
          margin-top: 3px;
        }
        .nk-status {
          font-size: 8px;
          font-weight: 800;
          border-radius: 20px;
          padding: 4px 7px;
        }
        .nk-section-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 750;
        }
        .nk-ver-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }
        .nk-ver-box {
          padding: 10px;
          border-radius: 8px;
          background: rgba(255,255,255,.025);
        }
        .nk-ver-value {
          font-size: 18px;
          font-weight: 800;
          margin-top: 3px;
        }
        .nk-bar {
          height: 6px;
          border-radius: 20px;
          background: #12232e;
          overflow: hidden;
          margin-top: 12px;
        }
        .nk-bar > div {
          height: 100%;
          background: #35e69b;
        }
        .nk-mini-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 12px;
        }
        .nk-mini {
          padding: 13px;
        }
        .nk-mini-value {
          font-size: 13px;
          font-weight: 750;
          margin-top: 8px;
        }
        .nk-pulse {
          animation: nkPulse 1.5s ease-in-out infinite;
        }
        @keyframes nkPulse {
          0%, 100% { transform: scale(.9); opacity: .45; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @media(max-width: 1150px) {
          .nk-live-grid { grid-template-columns: 1fr; }
          .nk-rail { display: grid; grid-template-columns: repeat(2, 1fr); }
          .nk-flow-grid { grid-template-columns: repeat(3, 1fr); }
          .nk-bottom { grid-template-columns: 1fr; }
        }
        @media(max-width: 760px) {
          .nk-shell { padding: 10px; }
          .nk-rail { grid-template-columns: 1fr; }
          .nk-flow-grid { grid-template-columns: repeat(2, 1fr); }
          .nk-map { min-height: 500px; }
          .nk-legend { width: 155px; }
          .nk-lake-name { font-size: 16px; }
          .nk-mini-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
