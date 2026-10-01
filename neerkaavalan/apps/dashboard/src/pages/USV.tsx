import { useEffect, useState } from 'react';

interface DevicePosition {
  latitude: number;
  longitude: number;
  speedMps: number;
  headingDeg: number;
}

interface DeviceState {
  deviceCode: string;
  deviceType: string;
  operatingMode: 'SIMULATION' | 'REAL';
  connectionStatus: 'OFFLINE' | 'ONLINE' | 'CONNECTING' | 'ERROR';
  batteryPercent: number | null;
  position: DevicePosition | null;
  updatedAt: string;
}

interface DeviceResponse {
  success: boolean;
  device: DeviceState;
  message?: string;
}

type Command = 'connect' | 'disconnect' | 'stop';

export default function USV() {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] =
    useState<Command | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const response = await fetch(
          'http://localhost:4000/api/devices/NK-U01/state',
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: DeviceResponse = await response.json();

        if (active) {
          setDevice(data.device);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch USV state',
          );
        }
      }
    };

    poll();

    const interval = window.setInterval(
      poll,
      2000,
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const executeCommand = async (command: Command) => {
    setActiveCommand(command);
    setCommandStatus(null);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/devices/NK-U01/${command}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data: DeviceResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? `Failed to ${command} USV`,
        );
      }

      setDevice(data.device);
      setCommandStatus(
        data.message ?? `${command.toUpperCase()} command accepted`,
      );
    } catch (err) {
      setCommandStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${command} USV`,
      );
    } finally {
      setActiveCommand(null);
    }
  };

  const position = device?.position;
  const isOnline =
    device?.connectionStatus === 'ONLINE';
  const isOffline =
    device?.connectionStatus === 'OFFLINE';

  return (
    <div className="simple-page">
      <span className="eyebrow">SURFACE UNIT</span>

      <h2>USV Operations</h2>

      <p>
        Live USV device state through the NeerKaavalan
        Device Gateway.
      </p>

      {error && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            border: '1px solid #ef4444',
            borderRadius: '8px',
          }}
        >
          <strong>Gateway Error</strong>
          <div style={{ marginTop: '6px' }}>{error}</div>
        </div>
      )}

      {device && (
        <>
          <div
            style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div className="simple-page">
              <span className="eyebrow">DEVICE</span>
              <h3>{device.deviceCode}</h3>
              <p>{device.deviceType.toUpperCase()}</p>
            </div>

            <div className="simple-page">
              <span className="eyebrow">OPERATING MODE</span>
              <h3>{device.operatingMode}</h3>
              <p>
                {device.operatingMode === 'SIMULATION'
                  ? 'Digital twin / simulator'
                  : 'Physical hardware'}
              </p>
            </div>

            <div className="simple-page">
              <span className="eyebrow">CONNECTION</span>
              <h3>{device.connectionStatus}</h3>
              <p>Gateway connection state</p>
            </div>

            <div className="simple-page">
              <span className="eyebrow">POSITION</span>
              <h3>
                {position
                  ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                  : 'N/A'}
              </h3>
              <p>Latitude / Longitude</p>
            </div>

            <div className="simple-page">
              <span className="eyebrow">SPEED</span>
              <h3>
                {position
                  ? `${position.speedMps.toFixed(2)} m/s`
                  : 'N/A'}
              </h3>
              <p>Current movement speed</p>
            </div>

            <div className="simple-page">
              <span className="eyebrow">HEADING</span>
              <h3>
                {position
                  ? `${position.headingDeg.toFixed(1)}\u00B0`
                  : 'N/A'}
              </h3>
              <p>Current heading</p>
            </div>
          </div>

          <div
            style={{
              marginTop: '32px',
              padding: '20px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
            }}
          >
            <span className="eyebrow">DEVICE CONTROL</span>

            <h3 style={{ marginTop: '8px' }}>
              Gateway Lifecycle
            </h3>

            <p>
              Control the simulated device connection
              through the Device Gateway.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  executeCommand('connect')
                }
                disabled={
                  !isOffline || activeCommand !== null
                }
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #22c55e',
                  background:
                    isOffline && !activeCommand
                      ? '#166534'
                      : '#1f2937',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor:
                    isOffline && !activeCommand
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                {activeCommand === 'connect'
                  ? 'CONNECTING...'
                  : 'CONNECT'}
              </button>

              <button
                type="button"
                onClick={() =>
                  executeCommand('disconnect')
                }
                disabled={
                  !isOnline || activeCommand !== null
                }
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #94a3b8',
                  background:
                    isOnline && !activeCommand
                      ? '#334155'
                      : '#1f2937',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor:
                    isOnline && !activeCommand
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                {activeCommand === 'disconnect'
                  ? 'DISCONNECTING...'
                  : 'DISCONNECT'}
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '20px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
            }}
          >
            <span className="eyebrow">SAFETY CONTROL</span>

            <h3 style={{ marginTop: '8px' }}>
              Emergency Stop
            </h3>

            <p>
              Immediately commands the USV to stop
              movement through the Device Gateway.
            </p>

            <button
              type="button"
              onClick={() =>
                executeCommand('stop')
              }
              disabled={
                !isOnline || activeCommand !== null
              }
              style={{
                marginTop: '16px',
                padding: '12px 22px',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                background:
                  isOnline && !activeCommand
                    ? '#ef4444'
                    : '#3f1d1d',
                color: '#ffffff',
                fontWeight: 700,
                cursor:
                  isOnline && !activeCommand
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              {activeCommand === 'stop'
                ? 'STOPPING...'
                : 'STOP USV'}
            </button>
          </div>

          {commandStatus && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                border:
                  '1px solid rgba(34, 197, 94, 0.35)',
                fontWeight: 700,
              }}
            >
              {commandStatus}
            </div>
          )}
        </>
      )}

      {device && (
        <p
          style={{
            marginTop: '20px',
            fontSize: '12px',
            opacity: 0.65,
          }}
        >
          Last gateway update:{' '}
          {new Date(device.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}