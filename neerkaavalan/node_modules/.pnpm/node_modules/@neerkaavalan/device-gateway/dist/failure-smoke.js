import { detectDeviceFailure } from './FailureDetector.js';
const onlineState = {
    deviceCode: 'NK-TEST-ONLINE',
    deviceType: 'usv',
    operatingMode: 'SIMULATION',
    connectionStatus: 'ONLINE',
    batteryPercent: 100,
    position: {
        latitude: 13.0525,
        longitude: 80.2125,
        speedMps: 0,
        headingDeg: 0,
    },
    updatedAt: new Date().toISOString(),
};
const offlineState = {
    ...onlineState,
    deviceCode: 'NK-TEST-OFFLINE',
    connectionStatus: 'OFFLINE',
};
console.log('');
console.log('=== FAILURE DETECTION SMOKE TEST ===');
const onlineFailure = detectDeviceFailure(onlineState);
console.log('');
console.log('[TEST 1] ONLINE DEVICE');
console.log('Failure:', onlineFailure);
if (onlineFailure !== null) {
    throw new Error('ONLINE device should not report a failure');
}
console.log('PASS');
const offlineFailure = detectDeviceFailure(offlineState);
console.log('');
console.log('[TEST 2] OFFLINE DEVICE');
console.log('Failure:', offlineFailure);
if (offlineFailure === null ||
    offlineFailure.code !== 'CONNECTION_LOST' ||
    offlineFailure.recoverable !== true) {
    throw new Error('OFFLINE device should report recoverable CONNECTION_LOST');
}
console.log('PASS');
console.log('');
console.log('=== FAILURE DETECTION SMOKE TEST PASSED ===');
