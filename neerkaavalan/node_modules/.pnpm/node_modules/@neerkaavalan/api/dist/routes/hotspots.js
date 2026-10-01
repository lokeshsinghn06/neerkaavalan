import { Router } from 'express';
import { db } from '@neerkaavalan/database';
const router = Router();
const DEFAULT_CLUSTER_RADIUS_M = 150;
const HOTSPOT_RADIUS_M = 50;
router.get('/', async (_req, res) => {
    try {
        const result = await db.query(`
      SELECT
        h.id,
        h.water_body_id,
        wb.name AS water_body_name,
        h.name,
        h.radius_m,
        h.waste_area_sq_m,
        h.waste_density,
        h.confidence,
        h.priority_score,
        h.severity,
        h.status,
        h.first_detected_at,
        h.last_detected_at,
        ST_AsGeoJSON(h.location)::json AS location
      FROM hotspots h
      JOIN water_bodies wb
        ON wb.id = h.water_body_id
      ORDER BY h.priority_score DESC, h.waste_area_sq_m DESC
    `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Failed to fetch hotspots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hotspots',
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        h.id,
        h.water_body_id,
        wb.name AS water_body_name,
        h.name,
        h.radius_m,
        h.waste_area_sq_m,
        h.waste_density,
        h.confidence,
        h.priority_score,
        h.severity,
        h.status,
        h.first_detected_at,
        h.last_detected_at,
        ST_AsGeoJSON(h.location)::json AS location
      FROM hotspots h
      JOIN water_bodies wb
        ON wb.id = h.water_body_id
      WHERE h.id = $1
      `, [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Hotspot not found',
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Failed to fetch hotspot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hotspot',
        });
    }
});
router.post('/generate', async (req, res) => {
    const clusterRadiusM = Number(req.body?.cluster_radius_m ?? DEFAULT_CLUSTER_RADIUS_M);
    const requestedWaterBodyId = req.body?.water_body_id ?? null;
    if (!Number.isFinite(clusterRadiusM) ||
        clusterRadiusM < 25 ||
        clusterRadiusM > 1000) {
        res.status(400).json({
            success: false,
            message: 'cluster_radius_m must be between 25 and 1000 metres',
        });
        return;
    }
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const waterBodiesResult = await client.query(`
      SELECT DISTINCT
        s.water_body_id,
        wb.name AS water_body_name
      FROM detections d
      JOIN scans s
        ON s.id = d.scan_id
      JOIN water_bodies wb
        ON wb.id = s.water_body_id
      WHERE
        ($1::uuid IS NULL OR s.water_body_id = $1::uuid)
      ORDER BY wb.name
      `, [requestedWaterBodyId]);
        const generatedHotspots = [];
        for (const waterBody of waterBodiesResult.rows) {
            const clusterResult = await client.query(`
        WITH clustered AS (
          SELECT
            d.id,
            d.centroid,
            d.area_sq_m,
            d.confidence,
            s.water_body_id,

            ST_ClusterWithinWin(
              ST_Transform(d.centroid, 3857),
              $1
            ) OVER (
              PARTITION BY s.water_body_id
            ) AS cluster_id

          FROM detections d
          JOIN scans s
            ON s.id = d.scan_id

          WHERE s.water_body_id = $2
        ),

        aggregated AS (
          SELECT
            water_body_id,
            cluster_id,

            ST_Centroid(
              ST_Collect(centroid)
            ) AS location,

            SUM(area_sq_m) AS waste_area_sq_m,
            AVG(confidence) AS confidence,
            COUNT(*) AS detection_count

          FROM clustered
          GROUP BY
            water_body_id,
            cluster_id
        )

        SELECT
          water_body_id,
          location,
          waste_area_sq_m,
          confidence,
          detection_count,

          waste_area_sq_m /
            (PI() * POWER($3, 2))
            AS waste_density,

          LEAST(
            100,
            (
              LEAST(waste_area_sq_m / 50.0, 1.0) * 50.0
            )
            +
            (confidence * 30.0)
            +
            (
              LEAST(
                (
                  waste_area_sq_m /
                  (PI() * POWER($3, 2))
                ) / 0.02,
                1.0
              ) * 20.0
            )
          ) AS priority_score

        FROM aggregated
        ORDER BY priority_score DESC
        `, [
                clusterRadiusM,
                waterBody.water_body_id,
                HOTSPOT_RADIUS_M,
            ]);
            let hotspotIndex = 1;
            for (const cluster of clusterResult.rows) {
                const priorityScore = Number(cluster.priority_score);
                let severity = 'LOW';
                if (priorityScore >= 80) {
                    severity = 'CRITICAL';
                }
                else if (priorityScore >= 60) {
                    severity = 'HIGH';
                }
                else if (priorityScore >= 40) {
                    severity = 'MEDIUM';
                }
                const existingHotspotResult = await client.query(`
            SELECT id
            FROM hotspots
            WHERE
              water_body_id = $1
              AND ST_DWithin(
                location::geography,
                $2::geography,
                75
              )
            ORDER BY
              ST_Distance(
                location::geography,
                $2::geography
              )
            LIMIT 1
            `, [
                    cluster.water_body_id,
                    cluster.location,
                ]);
                let hotspot;
                if (existingHotspotResult.rows.length > 0) {
                    const existingId = existingHotspotResult.rows[0].id;
                    const updateResult = await client.query(`
              UPDATE hotspots
              SET
                name = $1,
                location = $2,
                radius_m = $3,
                waste_area_sq_m = $4,
                waste_density = $5,
                confidence = $6,
                priority_score = $7,
                severity = $8,
                status = 'DETECTED',
                last_detected_at = NOW()
              WHERE id = $9
              RETURNING id
              `, [
                        `Hotspot ${hotspotIndex}`,
                        cluster.location,
                        HOTSPOT_RADIUS_M,
                        cluster.waste_area_sq_m,
                        cluster.waste_density,
                        cluster.confidence,
                        priorityScore,
                        severity,
                        existingId,
                    ]);
                    hotspot = updateResult.rows[0];
                }
                else {
                    const insertResult = await client.query(`
              INSERT INTO hotspots (
                water_body_id,
                name,
                location,
                radius_m,
                waste_area_sq_m,
                waste_density,
                confidence,
                priority_score,
                severity,
                status
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                'DETECTED'
              )
              RETURNING id
              `, [
                        cluster.water_body_id,
                        `Hotspot ${hotspotIndex}`,
                        cluster.location,
                        HOTSPOT_RADIUS_M,
                        cluster.waste_area_sq_m,
                        cluster.waste_density,
                        cluster.confidence,
                        priorityScore,
                        severity,
                    ]);
                    hotspot = insertResult.rows[0];
                }
                generatedHotspots.push({
                    id: hotspot.id,
                    water_body_id: cluster.water_body_id,
                    water_body_name: waterBody.water_body_name,
                    name: `Hotspot ${hotspotIndex}`,
                    detection_count: Number(cluster.detection_count),
                    waste_area_sq_m: Number(cluster.waste_area_sq_m),
                    waste_density: Number(cluster.waste_density),
                    confidence: Number(cluster.confidence),
                    priority_score: priorityScore,
                    severity,
                    status: 'DETECTED',
                    location: cluster.location,
                });
                hotspotIndex += 1;
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: 'Hotspots generated successfully',
            cluster_radius_m: clusterRadiusM,
            hotspot_radius_m: HOTSPOT_RADIUS_M,
            count: generatedHotspots.length,
            data: generatedHotspots,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to generate hotspots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate hotspots',
        });
    }
    finally {
        client.release();
    }
});
export default router;
