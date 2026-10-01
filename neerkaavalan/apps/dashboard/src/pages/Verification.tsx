import { useEffect, useState } from 'react';

type VerificationData = {
  id: string;
  mission: {
    id: string;
    code: string;
    status: string;
    priority: string;
    actualDistanceMeters: number;
    actualDurationSeconds: number;
    startedAt: string;
    completedAt: string;
  };
  hotspot: {
    id: string;
    name: string;
    severity: string;
    priorityScore: number;
    wasteAreaSqM: number;
    confidence: number;
    radiusMeters: number;
  };
  collection: {
    id: string;
    estimatedWasteKg: number;
    collectedWasteKg: number;
    efficiencyPercent: number;
    status: string;
    startedAt: string;
    completedAt: string;
  };
  verification: {
    beforeWasteAreaSqM: number;
    afterWasteAreaSqM: number;
    reductionPercent: number;
    confidence: number;
    verified: boolean;
    verifiedAt: string;
  };
};

type ApiResponse = {
  success: boolean;
  verification: VerificationData;
  message?: string;
};

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function Verification() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadVerification() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'http://localhost:4000/api/verifications/latest'
      );

      if (!response.ok) {
        throw new Error('Failed to load cleanup verification');
      }

      const payload: ApiResponse = await response.json();

      if (!payload.success || !payload.verification) {
        throw new Error(payload.message ?? 'Verification data unavailable');
      }

      setData(payload.verification);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load verification data'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVerification();
  }, []);

  if (loading) {
    return (
      <div className="simple-page">
        <span className="eyebrow">POST-CLEANUP ANALYSIS</span>
        <h2>Cleanup Verification</h2>
        <p>Loading verification evidence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="simple-page">
        <span className="eyebrow">POST-CLEANUP ANALYSIS</span>
        <h2>Cleanup Verification</h2>
        <p>{error || 'No verification data available.'}</p>
      </div>
    );
  }

  const {
    mission,
    hotspot,
    collection,
    verification,
  } = data;

  return (
    <div className="verification-page">
      <div className="verification-header">
        <div>
          <span className="eyebrow">POST-CLEANUP ANALYSIS</span>

          <h2>Cleanup Verification</h2>

          <p>
            AI-assisted verification of waste reduction after autonomous
            collection.
          </p>
        </div>

        <div
          className={`verification-status ${
            verification.verified ? 'verified' : 'pending'
          }`}
        >
          <span className="verification-status-dot" />

          {verification.verified ? 'VERIFIED' : 'PENDING'}
        </div>
      </div>

      <div className="verification-grid verification-primary-grid">
        <section className="verification-card before-card">
          <div className="verification-card-label">
            BEFORE CLEANUP
          </div>

          <div className="verification-big-value">
            {formatNumber(verification.beforeWasteAreaSqM)}
            <span>m²</span>
          </div>

          <div className="verification-card-description">
            Detected waste area
          </div>
        </section>

        <section className="verification-card after-card">
          <div className="verification-card-label">
            AFTER CLEANUP
          </div>

          <div className="verification-big-value">
            {formatNumber(verification.afterWasteAreaSqM)}
            <span>m²</span>
          </div>

          <div className="verification-card-description">
            Residual waste area
          </div>
        </section>

        <section className="verification-card reduction-card">
          <div className="verification-card-label">
            WASTE REDUCTION
          </div>

          <div className="verification-big-value">
            {formatNumber(verification.reductionPercent)}
            <span>%</span>
          </div>

          <div className="verification-card-description">
            Reduction after autonomous cleanup
          </div>
        </section>
      </div>

      <div className="verification-grid verification-secondary-grid">
        <section className="verification-panel">
          <div className="verification-panel-header">
            <div>
              <span className="verification-panel-eyebrow">
                MISSION
              </span>

              <h3>{mission.code}</h3>
            </div>

            <span className="verification-pill success-pill">
              {mission.status}
            </span>
          </div>

          <div className="verification-detail-grid">
            <div>
              <span>Priority</span>
              <strong>{mission.priority}</strong>
            </div>

            <div>
              <span>Distance</span>
              <strong>
                {formatNumber(mission.actualDistanceMeters)} m
              </strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>
                {formatDuration(mission.actualDurationSeconds)}
              </strong>
            </div>

            <div>
              <span>Completed</span>
              <strong>{formatDate(mission.completedAt)}</strong>
            </div>
          </div>
        </section>

        <section className="verification-panel">
          <div className="verification-panel-header">
            <div>
              <span className="verification-panel-eyebrow">
                HOTSPOT
              </span>

              <h3>{hotspot.name}</h3>
            </div>

            <span className="verification-pill critical-pill">
              {hotspot.severity}
            </span>
          </div>

          <div className="verification-detail-grid">
            <div>
              <span>Priority Score</span>
              <strong>
                {formatNumber(hotspot.priorityScore)}
              </strong>
            </div>

            <div>
              <span>AI Confidence</span>
              <strong>
                {formatNumber(hotspot.confidence * 100, 1)}%
              </strong>
            </div>

            <div>
              <span>Detection Area</span>
              <strong>
                {formatNumber(hotspot.wasteAreaSqM)} m²
              </strong>
            </div>

            <div>
              <span>Hotspot Radius</span>
              <strong>
                {formatNumber(hotspot.radiusMeters, 0)} m
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="verification-panel collection-panel">
        <div className="verification-panel-header">
          <div>
            <span className="verification-panel-eyebrow">
              COLLECTION RESULT
            </span>

            <h3>Waste Collection Performance</h3>
          </div>

          <span className="verification-pill success-pill">
            {collection.status}
          </span>
        </div>

        <div className="collection-metrics">
          <div className="collection-metric">
            <span>Estimated Waste</span>
            <strong>
              {formatNumber(collection.estimatedWasteKg)} kg
            </strong>
          </div>

          <div className="collection-metric">
            <span>Collected Waste</span>
            <strong>
              {formatNumber(collection.collectedWasteKg)} kg
            </strong>
          </div>

          <div className="collection-metric">
            <span>Collection Efficiency</span>
            <strong>
              {formatNumber(collection.efficiencyPercent, 0)}%
            </strong>
          </div>

          <div className="collection-metric">
            <span>Verification Confidence</span>
            <strong>
              {formatNumber(verification.confidence, 0)}%
            </strong>
          </div>
        </div>

        <div className="verification-progress">
          <div className="verification-progress-header">
            <span>Cleanup effectiveness</span>
            <strong>
              {formatNumber(verification.reductionPercent)}%
            </strong>
          </div>

          <div className="verification-progress-track">
            <div
              className="verification-progress-fill"
              style={{
                width: `${Math.min(
                  verification.reductionPercent,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="verification-timeline">
        <div className="timeline-step completed">
          <div className="timeline-dot">1</div>
          <div>
            <strong>Waste detected</strong>
            <span>AI perception identified the hotspot.</span>
          </div>
        </div>

        <div className="timeline-line" />

        <div className="timeline-step completed">
          <div className="timeline-dot">2</div>
          <div>
            <strong>Mission executed</strong>
            <span>
              USV completed mission {mission.code}.
            </span>
          </div>
        </div>

        <div className="timeline-line" />

        <div className="timeline-step completed">
          <div className="timeline-dot">3</div>
          <div>
            <strong>Waste collected</strong>
            <span>
              {formatNumber(collection.collectedWasteKg)} kg collected.
            </span>
          </div>
        </div>

        <div className="timeline-line" />

        <div className="timeline-step completed">
          <div className="timeline-dot">4</div>
          <div>
            <strong>Cleanup verified</strong>
            <span>
              {formatNumber(verification.reductionPercent)}% reduction
              measured.
            </span>
          </div>
        </div>
      </section>

      <div className="verification-footer">
        <span>
          Verification recorded at {formatDate(verification.verifiedAt)}
        </span>

        <span>
          Evidence confidence: {formatNumber(verification.confidence, 0)}%
        </span>
      </div>
    </div>
  );
}