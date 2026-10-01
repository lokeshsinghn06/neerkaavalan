import { Routes, Route } from 'react-router-dom';
import Verification from '../pages/Verification';

import AppLayout from '../components/layout/AppLayout';

import Overview from '../pages/Overview';
import LiveMap from '../pages/LiveMap';
import WaterBodies from '../pages/WaterBodies';
import Drone from '../pages/Drone';
import USV from '../pages/USV';
import AI from '../pages/AI';
import Hotspots from '../pages/Hotspots';
import Missions from '../pages/Missions';
import Telemetry from '../pages/Telemetry';
import Analytics from '../pages/Analytics';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/water-bodies" element={<WaterBodies />} />
        <Route path="/drone" element={<Drone />} />
        <Route path="/usv" element={<USV />} />
        <Route path="/ai" element={<AI />} />
        <Route path="/hotspots" element={<Hotspots />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/telemetry" element={<Telemetry />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/verification" element={<Verification />} />
      </Route>
    </Routes>
  );
}