import {
  DeviceGatewayService,
  createDeviceAdapter,
  detectDeviceFailure,
  decideRecovery,
  executeRecovery,
} from './index.js';

console.log('');
console.log('=== RECOVERY EXECUTOR SMOKE TEST ===');

const deviceCode = 'NK-U01';

const adapter = await createDeviceAdapter(deviceCode);

const gateway = new DeviceGatewayService([
  adapter,
]);

console.log('');
console.log('[STEP 1] Disconnecting device');

await gateway.disconnectDevice(deviceCode);

let state = await gateway.getDeviceState(deviceCode);

console.log('Connection:', state.connectionStatus);

if (state.connectionStatus !== 'OFFLINE') {
  throw new Error(
    'Expected NK-U01 to be OFFLINE after disconnect',
  );
}

console.log('PASS');

console.log('');
console.log('[STEP 2] Detecting failure');

const failure = detectDeviceFailure(state);

console.log('Failure:', failure);

if (
  failure === null ||
  failure.code !== 'CONNECTION_LOST'
) {
  throw new Error(
    'Expected CONNECTION_LOST failure',
  );
}

console.log('PASS');

console.log('');
console.log('[STEP 3] Creating recovery decision');

const decision = decideRecovery(failure);

console.log('Decision:', decision);

if (decision.action !== 'RECONNECT') {
  throw new Error(
    'Expected RECONNECT recovery action',
  );
}

console.log('PASS');

console.log('');
console.log('[STEP 4] Executing recovery');

state = await executeRecovery(
  gateway,
  failure,
  decision,
);

console.log('Recovered state:', state);

if (
  state === null ||
  state.connectionStatus !== 'ONLINE'
) {
  throw new Error(
    'Expected device to return ONLINE after recovery',
  );
}

console.log('PASS');

console.log('');
console.log('[STEP 5] Final verification');

const finalState = await gateway.getDeviceState(
  deviceCode,
);

console.log('Final state:', finalState);

if (finalState.connectionStatus !== 'ONLINE') {
  throw new Error(
    'NK-U01 did not return to ONLINE state',
  );
}

console.log('PASS');

console.log('');
console.log('=== RECOVERY EXECUTOR SMOKE TEST PASSED ===');