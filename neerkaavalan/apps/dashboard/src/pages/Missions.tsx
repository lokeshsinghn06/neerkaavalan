import { useEffect, useMemo, useState } from 'react';
import { Navigation, Route, ShieldCheck, Target } from 'lucide-react';

type Mission = {
  id: string;
  mission_code: string;
  water_body_name: string;
  hotspot_name: string | null;
  device_code: string | null;
  device_name: string | null;
  mission_type: string;
  status: string;
  priority: string | null;
  recovery_status: string;
  estimated_distance_m: number | null;
  estimated_duration_sec: number | null;
  actual_distance_m: number | null;
  actual_duration_sec: number | null;
};

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('http://localhost:4000/api/missions')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        setMissions(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(
    () =>
      missions.filter(
        (m) =>
          !['COMPLETED', 'FAILED', 'CANCELLED'].includes(m.status),
      ).length,
    [missions],
  );

  const completed = useMemo(
    () => missions.filter((m) => m.status === 'COMPLETED').length,
    [missions],
  );

  async function planMission() {
    setPlanning(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:4000/api/missions/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message ?? 'Mission planning failed');
      }

      setMessage(
        json.action === 'REUSED'
          ? 'Existing active mission selected.'
          : `Mission ${json.decision?.mission?.mission_code ?? 'created'}.`,
      );

      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mission planning failed');
    } finally {
      setPlanning(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">AUTONOMOUS OPERATIONS</div>
          <h1 className="page-header-title">Mission Control</h1>
          <p className="page-header-description">
            Plan, monitor and recover autonomous cleanup missions.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-primary"
            onClick={planMission}
            disabled={planning}
          >
            <Navigation size={14} />
            {planning ? 'Planning...' : 'Plan Highest Priority'}
          </button>
        </div>
      </div>

      <section className="kpi-grid">
        <StatCard label="Total Missions" value={String(missions.length)} icon={<Route size={17} />} />
        <StatCard label="Active" value={String(active)} icon={<Navigation size={17} />} />
        <StatCard label="Completed" value={String(completed)} icon={<ShieldCheck size={17} />} />
        <StatCard label="Recovery State" value={missions.some((m) => m.recovery_status === 'RECOVERED') ? 'RECOVERED' : 'NORMAL'} icon={<Target size={17} />} />
      </section>

      {message && (
        <div className="card card-body" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="card card-body">Loading missions...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Mission Queue</h2>
              <div className="card-subtitle">
                Live mission state from the autonomous operations API
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  {[
                    'Mission',
                    'Target',
                    'Device',
                    'Status',
                    'Priority',
                    'Recovery',
                    'Distance',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        color: '#7891ad',
                        fontSize: 12,
                        letterSpacing: 0.8,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {missions.map((mission) => (
                  <tr key={mission.id}>
                    <td style={{ padding: 16 }}>
                      <strong>{mission.mission_code}</strong>
                      <div className="card-subtitle">{mission.mission_type}</div>
                    </td>

                    <td style={{ padding: 16 }}>
                      <strong>{mission.hotspot_name ?? '—'}</strong>
                      <div className="card-subtitle">{mission.water_body_name}</div>
                    </td>

                    <td style={{ padding: 16 }}>
                      <strong>{mission.device_code ?? '—'}</strong>
                      <div className="card-subtitle">{mission.device_name ?? 'Unassigned'}</div>
                    </td>

                    <td style={{ padding: 16 }}>
                      <span className="status-badge status-online">
                        {mission.status}
                      </span>
                    </td>

                    <td style={{ padding: 16 }}>
                      <strong>{mission.priority ?? 'NORMAL'}</strong>
                    </td>

                    <td style={{ padding: 16 }}>
                      <span className="status-badge status-online">
                        {mission.recovery_status}
                      </span>
                    </td>

                    <td style={{ padding: 16 }}>
                      {mission.actual_distance_m != null
                        ? `${mission.actual_distance_m.toFixed(1)} m actual`
                        : mission.estimated_distance_m != null
                          ? `${mission.estimated_distance_m.toFixed(1)} m est.`
                          : '—'}
                    </td>
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
      <div className="kpi-value" style={{ fontSize: value.length > 8 ? 24 : undefined }}>
        {value}
      </div>
    </div>
  );
}