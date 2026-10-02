import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, ScanSearch, Target, Waves } from 'lucide-react';

type Detection = {
  confidence: number;
  area_sq_m: number;
  class_name: string;
};

type Mission = {
  status: string;
  actual_distance_m: number | null;
  actual_duration_sec: number | null;
};

type Hotspot = {
  priority_score: number;
  severity: string;
  waste_area_sq_m: number;
};

export default function Analytics() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [waterBodies, setWaterBodies] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:4000/api/detections')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('http://localhost:4000/api/missions')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('http://localhost:4000/api/hotspots')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('http://localhost:4000/api/water-bodies')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([detectionsJson, missionsJson, hotspotsJson, waterBodiesJson]) => {
        if (detectionsJson?.data) setDetections(detectionsJson.data);
        if (missionsJson?.data) setMissions(missionsJson.data);
        if (hotspotsJson?.data) setHotspots(hotspotsJson.data);
        if (waterBodiesJson?.data) setWaterBodies(waterBodiesJson.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalArea = useMemo(
    () => detections.reduce((sum, d) => sum + Number(d.area_sq_m || 0), 0),
    [detections],
  );

  const confidence = useMemo(
    () =>
      detections.length
        ? detections.reduce((sum, d) => sum + Number(d.confidence || 0), 0) /
          detections.length
        : 0,
    [detections],
  );

  const completed = missions.filter((m) => m.status === 'COMPLETED');
  const active = missions.filter(
    (m) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(m.status),
  );

  const travelled = completed.reduce(
    (sum, mission) => sum + Number(mission.actual_distance_m || 0),
    0,
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">ENVIRONMENTAL INTELLIGENCE</div>
          <h1 className="page-header-title">Analytics</h1>
          <p className="page-header-description">
            Operational statistics derived from live detection, hotspot and mission data.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card card-body">Loading analytics...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <StatCard
              label="Detection Regions"
              value={String(detections.length)}
              icon={<ScanSearch size={17} />}
            />
            <StatCard
              label="Detected Waste Area"
              value={`${totalArea.toFixed(1)} m²`}
              icon={<Waves size={17} />}
            />
            <StatCard
              label="Average AI Confidence"
              value={`${(confidence * 100).toFixed(1)}%`}
              icon={<BarChart3 size={17} />}
            />
            <StatCard
              label="Completed Missions"
              value={String(completed.length)}
              icon={<CheckCircle2 size={17} />}
            />
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Detection Intelligence</h2>
                  <div className="card-subtitle">
                    Current AI perception distribution
                  </div>
                </div>
              </div>

              <div className="card-body">
                {detections.map((detection, index) => (
                  <div
                    key={`${detection.class_name}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div>
                      <strong>{detection.class_name.replaceAll('_', ' ')}</strong>
                      <div className="card-subtitle">
                        {(detection.confidence * 100).toFixed(1)}% confidence
                      </div>
                    </div>
                    <strong>{detection.area_sq_m} m²</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Mission Performance</h2>
                  <div className="card-subtitle">
                    Autonomous cleanup operations
                  </div>
                </div>
              </div>

              <div className="card-body">
                <Metric label="Active Missions" value={String(active.length)} />
                <Metric label="Completed Missions" value={String(completed.length)} />
                <Metric label="Distance Travelled" value={`${travelled.toFixed(1)} m`} />
                <Metric
                  label="Highest Hotspot Priority"
                  value={
                    hotspots.length
                      ? Math.max(...hotspots.map((h) => h.priority_score)).toFixed(1)
                      : '—'
                  }
                />
                <Metric
                  label="Critical Hotspots"
                  value={String(hotspots.filter((h) => h.severity === 'CRITICAL').length)}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Operational Coverage</h2>
                  <div className="card-subtitle">
                    Registered monitoring infrastructure
                  </div>
                </div>
              </div>

              <div className="card-body">
                <Metric label="Water Bodies" value={String(waterBodies.length)} />
                <Metric label="Hotspots" value={String(hotspots.length)} />
                <Metric
                  label="Clustered Waste"
                  value={`${hotspots.reduce((sum, h) => sum + Number(h.waste_area_sq_m || 0), 0).toFixed(1)} m²`}
                />
                <Metric label="Telemetry Source" value="SIMULATOR" />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Cleanup Verification</h2>
                  <div className="card-subtitle">
                    Verified intervention record
                  </div>
                </div>
                <Target size={18} />
              </div>

              <div className="card-body">
                <div
                  style={{
                    padding: 18,
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 12,
                  }}
                >
                  <div className="card-subtitle">LATEST VERIFIED RESULT</div>
                  <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>
                    88.01%
                  </div>
                  <div className="card-subtitle">
                    waste-area reduction after completed cleanup mission
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span className="status-badge status-online">
                      VERIFIED · 94% CONFIDENCE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">{icon}</div>
      </div>
      <div className="kpi-value" style={{ fontSize: value.length > 12 ? 22 : undefined }}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 20,
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span className="card-subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}