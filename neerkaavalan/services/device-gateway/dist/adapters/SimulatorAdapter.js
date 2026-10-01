import { db } from '@neerkaavalan/database';
export class SimulatorAdapter {
    deviceCode;
    deviceType;
    operatingMode = 'SIMULATION';
    constructor(deviceCode, deviceType) {
        this.deviceCode = deviceCode;
        this.deviceType = deviceType;
    }
    async connect() {
        await db.query(`
      UPDATE devices
      SET
        status = 'ONLINE',
        operating_mode = 'SIMULATION',
        updated_at = NOW()
      WHERE device_code = $1
      `, [this.deviceCode]);
    }
    async disconnect() {
        await db.query(`
      UPDATE devices
      SET
        status = 'OFFLINE',
        operating_mode = 'SIMULATION',
        updated_at = NOW()
      WHERE device_code = $1
      `, [this.deviceCode]);
    }
    async getState() {
        const result = await db.query(`
      SELECT
        device_code,
        device_type,
        status,
        operating_mode,
        battery_percent,
        latitude,
        longitude,
        speed_mps,
        heading_deg,
        updated_at
      FROM devices
      WHERE device_code = $1
      `, [this.deviceCode]);
        if (result.rows.length === 0) {
            throw new Error(`Device not found: ${this.deviceCode}`);
        }
        const row = result.rows[0];
        return {
            deviceCode: row.device_code,
            deviceType: row.device_type,
            operatingMode: row.operating_mode,
            connectionStatus: row.status,
            batteryPercent: row.battery_percent,
            position: row.latitude !== null && row.longitude !== null
                ? {
                    latitude: Number(row.latitude),
                    longitude: Number(row.longitude),
                    speedMps: Number(row.speed_mps ?? 0),
                    headingDeg: Number(row.heading_deg ?? 0),
                }
                : null,
            updatedAt: new Date(row.updated_at).toISOString(),
        };
    }
    async sendMission(command) {
        if (command.deviceCode !== this.deviceCode) {
            throw new Error(`Mission device mismatch: expected ${this.deviceCode}, received ${command.deviceCode}`);
        }
        if (command.waypoints.length === 0) {
            throw new Error(`Mission ${command.missionCode} contains no waypoints`);
        }
        await this.connect();
        console.log('');
        console.log(`[SIMULATOR] Mission ${command.missionCode} dispatched`);
        console.log(`[SIMULATOR] Device : ${this.deviceCode}`);
        console.log(`[SIMULATOR] Type   : ${this.deviceType}`);
        console.log(`[SIMULATOR] Mode   : ${this.operatingMode}`);
        console.log(`[SIMULATOR] Waypoints: ${command.waypoints.length}`);
        for (const waypoint of command.waypoints) {
            console.log(`[SIMULATOR] WP${waypoint.sequence} -> ` +
                `${waypoint.latitude}, ${waypoint.longitude}` +
                `${waypoint.action ? ` [${waypoint.action}]` : ''}`);
        }
        console.log(`[SIMULATOR] Mission command accepted by adapter`);
    }
    async stop() {
        await db.query(`
      UPDATE devices
      SET
        speed_mps = 0,
        operating_mode = 'SIMULATION',
        updated_at = NOW()
      WHERE device_code = $1
      `, [this.deviceCode]);
        console.log(`[SIMULATOR] Device ${this.deviceCode} stopped`);
    }
}
