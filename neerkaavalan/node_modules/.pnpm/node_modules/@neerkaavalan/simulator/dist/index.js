import { db } from '@neerkaavalan/database';
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function distanceMeters(currentLat, currentLon, targetLat, targetLon) {
    const earthRadius = 6_371_000;
    const lat1 = (currentLat * Math.PI) / 180;
    const lat2 = (targetLat * Math.PI) / 180;
    const deltaLat = ((targetLat - currentLat) * Math.PI) / 180;
    const deltaLon = ((targetLon - currentLon) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLon / 2) ** 2;
    const c = 2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}
function moveTowards(currentLat, currentLon, targetLat, targetLon, stepMeters) {
    const distance = distanceMeters(currentLat, currentLon, targetLat, targetLon);
    if (distance <= stepMeters) {
        return {
            latitude: targetLat,
            longitude: targetLon,
        };
    }
    const ratio = stepMeters / distance;
    return {
        latitude: currentLat +
            (targetLat - currentLat) * ratio,
        longitude: currentLon +
            (targetLon - currentLon) * ratio,
    };
}
async function loadMission() {
    const result = await db.query(`
    SELECT
      m.id AS mission_id,
      m.mission_code,
      d.id AS device_id,
      d.device_code
    FROM missions m
    JOIN devices d
      ON d.id = m.device_id
    WHERE m.mission_code = 'NK-M001'
    LIMIT 1
  `);
    if (result.rows.length === 0) {
        throw new Error('Mission NK-M001 not found');
    }
    return result.rows[0];
}
async function loadWaypoints(missionId) {
    const result = await db.query(`
    SELECT
      sequence_number,
      latitude,
      longitude,
      action,
      arrival_radius_m
    FROM mission_waypoints
    WHERE mission_id = $1
    ORDER BY sequence_number
    `, [missionId]);
    if (result.rows.length === 0) {
        throw new Error('No waypoints found for mission');
    }
    return result.rows;
}
async function updateMissionStatus(missionId, status) {
    await db.query(`
    UPDATE missions
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
    `, [status, missionId]);
    console.log(`MISSION STATE → ${status}`);
}
async function writeTelemetry(deviceId, latitude, longitude) {
    await db.query(`
    INSERT INTO telemetry (
      device_id,
      timestamp,
      latitude,
      longitude,
      position
    )
    VALUES (
      $1,
      NOW(),
      $2,
      $3,
      ST_SetSRID(
        ST_Point($3, $2),
        4326
      )
    )
    `, [
        deviceId,
        latitude,
        longitude,
    ]);
}
/*
 * ============================================================
 * DEVICE STATE
 * ============================================================
 *
 * The simulator explicitly identifies itself as SIMULATION.
 *
 * ONLINE + SIMULATION
 * does NOT mean physical hardware is connected.
 */
async function updateDevicePosition(deviceId, latitude, longitude) {
    await db.query(`
    UPDATE devices
    SET
      latitude = $1,
      longitude = $2,
      position = ST_SetSRID(
        ST_Point($2, $1),
        4326
      ),
      status = 'ONLINE',
      operating_mode = 'SIMULATION',
      updated_at = NOW()
    WHERE id = $3
    `, [
        latitude,
        longitude,
        deviceId,
    ]);
}
async function updateDeviceSimulationState(deviceId, latitude, longitude, speedMps) {
    await db.query(`
    UPDATE devices
    SET
      latitude = $1,
      longitude = $2,
      position = ST_SetSRID(
        ST_Point($2, $1),
        4326
      ),
      speed_mps = $4,
      status = 'ONLINE',
      operating_mode = 'SIMULATION',
      updated_at = NOW()
    WHERE id = $3
    `, [
        latitude,
        longitude,
        deviceId,
        speedMps,
    ]);
}
/*
 * ============================================================
 * M11 — COLLECTION SIMULATION
 * ============================================================
 */
async function createCollection(mission) {
    const existing = await db.query(`
      SELECT
        c.id,
        c.mission_id,
        c.device_id,
        c.hotspot_id,
        c.estimated_waste_kg
      FROM collections c
      WHERE c.mission_id = $1
      LIMIT 1
      `, [mission.mission_id]);
    if (existing.rows.length > 0) {
        console.log('Existing collection record found.');
        return existing.rows[0];
    }
    const hotspotResult = await db.query(`
      SELECT
        id AS hotspot_id,
        waste_area_sq_m
      FROM hotspots
      WHERE id = (
        SELECT hotspot_id
        FROM missions
        WHERE id = $1
      )
      `, [mission.mission_id]);
    if (hotspotResult.rows.length === 0) {
        throw new Error('Hotspot not found for collection');
    }
    const wasteArea = Number(hotspotResult.rows[0].waste_area_sq_m);
    /*
     * DEMO CONVERSION ONLY
     *
     * Hotspot area is stored in m².
     * Collection uses kg.
     *
     * Demo assumption:
     *
     * 0.5 kg / m²
     *
     * Replace this later with field measurements
     * or an ML-based waste-mass estimation model.
     */
    const estimatedWasteKg = Number((wasteArea * 0.5).toFixed(2));
    const result = await db.query(`
      INSERT INTO collections (
        mission_id,
        device_id,
        hotspot_id,
        started_at,
        estimated_waste_kg,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        $4,
        'IN_PROGRESS'
      )
      RETURNING
        id,
        mission_id,
        device_id,
        hotspot_id,
        estimated_waste_kg
      `, [
        mission.mission_id,
        mission.device_id,
        hotspotResult.rows[0].hotspot_id,
        estimatedWasteKg,
    ]);
    return result.rows[0];
}
async function completeCollection(collectionId, estimatedWasteKg) {
    /*
     * Demo collection efficiency.
     *
     * 92% of estimated waste is collected.
     */
    const collectionEfficiency = 0.92;
    const collectedWasteKg = Number((estimatedWasteKg *
        collectionEfficiency).toFixed(2));
    await db.query(`
    UPDATE collections
    SET
      completed_at = NOW(),
      collected_waste_kg = $2,
      collection_efficiency = $3,
      status = 'COMPLETED'
    WHERE id = $1
    `, [
        collectionId,
        collectedWasteKg,
        collectionEfficiency * 100,
    ]);
    console.log(`Estimated waste : ${estimatedWasteKg.toFixed(2)} kg`);
    console.log(`Collected waste : ${collectedWasteKg.toFixed(2)} kg`);
    console.log(`Efficiency      : ${(collectionEfficiency * 100).toFixed(1)}%`);
}
/*
 * ============================================================
 * M12 — POST-CLEANUP VERIFICATION
 * ============================================================
 */
async function createVerification(mission) {
    const existing = await db.query(`
      SELECT
        id,
        mission_id,
        hotspot_id,
        before_waste_area_sq_m,
        after_waste_area_sq_m,
        reduction_percent,
        verification_confidence
      FROM verifications
      WHERE mission_id = $1
      LIMIT 1
      `, [mission.mission_id]);
    if (existing.rows.length > 0) {
        console.log('Existing verification record found.');
        return existing.rows[0];
    }
    const hotspotResult = await db.query(`
      SELECT
        id AS hotspot_id,
        waste_area_sq_m
      FROM hotspots
      WHERE id = (
        SELECT hotspot_id
        FROM missions
        WHERE id = $1
      )
      `, [mission.mission_id]);
    if (hotspotResult.rows.length === 0) {
        throw new Error('Hotspot not found for verification');
    }
    const beforeWasteArea = Number(hotspotResult.rows[0].waste_area_sq_m);
    /*
     * DEMO POST-CLEANUP RE-SCAN
     *
     * Simulate a second AI scan after collection.
     *
     * 12% of the original detected waste
     * remains after cleanup.
     */
    const residualWasteFactor = 0.12;
    const afterWasteArea = Number((beforeWasteArea *
        residualWasteFactor).toFixed(2));
    const reductionPercent = beforeWasteArea > 0
        ? Number((((beforeWasteArea -
            afterWasteArea) /
            beforeWasteArea) *
            100).toFixed(2))
        : 0;
    /*
     * Demo confidence for post-cleanup
     * AI verification.
     */
    const verificationConfidence = 0.94;
    const result = await db.query(`
      INSERT INTO verifications (
        mission_id,
        hotspot_id,
        before_waste_area_sq_m,
        after_waste_area_sq_m,
        reduction_percent,
        verification_confidence,
        verified,
        verified_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        TRUE,
        NOW()
      )
      RETURNING
        id,
        mission_id,
        hotspot_id,
        before_waste_area_sq_m,
        after_waste_area_sq_m,
        reduction_percent,
        verification_confidence
      `, [
        mission.mission_id,
        hotspotResult.rows[0].hotspot_id,
        beforeWasteArea,
        afterWasteArea,
        reductionPercent,
        verificationConfidence,
    ]);
    return result.rows[0];
}
async function runVerification(mission) {
    console.log('\n==========================================');
    console.log(' POST-CLEANUP VERIFICATION STARTED');
    console.log('==========================================');
    await updateMissionStatus(mission.mission_id, 'VERIFYING');
    console.log('\nRe-scanning cleaned hotspot...');
    const scanSteps = 4;
    for (let step = 1; step <= scanSteps; step += 1) {
        const progress = (step / scanSteps) * 100;
        console.log(`  Re-scan progress: ${progress.toFixed(0)}%`);
        await sleep(1000);
    }
    const verification = await createVerification(mission);
    console.log(`\nBefore cleanup : ` +
        `${verification.before_waste_area_sq_m.toFixed(2)} m²`);
    console.log(`After cleanup  : ` +
        `${verification.after_waste_area_sq_m.toFixed(2)} m²`);
    console.log(`Waste reduction: ` +
        `${verification.reduction_percent.toFixed(2)}%`);
    console.log(`Confidence     : ` +
        `${(verification.verification_confidence *
            100).toFixed(1)}%`);
    console.log('\nCleanup verification completed.');
    console.log('==========================================\n');
}
/*
 * ============================================================
 * M10 + M11 + M12 — COMPLETE USV SIMULATION
 * ============================================================
 */
async function runSimulation() {
    console.log('==========================================');
    console.log(' NEERKAAVALAN USV DIGITAL TWIN');
    console.log('==========================================');
    const mission = await loadMission();
    const waypoints = await loadWaypoints(mission.mission_id);
    console.log(`Mission : ${mission.mission_code}`);
    console.log(`USV     : ${mission.device_code}`);
    console.log(`Mode    : SIMULATION`);
    console.log(`Points  : ${waypoints.length}`);
    console.log('');
    /*
     * ==========================================================
     * M10 — MISSION LIFECYCLE
     * ==========================================================
     */
    await updateMissionStatus(mission.mission_id, 'PLANNED');
    await sleep(1000);
    await updateMissionStatus(mission.mission_id, 'DISPATCHED');
    await sleep(1000);
    const startedAt = new Date();
    await db.query(`
    UPDATE missions
    SET
      status = 'NAVIGATING',
      started_at = $1,
      updated_at = NOW()
    WHERE id = $2
    `, [
        startedAt,
        mission.mission_id,
    ]);
    console.log('MISSION STATE → NAVIGATING');
    /*
     * Initial position
     */
    let latitude = waypoints[0].latitude;
    let longitude = waypoints[0].longitude;
    await writeTelemetry(mission.device_id, latitude, longitude);
    await updateDevicePosition(mission.device_id, latitude, longitude);
    console.log(`[${waypoints[0].action}] ` +
        `${latitude.toFixed(6)}, ` +
        `${longitude.toFixed(6)}`);
    let actualDistanceM = 0;
    /*
     * ==========================================================
     * NAVIGATE THROUGH WAYPOINTS
     * ==========================================================
     */
    for (let index = 1; index < waypoints.length; index += 1) {
        const waypoint = waypoints[index];
        console.log(`\n→ Target ${waypoint.sequence_number}: ` +
            `${waypoint.action ?? 'MOVE'}`);
        while (true) {
            const distance = distanceMeters(latitude, longitude, waypoint.latitude, waypoint.longitude);
            /*
             * ========================================================
             * ARRIVAL
             * ========================================================
             */
            if (distance <=
                waypoint.arrival_radius_m) {
                const previousLat = latitude;
                const previousLon = longitude;
                latitude =
                    waypoint.latitude;
                longitude =
                    waypoint.longitude;
                actualDistanceM +=
                    distanceMeters(previousLat, previousLon, latitude, longitude);
                await writeTelemetry(mission.device_id, latitude, longitude);
                await updateDeviceSimulationState(mission.device_id, latitude, longitude, 0);
                console.log(`✓ Arrived at ` +
                    `${waypoint.action ?? 'WAYPOINT'} ` +
                    `(${latitude.toFixed(6)}, ` +
                    `${longitude.toFixed(6)})`);
                /*
                 * ======================================================
                 * M11 — COLLECTION
                 * ======================================================
                 *
                 * Collection starts when the USV reaches
                 * the APPROACH waypoint.
                 */
                if (waypoint.action ===
                    'APPROACH') {
                    await updateMissionStatus(mission.mission_id, 'ARRIVED');
                    await sleep(1000);
                    console.log('\n==========================================');
                    console.log(' COLLECTION OPERATION STARTED');
                    console.log('==========================================');
                    const collection = await createCollection(mission);
                    console.log(`Estimated waste : ` +
                        `${collection.estimated_waste_kg.toFixed(2)} kg`);
                    await updateMissionStatus(mission.mission_id, 'COLLECTING');
                    console.log('\nCollecting waste...');
                    const collectionSteps = 5;
                    for (let step = 1; step <=
                        collectionSteps; step += 1) {
                        const progress = step /
                            collectionSteps;
                        console.log(`  Collection progress: ` +
                            `${(progress * 100).toFixed(0)}%`);
                        await sleep(1000);
                    }
                    await completeCollection(collection.id, collection.estimated_waste_kg);
                    console.log('Collection operation completed.');
                    console.log('==========================================\n');
                    await updateMissionStatus(mission.mission_id, 'NAVIGATING');
                }
                break;
            }
            /*
             * ========================================================
             * MOVE USV
             * ========================================================
             */
            const nextPosition = moveTowards(latitude, longitude, waypoint.latitude, waypoint.longitude, 8);
            const stepDistance = distanceMeters(latitude, longitude, nextPosition.latitude, nextPosition.longitude);
            actualDistanceM +=
                stepDistance;
            latitude =
                nextPosition.latitude;
            longitude =
                nextPosition.longitude;
            await writeTelemetry(mission.device_id, latitude, longitude);
            await updateDeviceSimulationState(mission.device_id, latitude, longitude, 8);
            console.log(`  USV → ` +
                `${latitude.toFixed(6)}, ` +
                `${longitude.toFixed(6)} ` +
                `| ${distance.toFixed(1)} m remaining`);
            await sleep(1000);
        }
    }
    /*
     * ==========================================================
     * M12 — POST-CLEANUP VERIFICATION
     * ==========================================================
     */
    await runVerification(mission);
    /*
     * ==========================================================
     * COMPLETE MISSION
     * ==========================================================
     */
    const completedAt = new Date();
    const actualDurationSec = Math.max(1, Math.round((completedAt.getTime() -
        startedAt.getTime()) /
        1000));
    await db.query(`
    UPDATE missions
    SET
      status = 'COMPLETED',
      actual_distance_m = $1,
      actual_duration_sec = $2,
      completed_at = $3,
      updated_at = NOW()
    WHERE id = $4
    `, [
        actualDistanceM,
        actualDurationSec,
        completedAt,
        mission.mission_id,
    ]);
    /*
     * The mission is still a simulator mission.
     * Keep the explicit operating mode.
     */
    await db.query(`
    UPDATE devices
    SET
      speed_mps = 0,
      status = 'ONLINE',
      operating_mode = 'SIMULATION',
      updated_at = NOW()
    WHERE id = $1
    `, [mission.device_id]);
    console.log('MISSION STATE → COMPLETED');
    console.log(`Actual distance : ` +
        `${actualDistanceM.toFixed(2)} m`);
    console.log(`Actual duration : ` +
        `${actualDurationSec} sec`);
    console.log('\n==========================================');
    console.log(' MISSION EXECUTION COMPLETED');
    console.log('==========================================');
    await db.end();
}
runSimulation().catch(async (error) => {
    console.error('\nUSV simulator failed:', error);
    await db.end();
    process.exit(1);
});
