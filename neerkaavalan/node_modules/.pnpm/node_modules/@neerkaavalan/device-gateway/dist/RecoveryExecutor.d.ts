import type { DeviceFailure, RecoveryDecision, DeviceState } from './types.js';
import { DeviceGatewayService } from './index.js';
export declare function executeRecovery(gateway: DeviceGatewayService, failure: DeviceFailure, decision: RecoveryDecision): Promise<DeviceState | null>;
