import { Router } from 'express';
import { db } from '@neerkaavalan/database';

const router = Router();

/**
 * GET /api/verifications/latest
 *
 * Returns the most recently verified cleanup mission.
 */
router.get('/latest', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        m.id AS mission_id,
        m.mission_code,
        m.status AS mission_status,
        m.priority AS mission_priority,
        m.actual_distance_m,
        m.actual_duration_sec,
        m.started_at,
        m.completed_at,

        h.id AS hotspot_id,
        h.name AS hotspot_name,
        h.severity AS hotspot_severity,
        h.priority_score,
        h.waste_area_sq_m AS hotspot_waste_area_sq_m,
        h.confidence AS hotspot_confidence,
        h.radius_m AS hotspot_radius_m,

        c.id AS collection_id,
        c.estimated_waste_kg,
        c.collected_waste_kg,
        c.collection_efficiency,
        c.status AS collection_status,
        c.started_at AS collection_started_at,
        c.completed_at AS collection_completed_at,

        v.id AS verification_id,
        v.before_waste_area_sq_m,
        v.after_waste_area_sq_m,
        v.reduction_percent,
        v.verification_confidence,
        v.verified,
        v.verified_at

      FROM verifications v
      JOIN missions m
        ON m.id = v.mission_id
      LEFT JOIN hotspots h
        ON h.id = v.hotspot_id
      LEFT JOIN collections c
        ON c.mission_id = m.id
      ORDER BY v.verified_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No cleanup verification records found',
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      verification: {
        id: row.verification_id,
        mission: {
          id: row.mission_id,
          code: row.mission_code,
          status: row.mission_status,
          priority: row.mission_priority,
          actualDistanceMeters: Number(row.actual_distance_m),
          actualDurationSeconds: Number(row.actual_duration_sec),
          startedAt: row.started_at,
          completedAt: row.completed_at,
        },
        hotspot: {
          id: row.hotspot_id,
          name: row.hotspot_name,
          severity: row.hotspot_severity,
          priorityScore: Number(row.priority_score),
          wasteAreaSqM: Number(row.hotspot_waste_area_sq_m),
          confidence: Number(row.hotspot_confidence),
          radiusMeters: Number(row.hotspot_radius_m),
        },
        collection: {
          id: row.collection_id,
          estimatedWasteKg: Number(row.estimated_waste_kg),
          collectedWasteKg: Number(row.collected_waste_kg),
          efficiencyPercent: Number(row.collection_efficiency),
          status: row.collection_status,
          startedAt: row.collection_started_at,
          completedAt: row.collection_completed_at,
        },
        verification: {
          beforeWasteAreaSqM: Number(row.before_waste_area_sq_m),
          afterWasteAreaSqM: Number(row.after_waste_area_sq_m),
          reductionPercent: Number(row.reduction_percent),
          confidence: Number(row.verification_confidence) * 100,
          verified: row.verified,
          verifiedAt: row.verified_at,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch latest verification:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cleanup verification',
    });
  }
});

/**
 * GET /api/verifications/:missionCode
 *
 * Returns verification information for a specific mission.
 *
 * Example:
 * /api/verifications/NK-M001
 */
router.get('/:missionCode', async (req, res) => {
  try {
    const { missionCode } = req.params;

    const result = await db.query(
      `
      SELECT
        m.id AS mission_id,
        m.mission_code,
        m.status AS mission_status,
        m.priority AS mission_priority,
        m.actual_distance_m,
        m.actual_duration_sec,
        m.started_at,
        m.completed_at,

        h.id AS hotspot_id,
        h.name AS hotspot_name,
        h.severity AS hotspot_severity,
        h.priority_score,
        h.waste_area_sq_m AS hotspot_waste_area_sq_m,
        h.confidence AS hotspot_confidence,
        h.radius_m AS hotspot_radius_m,

        c.id AS collection_id,
        c.estimated_waste_kg,
        c.collected_waste_kg,
        c.collection_efficiency,
        c.status AS collection_status,
        c.started_at AS collection_started_at,
        c.completed_at AS collection_completed_at,

        v.id AS verification_id,
        v.before_waste_area_sq_m,
        v.after_waste_area_sq_m,
        v.reduction_percent,
        v.verification_confidence,
        v.verified,
        v.verified_at

      FROM verifications v
      JOIN missions m
        ON m.id = v.mission_id
      LEFT JOIN hotspots h
        ON h.id = v.hotspot_id
      LEFT JOIN collections c
        ON c.mission_id = m.id
      WHERE m.mission_code = $1
      ORDER BY v.verified_at DESC
      LIMIT 1
      `,
      [missionCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No verification found for mission ${missionCode}`,
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      verification: {
        id: row.verification_id,

        mission: {
          id: row.mission_id,
          code: row.mission_code,
          status: row.mission_status,
          priority: row.mission_priority,
          actualDistanceMeters: Number(row.actual_distance_m),
          actualDurationSeconds: Number(row.actual_duration_sec),
          startedAt: row.started_at,
          completedAt: row.completed_at,
        },

        hotspot: {
          id: row.hotspot_id,
          name: row.hotspot_name,
          severity: row.hotspot_severity,
          priorityScore: Number(row.priority_score),
          wasteAreaSqM: Number(row.hotspot_waste_area_sq_m),
          confidence: Number(row.hotspot_confidence),
          radiusMeters: Number(row.hotspot_radius_m),
        },

        collection: {
          id: row.collection_id,
          estimatedWasteKg: Number(row.estimated_waste_kg),
          collectedWasteKg: Number(row.collected_waste_kg),
          efficiencyPercent: Number(row.collection_efficiency),
          status: row.collection_status,
          startedAt: row.collection_started_at,
          completedAt: row.collection_completed_at,
        },

        verification: {
          beforeWasteAreaSqM: Number(row.before_waste_area_sq_m),
          afterWasteAreaSqM: Number(row.after_waste_area_sq_m),
          reductionPercent: Number(row.reduction_percent),
          confidence: Number(row.verification_confidence) * 100,
          verified: row.verified,
          verifiedAt: row.verified_at,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch verification:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cleanup verification',
    });
  }
});

export default router;