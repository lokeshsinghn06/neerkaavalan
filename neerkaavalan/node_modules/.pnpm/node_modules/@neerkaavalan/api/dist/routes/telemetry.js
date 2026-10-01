import { Router } from 'express';
import { db } from '@neerkaavalan/database';
const router = Router();
router.get('/:deviceCode', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT
        t.id,
        t.device_id,
        d.device_code,
        d.name AS device_name,
        t.timestamp,
        t.latitude,
        t.longitude
      FROM telemetry t
      JOIN devices d ON d.id = t.device_id
      WHERE d.device_code = $1
      ORDER BY t.timestamp ASC
      `, [req.params.deviceCode]);
        res.json({
            success: true,
            device: req.params.deviceCode,
            count: result.rows.length,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Failed to fetch telemetry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch telemetry',
        });
    }
});
export default router;
