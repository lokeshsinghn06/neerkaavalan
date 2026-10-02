import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  BrainCircuit,
  MapPin,
  Route,
  Zap,
  ImageIcon,
  Navigation,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
  Crosshair,
  Trash2,
  RotateCcw,
  Eye,
} from 'lucide-react';

/* ================================================================
   Types
   ================================================================ */

type GarbageObject = {
  label: number;
  area_pixels: number;
  centroid_x: number;
  centroid_y: number;
  bbox: { x: number; y: number; w: number; h: number };
};

type GarbageGPS = {
  id: string;
  latitude: number;
  longitude: number;
  pixel_x: number;
  pixel_y: number;
  area_pixels: number;
};

type AnalysisResult = {
  success: boolean;
  processing_time_s: number;
  waste_percentage: number;
  garbage_objects: GarbageObject[];
  garbage_gps: GarbageGPS[];
  waypoints: GarbageGPS[];
  optimized_route: GarbageGPS[];
  route_indices: number[];
  total_distance_m: number;
  images: {
    original: string | null;
    mask: string | null;
    probability_heatmap: string | null;
    route_visualization: string | null;
  };
  parameters: {
    drone_lat: number;
    drone_lon: number;
    altitude: number;
    heading: number;
    hfov: number;
    threshold: number;
    min_garbage_area: number;
  };
};

/* Detection type from existing API */
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
const AI_ENGINE_URL = 'http://localhost:5050';

type ViewTab = 'upload' | 'results';
type ImageView = 'original' | 'mask' | 'heatmap' | 'route';

/* ================================================================
   Component
   ================================================================ */

export default function AI() {
  /* ---- Existing detection feed ---- */
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionsLoading, setDetectionsLoading] = useState(true);
  const [detectionsError, setDetectionsError] = useState<string | null>(null);

  /* ---- AI Engine analysis ---- */
  const [activeTab, setActiveTab] = useState<ViewTab>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [imageView, setImageView] = useState<ImageView>('route');
  const [aiEngineOnline, setAiEngineOnline] = useState<boolean | null>(null);

  /* ---- Parameters ---- */
  const [droneLat, setDroneLat] = useState('13.082680');
  const [droneLon, setDroneLon] = useState('80.270718');
  const [altitude, setAltitude] = useState('30.0');
  const [heading, setHeading] = useState('0.0');
  const [hfov, setHfov] = useState('78.0');
  const [threshold, setThreshold] = useState('0.5');

  /* ---- Pipeline step animation ---- */
  const [pipelineStep, setPipelineStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ----------------------------------------------------------------
     Fetch existing detections
     ---------------------------------------------------------------- */

  async function fetchDetections() {
    try {
      const response = await fetch(`${API_URL}/api/detections`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result: DetectionResponse = await response.json();
      if (!result.success) throw new Error('Detection API returned unsuccessful response');
      setDetections(result.data);
      setDetectionsError(null);
    } catch (err) {
      console.error('Detection fetch failed:', err);
      setDetectionsError('Unable to connect to API service');
    } finally {
      setDetectionsLoading(false);
    }
  }

  /* ----------------------------------------------------------------
     Check AI Engine health
     ---------------------------------------------------------------- */

  async function checkAiEngine() {
    try {
      const res = await fetch(`${AI_ENGINE_URL}/api/ai/health`);
      if (res.ok) {
        setAiEngineOnline(true);
      } else {
        setAiEngineOnline(false);
      }
    } catch {
      setAiEngineOnline(false);
    }
  }

  useEffect(() => {
    fetchDetections();
    checkAiEngine();
    const interval = window.setInterval(fetchDetections, 10000);
    const healthInterval = window.setInterval(checkAiEngine, 15000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(healthInterval);
    };
  }, []);

  /* ----------------------------------------------------------------
     Derived data from existing detections
     ---------------------------------------------------------------- */

  const totalWasteArea = useMemo(
    () => detections.reduce((t, d) => t + d.area_sq_m, 0),
    [detections],
  );

  const averageConfidence = useMemo(() => {
    if (detections.length === 0) return 0;
    return detections.reduce((t, d) => t + d.confidence, 0) / detections.length;
  }, [detections]);

  /* ----------------------------------------------------------------
     Image handling
     ---------------------------------------------------------------- */

  const handleFileSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setAnalysisResult(null);
    setAnalysisError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /* ----------------------------------------------------------------
     Run AI Analysis
     ---------------------------------------------------------------- */

  async function runAnalysis() {
    if (!selectedImage) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setPipelineStep(0);

    // Animate pipeline steps
    const stepTimers = [
      setTimeout(() => setPipelineStep(1), 500),
      setTimeout(() => setPipelineStep(2), 2000),
      setTimeout(() => setPipelineStep(3), 4000),
      setTimeout(() => setPipelineStep(4), 6000),
      setTimeout(() => setPipelineStep(5), 8000),
    ];

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('drone_lat', droneLat);
      formData.append('drone_lon', droneLon);
      formData.append('altitude', altitude);
      formData.append('heading', heading);
      formData.append('hfov', hfov);
      formData.append('threshold', threshold);

      const res = await fetch(`${AI_ENGINE_URL}/api/ai/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setPipelineStep(6);
      setAnalysisResult(data);
      setActiveTab('results');
      setImageView('route');
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Is the AI Engine running?');
    } finally {
      stepTimers.forEach(clearTimeout);
      setAnalyzing(false);
    }
  }

  const resetAnalysis = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setActiveTab('upload');
    setPipelineStep(0);
  };

  /* ----------------------------------------------------------------
     Current image source for viewer
     ---------------------------------------------------------------- */

  const currentViewImage = useMemo(() => {
    if (!analysisResult) return null;
    const imgs = analysisResult.images;
    switch (imageView) {
      case 'original':
        return imgs.original;
      case 'mask':
        return imgs.mask;
      case 'heatmap':
        return imgs.probability_heatmap;
      case 'route':
        return imgs.route_visualization;
      default:
        return null;
    }
  }, [analysisResult, imageView]);

  /* ----------------------------------------------------------------
     Pipeline steps config
     ---------------------------------------------------------------- */

  const pipelineSteps = [
    { icon: Upload, label: 'Image Upload', desc: 'Loading aerial image' },
    { icon: BrainCircuit, label: 'DeepLabV3+', desc: 'Running segmentation model' },
    { icon: Layers, label: 'Post-processing', desc: 'Extracting garbage regions' },
    { icon: MapPin, label: 'GPS Mapping', desc: 'Pixel → GPS conversion' },
    { icon: Route, label: 'Route Planning', desc: 'TSP optimization' },
    { icon: CheckCircle2, label: 'Complete', desc: 'Results ready' },
  ];

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="ai-page">
      {/* ---- Page Header ---- */}
      <div className="ai-page-header">
        <div>
          <span className="ai-eyebrow">INTELLIGENCE · AI ENGINE</span>
          <h2 className="ai-title">AI Perception & Route Planning</h2>
          <p className="ai-subtitle">
            DeepLabV3+ garbage segmentation, GPS waypoint extraction, and TSP-optimized USV collection routes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* DB Detection Status */}
          <div className="ai-status-pill">
            <span
              className="ai-status-dot"
              style={{
                background: detectionsError ? '#fb7185' : '#34d399',
                boxShadow: detectionsError
                  ? '0 0 8px rgba(251,113,133,0.5)'
                  : '0 0 8px rgba(52,211,153,0.5)',
              }}
            />
            DB {detectionsLoading ? 'CONNECTING' : detectionsError ? 'OFFLINE' : 'ONLINE'}
          </div>

          {/* AI Engine Status */}
          <div className="ai-status-pill">
            <span
              className="ai-status-dot"
              style={{
                background:
                  aiEngineOnline === null
                    ? '#fbbf24'
                    : aiEngineOnline
                      ? '#34d399'
                      : '#fb7185',
                boxShadow:
                  aiEngineOnline === null
                    ? '0 0 8px rgba(251,191,36,0.5)'
                    : aiEngineOnline
                      ? '0 0 8px rgba(52,211,153,0.5)'
                      : '0 0 8px rgba(251,113,133,0.5)',
              }}
            />
            AI Engine{' '}
            {aiEngineOnline === null ? 'CHECKING' : aiEngineOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* ---- Top KPI Cards ---- */}
      <div className="ai-kpi-row">
        <div className="ai-kpi-card">
          <div className="ai-kpi-icon-wrap" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee' }}>
            <BrainCircuit size={18} />
          </div>
          <div>
            <span className="ai-kpi-label">DETECTIONS</span>
            <div className="ai-kpi-value">{detections.length}</div>
          </div>
        </div>

        <div className="ai-kpi-card">
          <div className="ai-kpi-icon-wrap" style={{ background: 'rgba(251,113,133,0.08)', color: '#fb7185' }}>
            <Target size={18} />
          </div>
          <div>
            <span className="ai-kpi-label">WASTE AREA</span>
            <div className="ai-kpi-value">{totalWasteArea.toFixed(1)} <span className="ai-kpi-unit">m²</span></div>
          </div>
        </div>

        <div className="ai-kpi-card">
          <div className="ai-kpi-icon-wrap" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
            <Zap size={18} />
          </div>
          <div>
            <span className="ai-kpi-label">AVG CONFIDENCE</span>
            <div className="ai-kpi-value">{(averageConfidence * 100).toFixed(1)}<span className="ai-kpi-unit">%</span></div>
          </div>
        </div>

        <div className="ai-kpi-card">
          <div className="ai-kpi-icon-wrap" style={{ background: 'rgba(168,85,247,0.08)', color: '#a855f7' }}>
            <Route size={18} />
          </div>
          <div>
            <span className="ai-kpi-label">ROUTE DISTANCE</span>
            <div className="ai-kpi-value">
              {analysisResult ? `${analysisResult.total_distance_m.toFixed(1)}` : '--'}
              <span className="ai-kpi-unit">{analysisResult ? 'm' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Main Content ---- */}
      <div className="ai-main-grid">
        {/* ---- Left Column: Upload / Results ---- */}
        <div className="ai-main-left">
          {/* Tab switcher */}
          <div className="ai-tab-bar">
            <button
              className={`ai-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} /> Analyze Image
            </button>
            <button
              className={`ai-tab ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
              disabled={!analysisResult}
            >
              <Eye size={14} /> Results Viewer
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="ai-upload-area">
              {!imagePreview ? (
                <div
                  className="ai-dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <div className="ai-dropzone-icon">
                    <Upload size={32} />
                  </div>
                  <h3>Upload Aerial Image</h3>
                  <p>Drag & drop a drone or boat-captured image, or click to browse</p>
                  <span className="ai-dropzone-hint">PNG, JPG, TIFF — Max 50MB</span>
                </div>
              ) : (
                <div className="ai-preview-container">
                  <div className="ai-preview-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ImageIcon size={16} style={{ color: '#22d3ee' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {selectedImage?.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {selectedImage && `${(selectedImage.size / 1024 / 1024).toFixed(2)} MB`}
                      </span>
                    </div>
                    <button className="ai-icon-btn" onClick={resetAnalysis} title="Clear">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="ai-preview-image-wrap">
                    <img src={imagePreview} alt="Preview" className="ai-preview-image" />

                    {analyzing && (
                      <div className="ai-analyzing-overlay">
                        <div className="ai-analyzing-spinner" />
                        <span>Analyzing...</span>
                      </div>
                    )}
                  </div>

                  {/* Parameters Panel */}
                  <div className="ai-params-grid">
                    <div className="ai-param">
                      <label>Drone Lat</label>
                      <input value={droneLat} onChange={(e) => setDroneLat(e.target.value)} />
                    </div>
                    <div className="ai-param">
                      <label>Drone Lon</label>
                      <input value={droneLon} onChange={(e) => setDroneLon(e.target.value)} />
                    </div>
                    <div className="ai-param">
                      <label>Altitude (m)</label>
                      <input value={altitude} onChange={(e) => setAltitude(e.target.value)} />
                    </div>
                    <div className="ai-param">
                      <label>Heading (°)</label>
                      <input value={heading} onChange={(e) => setHeading(e.target.value)} />
                    </div>
                    <div className="ai-param">
                      <label>HFOV (°)</label>
                      <input value={hfov} onChange={(e) => setHfov(e.target.value)} />
                    </div>
                    <div className="ai-param">
                      <label>Threshold</label>
                      <input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="ai-action-row">
                    <button
                      className="ai-btn-primary"
                      onClick={runAnalysis}
                      disabled={analyzing || !aiEngineOnline}
                    >
                      {analyzing ? (
                        <>
                          <div className="ai-btn-spinner" /> Processing...
                        </>
                      ) : (
                        <>
                          <BrainCircuit size={16} /> Run AI Pipeline
                        </>
                      )}
                    </button>

                    <button className="ai-btn-secondary" onClick={resetAnalysis}>
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>

                  {analysisError && (
                    <div className="ai-error-banner">
                      <AlertTriangle size={16} />
                      <span>{analysisError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && analysisResult && (
            <div className="ai-results-area">
              {/* Image view switcher */}
              <div className="ai-view-switcher">
                {(
                  [
                    { key: 'route', label: 'Route Map', icon: Route },
                    { key: 'original', label: 'Original', icon: ImageIcon },
                    { key: 'mask', label: 'Segmentation', icon: Layers },
                    { key: 'heatmap', label: 'Heatmap', icon: Crosshair },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.key}
                    className={`ai-view-btn ${imageView === v.key ? 'active' : ''}`}
                    onClick={() => setImageView(v.key)}
                  >
                    <v.icon size={13} /> {v.label}
                  </button>
                ))}
              </div>

              {/* Image Viewer */}
              <div className="ai-result-image-wrap">
                {currentViewImage ? (
                  <img
                    src={`data:image/png;base64,${currentViewImage}`}
                    alt={imageView}
                    className="ai-result-image"
                  />
                ) : (
                  <div className="ai-no-image">
                    <ImageIcon size={32} />
                    <p>No image available for this view</p>
                  </div>
                )}
              </div>

              {/* Processing summary */}
              <div className="ai-result-summary">
                <div className="ai-summary-item">
                  <Clock size={13} />
                  <span>Processed in <strong>{analysisResult.processing_time_s}s</strong></span>
                </div>
                <div className="ai-summary-item">
                  <Target size={13} />
                  <span><strong>{analysisResult.garbage_objects.length}</strong> regions detected</span>
                </div>
                <div className="ai-summary-item">
                  <Navigation size={13} />
                  <span>Route: <strong>{analysisResult.total_distance_m.toFixed(1)}m</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Right Column: Pipeline + Waypoints ---- */}
        <div className="ai-main-right">
          {/* Pipeline visualization */}
          <div className="ai-panel">
            <div className="ai-panel-header">
              <span className="ai-eyebrow">PROCESSING PIPELINE</span>
              <h3>AI Pipeline Status</h3>
            </div>

            <div className="ai-pipeline-steps">
              {pipelineSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = analyzing && pipelineStep === i;
                const isComplete = pipelineStep > i;
                const isPending = pipelineStep < i;

                return (
                  <div key={i} className="ai-pipeline-row">
                    <div
                      className={`ai-pipeline-dot ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                    >
                      {isComplete ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <StepIcon size={14} />
                      )}
                    </div>
                    <div className="ai-pipeline-info">
                      <strong>{step.label}</strong>
                      <span>{step.desc}</span>
                    </div>
                    {isActive && <div className="ai-pipeline-pulse" />}
                    {isComplete && (
                      <ChevronRight size={14} style={{ color: '#34d399', opacity: 0.6 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results data panel */}
          {analysisResult && (
            <>
              {/* Waste Coverage */}
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <span className="ai-eyebrow">WASTE ANALYSIS</span>
                  <h3>Coverage Report</h3>
                </div>

                <div className="ai-waste-stats">
                  <div className="ai-waste-bar-container">
                    <div className="ai-waste-bar-track">
                      <div
                        className="ai-waste-bar-fill"
                        style={{ width: `${Math.min(analysisResult.waste_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="ai-waste-bar-label">
                      <span>Waste Coverage</span>
                      <strong>{analysisResult.waste_percentage.toFixed(2)}%</strong>
                    </div>
                  </div>

                  <div className="ai-stat-grid">
                    <div className="ai-stat">
                      <span>Regions</span>
                      <strong>{analysisResult.garbage_objects.length}</strong>
                    </div>
                    <div className="ai-stat">
                      <span>Waypoints</span>
                      <strong>{analysisResult.waypoints.length}</strong>
                    </div>
                    <div className="ai-stat">
                      <span>Route Stops</span>
                      <strong>{analysisResult.route_indices.length}</strong>
                    </div>
                    <div className="ai-stat">
                      <span>Distance</span>
                      <strong>{analysisResult.total_distance_m.toFixed(1)}m</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS Waypoints */}
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <span className="ai-eyebrow">USV COLLECTION ROUTE</span>
                  <h3>GPS Waypoints ({analysisResult.waypoints.length})</h3>
                </div>

                <div className="ai-waypoints-list">
                  {analysisResult.optimized_route.map((wp, i) => (
                    <div key={wp.id} className="ai-waypoint-row">
                      <div className="ai-waypoint-order">{i + 1}</div>
                      <div className="ai-waypoint-info">
                        <strong>{wp.id}</strong>
                        <span>
                          {wp.latitude.toFixed(6)}, {wp.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="ai-waypoint-area">
                        {wp.area_pixels.toLocaleString()}
                        <span>px</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Existing detections feed */}
          {!analysisResult && (
            <div className="ai-panel">
              <div className="ai-panel-header">
                <span className="ai-eyebrow">DATABASE DETECTIONS</span>
                <h3>Recent Waste Detections ({detections.length})</h3>
              </div>

              <div className="ai-waypoints-list">
                {detectionsLoading ? (
                  <p style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>
                    Loading detections...
                  </p>
                ) : detectionsError ? (
                  <p style={{ padding: '16px', color: '#fb7185', fontSize: '12px' }}>
                    {detectionsError}
                  </p>
                ) : detections.length === 0 ? (
                  <p style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>
                    No detections available.
                  </p>
                ) : (
                  detections.slice(0, 8).map((d) => (
                    <div key={d.id} className="ai-waypoint-row">
                      <div className="ai-waypoint-order" style={{ background: 'rgba(251,113,133,0.1)', color: '#fb7185' }}>
                        <AlertTriangle size={12} />
                      </div>
                      <div className="ai-waypoint-info">
                        <strong>
                          {d.class_name.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </strong>
                        <span>{d.water_body_name} · {d.area_sq_m.toFixed(1)} m²</span>
                      </div>
                      <div className="ai-waypoint-area">
                        {(d.confidence * 100).toFixed(0)}
                        <span>%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}