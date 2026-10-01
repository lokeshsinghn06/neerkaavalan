import type {
  DeviceFailure,
  RecoveryDecision,
  DeviceState,
} from './types.js';

import { DeviceGatewayService } from './index.js';

export async function executeRecovery(
  gateway: DeviceGatewayService,
  failure: DeviceFailure,
  decision: RecoveryDecision,
): Promise<DeviceState | null> {
  if (failure.deviceCode !== decision.deviceCode) {
    throw new Error(
      `Recovery device mismatch: failure=${failure.deviceCode}, decision=${decision.deviceCode}`,
    );
  }

  switch (decision.action) {
    case 'RECONNECT':
      return gateway.connectDevice(failure.deviceCode);

    case 'RETRY_COMMAND':
      throw new Error(
        'RETRY_COMMAND requires the original mission command and is not implemented yet',
      );

    case 'ESCALATE':
      return null;

    default:
      throw new Error(
        `Unsupported recovery action: ${decision.action}`,
      );
  }
}