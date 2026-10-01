import { db } from '@neerkaavalan/database';
import { SimulatorAdapter } from './adapters/SimulatorAdapter.js';
export async function createDeviceAdapter(deviceCode) {
    const result = await db.query(`
    SELECT
      device_code,
      device_type,
      operating_mode
    FROM devices
    WHERE device_code = $1
    `, [deviceCode]);
    if (result.rows.length === 0) {
        throw new Error(`Device not found: ${deviceCode}`);
    }
    const row = result.rows[0];
    const deviceType = row.device_type;
    const operatingMode = row.operating_mode;
    if (operatingMode === 'SIMULATION') {
        return new SimulatorAdapter(row.device_code, deviceType);
    }
    if (operatingMode === 'REAL') {
        throw new Error(`Real adapter is not implemented yet for device: ${deviceCode}`);
    }
    throw new Error(`Unsupported operating mode "${operatingMode}" for device: ${deviceCode}`);
}
