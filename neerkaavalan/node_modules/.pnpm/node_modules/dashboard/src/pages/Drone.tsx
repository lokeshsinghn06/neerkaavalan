import { useEffect, useMemo, useState } from 'react';
import { Battery, Camera, MapPin, Plane, ScanSearch } from 'lucide-react';

type DeviceState = {
  deviceCode: string;
  deviceType: string;
  operatingMode: string;
  connectionStatus: string;
  batteryPercent: number | null;
  position: {
    latitude: number;
    longitude: number;
    speedMps: number;
    headingDeg: number;
  } | null;
};

type Detection = {
  class_name: string;
  confidence: number;
  area_sq_m: number;
  centroid?: {
    coordinates: [number, number];
  };
  image_count?: number;
  coverage_percent?: number;
};

export default function Drone() {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:4000/api/devices/NK-D01/state')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('http://localhost:4000/api/detections')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([deviceJson, detectionJson]) => {
        if (deviceJson?.device) {
          setDevice(deviceJson.device);
        }
        if (detectionJson?.data) {
          setDetections(detectionJson.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalArea = useMemo(
    () => detections.reduce((sum, d) => sum + Number(d.area_sq_m || 0), 0),
    [detections],
  );

  const avgConfidence = useMemo(
    () =>
      detections.length
        ? detections.reduce((sum, d) => sum + Number(d.confidence || 0), 0) /
          detections.length
        : 0,
    [detections],
  );

  const scan = detections[0];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">AERIAL UNIT</div>
          <h1 className="page-header-title">Drone Operations</h1>
          <p className="page-header-description">
            Drone state, aerial scan results and AI perception output.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card card-body">Loading drone operations...</div>
      ) : (
        <>
          <section className="kpi-grid">
            <StatCard
              label="Device"
              value={device?.deviceCode ?? 'NK-D01'}
              icon={<Plane size={17} />}
            />
            <StatCard
              label="Connection"
              value={device?.connectionStatus ?? 'UNKNOWN'}
              icon={<MapPin size={17} />}
            />
            <StatCard
              label="Detected Regions"
              value={String(detections.length)}
              icon={<ScanSearch size={17} />}
            />
            <StatCard
              label="Waste Area"
              value={`${totalArea.toFixed(1)} m²`}
              icon={<Camera size={17} />}
            />
          </section>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Aerial Unit Status</h2>
                  <div className="card-subtitle">
                    Device Gateway state
                  </div>
                </div>

                <span className="status-badge status-online">
                  {device?.operatingMode ?? 'SIMULATION'}
                </span>
              </div>

              <div className="card-body">
                <div className="device-list">
                  <Info label="Connection" value={device?.connectionStatus ?? 'UNKNOWN'} />
                  <Info label="Battery" value={device?.batteryPercent != null ? `${device.batteryPercent}%` : 'Unavailable'} />
                  <Info
                    label="Position"
                    value={
                      device?.position
                        ? `${device.position.latitude.toFixed(5)}, ${device.position.longitude.toFixed(5)}`
                        : 'Unavailable'
                    }
                  />
                  <Info label="Speed" value={`${device?.position?.speedMps?.toFixed(2) ?? '0.00'} m/s`} />
                  <Info label="Heading" value={`${device?.position?.headingDeg?.toFixed(1) ?? '0.0'}°`} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Latest Scan Intelligence</h2>
                  <div className="card-subtitle">
                    AI detection output associated with the aerial scan
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div className="device-list">
                  <Info label="Detection Regions" value={String(detections.length)} />
                  <Info label="Total Waste Area" value={`${totalArea.toFixed(1)} m²`} />
                  <Info label="Average Confidence" value={`${(avgConfidence * 100).toFixed(1)}%`} />
                  <Info label="Images Captured" value={String(scan?.image_count ?? 24)} />
                  <Info label="Coverage" value={`${scan?.coverage_percent ?? 87.5}%`} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Detected Classes</h2>
                <div className="card-subtitle">
                  Current aerial perception results
                </div>
              </div>

              <Battery size={18} />
            </div>

            <div className="card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {detections.map((detection, index) => (
                  <div
                    key={`${detection.class_name}-${index}`}
                    style={{
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                  >
                    <strong>{detection.class_name.replaceAll('_', ' ')}</strong>
                    <div className="card-subtitle" style={{ marginTop: 6 }}>
                      {(detection.confidence * 100).toFixed(1)}% confidence
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {detection.area_sq_m} m²
                    </div>
                  </div>
                ))}
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
      <div className="kpi-value" style={{ fontSize: value.length > 9 ? 22 : undefined }}>
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 20,
        padding: '11px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span className="card-subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}