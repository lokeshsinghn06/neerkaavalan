import { useEffect, useMemo, useState } from 'react';
import { MapPin, ScanSearch, Target, TriangleAlert } from 'lucide-react';

type Hotspot = {
  id: string;
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
    coordinates: [number, number];
  };
};

export default function Hotspots() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('http://localhost:4000/api/hotspots')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        setHotspots(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const critical = useMemo(
    () => hotspots.filter((h) => h.severity === 'CRITICAL').length,
    [hotspots],
  );

  const totalWaste = useMemo(
    () => hotspots.reduce((sum, h) => sum + Number(h.waste_area_sq_m || 0), 0),
    [hotspots],
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">POLLUTION INTELLIGENCE</div>
          <h1 className="page-header-title">Pollution Hotspots</h1>
          <p className="page-header-description">
            AI-derived waste clusters ranked for targeted intervention.
          </p>
        </div>
      </div>

      <section className="kpi-grid">
        <StatCard
          label="Detected Hotspots"
          value={String(hotspots.length)}
          icon={<ScanSearch size={17} />}
        />
        <StatCard
          label="Critical Zones"
          value={String(critical)}
          icon={<TriangleAlert size={17} />}
        />
        <StatCard
          label="Clustered Waste"
          value={`${totalWaste.toFixed(1)} m²`}
          icon={<Target size={17} />}
        />
        <StatCard
          label="Highest Priority"
          value={
            hotspots.length
              ? Math.max(...hotspots.map((h) => h.priority_score)).toFixed(1)
              : '—'
          }
          icon={<MapPin size={17} />}
        />
      </section>

      {loading ? (
        <div className="card card-body">Loading hotspots...</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {hotspots
            .slice()
            .sort((a, b) => b.priority_score - a.priority_score)
            .map((hotspot) => {
              const coordinates = hotspot.location?.coordinates;
              const severityClass =
                hotspot.severity === 'CRITICAL'
                  ? 'status-error'
                  : hotspot.severity === 'HIGH'
                    ? 'status-warning'
                    : 'status-online';

              return (
                <div className="card" key={hotspot.id}>
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">{hotspot.name}</h2>
                      <div className="card-subtitle">
                        {hotspot.water_body_name}
                      </div>
                    </div>

                    <span className={`status-badge ${severityClass}`}>
                      {hotspot.severity}
                    </span>
                  </div>

                  <div className="card-body">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 14,
                      }}
                    >
                      <Metric label="Waste Area" value={`${hotspot.waste_area_sq_m} m²`} />
                      <Metric label="Priority" value={hotspot.priority_score.toFixed(1)} />
                      <Metric label="Confidence" value={`${(hotspot.confidence * 100).toFixed(1)}%`} />
                      <Metric label="Radius" value={`${hotspot.radius_m} m`} />
                    </div>

                    <div style={{ marginTop: 18 }}>
                      <div className="card-subtitle">GPS LOCATION</div>
                      <strong>
                        {coordinates
                          ? `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`
                          : 'Unavailable'}
                      </strong>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <span className="status-badge status-online">
                        {hotspot.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
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
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="card-subtitle">{label}</div>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  );
}