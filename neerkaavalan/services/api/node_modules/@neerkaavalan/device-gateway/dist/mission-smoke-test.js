import { db } from '@neerkaavalan/database';
import { DeviceGatewayService } from './index.js';
import { createDeviceAdapter } from './adapterFactory.js';
async function main() {
    console.log('');
    console.log('========================================');
    console.log(' GATEWAY MISSION DISPATCH TEST');
    console.log('========================================');
    console.log('');
    const adapter = await createDeviceAdapter('NK-U01');
    const gateway = new DeviceGatewayService([
        adapter,
    ]);
    const command = {
        missionCode: 'NK-GW-TEST-001',
        deviceCode: 'NK-U01',
        waypoints: [
            {
                sequence: 1,
                latitude: 13.0525,
                longitude: 80.2125,
                action: 'DEPART',
            },
            {
                sequence: 2,
                latitude: 13.0528,
                longitude: 80.2132,
                action: 'APPROACH',
            },
            {
                sequence: 3,
                latitude: 13.0534,
                longitude: 80.2141,
                action: 'COLLECT',
            },
        ],
    };
    console.log('[1] Dispatching test mission through gateway...');
    await gateway.dispatchMission(command);
    console.log('');
    console.log('[2] Reading device state after dispatch...');
    const state = await gateway.getDeviceState('NK-U01');
    console.log('');
    console.log('Device State:');
    console.log(JSON.stringify(state, null, 2));
    console.log('');
    console.log('========================================');
    console.log(' MISSION DISPATCH TEST PASSED');
    console.log('========================================');
    console.log('');
    console.log('No mission database record was created.');
    console.log('No telemetry was generated.');
    console.log('NK-M001 was not executed.');
    console.log('');
    await db.end();
}
main().catch(async (error) => {
    console.error('');
    console.error('========================================');
    console.error(' MISSION DISPATCH TEST FAILED');
    console.error('========================================');
    console.error('');
    console.error(error);
    await db.end();
    process.exit(1);
});
