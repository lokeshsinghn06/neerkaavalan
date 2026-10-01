import { Router } from 'express';
import { db } from '@neerkaavalan/database';
const router = Router();
const RECOVERY_STATUSES = [
    'NONE',
    'RECOVERY_REQUIRED',
    'RECOVERY_IN_PROGRESS',
    'RECOVERED',
    'ESCALATED',
];
const ACTIVE_MISSION_STATUSES = [
    'CREATED',
    'PLANNED',
    'DISPATCHED',
    'NAVIGATING',
    'ARRIVED',
    'COLLECTING',
    'VERIFYING',
];
function priorityFromSeverity(severity) {
    switch (severity.toUpperCase()) {
        case 'CRITICAL':
            return 'HIGH';
        case 'HIGH':
            return 'HIGH';
        case 'MEDIUM':
            return 'NORMAL';
        default:
            return 'LOW';
    }
}
function estimateDurationSeconds(distanceM) {
    const planningSpeedMps = 1.5;
    return Math.max(1, Math.ceil(distanceM / planningSpeedMps));
}
router.get('/', async (_req, res) => {
    try {
        const result = await db.query(`
      SELECT
        m.id,
        m.mission_code,
        m.water_body_id,
        wb.name AS water_body_name,
        m.hotspot_id,
        h.name AS hotspot_name,
        m.device_id,
        d.device_code,
        d.name AS device_name,
        m.mission_type,
        m.status,
        m.priority,
        m.recovery_status,
        m.estimated_distance_m,
        m.estimated_duration_sec,
        m.actual_distance_m,
        m.actual_duration_sec,
        m.started_at,
        m.completed_at,
        m.created_at,
        m.updated_at
      FROM missions m
      JOIN water_bodies wb
        ON wb.id = m.water_body_id
      LEFT JOIN hotspots h
        ON h.id = m.hotspot_id
      LEFT JOIN devices d
        ON d.id = m.device_id
      ORDER BY m.created_at DESC
    `);
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Failed to fetch missions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch missions',
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        m.id,
        m.mission_code,
        m.water_body_id,
        wb.name AS water_body_name,
        m.hotspot_id,
        h.name AS hotspot_name,
        m.device_id,
        d.device_code,
        d.name AS device_name,
        m.mission_type,
        m.status,
        m.priority,
        m.recovery_status,
        m.estimated_distance_m,
        m.estimated_duration_sec,
        m.actual_distance_m,
        m.actual_duration_sec,
        m.started_at,
        m.completed_at,
        m.created_at,
        m.updated_at
      FROM missions m
      JOIN water_bodies wb
        ON wb.id = m.water_body_id
      LEFT JOIN hotspots h
        ON h.id = m.hotspot_id
      LEFT JOIN devices d
        ON d.id = m.device_id
      WHERE m.id = $1
      `, [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Mission not found',
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Failed to fetch mission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mission',
        });
    }
});
router.post('/plan', async (_req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        /*
         * 1. Select the highest-priority detected hotspot.
         */
        const hotspotResult = await client.query(`
      SELECT
        h.id,
        h.water_body_id,
        wb.name AS water_body_name,
        h.name,
        h.location,
        h.radius_m,
        h.waste_area_sq_m,
        h.waste_density,
        h.confidence,
        h.priority_score,
        h.severity,
        h.status
      FROM hotspots h
      JOIN water_bodies wb
        ON wb.id = h.water_body_id
      WHERE h.status = 'DETECTED'
      ORDER BY
        h.priority_score DESC,
        h.waste_area_sq_m DESC
      LIMIT 1
    `);
        if (hotspotResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                message: 'No detected hotspots available for planning',
            });
            return;
        }
        const hotspot = hotspotResult.rows[0];
        /*
         * 2. Find a USV.
         */
        const deviceResult = await client.query(`
      SELECT
        id,
        device_code,
        name,
        device_type,
        status,
        battery_percent,
        latitude,
        longitude,
        speed_mps,
        heading_deg
      FROM devices
      WHERE device_type = 'usv'
      ORDER BY
        CASE
          WHEN status = 'ONLINE' THEN 0
          ELSE 1
        END,
        device_code
      LIMIT 1
    `);
        if (deviceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                message: 'No USV available for mission planning',
            });
            return;
        }
        const device = deviceResult.rows[0];
        /*
         * 3. Get the latest simulator telemetry.
         *
         * This is intentionally separate from device status.
         * The device may be OFFLINE while simulation data exists.
         */
        const telemetryResult = await client.query(`
      SELECT
        latitude,
        longitude,
        timestamp
      FROM telemetry
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
      `, [device.id]);
        let planningLatitude = device.latitude;
        let planningLongitude = device.longitude;
        let planningSource = 'DEVICE';
        if (planningLatitude === null ||
            planningLongitude === null) {
            if (telemetryResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(409).json({
                    success: false,
                    message: 'USV has no live position or simulator telemetry position',
                });
                return;
            }
            planningLatitude =
                telemetryResult.rows[0].latitude;
            planningLongitude =
                telemetryResult.rows[0].longitude;
            planningSource = 'SIMULATOR_TELEMETRY';
        }
        /*
         * 4. Calculate distance from the USV planning position
         *    to the hotspot.
         */
        const distanceResult = await client.query(`
      SELECT ST_Distance(
        ST_SetSRID(
          ST_MakePoint($1, $2),
          4326
        )::geography,
        location::geography
      ) AS distance_m
      FROM hotspots
      WHERE id = $3
      `, [
            planningLongitude,
            planningLatitude,
            hotspot.id,
        ]);
        const distanceM = Number(distanceResult.rows[0].distance_m);
        const estimatedDurationSec = estimateDurationSeconds(distanceM);
        const missionPriority = priorityFromSeverity(hotspot.severity);
        /*
         * 5. Reuse an existing active mission for this hotspot.
         */
        const existingMissionResult = await client.query(`
        SELECT id, mission_code
        FROM missions
        WHERE
          hotspot_id = $1
          AND status = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT 1
        `, [
            hotspot.id,
            ACTIVE_MISSION_STATUSES,
        ]);
        let missionId;
        let missionCode;
        let action;
        if (existingMissionResult.rows.length > 0) {
            missionId =
                existingMissionResult.rows[0].id;
            missionCode =
                existingMissionResult.rows[0].mission_code;
            action = 'REUSED';
            await client.query(`
        UPDATE missions
        SET
          device_id = $1,
          mission_type = 'CLEANUP',
          priority = $2,
          estimated_distance_m = $3,
          estimated_duration_sec = $4,
          updated_at = NOW()
        WHERE id = $5
        `, [
                device.id,
                missionPriority,
                distanceM,
                estimatedDurationSec,
                missionId,
            ]);
        }
        else {
            /*
             * Generate the next NK-M### mission code.
             */
            const missionCodeResult = await client.query(`
          SELECT
            COALESCE(
              MAX(
                CAST(
                  NULLIF(
                    REGEXP_REPLACE(
                      mission_code,
                      '^NK-M',
                      ''
                    ),
                    ''
                  ) AS INTEGER
                )
              ),
              0
            ) + 1 AS next_number
          FROM missions
          WHERE mission_code LIKE 'NK-M%'
        `);
            const nextNumber = Number(missionCodeResult.rows[0].next_number);
            missionCode = `NK-M${String(nextNumber).padStart(3, '0')}`;
            const insertResult = await client.query(`
          INSERT INTO missions (
            mission_code,
            water_body_id,
            hotspot_id,
            device_id,
            mission_type,
            status,
            priority,
            estimated_distance_m,
            estimated_duration_sec
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'CLEANUP',
            'CREATED',
            $5,
            $6,
            $7
          )
          RETURNING id
          `, [
                missionCode,
                hotspot.water_body_id,
                hotspot.id,
                device.id,
                missionPriority,
                distanceM,
                estimatedDurationSec,
            ]);
            missionId = insertResult.rows[0].id;
            action = 'CREATED';
        }
        await client.query('COMMIT');
        res.status(action === 'CREATED' ? 201 : 200).json({
            success: true,
            action,
            decision: {
                hotspot: {
                    id: hotspot.id,
                    name: hotspot.name,
                    severity: hotspot.severity,
                    priority_score: Number(hotspot.priority_score),
                    waste_area_sq_m: Number(hotspot.waste_area_sq_m),
                    confidence: Number(hotspot.confidence),
                },
                usv: {
                    id: device.id,
                    device_code: device.device_code,
                    name: device.name,
                    status: device.status,
                    planning_source: planningSource,
                    latitude: Number(planningLatitude),
                    longitude: Number(planningLongitude),
                },
                mission: {
                    id: missionId,
                    mission_code: missionCode,
                    mission_type: 'CLEANUP',
                    status: 'CREATED',
                    recovery_status: 'NONE',
                    priority: missionPriority,
                    estimated_distance_m: Number(distanceM),
                    estimated_duration_sec: estimatedDurationSec,
                },
            },
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to plan mission:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to plan mission',
        });
    }
    finally {
        client.release();
    }
});
router.patch('/:id/recovery', async (req, res) => {
    try {
        const missionId = req.params.id;
        const { recoveryStatus } = req.body;
        if (!recoveryStatus ||
            !RECOVERY_STATUSES.includes(recoveryStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recoveryStatus',
                allowedStatuses: RECOVERY_STATUSES,
            });
        }
        const result = await db.query(`
      UPDATE missions
      SET
        recovery_status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        mission_code,
        status,
        recovery_status,
        device_id,
        updated_at
      `, [recoveryStatus, missionId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Mission ${missionId} not found`,
            });
        }
        return res.json({
            success: true,
            message: `Mission recovery status updated to ${recoveryStatus}`,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Failed to update mission recovery status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update mission recovery status',
        });
    }
});
router.patch('/:id/status', async (req, res) => {
    try {
        const missionId = req.params.id;
        const { status } = req.body;
        const allowedStatuses = [
            'CREATED',
            'PLANNED',
            'DISPATCHED',
            'NAVIGATING',
            'ARRIVED',
            'COLLECTING',
            'VERIFYING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
        ];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mission status',
                allowedStatuses,
            });
        }
        const result = await db.query(`
      UPDATE missions
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        mission_code,
        status,
        recovery_status,
        device_id,
        updated_at
      `, [status, missionId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Mission ${missionId} not found`,
            });
        }
        return res.json({
            success: true,
            message: `Mission status updated to ${status}`,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Failed to update mission status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update mission status',
        });
    }
});
export default router;
