import { db } from '@neerkaavalan/database';
import { DeviceGatewayService } from './index.js';
import { SimulatorAdapter } from './adapters/SimulatorAdapter.js';
async function main() {
    const simulatorAdapter = new SimulatorAdapter('NK-U01', 'usv');
    const gateway = new DeviceGatewayService([
        simulatorAdapter,
    ]);
    console.log('');
    console.log('========================================');
    console.log(' NEERKAAVALAN DEVICE GATEWAY TEST');
    console.log('========================================');
    console.log('');
    console.log('[1] Connecting to NK-U01 through gateway...');
    const state = await gateway.connectDevice('NK-U01');
    console.log('');
    console.log('Device State:');
    console.log(JSON.stringify(state, null, 2));
    console.log('');
    console.log('[2] Reading state again through gateway...');
    const currentState = await gateway.getDeviceState('NK-U01');
    console.log(JSON.stringify(currentState, null, 2));
    console.log('');
    console.log('========================================');
    console.log(' GATEWAY TEST PASSED');
    console.log('========================================');
    console.log('');
    await db.end();
}
main().catch(async (error) => {
    console.error('');
    console.error('========================================');
    console.error(' GATEWAY TEST FAILED');
    console.error('========================================');
    console.error('');
    console.error(error);
    await db.end();
    process.exit(1);
});
