export function decideRecovery(failure) {
    let action;
    let reason;
    switch (failure.code) {
        case 'CONNECTION_LOST':
            action = 'RECONNECT';
            reason =
                'The device connection was lost and the failure is recoverable. Attempt reconnection before escalating.';
            break;
        case 'COMMAND_REJECTED':
            action = 'RETRY_COMMAND';
            reason =
                'The device rejected a command. Retry the command before escalating the failure.';
            break;
        case 'TELEMETRY_TIMEOUT':
            action = 'RECONNECT';
            reason =
                'Telemetry has timed out. Re-establish the device connection before escalating.';
            break;
        case 'DEVICE_ERROR':
            action = failure.recoverable
                ? 'RECONNECT'
                : 'ESCALATE';
            reason = failure.recoverable
                ? 'The device reported a recoverable error. Attempt reconnection.'
                : 'The device reported a non-recoverable error. Escalate for operator intervention.';
            break;
        default:
            action = 'ESCALATE';
            reason =
                'The failure type is not recognized by the recovery policy.';
            break;
    }
    return {
        deviceCode: failure.deviceCode,
        failureCode: failure.code,
        action,
        reason,
        createdAt: new Date().toISOString(),
    };
}
