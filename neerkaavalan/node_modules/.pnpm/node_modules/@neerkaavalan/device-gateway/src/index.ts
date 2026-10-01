import type {
  DeviceAdapter,
  DeviceFailure,
  DeviceState,
  MissionCommand,
} from './types.js';
import { detectDeviceFailure } from './FailureDetector.js';


export * from './types.js';
export { createDeviceAdapter } from './adapterFactory.js';
export { detectDeviceFailure } from './FailureDetector.js';
export { decideRecovery } from './RecoveryDecisionEngine.js';
export { executeRecovery } from './RecoveryExecutor.js';

export class DeviceGatewayService {
  private readonly adapters = new Map<string, DeviceAdapter>();

  constructor(adapters: DeviceAdapter[] = []) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.deviceCode, adapter);
    }
  }

  registerAdapter(adapter: DeviceAdapter): void {
    this.adapters.set(adapter.deviceCode, adapter);
  }

  async getDevice(deviceCode: string): Promise<DeviceAdapter> {
    const adapter = this.adapters.get(deviceCode);

    if (!adapter) {
      throw new Error(`Device adapter not found: ${deviceCode}`);
    }

    return adapter;
  }

  async connectDevice(deviceCode: string): Promise<DeviceState> {
    const adapter = await this.getDevice(deviceCode);

    await adapter.connect();

    return adapter.getState();
  }

  async disconnectDevice(deviceCode: string): Promise<void> {
    const adapter = await this.getDevice(deviceCode);

    await adapter.disconnect();
  }

  async getDeviceState(deviceCode: string): Promise<DeviceState> {
    const adapter = await this.getDevice(deviceCode);

    return adapter.getState();
  }
  async getFailureState(
  deviceCode: string,
): Promise<DeviceFailure | null> {
  const state = await this.getDeviceState(deviceCode);

  return detectDeviceFailure(state);
}

  async dispatchMission(command: MissionCommand): Promise<void> {
    const adapter = await this.getDevice(command.deviceCode);

    await adapter.sendMission(command);
  }

  async stopDevice(deviceCode: string): Promise<void> {
    const adapter = await this.getDevice(deviceCode);

    await adapter.stop();
  }
}
