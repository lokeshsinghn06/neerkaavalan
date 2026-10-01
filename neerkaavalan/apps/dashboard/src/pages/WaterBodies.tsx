import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Droplets,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Waves,
} from 'lucide-react';

type WaterBody = {
  id: string;
  name: string;
  type?: string;
  areaSqM?: number;
  area_sq_m?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  center_latitude?: number;
  center_longitude?: number;
  status?: string;
  description?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

function areaOf(body: WaterBody) {
  return Number(body.areaSqM ?? body.area_sq_m ?? 0);
}

function centerOf(body: WaterBody) {
  return {
    lat: Number(body.centerLatitude ?? body.center_latitude ?? 0),
    lng: Number(body.centerLongitude ?? body.center_longitude ?? 0),
  };
}

export default function WaterBodies() {
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWaterBodies = async () => {
    try {
      setError('');
      const response = await fetch(`${API_BASE}/water-bodies`);

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const payload = await response.json();
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.waterBodies)
            ? payload.waterBodies
            : [];

      setWaterBodies(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load water bodies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWaterBodies();
  }, []);

  const metrics = useMemo(() => {
    const totalArea = waterBodies.reduce((sum, body) => sum + areaOf(body), 0);
    const monitored = waterBodies.filter(
      (body) => String(body.status ?? 'MONITORED').toUpperCase() !== 'OFFLINE',
    ).length;

    return {
      monitored,
      totalArea,
      mode: monitored > 0 ? 'AUTONOMOUS' : 'STANDBY',
    };
  }, [waterBodies]);

  const formatArea = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}k m²` : `${value.toLocaleString()} m²`;

  return (
    <div className="wb-page">
      <style>{`
        .wb-page {
          width: 100%;
          min-height: calc(100vh - 72px);
          padding: 34px 38px 50px;
          color: #edf6fb;
          background:
            radial-gradient(circle at 78% 10%, rgba(22, 157, 195, .055), transparent 28%),
            #070c12;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-sizing: border-box;
        }

        .wb-container {
          max-width: 1120px;
          margin: 0 auto;
        }

        .wb-eyebrow {
          margin: 0 0 7px;
          color: #54b8e9;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .wb-heading {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 780;
          letter-spacing: -.035em;
        }

        .wb-subtitle {
          margin: 10px 0 0;
          color: #7d95a6;
          font-size: 13px;
          line-height: 1.6;
        }

        .wb-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 27px;
        }

        .wb-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 13px;
          border: 1px solid rgba(91, 188, 226, .16);
          border-radius: 8px;
          background: rgba(12, 28, 39, .82);
          color: #91afbd;
          font-size: 11px;
          font-weight: 650;
          cursor: pointer;
          transition: .18s ease;
        }

        .wb-refresh:hover {
          border-color: rgba(91, 188, 226, .35);
          color: #d9edf5;
          background: #0d202d;
        }

        .wb-refresh svg {
          transition: transform .3s ease;
        }

        .wb-refresh:hover svg {
          transform: rotate(180deg);
        }

        .wb-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .wb-card {
          border: 1px solid rgba(110, 160, 184, .13);
          border-radius: 13px;
          background: linear-gradient(145deg, #111a24, #0d151e);
          box-shadow: 0 14px 34px rgba(0, 0, 0, .14);
        }

        .wb-metric {
          position: relative;
          min-height: 121px;
          padding: 20px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .wb-metric::after {
          content: "";
          position: absolute;
          width: 110px;
          height: 110px;
          right: -55px;
          bottom: -55px;
          border-radius: 50%;
          background: rgba(20, 190, 224, .045);
        }

        .wb-metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .wb-metric-label {
          color: #83a0b3;
          font-size: 11px;
          font-weight: 600;
        }

        .wb-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #48c6ec;
          background: rgba(19, 184, 222, .10);
          border: 1px solid rgba(19, 184, 222, .10);
        }

        .wb-metric-value {
          margin-top: 15px;
          color: #f4f9fb;
          font-size: 25px;
          line-height: 1;
          font-weight: 780;
          letter-spacing: -.035em;
        }

        .wb-metric-value.autonomous {
          color: #f2f7fa;
          font-size: 22px;
          letter-spacing: -.025em;
        }

        .wb-list-card {
          overflow: hidden;
        }

        .wb-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .wb-list-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 720;
        }

        .wb-list-title-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          color: #50c9eb;
          background: rgba(25, 181, 220, .09);
        }

        .wb-count {
          padding: 5px 9px;
          border-radius: 20px;
          color: #57e5ae;
          background: rgba(53, 230, 155, .075);
          border: 1px solid rgba(53, 230, 155, .13);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: .06em;
        }

        .wb-body {
          padding: 0 20px 18px;
        }

        .wb-item {
          padding: 20px 0 19px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .wb-item:last-child {
          border-bottom: 0;
          padding-bottom: 4px;
        }

        .wb-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .wb-name-wrap {
          min-width: 0;
        }

        .wb-name {
          margin: 0;
          font-size: 15px;
          font-weight: 720;
          color: #e8f2f6;
        }

        .wb-type {
          margin-top: 5px;
          color: #6d8595;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .09em;
        }

        .wb-status {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 20px;
          color: #50e4ad;
          background: rgba(53,230,155,.065);
          border: 1px solid rgba(53,230,155,.12);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: .06em;
        }

        .wb-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #50e4ad;
          box-shadow: 0 0 8px rgba(80,228,173,.65);
        }

        .wb-info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(255,255,255,.045);
        }

        .wb-info {
          min-width: 0;
          padding: 14px 14px 8px 0;
        }

        .wb-info + .wb-info {
          padding-left: 18px;
          border-left: 1px solid rgba(255,255,255,.045);
        }

        .wb-info-label {
          color: #668095;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .03em;
        }

        .wb-info-value {
          margin-top: 7px;
          color: #edf5f8;
          font-size: 13px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wb-description {
          margin-top: 11px;
          color: #607887;
          font-size: 10px;
          line-height: 1.6;
        }

        .wb-empty {
          padding: 42px 20px;
          text-align: center;
          color: #6d8493;
          font-size: 12px;
        }

        .wb-error {
          margin-bottom: 15px;
          padding: 11px 13px;
          border: 1px solid rgba(255, 107, 107, .16);
          border-radius: 8px;
          background: rgba(255, 107, 107, .05);
          color: #ff9b9b;
          font-size: 10px;
        }

        .wb-skeleton {
          height: 16px;
          border-radius: 5px;
          background: linear-gradient(90deg, #101923, #172532, #101923);
          background-size: 200% 100%;
          animation: wb-shimmer 1.3s infinite;
        }

        @keyframes wb-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 900px) {
          .wb-page { padding: 25px 20px 40px; }
          .wb-metrics { grid-template-columns: 1fr; }
          .wb-info-grid { grid-template-columns: 1fr; }
          .wb-info + .wb-info { padding-left: 0; border-left: 0; border-top: 1px solid rgba(255,255,255,.045); }
        }

        @media (max-width: 600px) {
          .wb-page { padding: 20px 14px 30px; }
          .wb-header-row { align-items: flex-start; }
          .wb-refresh { display: none; }
          .wb-heading { font-size: 26px; }
          .wb-item-top { align-items: flex-start; flex-direction: column; gap: 10px; }
        }
      `}</style>

      <div className="wb-container">
        <div className="wb-header-row">
          <div>
            <p className="wb-eyebrow">Geospatial Management</p>
            <h1 className="wb-heading">Water Bodies</h1>
            <p className="wb-subtitle">
              Registered monitoring zones and operational water-body boundaries.
            </p>
          </div>

          <button className="wb-refresh" onClick={() => void loadWaterBodies()}>
            <RefreshCw size={13} />
            Refresh data
          </button>
        </div>

        {error && <div className="wb-error">{error}</div>}

        <div className="wb-metrics">
          <div className="wb-card wb-metric">
            <div className="wb-metric-top">
              <span className="wb-metric-label">Monitored Water Bodies</span>
              <span className="wb-icon"><Waves size={17} /></span>
            </div>
            <div className="wb-metric-value">
              {loading ? <div className="wb-skeleton" style={{ width: 35 }} /> : metrics.monitored}
            </div>
          </div>

          <div className="wb-card wb-metric">
            <div className="wb-metric-top">
              <span className="wb-metric-label">Total Monitored Area</span>
              <span className="wb-icon"><MapPin size={17} /></span>
            </div>
            <div className="wb-metric-value">
              {loading ? <div className="wb-skeleton" style={{ width: 130 }} /> : formatArea(metrics.totalArea)}
            </div>
          </div>

          <div className="wb-card wb-metric">
            <div className="wb-metric-top">
              <span className="wb-metric-label">Monitoring Mode</span>
              <span className="wb-icon"><Navigation size={17} /></span>
            </div>
            <div className="wb-metric-value autonomous">
              {loading ? <div className="wb-skeleton" style={{ width: 155 }} /> : metrics.mode}
            </div>
          </div>
        </div>

        <section className="wb-card wb-list-card">
          <div className="wb-list-header">
            <div className="wb-list-title">
              <span className="wb-list-title-icon"><Droplets size={16} /></span>
              Registered Monitoring Zones
            </div>
            <span className="wb-count">{waterBodies.length} ZONE{waterBodies.length === 1 ? '' : 'S'}</span>
          </div>

          <div className="wb-body">
            {loading ? (
              <div className="wb-item">
                <div className="wb-skeleton" style={{ width: 210, marginBottom: 18 }} />
                <div className="wb-skeleton" style={{ width: '100%', marginBottom: 10 }} />
                <div className="wb-skeleton" style={{ width: '75%' }} />
              </div>
            ) : waterBodies.length === 0 ? (
              <div className="wb-empty">
                <ShieldCheck size={25} style={{ marginBottom: 9, opacity: .55 }} />
                <div>No water bodies are currently registered.</div>
              </div>
            ) : (
              waterBodies.map((body) => {
                const center = centerOf(body);
                const status = String(body.status ?? 'MONITORED').toUpperCase();

                return (
                  <article className="wb-item" key={body.id}>
                    <div className="wb-item-top">
                      <div className="wb-name-wrap">
                        <h2 className="wb-name">{body.name}</h2>
                        <div className="wb-type">
                          {String(body.type ?? 'WATER BODY').toUpperCase()} · ACTIVE MONITORING ZONE
                        </div>
                      </div>

                      <span className="wb-status">
                        <span className="wb-status-dot" />
                        {status}
                      </span>
                    </div>

                    <div className="wb-info-grid">
                      <div className="wb-info">
                        <div className="wb-info-label">Area</div>
                        <div className="wb-info-value">{areaOf(body).toLocaleString()} m²</div>
                      </div>

                      <div className="wb-info">
                        <div className="wb-info-label">Center</div>
                        <div className="wb-info-value">
                          {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                        </div>
                      </div>

                      <div className="wb-info">
                        <div className="wb-info-label">Water Body ID</div>
                        <div className="wb-info-value">{body.id}</div>
                      </div>
                    </div>

                    <div className="wb-description">
                      {body.description ??
                        'Registered water body for autonomous monitoring and floating-waste management.'}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 14,
            color: '#526b7b',
            fontSize: 9,
          }}
        >
          <Activity size={11} />
          Live water-body registry · API connected
        </div>
      </div>
    </div>
  );
}
