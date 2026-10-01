import { useEffect, useMemo, useState } from 'react';

type Detection = {
  id: string;
  class_name: string;
  confidence: number;
  area_sq_m: number;
  centroid: {
    type: string;
    coordinates: [number, number];
  };
  scan_type: string;
  image_count: number;
  coverage_percent: number;
  water_body_name: string;
};

type DetectionResponse = {
  success: boolean;
  count: number;
  data: Detection[];
};

const API_URL = 'http://localhost:4000';

export default function AI() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDetections() {
    try {
      const response = await fetch(`${API_URL}/api/detections`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result: DetectionResponse = await response.json();

      if (!result.success) {
        throw new Error('Detection API returned an unsuccessful response');
      }

      setDetections(result.data);
      setError(null);
    } catch (err) {
      console.error('Detection fetch failed:', err);
      setError('Unable to connect to AI perception service');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetections();

    const interval = window.setInterval(fetchDetections, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const totalWasteArea = useMemo(
    () =>
      detections.reduce(
        (total, detection) => total + detection.area_sq_m,
        0,
      ),
    [detections],
  );

  const averageConfidence = useMemo(() => {
    if (detections.length === 0) {
      return 0;
    }

    return (
      detections.reduce(
        (total, detection) => total + detection.confidence,
        0,
      ) / detections.length
    );
  }, [detections]);

  const scan = detections[0];

  return (
    <div className="simple-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">AI PERCEPTION</span>
          <h2>Waste Detection</h2>
          <p>
            AI-generated waste perception and spatial detection results.
          </p>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          {loading ? 'CONNECTING' : error ? 'OFFLINE' : 'ONLINE'}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <div className="panel-card">
          <span className="eyebrow">DETECTIONS</span>
          <h3>{detections.length}</h3>
          <p>Waste regions detected</p>
        </div>

        <div className="panel-card">
          <span className="eyebrow">WASTE AREA</span>
          <h3>{totalWasteArea.toFixed(1)} m²</h3>
          <p>Total detected surface area</p>
        </div>

        <div className="panel-card">
          <span className="eyebrow">AVG CONFIDENCE</span>
          <h3>{(averageConfidence * 100).toFixed(1)}%</h3>
          <p>Detection confidence</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        <div className="panel-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <div>
              <span className="eyebrow">DETECTION RESULTS</span>
              <h3>Detected Waste Regions</h3>
            </div>

            <span className="eyebrow">
              {detections.length} RESULTS
            </span>
          </div>

          {loading ? (
            <p>Loading AI detections...</p>
          ) : error ? (
            <p>{error}</p>
          ) : detections.length === 0 ? (
            <p>No detections available.</p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {detections.map((detection) => (
                <div
                  key={detection.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr auto auto',
                    gap: '20px',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    background:
                      'rgba(255,255,255,0.035)',
                    border:
                      '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div>
                    <strong>
                      {detection.class_name
                        .replaceAll('_', ' ')
                        .replace(/\b\w/g, (char) =>
                          char.toUpperCase(),
                        )}
                    </strong>

                    <p
                      style={{
                        margin: '5px 0 0',
                        opacity: 0.6,
                      }}
                    >
                      {detection.area_sq_m.toFixed(1)} m²
                      {' · '}
                      {detection.water_body_name}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong>
                      {(detection.confidence * 100).toFixed(0)}%
                    </strong>

                    <p
                      style={{
                        margin: '5px 0 0',
                        opacity: 0.6,
                      }}
                    >
                      confidence
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong>
                      {detection.centroid.coordinates[1].toFixed(
                        5,
                      )}
                    </strong>

                    <p
                      style={{
                        margin: '5px 0 0',
                        opacity: 0.6,
                      }}
                    >
                      {detection.centroid.coordinates[0].toFixed(
                        5,
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div className="panel-card">
            <span className="eyebrow">SCAN</span>

            {scan ? (
              <>
                <h3>{scan.scan_type.toUpperCase()}</h3>
                <p>
                  {scan.image_count} aerial images processed
                </p>
              </>
            ) : (
              <h3>--</h3>
            )}
          </div>

          <div className="panel-card">
            <span className="eyebrow">COVERAGE</span>

            <h3>
              {scan
                ? `${scan.coverage_percent.toFixed(1)}%`
                : '--'}
            </h3>

            <p>Water-body scan coverage</p>
          </div>

          <div className="panel-card">
            <span className="eyebrow">TARGET AREA</span>

            <h3>
              {scan
                ? scan.water_body_name
                : '--'}
            </h3>

            <p>Active perception region</p>
          </div>
        </div>
      </div>
    </div>
  );
}