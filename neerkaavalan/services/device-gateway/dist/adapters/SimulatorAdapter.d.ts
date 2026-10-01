import type { DeviceAdapter, DeviceState, MissionCommand } from '../types.js';
export declare class SimulatorAdapter implements DeviceAdapter {
    readonly deviceCode: string;
    readonly deviceType: 'drone' | 'usv';
    readonly operatingMode: "SIMULATION";
    constructor(deviceCode: string, deviceType: 'drone' | 'usv');
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getState(): Promise<DeviceState>;
    sendMission(command: MissionCommand): Promise<void>;
    stop(): Promise<void>;
}
