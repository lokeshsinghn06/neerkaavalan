export type DeviceType = 'drone' | 'usv';
export type DeviceOperatingMode = 'SIMULATION' | 'REAL';
export type DeviceConnectionStatus = 'OFFLINE' | 'ONLINE' | 'CONNECTING' | 'ERROR';
export interface DevicePosition {
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    speedMps: number;
    headingDeg: number;
}
export interface DeviceState {
    deviceCode: string;
    deviceType: DeviceType;
    operatingMode: DeviceOperatingMode;
    connectionStatus: DeviceConnectionStatus;
    batteryPercent: number | null;
    position: DevicePosition | null;
    updatedAt: string;
}
export interface Waypoint {
    sequence: number;
    latitude: number;
    longitude: number;
    action?: string;
}
export interface MissionCommand {
    missionCode: string;
    deviceCode: string;
    waypoints: Waypoint[];
}
export interface DeviceAdapter {
    readonly deviceCode: string;
    readonly deviceType: DeviceType;
    readonly operatingMode: DeviceOperatingMode;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getState(): Promise<DeviceState>;
    sendMission(command: MissionCommand): Promise<void>;
    stop(): Promise<void>;
}
export interface DeviceGateway {
    getDevice(deviceCode: string): Promise<DeviceAdapter>;
    connectDevice(deviceCode: string): Promise<DeviceState>;
    disconnectDevice(deviceCode: string): Promise<void>;
    getDeviceState(deviceCode: string): Promise<DeviceState>;
    dispatchMission(command: MissionCommand): Promise<void>;
    stopDevice(deviceCode: string): Promise<void>;
}
export type DeviceFailureCode = 'CONNECTION_LOST' | 'COMMAND_REJECTED' | 'TELEMETRY_TIMEOUT' | 'DEVICE_ERROR';
export interface DeviceFailure {
    deviceCode: string;
    code: DeviceFailureCode;
    message: string;
    detectedAt: string;
    recoverable: boolean;
}
export type RecoveryAction = 'RECONNECT' | 'RETRY_COMMAND' | 'ESCALATE';
export interface RecoveryDecision {
    deviceCode: string;
    failureCode: DeviceFailureCode;
    action: RecoveryAction;
    reason: string;
    createdAt: string;
}
