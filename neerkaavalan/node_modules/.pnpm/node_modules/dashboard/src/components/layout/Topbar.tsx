import { Bell, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Command Center',
  '/map': 'Live Operations Map',
  '/water-bodies': 'Water Bodies',
  '/drone': 'Drone Operations',
  '/usv': 'USV Operations',
  '/ai': 'AI Perception',
  '/hotspots': 'Waste Hotspots',
  '/missions': 'Mission Control',
  '/telemetry': 'Fleet Telemetry',
  '/analytics': 'System Analytics',
};

export default function Topbar() {
  const location = useLocation();

  const title = titles[location.pathname] ?? 'NeerKaavalan';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        <div className="topbar-breadcrumb">
          NeerKaavalan / Autonomous Water Intelligence
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" title="Notifications">
          <Bell size={16} />
        </button>

        <button className="icon-button" title="Settings">
          <Settings size={16} />
        </button>

        <div className="user-avatar">CS</div>
      </div>
    </header>
  );
}