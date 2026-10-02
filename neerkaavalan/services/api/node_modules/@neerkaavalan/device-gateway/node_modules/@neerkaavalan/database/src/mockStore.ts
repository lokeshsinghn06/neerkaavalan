// High-fidelity in-memory simulated database for NeerKaavalan
// Ensures the entire platform operates smoothly with live, realistic data
// even when Docker / PostgreSQL is not running.

export interface MockWaterBody {
  id: string;
  name: string;
  type: string;
  description: string;
  area_sq_m: number;
  center_latitude: number;
  center_longitude: number;
  boundary: any;
  center_point: any;
  status: string;
}

export interface MockDevice {
  id: string;
  device_code: string;
  name: string;
  device_type: 'drone' | 'usv';
  model: string;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
  operating_mode: 'SIMULATION' | 'REAL';
  battery_percent: number;
  latitude: number;
  longitude: number;
  speed_mps: number;
  heading_deg: number;
  updated_at: string;
}

export interface MockDetection {
  id: string;
  scan_id: string;
  class_name: string;
  confidence: number;
  area_sq_m: number;
  centroid: { type: 'Point'; coordinates: [number, number] };
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  image_url: string;
  scan_type: string;
  image_count: number;
  coverage_percent: number;
  water_body_id: string;
  water_body_name: string;
}

export interface MockHotspot {
  id: string;
  water_body_id: string;
  water_body_name: string;
  name: string;
  radius_m: number;
  waste_area_sq_m: number;
  waste_density: number;
  confidence: number;
  priority_score: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'PLANNED' | 'CLEARED' | 'DETECTED';
  first_detected_at: string;
  last_detected_at: string;
  location: { type: 'Point'; coordinates: [number, number] };
}

export interface MockMission {
  id: string;
  mission_code: string;
  water_body_id: string;
  water_body_name: string;
  hotspot_id: string | null;
  hotspot_name: string | null;
  device_id: string;
  device_code: string;
  device_name: string;
  mission_type: string;
  status: string;
  priority: string;
  recovery_status: string;
  estimated_distance_m: number;
  estimated_duration_sec: number;
  actual_distance_m: number;
  actual_duration_sec: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  last_error_message?: string | null;
}

export interface MockTelemetry {
  id: number;
  device_id: string;
  device_code: string;
  device_name: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed_mps?: number;
  heading_deg?: number;
  battery_percent?: number;
}

export interface MockVerification {
  verification_id: string;
  mission_id: string;
  mission_code: string;
  mission_status: string;
  mission_priority: string;
  actual_distance_m: number;
  actual_duration_sec: number;
  started_at: string;
  completed_at: string;
  hotspot_id: string;
  hotspot_name: string;
  hotspot_severity: string;
  priority_score: number;
  hotspot_waste_area_sq_m: number;
  hotspot_confidence: number;
  hotspot_radius_m: number;
  collection_id: string;
  estimated_waste_kg: number;
  collected_waste_kg: number;
  collection_efficiency: number;
  collection_status: string;
  collection_started_at: string;
  collection_completed_at: string;
  before_waste_area_sq_m: number;
  after_waste_area_sq_m: number;
  reduction_percent: number;
  verification_confidence: number;
  verified: boolean;
  verified_at: string;
}

class InMemoryStore {
  waterBodies: MockWaterBody[] = [
    {
      id: 'wb-001',
      name: 'Velachery Lake',
      type: 'Urban Lake',
      description: 'Primary urban catchment and eco-restoration water body in South Chennai.',
      area_sq_m: 265000,
      center_latitude: 13.0525,
      center_longitude: 80.2125,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [80.2097, 13.0498],
              [80.2155, 13.0505],
              [80.2148, 13.0545],
              [80.2118, 13.0552],
              [80.2097, 13.0498],
            ],
          ],
        ],
      },
      center_point: { type: 'Point', coordinates: [80.2125, 13.0525] },
      status: 'ACTIVE',
    },
    {
      id: 'wb-002',
      name: 'Porur Lake',
      type: 'Reservoir',
      description: 'Major freshwater drinking reservoir serving southwestern Chennai metropolitan.',
      area_sq_m: 800000,
      center_latitude: 13.0335,
      center_longitude: 80.1582,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [80.152, 13.028],
              [80.165, 13.031],
              [80.162, 13.041],
              [80.151, 13.038],
              [80.152, 13.028],
            ],
          ],
        ],
      },
      center_point: { type: 'Point', coordinates: [80.1582, 13.0335] },
      status: 'ACTIVE',
    },
    {
      id: 'wb-003',
      name: 'Chembarambakkam Lake',
      type: 'Primary Reservoir',
      description: 'Key surface water source for Chennai with extensive shoreline monitoring.',
      area_sq_m: 3800000,
      center_latitude: 13.0112,
      center_longitude: 80.0573,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [80.045, 13.002],
              [80.072, 13.008],
              [80.068, 13.025],
              [80.042, 13.018],
              [80.045, 13.002],
            ],
          ],
        ],
      },
      center_point: { type: 'Point', coordinates: [80.0573, 13.0112] },
      status: 'ACTIVE',
    },
    {
      id: 'wb-004',
      name: 'Korattur Lake',
      type: 'Wetland Lake',
      description: 'North Chennai industrial buffer wetland with automated waste barrier monitoring.',
      area_sq_m: 990000,
      center_latitude: 13.118,
      center_longitude: 80.178,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [80.171, 13.112],
              [80.186, 13.115],
              [80.183, 13.125],
              [80.169, 13.122],
              [80.171, 13.112],
            ],
          ],
        ],
      },
      center_point: { type: 'Point', coordinates: [80.178, 13.118] },
      status: 'ACTIVE',
    },
    {
      id: 'wb-005',
      name: 'Pallikaranai Marshland',
      type: 'Ecological Reserve',
      description: 'Ramsar wetland site receiving urban stormwater runoff with high plastic density.',
      area_sq_m: 1200000,
      center_latitude: 12.9348,
      center_longitude: 80.2173,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [80.211, 12.928],
              [80.225, 12.932],
              [80.222, 12.942],
              [80.208, 12.939],
              [80.211, 12.928],
            ],
          ],
        ],
      },
      center_point: { type: 'Point', coordinates: [80.2173, 12.9348] },
      status: 'ACTIVE',
    },
  ];

  devices: MockDevice[] = [
    {
      id: 'dev-001',
      device_code: 'NK-U01',
      name: 'NeerKaavalan Surface Drone 01',
      device_type: 'usv',
      model: 'NeerKaavalan USV-X1',
      status: 'ONLINE',
      operating_mode: 'SIMULATION',
      battery_percent: 88.5,
      latitude: 13.0526,
      longitude: 80.2131,
      speed_mps: 1.85,
      heading_deg: 42.0,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'dev-002',
      device_code: 'NK-D01',
      name: 'NeerKaavalan Aerial Sentinel 01',
      device_type: 'drone',
      model: 'NeerKaavalan Quad-Perception',
      status: 'ONLINE',
      operating_mode: 'SIMULATION',
      battery_percent: 74.0,
      latitude: 13.0534,
      longitude: 80.2141,
      speed_mps: 4.5,
      heading_deg: 118.0,
      updated_at: new Date().toISOString(),
    },
  ];

  detections: MockDetection[] = [
    {
      id: 'det-001',
      scan_id: 'scan-001',
      class_name: 'Plastic Waste Clustered',
      confidence: 0.942,
      area_sq_m: 18.5,
      centroid: { type: 'Point', coordinates: [80.2132, 13.0528] },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [80.213, 13.0526],
            [80.2134, 13.0526],
            [80.2135, 13.053],
            [80.2131, 13.053],
            [80.213, 13.0526],
          ],
        ],
      },
      image_url: '/assets/drone-scans/scan_01.jpg',
      scan_type: 'AERIAL_SURVEILLANCE',
      image_count: 142,
      coverage_percent: 94.6,
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
    },
    {
      id: 'det-002',
      scan_id: 'scan-001',
      class_name: 'Mixed Floating Waste',
      confidence: 0.895,
      area_sq_m: 32.7,
      centroid: { type: 'Point', coordinates: [80.2141, 13.0534] },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [80.2138, 13.0532],
            [80.2144, 13.0532],
            [80.2145, 13.0537],
            [80.2139, 13.0537],
            [80.2138, 13.0532],
          ],
        ],
      },
      image_url: '/assets/drone-scans/scan_02.jpg',
      scan_type: 'AERIAL_SURVEILLANCE',
      image_count: 142,
      coverage_percent: 94.6,
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
    },
    {
      id: 'det-003',
      scan_id: 'scan-001',
      class_name: 'Bottle Waste & Containers',
      confidence: 0.912,
      area_sq_m: 11.2,
      centroid: { type: 'Point', coordinates: [80.2118, 13.054] },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [80.2116, 13.0538],
            [80.212, 13.0538],
            [80.2121, 13.0542],
            [80.2117, 13.0542],
            [80.2116, 13.0538],
          ],
        ],
      },
      image_url: '/assets/drone-scans/scan_03.jpg',
      scan_type: 'AERIAL_SURVEILLANCE',
      image_count: 142,
      coverage_percent: 94.6,
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
    },
    {
      id: 'det-004',
      scan_id: 'scan-002',
      class_name: 'Discarded Net / Entanglement Hazard',
      confidence: 0.865,
      area_sq_m: 24.3,
      centroid: { type: 'Point', coordinates: [80.2128, 13.0522] },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [80.2126, 13.052],
            [80.213, 13.052],
            [80.2131, 13.0524],
            [80.2127, 13.0524],
            [80.2126, 13.052],
          ],
        ],
      },
      image_url: '/assets/drone-scans/scan_04.jpg',
      scan_type: 'AERIAL_SURVEILLANCE',
      image_count: 98,
      coverage_percent: 91.2,
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
    },
    {
      id: 'det-005',
      scan_id: 'scan-003',
      class_name: 'Thermocol & Expanded Polystyrene',
      confidence: 0.825,
      area_sq_m: 9.8,
      centroid: { type: 'Point', coordinates: [80.2138, 13.0516] },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [80.2136, 13.0514],
            [80.214, 13.0514],
            [80.2141, 13.0518],
            [80.2137, 13.0518],
            [80.2136, 13.0514],
          ],
        ],
      },
      image_url: '/assets/drone-scans/scan_05.jpg',
      scan_type: 'AERIAL_SURVEILLANCE',
      image_count: 110,
      coverage_percent: 88.0,
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
    },
  ];

  hotspots: MockHotspot[] = [
    {
      id: 'hs-001',
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
      name: 'Sector A — Northeast Waste Influx',
      radius_m: 25.0,
      waste_area_sq_m: 64.2,
      waste_density: 0.88,
      confidence: 94.2,
      priority_score: 95.4,
      severity: 'CRITICAL',
      status: 'ACTIVE',
      first_detected_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      last_detected_at: new Date().toISOString(),
      location: { type: 'Point', coordinates: [80.2132, 13.0528] },
    },
    {
      id: 'hs-002',
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
      name: 'Sector B — Inlet Debris Bank',
      radius_m: 30.0,
      waste_area_sq_m: 42.8,
      waste_density: 0.76,
      confidence: 89.5,
      priority_score: 87.1,
      severity: 'HIGH',
      status: 'ACTIVE',
      first_detected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      last_detected_at: new Date().toISOString(),
      location: { type: 'Point', coordinates: [80.2141, 13.0534] },
    },
    {
      id: 'hs-003',
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
      name: 'Sector C — Western Embankment Litter',
      radius_m: 20.0,
      waste_area_sq_m: 28.5,
      waste_density: 0.54,
      confidence: 85.0,
      priority_score: 72.3,
      severity: 'MEDIUM',
      status: 'PLANNED',
      first_detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      last_detected_at: new Date().toISOString(),
      location: { type: 'Point', coordinates: [80.2118, 13.054] },
    },
  ];

  missions: MockMission[] = [
    {
      id: 'mis-001',
      mission_code: 'NK-M001',
      water_body_id: 'wb-001',
      water_body_name: 'Velachery Lake',
      hotspot_id: 'hs-001',
      hotspot_name: 'Sector A — Northeast Waste Influx',
      device_id: 'dev-001',
      device_code: 'NK-U01',
      device_name: 'NeerKaavalan Surface Drone 01',
      mission_type: 'CLEANUP',
      status: 'NAVIGATING',
      priority: 'HIGH',
      recovery_status: 'NONE',
      estimated_distance_m: 342,
      estimated_duration_sec: 228,
      actual_distance_m: 145,
      actual_duration_sec: 97,
      started_at: new Date(Date.now() - 600000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      last_error_message: null,
    },
    {
      id: 'mis-002',
      mission_code: 'NK-M002',
      water_body_id: 'wb-002',
      water_body_name: 'Porur Lake',
      hotspot_id: 'hs-002',
      hotspot_name: 'Sector B — Inlet Debris Bank',
      device_id: 'dev-001',
      device_code: 'NK-U01',
      device_name: 'NeerKaavalan Surface Drone 01',
      mission_type: 'CLEANUP',
      status: 'COMPLETED',
      priority: 'NORMAL',
      recovery_status: 'NONE',
      estimated_distance_m: 520,
      estimated_duration_sec: 350,
      actual_distance_m: 512,
      actual_duration_sec: 340,
      started_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 86400000 + 350000).toISOString(),
      created_at: new Date(Date.now() - 86400000 - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 86400000 + 350000).toISOString(),
      last_error_message: null,
    },
  ];

  telemetry: MockTelemetry[] = [];

  verification: MockVerification = {
    verification_id: 'ver-001',
    mission_id: 'mis-002',
    mission_code: 'NK-M002',
    mission_status: 'COMPLETED',
    mission_priority: 'HIGH',
    actual_distance_m: 512,
    actual_duration_sec: 340,
    started_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 86400000 + 350000).toISOString(),
    hotspot_id: 'hs-002',
    hotspot_name: 'Sector B — Inlet Debris Bank',
    hotspot_severity: 'HIGH',
    priority_score: 87.1,
    hotspot_waste_area_sq_m: 48.5,
    hotspot_confidence: 91.2,
    hotspot_radius_m: 30.0,
    collection_id: 'col-001',
    estimated_waste_kg: 52.0,
    collected_waste_kg: 49.8,
    collection_efficiency: 95.8,
    collection_status: 'COMPLETED',
    collection_started_at: new Date(Date.now() - 86400000).toISOString(),
    collection_completed_at: new Date(Date.now() - 86400000 + 350000).toISOString(),
    before_waste_area_sq_m: 48.5,
    after_waste_area_sq_m: 2.1,
    reduction_percent: 95.7,
    verification_confidence: 0.962,
    verified: true,
    verified_at: new Date(Date.now() - 86400000 + 400000).toISOString(),
  };

  private telemetryTimer: any = null;
  private simStep = 0;

  // Path coordinates around Velachery Lake for real-time live simulation
  private simRoute = [
    { lat: 13.0525, lng: 80.2125, heading: 42, speed: 1.8 },
    { lat: 13.0527, lng: 80.2128, heading: 45, speed: 1.9 },
    { lat: 13.0529, lng: 80.2131, heading: 50, speed: 1.8 },
    { lat: 13.0531, lng: 80.2135, heading: 58, speed: 1.7 },
    { lat: 13.0534, lng: 80.2139, heading: 65, speed: 1.8 },
    { lat: 13.0536, lng: 80.2141, heading: 40, speed: 1.6 },
    { lat: 13.0538, lng: 80.2138, heading: 320, speed: 1.7 },
    { lat: 13.0539, lng: 80.2133, heading: 290, speed: 1.8 },
    { lat: 13.0537, lng: 80.2128, heading: 250, speed: 1.9 },
    { lat: 13.0534, lng: 80.2124, heading: 230, speed: 1.8 },
    { lat: 13.0530, lng: 80.2121, heading: 200, speed: 1.7 },
    { lat: 13.0527, lng: 80.2123, heading: 160, speed: 1.6 },
  ];

  constructor() {
    this.seedInitialTelemetry();
    this.startLiveSimulation();
  }

  private seedInitialTelemetry() {
    const baseTime = Date.now() - 120000;
    for (let i = 0; i < 20; i++) {
      const idx = i % this.simRoute.length;
      const pt = this.simRoute[idx];
      this.telemetry.push({
        id: i + 1,
        device_id: 'dev-001',
        device_code: 'NK-U01',
        device_name: 'NeerKaavalan Surface Drone 01',
        timestamp: new Date(baseTime + i * 5000).toISOString(),
        latitude: pt.lat + (Math.random() - 0.5) * 0.0001,
        longitude: pt.lng + (Math.random() - 0.5) * 0.0001,
        speed_mps: pt.speed,
        heading_deg: pt.heading,
        battery_percent: Math.max(20, 90 - i * 0.1),
      });
    }
  }

  private startLiveSimulation() {
    if (this.telemetryTimer) return;

    this.telemetryTimer = setInterval(() => {
      this.simStep = (this.simStep + 1) % this.simRoute.length;
      const pt = this.simRoute[this.simStep];
      const now = new Date().toISOString();

      const usv = this.devices.find((d) => d.device_code === 'NK-U01');
      if (usv && usv.status === 'ONLINE') {
        usv.latitude = pt.lat;
        usv.longitude = pt.lng;
        usv.heading_deg = pt.heading;
        usv.speed_mps = pt.speed;
        usv.battery_percent = Math.max(15, +(usv.battery_percent - 0.02).toFixed(1));
        usv.updated_at = now;

        this.telemetry.push({
          id: this.telemetry.length + 1,
          device_id: usv.id,
          device_code: usv.device_code,
          device_name: usv.name,
          timestamp: now,
          latitude: pt.lat,
          longitude: pt.lng,
          speed_mps: pt.speed,
          heading_deg: pt.heading,
          battery_percent: usv.battery_percent,
        });

        // Keep rolling telemetry list clean
        if (this.telemetry.length > 100) {
          this.telemetry.shift();
        }
      }
    }, 2000);
  }

  // Handle SQL queries dynamically
  async executeQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // 1. Health check: SELECT 1
    if (/^SELECT 1/i.test(cleanSql)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 2. Water bodies
    if (/FROM water_bodies/i.test(cleanSql)) {
      if (/WHERE id = \$1/i.test(cleanSql)) {
        const found = this.waterBodies.find((wb) => wb.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      return { rows: this.waterBodies, rowCount: this.waterBodies.length };
    }

    // 3. Telemetry: SELECT ... FROM telemetry ... WHERE d.device_code = $1
    if (/FROM telemetry/i.test(cleanSql)) {
      const code = params[0] ?? 'NK-U01';
      const points = this.telemetry.filter((t) => t.device_code === code);
      return { rows: points, rowCount: points.length };
    }

    // 4. Detections
    if (/FROM detections/i.test(cleanSql)) {
      if (/WHERE d\.id = \$1/i.test(cleanSql)) {
        const found = this.detections.find((d) => d.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      return { rows: this.detections, rowCount: this.detections.length };
    }

    // 5. Hotspots
    if (/FROM hotspots/i.test(cleanSql)) {
      if (/WHERE h\.id = \$1/i.test(cleanSql)) {
        const found = this.hotspots.find((h) => h.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      if (/WHERE h\.status = 'DETECTED'/i.test(cleanSql)) {
        const detected = this.hotspots.filter((h) => h.status === 'DETECTED' || h.status === 'ACTIVE');
        return { rows: detected, rowCount: detected.length };
      }
      if (/WHERE h\.status = 'ACTIVE'/i.test(cleanSql)) {
        const active = this.hotspots
          .filter((h) => h.status === 'ACTIVE' || h.status === 'DETECTED')
          .map((h) => ({
            id: h.id,
            water_body_id: h.water_body_id,
            name: h.name,
            severity: h.severity,
            priority_score: h.priority_score,
            waste_area_sq_m: h.waste_area_sq_m,
            confidence: h.confidence,
            latitude: h.location.coordinates[1],
            longitude: h.location.coordinates[0],
          }));
        return { rows: active, rowCount: active.length };
      }
      if (/ST_Distance/i.test(cleanSql)) {
        return { rows: [{ distance_m: 238.5 }], rowCount: 1 };
      }
      return { rows: this.hotspots, rowCount: this.hotspots.length };
    }

    // 6. Devices
    if (/FROM devices/i.test(cleanSql)) {
      if (/device_type = 'usv'/i.test(cleanSql)) {
        const usv = this.devices.find((d) => d.device_type === 'usv') ?? this.devices[0];
        return { rows: [usv], rowCount: 1 };
      }
      if (/device_type = 'drone'/i.test(cleanSql)) {
        const drone = this.devices.find((d) => d.device_type === 'drone') ?? this.devices[1];
        return { rows: [drone], rowCount: 1 };
      }

      const code = params[0];
      const device = code
        ? this.devices.find((d) => d.device_code === code)
        : this.devices[0];

      if (!device) {
        return { rows: [], rowCount: 0 };
      }

      // Check what fields were requested
      if (/operating_mode/i.test(cleanSql)) {
        return {
          rows: [
            {
              device_code: device.device_code,
              device_type: device.device_type,
              status: device.status,
              operating_mode: device.operating_mode,
              battery_percent: device.battery_percent,
              latitude: device.latitude,
              longitude: device.longitude,
              speed_mps: device.speed_mps,
              heading_deg: device.heading_deg,
              updated_at: device.updated_at,
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [device], rowCount: 1 };
    }

    // 7. Update device state (connect, disconnect, stop, etc.)
    if (/UPDATE devices/i.test(cleanSql)) {
      if (/SET status = 'ONLINE'/i.test(cleanSql)) {
        const code = params[0];
        const dev = this.devices.find((d) => d.device_code === code);
        if (dev) {
          dev.status = 'ONLINE';
          dev.updated_at = new Date().toISOString();
        }
        return { rows: [], rowCount: 1 };
      }
      if (/SET status = 'OFFLINE'/i.test(cleanSql)) {
        const code = params[0];
        const dev = this.devices.find((d) => d.device_code === code);
        if (dev) {
          dev.status = 'OFFLINE';
          dev.updated_at = new Date().toISOString();
        }
        return { rows: [], rowCount: 1 };
      }
      if (/speed_mps = 0/i.test(cleanSql) || /status = \$1/i.test(cleanSql)) {
        const code = params[params.length - 1];
        const dev = this.devices.find((d) => d.device_code === code);
        if (dev) {
          dev.speed_mps = 0;
          dev.updated_at = new Date().toISOString();
        }
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }

    // 8. Missions
    if (/FROM missions/i.test(cleanSql)) {
      if (/next_number/i.test(cleanSql)) {
        const nextNum = this.missions.length + 1;
        return { rows: [{ next_number: nextNum }], rowCount: 1 };
      }
      if (/WHERE m\.status IN/i.test(cleanSql)) {
        const active = this.missions.filter((m) =>
          ['CREATED', 'PLANNED', 'DISPATCHED', 'NAVIGATING', 'ARRIVED', 'COLLECTING', 'VERIFYING'].includes(
            m.status,
          ),
        );
        return { rows: active, rowCount: active.length };
      }
      if (/hotspot_id = \$1/i.test(cleanSql)) {
        const found = this.missions.find((m) => m.hotspot_id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      if (/WHERE m\.id = \$1/i.test(cleanSql)) {
        const found = this.missions.find((m) => m.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      return { rows: this.missions, rowCount: this.missions.length };
    }

    // 9. Insert new mission (Plan mission)
    if (/INSERT INTO missions/i.test(cleanSql)) {
      const newMissionId = `mis-${Date.now()}`;
      const [
        missionCode,
        waterBodyId,
        hotspotId,
        deviceId,
        missionPriority,
        distanceM,
        durationSec,
      ] = params;

      const wb = this.waterBodies.find((w) => w.id === waterBodyId) ?? this.waterBodies[0];
      const hs = this.hotspots.find((h) => h.id === hotspotId) ?? this.hotspots[0];
      const dev = this.devices.find((d) => d.id === deviceId) ?? this.devices[0];

      const newMission: MockMission = {
        id: newMissionId,
        mission_code: missionCode ?? `NK-M${String(this.missions.length + 1).padStart(3, '0')}`,
        water_body_id: wb.id,
        water_body_name: wb.name,
        hotspot_id: hs ? hs.id : null,
        hotspot_name: hs ? hs.name : null,
        device_id: dev.id,
        device_code: dev.device_code,
        device_name: dev.name,
        mission_type: 'CLEANUP',
        status: 'CREATED',
        priority: missionPriority ?? 'HIGH',
        recovery_status: 'NONE',
        estimated_distance_m: distanceM ?? 250,
        estimated_duration_sec: durationSec ?? 180,
        actual_distance_m: 0,
        actual_duration_sec: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.missions.unshift(newMission);
      return { rows: [{ id: newMissionId }], rowCount: 1 };
    }

    // 10. Update mission or hotspots
    if (/UPDATE missions/i.test(cleanSql)) {
      return { rows: [], rowCount: 1 };
    }
    if (/UPDATE hotspots/i.test(cleanSql)) {
      return { rows: [], rowCount: 1 };
    }

    // 11. Verifications
    if (/FROM verifications/i.test(cleanSql)) {
      return { rows: [this.verification], rowCount: 1 };
    }

    // 12. Transaction commands
    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(cleanSql)) {
      return { rows: [], rowCount: 0 };
    }

    // Fallback: return empty array with success
    return { rows: [], rowCount: 0 };
  }
}

export const inMemoryStore = new InMemoryStore();
