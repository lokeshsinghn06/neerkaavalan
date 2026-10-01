import { detectDeviceFailure } from './FailureDetector.js';
export * from './types.js';
export { createDeviceAdapter } from './adapterFactory.js';
export { detectDeviceFailure } from './FailureDetector.js';
export { decideRecovery } from './RecoveryDecisionEngine.js';
export { executeRecovery } from './RecoveryExecutor.js';
export class DeviceGatewayService {
    adapters = new Map();
    constructor(adapters = []) {
        for (const adapter of adapters) {
            this.adapters.set(adapter.deviceCode, adapter);
        }
    }
    registerAdapter(adapter) {
        this.adapters.set(adapter.deviceCode, adapter);
    }
    async getDevice(deviceCode) {
        const adapter = this.adapters.get(deviceCode);
        if (!adapter) {
            throw new Error(`Device adapter not found: ${deviceCode}`);
        }
        return adapter;
    }
    async connectDevice(deviceCode) {
        const adapter = await this.getDevice(deviceCode);
        await adapter.connect();
        return adapter.getState();
    }
    async disconnectDevice(deviceCode) {
        const adapter = await this.getDevice(deviceCode);
        await adapter.disconnect();
    }
    async getDeviceState(deviceCode) {
        const adapter = await this.getDevice(deviceCode);
        return adapter.getState();
    }
    async getFailureState(deviceCode) {
        const state = await this.getDeviceState(deviceCode);
        return detectDeviceFailure(state);
    }
    async dispatchMission(command) {
        const adapter = await this.getDevice(command.deviceCode);
        await adapter.sendMission(command);
    }
    async stopDevice(deviceCode) {
        const adapter = await this.getDevice(deviceCode);
        await adapter.stop();
    }
}
