import { decideRecovery } from './RecoveryDecisionEngine.js';
console.log('');
console.log('=== RECOVERY DECISION SMOKE TEST ===');
const connectionLost = decideRecovery({
    deviceCode: 'NK-TEST-001',
    code: 'CONNECTION_LOST',
    message: 'Connection lost',
    detectedAt: new Date().toISOString(),
    recoverable: true,
});
console.log('');
console.log('[TEST 1] CONNECTION_LOST');
console.log(connectionLost);
if (connectionLost.action !== 'RECONNECT') {
    throw new Error('CONNECTION_LOST should result in RECONNECT');
}
console.log('PASS');
const commandRejected = decideRecovery({
    deviceCode: 'NK-TEST-002',
    code: 'COMMAND_REJECTED',
    message: 'Mission command rejected',
    detectedAt: new Date().toISOString(),
    recoverable: true,
});
console.log('');
console.log('[TEST 2] COMMAND_REJECTED');
console.log(commandRejected);
if (commandRejected.action !== 'RETRY_COMMAND') {
    throw new Error('COMMAND_REJECTED should result in RETRY_COMMAND');
}
console.log('PASS');
const telemetryTimeout = decideRecovery({
    deviceCode: 'NK-TEST-003',
    code: 'TELEMETRY_TIMEOUT',
    message: 'Telemetry timeout',
    detectedAt: new Date().toISOString(),
    recoverable: true,
});
console.log('');
console.log('[TEST 3] TELEMETRY_TIMEOUT');
console.log(telemetryTimeout);
if (telemetryTimeout.action !== 'RECONNECT') {
    throw new Error('TELEMETRY_TIMEOUT should result in RECONNECT');
}
console.log('PASS');
const recoverableDeviceError = decideRecovery({
    deviceCode: 'NK-TEST-004',
    code: 'DEVICE_ERROR',
    message: 'Recoverable device error',
    detectedAt: new Date().toISOString(),
    recoverable: true,
});
console.log('');
console.log('[TEST 4] RECOVERABLE DEVICE_ERROR');
console.log(recoverableDeviceError);
if (recoverableDeviceError.action !== 'RECONNECT') {
    throw new Error('Recoverable DEVICE_ERROR should result in RECONNECT');
}
console.log('PASS');
const nonRecoverableDeviceError = decideRecovery({
    deviceCode: 'NK-TEST-005',
    code: 'DEVICE_ERROR',
    message: 'Critical device failure',
    detectedAt: new Date().toISOString(),
    recoverable: false,
});
console.log('');
console.log('[TEST 5] NON-RECOVERABLE DEVICE_ERROR');
console.log(nonRecoverableDeviceError);
if (nonRecoverableDeviceError.action !== 'ESCALATE') {
    throw new Error('Non-recoverable DEVICE_ERROR should result in ESCALATE');
}
console.log('PASS');
console.log('');
console.log('=== RECOVERY DECISION SMOKE TEST PASSED ===');
