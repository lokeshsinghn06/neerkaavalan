import { Router } from 'express';

import { db } from '@neerkaavalan/database';

import {
  DeviceGatewayService,
  createDeviceAdapter,
  detectDeviceFailure,
  decideRecovery,
  executeRecovery,
} from '@neerkaavalan/device-gateway';

const router = Router();

router.get('/:deviceCode/state', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    const state = await gateway.getDeviceState(deviceCode);

    res.json({
      success: true,
      device: state,
    });
  } catch (error) {
    console.error('Failed to get device gateway state:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to get device state',
    });
  }
});

router.post('/:deviceCode/connect', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    const state = await gateway.connectDevice(deviceCode);

    res.json({
      success: true,
      message: `Device ${deviceCode} connected`,
      device: state,
    });
  } catch (error) {
    console.error('Failed to connect device:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to connect device',
    });
  }
});

router.post('/:deviceCode/disconnect', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    await gateway.disconnectDevice(deviceCode);

    const state = await gateway.getDeviceState(deviceCode);

    res.json({
      success: true,
      message: `Device ${deviceCode} disconnected`,
      device: state,
    });
  } catch (error) {
    console.error('Failed to disconnect device:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to disconnect device',
    });
  }
});

router.post('/:deviceCode/stop', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    await gateway.stopDevice(deviceCode);

    const state = await gateway.getDeviceState(deviceCode);

    res.json({
      success: true,
      message: `Device ${deviceCode} stopped`,
      device: state,
    });
  } catch (error) {
    console.error('Failed to stop device:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to stop device',
    });
  }
});

router.post('/:deviceCode/mission', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const { missionCode, waypoints } = req.body;

    if (
      typeof missionCode !== 'string' ||
      missionCode.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'missionCode is required',
      });
    }

    if (!Array.isArray(waypoints) || waypoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'waypoints must be a non-empty array',
      });
    }

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    await gateway.dispatchMission({
      missionCode,
      deviceCode,
      waypoints,
    });

    const state = await gateway.getDeviceState(deviceCode);

    res.json({
      success: true,
      message: `Mission ${missionCode} dispatched to ${deviceCode}`,
      mission: {
        missionCode,
        deviceCode,
        waypointCount: waypoints.length,
      },
      device: state,
    });
  } catch (error) {
    console.error('Failed to dispatch mission:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to dispatch mission',
    });
  }
});

router.get('/:deviceCode/failure', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    const failure = await gateway.getFailureState(deviceCode);

    res.json({
      success: true,
      failure,
    });
  } catch (error) {
    console.error('Failed to get device failure state:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to get device failure state',
    });
  }
});

router.post('/:deviceCode/recover', async (req, res) => {
  try {
    const deviceCode = req.params.deviceCode;

    const adapter = await createDeviceAdapter(deviceCode);

    const gateway = new DeviceGatewayService([adapter]);

    const state = await gateway.getDeviceState(deviceCode);

    const failure = detectDeviceFailure(state);

    if (failure === null) {
      return res.status(409).json({
        success: false,
        message: `Device ${deviceCode} does not currently have a recoverable failure`,
        device: state,
      });
    }

    const decision = decideRecovery(failure);

    const recoveredState = await executeRecovery(
      gateway,
      failure,
      decision,
    );

    const finalState =
      recoveredState ??
      await gateway.getDeviceState(deviceCode);

    let missionRecovery = null;

    /*
     * If the recovery action successfully reconnects the device,
     * update any active mission assigned to this device that is
     * currently waiting for recovery.
     */
    if (
      decision.action === 'RECONNECT' &&
      finalState.connectionStatus === 'ONLINE'
    ) {
      const missionResult = await db.query(
        `
        UPDATE missions
        SET
          recovery_status = 'RECOVERED',
          updated_at = NOW()
        WHERE device_id = (
          SELECT id
          FROM devices
          WHERE device_code = $1
        )
        AND status IN (
          'CREATED',
          'PLANNED',
          'DISPATCHED',
          'NAVIGATING',
          'ARRIVED',
          'COLLECTING',
          'VERIFYING'
        )
        AND recovery_status = 'RECOVERY_REQUIRED'
        RETURNING
          id,
          mission_code,
          status,
          recovery_status,
          device_id
        `,
        [deviceCode],
      );

      missionRecovery = missionResult.rows[0] ?? null;
    }

    return res.json({
      success: true,
      message: `Recovery action ${decision.action} executed for ${deviceCode}`,
      failure,
      decision,
      device: finalState,
      missionRecovery,
    });
  } catch (error) {
    console.error('Failed to recover device:', error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to recover device',
    });
  }
});

export default router;