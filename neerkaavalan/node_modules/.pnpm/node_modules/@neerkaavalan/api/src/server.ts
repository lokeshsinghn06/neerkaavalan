import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { checkDatabaseConnection } from '@neerkaavalan/database';
import waterBodiesRouter from './routes/waterBodies.js';
import telemetryRouter from './routes/telemetry.js';
import detectionsRouter from './routes/detections.js';
import hotspotsRouter from './routes/hotspots.js';
import missionsRouter from './routes/missions.js';
import verificationsRouter from './routes/verifications.js';
import devicesRouter from './routes/devices.js';

const app = express();

const PORT = Number(process.env.API_PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use('/api/water-bodies', waterBodiesRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/detections', detectionsRouter);
app.use('/api/hotspots', hotspotsRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/verifications', verificationsRouter);
app.use('/api/devices', devicesRouter);

app.get('/health', async (_req, res) => {
  try {
    await checkDatabaseConnection();

    res.json({
      success: true,
      service: 'neerkaavalan-api',
      status: 'healthy',
      database: 'online',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database connection failed:', error);

    res.status(503).json({
      success: false,
      service: 'neerkaavalan-api',
      status: 'degraded',
      database: 'offline',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'NeerKaavalan API',
    version: '1.0.0',
    status: 'online',
  });
});

app.listen(PORT, () => {
  console.log(
    `NEERKAAVALAN API ONLINE | Port: ${PORT} | PostgreSQL + PostGIS`
  );
});
