import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bot,
  BrainCircuit,
  MapPin,
  Navigation,
  RefreshCw,
  ScanSearch,
  Ship,
  Waves,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:4000/api';

type WaterBody = {
  id: string;
  name: string;
  type: string;
  area_sq_m: number;
};

type Hotspot = {
  id: string;
  water_body_id: string;
  water_body_name: string;
  name: string;
  radius_m: number;
  waste_area_sq_m: number;
  waste_density: number;
  confidence: number;
  priority_score: number;
  severity: string;
  status: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
};

type Mission = {
  id: string;
  mission_code: string;
  water_body_name: string;
  hotspot_name: string;
  device_code: string;
  device_name: string;
  mission_type: string;
  status: string;
  priority: string;
  recovery_status: string;
  estimated_distance_m: number | null;
  estimated_duration_sec: number | null;
  actual_distance_m: number | null;
  actual_duration_sec: number | null;
  created_at: string;
  updated_at: string;
};

type DeviceState = {
  deviceCode: string;
  deviceType: 'drone' | 'usv';
  operatingMode: 'SIMULATION' | 'REAL';
  connectionStatus: 'OFFLINE' | 'ONLINE' | 'CONNECTING' | 'ERROR';
  batteryPercent: number | null;
  position: {
    latitude: number;
    longitude: number;
    speedMps: number;
    headingDeg: number;
  } | null;
  updatedAt: string;
};

type ApiState = {
  waterBodies: WaterBody[];
  hotspots: Hotspot[];
  missions: Mission[];
  devices: DeviceState[];
  loading: boolean;
  error: string | null;
  refreshedAt: Date | null;
};

const ACTIVE_MISSION_STATUSES = [
  'CREATED',
  'PLANNED',
  'DISPATCHED',
  'NAVIGATING',
  'ARRIVED',
  'COLLECTING',
  'VERIFYING',
];

export default function Overview() {
  const navigate = useNavigate();

  const [state, setState] = useState<ApiState>({
    waterBodies: [],
    hotspots: [],
    missions: [],
    devices: [],
    loading: true,
    error: null,
    refreshedAt: null,
  });

  const loadDashboard = async () => {
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          return res.ok ? await res.json() : null;
        } catch {
          return null;
        }
      };

      const [
        waterBodiesData,
        hotspotsData,
        missionsData,
        usvData,
        droneData,
      ] = await Promise.all([
        fetchJson(`${API}/water-bodies`),
        fetchJson(`${API}/hotspots`),
        fetchJson(`${API}/missions`),
        fetchJson(`${API}/devices/NK-U01/state`),
        fetchJson(`${API}/devices/NK-D01/state`),
      ]);

      const hasAnyData =
        waterBodiesData || hotspotsData || missionsData || usvData || droneData;

      if (!hasAnyData) {
        throw new Error('Connecting to NeerKaavalan API server (http://localhost:4000)...');
      }

      setState((current) => ({
        waterBodies: waterBodiesData?.data ?? current.waterBodies,
        hotspots: hotspotsData?.data ?? current.hotspots,
        missions: missionsData?.data ?? current.missions,
        devices: [
          usvData?.device ?? current.devices[0],
          droneData?.device ?? current.devices[1],
        ].filter(Boolean),
        loading: false,
        error: null,
        refreshedAt: new Date(),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load dashboard data.',
      }));
    }
  };

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(loadDashboard, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const activeMissions = useMemo(
    () =>
      state.missions.filter((mission) =>
        ACTIVE_MISSION_STATUSES.includes(mission.status),
      ),
    [state.missions],
  );

  const totalWasteArea = useMemo(
    () =>
      state.hotspots.reduce(
        (total, hotspot) => total + Number(hotspot.waste_area_sq_m || 0),
        0,
      ),
    [state.hotspots],
  );

  const averageConfidence = useMemo(() => {
    if (state.hotspots.length === 0) return 0;

    const weightedConfidence = state.hotspots.reduce(
      (total, hotspot) =>
        total +
        Number(hotspot.confidence || 0) *
          Number(hotspot.waste_area_sq_m || 0),
      0,
    );

    return totalWasteArea > 0
      ? (weightedConfidence / totalWasteArea) * 100
      : 0;
  }, [state.hotspots, totalWasteArea]);

  const criticalHotspots = state.hotspots.filter(
    (hotspot) => hotspot.severity === 'CRITICAL',
  ).length;

  const usv = state.devices.find(
    (device) => device.deviceCode === 'NK-U01',
  );

  const drone = state.devices.find(
    (device) => device.deviceCode === 'NK-D01',
  );

  const currentMission =
    activeMissions[0] ??
    state.missions.find((mission) => mission.status === 'COMPLETED');

  const missionProgress = currentMission
    ? getMissionProgress(currentMission.status)
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            Water Intelligence Command Center
          </h1>

          <p className="page-header-description">
            Monitor water bodies, detect floating waste, coordinate autonomous
            missions, and verify cleanup operations in real time.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn"
            onClick={() => navigate('/water-bodies')}
          >
            <MapPin size={14} />
            Water Bodies
          </button>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/missions')}
          >
            <Navigation size={14} />
            Missions
          </button>
        </div>
      </div>

      {state.error && (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="status-badge status-neutral">
              API
            </span>

            <span>
              {state.error}
            </span>

            <button
              className="btn"
              style={{ marginLeft: 'auto' }}
              onClick={loadDashboard}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* KPI ROW */}

      <section className="kpi-grid">
        <KpiCard
          label="Water Bodies"
          value={String(state.waterBodies.length)}
          icon={<Waves size={16} />}
          footer={
            state.waterBodies.length === 1
              ? '1 monitored water body'
              : `${state.waterBodies.length} monitored water bodies`
          }
          positive
        />

        <KpiCard
          label="Waste Detected"
          value={`${totalWasteArea.toFixed(1)} m²`}
          icon={<ScanSearch size={16} />}
          footer={`${state.hotspots.length} active hotspots`}
          warning={totalWasteArea > 0}
        />

        <KpiCard
          label="Active Missions"
          value={String(activeMissions.length)}
          icon={<Navigation size={16} />}
          footer={
            activeMissions.length > 0
              ? `${activeMissions[0].mission_code} in operation`
              : 'No active cleanup mission'
          }
          positive={activeMissions.length > 0}
        />

        <KpiCard
          label="AI Confidence"
          value={`${averageConfidence.toFixed(1)}%`}
          icon={<BrainCircuit size={16} />}
          footer={`${criticalHotspots} critical hotspot${
            criticalHotspots === 1 ? '' : 's'
          }`}
          positive={averageConfidence >= 90}
        />
      </section>

      <div className="dashboard-grid">
        {/* LIVE OPERATIONS */}

        <div className="card map-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Live Operations</h2>

              <div className="card-subtitle">
                Autonomous fleet and detected waste hotspots
              </div>
            </div>

            <span
              className={`status-badge ${
                usv?.connectionStatus === 'ONLINE'
                  ? 'status-online'
                  : 'status-neutral'
              }`}
            >
              {usv?.connectionStatus === 'ONLINE'
                ? 'Live'
                : 'Offline'}
            </span>
          </div>

          <div className="map-container">
            <div className="map-water" />

            <div className="map-overlay">
              <div className="map-pill">
                <span className="status-dot" />
                {usv?.connectionStatus === 'ONLINE'
                  ? 'USV online'
                  : 'USV offline'}
              </div>

              <div className="map-pill">
                <ScanSearch size={11} />
                {state.hotspots.length} hotspots
              </div>
            </div>

            {state.hotspots.map((hotspot, index) => {
              const coordinates = hotspot.location?.coordinates;

              if (!coordinates) return null;

              const longitude = coordinates[0];
              const latitude = coordinates[1];

              const left = Math.min(
                92,
                Math.max(
                  8,
                  ((longitude - 80.21) / 0.005) * 84 + 8,
                ),
              );

              const top = Math.min(
                88,
                Math.max(
                  12,
                  92 - ((latitude - 13.05) / 0.005) * 84,
                ),
              );

              return (
                <div
                  key={hotspot.id}
                  className={`map-marker marker-${
                    index + 1
                  }`}
                  title={`${hotspot.name} — ${hotspot.severity}`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                  }}
                />
              );
            })}

            {usv?.position && (
              <div
                className="usv-marker usv-one"
                title={`NK-U01 • ${usv.connectionStatus}`}
              >
                <Ship size={15} />
              </div>
            )}

            <div className="map-controls">
              <button className="map-control">+</button>
              <button className="map-control">−</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}

        <div className="dashboard-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Autonomous Fleet</h2>

                <div className="card-subtitle">
                  Current device status
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="device-list">
                {drone && (
                  <Device
                    icon={<Bot size={17} />}
                    name={drone.deviceCode}
                    meta={`Aerial surveillance • ${drone.operatingMode}`}
                    status={formatStatus(drone.connectionStatus)}
                    value={
                      drone.batteryPercent !== null
                        ? `${drone.batteryPercent}% battery`
                        : 'Battery unavailable'
                    }
                  />
                )}

                {usv && (
                  <Device
                    icon={<Ship size={17} />}
                    name={usv.deviceCode}
                    meta={`Waste collection • ${usv.operatingMode}`}
                    status={formatStatus(usv.connectionStatus)}
                    value={
                      usv.position
                        ? `${usv.position.speedMps.toFixed(1)} m/s`
                        : 'Position unavailable'
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Current Mission</h2>

                <div className="card-subtitle">
                  Autonomous cleanup operation
                </div>
              </div>

              {currentMission && (
                <span
                  className={`status-badge ${
                    currentMission.status === 'COMPLETED'
                      ? 'status-neutral'
                      : 'status-online'
                  }`}
                >
                  {currentMission.status}
                </span>
              )}
            </div>

            <div className="card-body">
              {currentMission ? (
                <div className="mission-list">
                  <div className="mission-row">
                    <div className="mission-row-top">
                      <span className="mission-id">
                        {currentMission.mission_code}
                      </span>

                      <span className="device-value">
                        {currentMission.priority}
                      </span>
                    </div>

                    <div className="mission-name">
                      {currentMission.water_body_name} ·{' '}
                      {currentMission.hotspot_name}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="status-badge status-neutral">
                        {currentMission.device_code}
                      </span>

                      <span className="status-badge status-neutral">
                        Recovery: {currentMission.recovery_status}
                      </span>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${missionProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="device-meta">
                  No mission data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SYSTEM ACTIVITY */}

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">System Activity</h2>

              <div className="card-subtitle">
                Latest autonomous state
              </div>
            </div>

            {state.refreshedAt && (
              <span className="device-meta">
                Updated {formatTime(state.refreshedAt)}
              </span>
            )}
          </div>

          <div className="card-body">
            <div className="activity-list">
              <Activity
                text={`${state.hotspots.length} waste hotspots detected across ${state.waterBodies.length} water body.`}
                time="Live"
              />

              <Activity
                text={`Highest priority hotspot: ${
                  state.hotspots[0]?.name ?? 'None'
                } (${state.hotspots[0]?.severity ?? 'N/A'}).`}
                time="Current"
              />

              <Activity
                text={
                  usv?.connectionStatus === 'ONLINE'
                    ? `USV ${usv.deviceCode} is online in ${usv.operatingMode.toLowerCase()} mode.`
                    : 'USV connection requires attention.'
                }
                time="Current"
              />

              {currentMission && (
                <Activity
                  text={`Mission ${currentMission.mission_code} is ${currentMission.status.toLowerCase()} with recovery state ${currentMission.recovery_status.toLowerCase()}.`}
                  time="Current"
                />
              )}
            </div>
          </div>
        </div>

        {/* AI STATUS */}

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">AI Perception</h2>

              <div className="card-subtitle">
                Current detection and hotspot intelligence
              </div>
            </div>

            <span
              className={`status-badge ${
                state.hotspots.length > 0
                  ? 'status-online'
                  : 'status-neutral'
              }`}
            >
              {state.hotspots.length > 0
                ? 'Active'
                : 'Waiting'}
            </span>
          </div>

          <div className="card-body">
            <div className="device-list">
              <Device
                icon={<BrainCircuit size={17} />}
                name="Waste Perception"
                meta="Weighted hotspot confidence"
                status={
                  state.hotspots.length > 0
                    ? 'Running'
                    : 'Idle'
                }
                value={`${averageConfidence.toFixed(1)}%`}
              />

              <Device
                icon={<ScanSearch size={17} />}
                name="Hotspot Engine"
                meta="Priority analysis"
                status="Running"
                value={`${state.hotspots.length} hotspots`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getMissionProgress(status: string): number {
  const progress: Record<string, number> = {
    CREATED: 10,
    PLANNED: 20,
    DISPATCHED: 30,
    NAVIGATING: 55,
    ARRIVED: 65,
    COLLECTING: 78,
    VERIFYING: 90,
    COMPLETED: 100,
  };

  return progress[status] ?? 10;
}

function formatStatus(status: DeviceState['connectionStatus']): string {
  if (status === 'ONLINE') return 'Online';
  if (status === 'OFFLINE') return 'Offline';
  if (status === 'CONNECTING') return 'Connecting';
  return 'Error';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function KpiCard({
  label,
  value,
  icon,
  footer,
  positive,
  warning,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  footer: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>

        <div className="kpi-icon">
          {icon}
        </div>
      </div>

      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-footer">
        <span
          className={
            positive
              ? 'kpi-positive'
              : warning
                ? 'kpi-warning'
                : ''
          }
        >
          {positive ? '↑' : warning ? '!' : '•'}
        </span>

        {footer}
      </div>
    </div>
  );
}

function Device({
  icon,
  name,
  meta,
  status,
  value,
}: {
  icon: ReactNode;
  name: string;
  meta: string;
  status: string;
  value: string;
}) {
  const isOnline =
    status === 'Online' ||
    status === 'Active' ||
    status === 'Running';

  return (
    <div className="device-row">
      <div className="device-icon">
        {icon}
      </div>

      <div className="device-info">
        <div className="device-name">
          {name}
        </div>

        <div className="device-meta">
          {meta}
        </div>
      </div>

      <div>
        <span
          className={`status-badge ${
            isOnline
              ? 'status-online'
              : 'status-neutral'
          }`}
        >
          {status}
        </span>

        <div className="device-value">
          {value}
        </div>
      </div>
    </div>
  );
}

function Activity({
  text,
  time,
}: {
  text: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <span className="activity-dot" />

      <div>
        <div className="activity-text">
          {text}
        </div>

        <div className="activity-time">
          {time}
        </div>
      </div>
    </div>
  );
}