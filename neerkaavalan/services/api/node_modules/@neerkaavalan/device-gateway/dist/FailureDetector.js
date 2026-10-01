export function detectDeviceFailure(state) {
    if (state.connectionStatus === 'OFFLINE') {
        return {
            deviceCode: state.deviceCode,
            code: 'CONNECTION_LOST',
            message: `Device ${state.deviceCode} is offline`,
            detectedAt: new Date().toISOString(),
            recoverable: true,
        };
    }
    if (state.connectionStatus === 'ERROR') {
        return {
            deviceCode: state.deviceCode,
            code: 'DEVICE_ERROR',
            message: `Device ${state.deviceCode} reported an error state`,
            detectedAt: new Date().toISOString(),
            recoverable: true,
        };
    }
    return null;
}
