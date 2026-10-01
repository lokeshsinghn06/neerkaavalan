-- ============================================================
-- NEERKAAVALAN DATABASE SCHEMA
-- PostgreSQL + PostGIS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================
-- WATER BODIES
-- ============================================================

CREATE TABLE IF NOT EXISTS water_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,

    description TEXT,

    area_sq_m DOUBLE PRECISION,

    boundary GEOMETRY(MULTIPOLYGON, 4326),

    center_point GEOMETRY(POINT, 4326),

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_bodies_boundary
ON water_bodies
USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_water_bodies_center
ON water_bodies
USING GIST (center_point);


-- ============================================================
-- DEVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    device_code VARCHAR(50) UNIQUE NOT NULL,

    name VARCHAR(100) NOT NULL,

    device_type VARCHAR(30) NOT NULL,

    model VARCHAR(100),

    status VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',

    battery_percent DOUBLE PRECISION,

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    position GEOMETRY(POINT, 4326),

    speed_mps DOUBLE PRECISION DEFAULT 0,

    heading_deg DOUBLE PRECISION DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_position
ON devices
USING GIST (position);


-- ============================================================
-- SCANS
-- ============================================================

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    water_body_id UUID NOT NULL
        REFERENCES water_bodies(id)
        ON DELETE CASCADE,

    device_id UUID
        REFERENCES devices(id)
        ON DELETE SET NULL,

    scan_type VARCHAR(30) NOT NULL,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    image_count INTEGER DEFAULT 0,

    coverage_percent DOUBLE PRECISION DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scans_water_body
ON scans(water_body_id);


-- ============================================================
-- AI DETECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scan_id UUID NOT NULL
        REFERENCES scans(id)
        ON DELETE CASCADE,

    class_name VARCHAR(100) NOT NULL,

    confidence DOUBLE PRECISION NOT NULL,

    area_sq_m DOUBLE PRECISION,

    centroid GEOMETRY(POINT, 4326),

    polygon GEOMETRY(POLYGON, 4326),

    image_url TEXT,

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detections_centroid
ON detections
USING GIST (centroid);

CREATE INDEX IF NOT EXISTS idx_detections_polygon
ON detections
USING GIST (polygon);


-- ============================================================
-- WASTE HOTSPOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    water_body_id UUID NOT NULL
        REFERENCES water_bodies(id)
        ON DELETE CASCADE,

    name VARCHAR(100),

    location GEOMETRY(POINT, 4326) NOT NULL,

    radius_m DOUBLE PRECISION DEFAULT 25,

    waste_area_sq_m DOUBLE PRECISION DEFAULT 0,

    waste_density DOUBLE PRECISION DEFAULT 0,

    confidence DOUBLE PRECISION DEFAULT 0,

    priority_score DOUBLE PRECISION DEFAULT 0,

    severity VARCHAR(30) DEFAULT 'LOW',

    status VARCHAR(30) DEFAULT 'DETECTED',

    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_location
ON hotspots
USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_hotspots_water_body
ON hotspots(water_body_id);

CREATE INDEX IF NOT EXISTS idx_hotspots_priority
ON hotspots(priority_score DESC);


-- ============================================================
-- MISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    mission_code VARCHAR(50) UNIQUE NOT NULL,

    water_body_id UUID NOT NULL
        REFERENCES water_bodies(id),

    hotspot_id UUID
        REFERENCES hotspots(id)
        ON DELETE SET NULL,

    device_id UUID
        REFERENCES devices(id)
        ON DELETE SET NULL,

    mission_type VARCHAR(50) NOT NULL DEFAULT 'CLEANUP',

    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',

    priority VARCHAR(30) DEFAULT 'NORMAL',

    estimated_distance_m DOUBLE PRECISION,

    estimated_duration_sec INTEGER,

    actual_distance_m DOUBLE PRECISION,

    actual_duration_sec INTEGER,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- MISSION WAYPOINTS
-- ============================================================

CREATE TABLE IF NOT EXISTS mission_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    mission_id UUID NOT NULL
        REFERENCES missions(id)
        ON DELETE CASCADE,

    sequence_number INTEGER NOT NULL,

    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    position GEOMETRY(POINT, 4326) NOT NULL,

    action VARCHAR(50),

    arrival_radius_m DOUBLE PRECISION DEFAULT 5,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(mission_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_waypoints_position
ON mission_waypoints
USING GIST (position);


-- ============================================================
-- TELEMETRY
-- ============================================================

CREATE TABLE IF NOT EXISTS telemetry (
    id BIGSERIAL PRIMARY KEY,

    device_id UUID NOT NULL
        REFERENCES devices(id)
        ON DELETE CASCADE,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    position GEOMETRY(POINT, 4326),

    altitude_m DOUBLE PRECISION,

    speed_mps DOUBLE PRECISION,

    heading_deg DOUBLE PRECISION,

    battery_percent DOUBLE PRECISION,

    signal_strength DOUBLE PRECISION,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
ON telemetry(device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_position
ON telemetry
USING GIST (position);


-- ============================================================
-- COLLECTION EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    mission_id UUID NOT NULL
        REFERENCES missions(id)
        ON DELETE CASCADE,

    device_id UUID
        REFERENCES devices(id)
        ON DELETE SET NULL,

    hotspot_id UUID
        REFERENCES hotspots(id)
        ON DELETE SET NULL,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    estimated_waste_kg DOUBLE PRECISION DEFAULT 0,

    collected_waste_kg DOUBLE PRECISION DEFAULT 0,

    collection_efficiency DOUBLE PRECISION DEFAULT 0,

    status VARCHAR(30) DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- CLEANUP VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    mission_id UUID NOT NULL
        REFERENCES missions(id)
        ON DELETE CASCADE,

    hotspot_id UUID
        REFERENCES hotspots(id)
        ON DELETE SET NULL,

    before_waste_area_sq_m DOUBLE PRECISION DEFAULT 0,

    after_waste_area_sq_m DOUBLE PRECISION DEFAULT 0,

    reduction_percent DOUBLE PRECISION DEFAULT 0,

    verification_confidence DOUBLE PRECISION DEFAULT 0,

    verified BOOLEAN DEFAULT FALSE,

    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS water_bodies_updated_at
ON water_bodies;

CREATE TRIGGER water_bodies_updated_at
BEFORE UPDATE ON water_bodies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS devices_updated_at
ON devices;

CREATE TRIGGER devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS missions_updated_at
ON missions;

CREATE TRIGGER missions_updated_at
BEFORE UPDATE ON missions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();