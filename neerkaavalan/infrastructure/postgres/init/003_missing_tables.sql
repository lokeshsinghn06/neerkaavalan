-- ============================================================
-- NEERKAAVALAN - MISSING TABLES
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