import { Router } from 'express';
import { db } from '@neerkaavalan/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        d.id,
        d.scan_id,
        d.class_name,
        d.confidence,
        d.area_sq_m,
        ST_AsGeoJSON(d.centroid)::json AS centroid,
        ST_AsGeoJSON(d.polygon)::json AS polygon,
        d.image_url,
        s.scan_type,
        s.image_count,
        s.coverage_percent,
        wb.id AS water_body_id,
        wb.name AS water_body_name
      FROM detections d
      JOIN scans s ON s.id = d.scan_id
      JOIN water_bodies wb ON wb.id = s.water_body_id
      ORDER BY d.confidence DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Failed to fetch detections:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch detections',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        d.id,
        d.scan_id,
        d.class_name,
        d.confidence,
        d.area_sq_m,
        ST_AsGeoJSON(d.centroid)::json AS centroid,
        ST_AsGeoJSON(d.polygon)::json AS polygon,
        d.image_url,
        s.scan_type,
        s.image_count,
        s.coverage_percent,
        wb.id AS water_body_id,
        wb.name AS water_body_name
      FROM detections d
      JOIN scans s ON s.id = d.scan_id
      JOIN water_bodies wb ON wb.id = s.water_body_id
      WHERE d.id = $1
      `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Detection not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to fetch detection:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch detection',
    });
  }
});

export default router;