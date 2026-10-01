import type { DeviceAdapter, DeviceFailure, DeviceState, MissionCommand } from './types.js';
export * from './types.js';
export { createDeviceAdapter } from './adapterFactory.js';
export { detectDeviceFailure } from './FailureDetector.js';
export { decideRecovery } from './RecoveryDecisionEngine.js';
export { executeRecovery } from './RecoveryExecutor.js';
export declare class DeviceGatewayService {
    private readonly adapters;
    constructor(adapters?: DeviceAdapter[]);
    registerAdapter(adapter: DeviceAdapter): void;
    getDevice(deviceCode: string): Promise<DeviceAdapter>;
    connectDevice(deviceCode: string): Promise<DeviceState>;
    disconnectDevice(deviceCode: string): Promise<void>;
    getDeviceState(deviceCode: string): Promise<DeviceState>;
    getFailureState(deviceCode: string): Promise<DeviceFailure | null>;
    dispatchMission(command: MissionCommand): Promise<void>;
    stopDevice(deviceCode: string): Promise<void>;
}
