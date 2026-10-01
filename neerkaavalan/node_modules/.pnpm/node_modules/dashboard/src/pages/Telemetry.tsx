import { useEffect, useState } from 'react';
import { Activity, Navigation, Radio, Waves } from 'lucide-react';

type TelemetryPoint = {
  timestamp: string;
  latitude: number;
  longitude: number;
  device_code?: string;
  device_name?: string;
};

export default function Telemetry() {
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('http://localhost:4000/api/telemetry/NK-U01')
      .then((res) => res.json())
      .then((json) => {
        const rows = json.data ?? json.telemetry ?? [];
        setPoints(rows);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = points[points.length - 1] ?? points[0];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">REAL-TIME DATA</div>
          <h1 className="page-header-title">Fleet Telemetry</h1>
          <p className="page-header-description">
            Live simulator telemetry stream for the autonomous surface vehicle.
          </p>
        </div>

        <div className="page-header-actions">
          <span className="status-badge status-online">
            <Radio size={12} /> LIVE · 2s
          </span>
        </div>
      </div>

      <section className="kpi-grid">
        <StatCard label="Device" value="NK-U01" icon={<Waves size={17} />} />
        <StatCard label="Telemetry Points" value={String(points.length)} icon={<Activity size={17} />} />
        <StatCard
          label="Latitude"
          value={latest ? latest.latitude.toFixed(5) : '—'}
          icon={<Navigation size={17} />}
        />
        <StatCard
          label="Longitude"
          value={latest ? latest.longitude.toFixed(5) : '—'}
          icon={<Navigation size={17} />}
        />
      </section>

      {loading ? (
        <div className="card card-body">Loading telemetry...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Position History</h2>
              <div className="card-subtitle">
                Latest simulator telemetry received from NK-U01
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Timestamp', 'Latitude', 'Longitude', 'Device'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        color: '#7891ad',
                        fontSize: 12,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {points
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((point, index) => (
                    <tr key={`${point.timestamp}-${index}`}>
                      <td style={{ padding: 14 }}>
                        {new Date(point.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: 14 }}>{point.latitude.toFixed(6)}</td>
                      <td style={{ padding: 14 }}>{point.longitude.toFixed(6)}</td>
                      <td style={{ padding: 14 }}>{point.device_code ?? 'NK-U01'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
      <div className="kpi-value" style={{ fontSize: value.length > 12 ? 22 : undefined }}>
        {value}
      </div>
    </div>
  );
}