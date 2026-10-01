import { Router } from 'express';
import { db } from '@neerkaavalan/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        type,
        description,
        area_sq_m,
        ST_AsGeoJSON(boundary)::json AS boundary,
        ST_AsGeoJSON(center_point)::json AS center_point
      FROM water_bodies
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Failed to fetch water bodies:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch water bodies',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        type,
        description,
        area_sq_m,
        ST_AsGeoJSON(boundary)::json AS boundary,
        ST_AsGeoJSON(center_point)::json AS center_point
      FROM water_bodies
      WHERE id = $1
      `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Water body not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to fetch water body:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch water body',
    });
  }
});

export default router;