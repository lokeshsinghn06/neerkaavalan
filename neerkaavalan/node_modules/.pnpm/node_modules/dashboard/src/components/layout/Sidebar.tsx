import {
  Activity,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Droplets,
  Gauge,
  Map,
  Radio,
  Route,
  ScanSearch,
  Ship,
  Waves,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const sections = [
  {
    title: 'Command Center',
    items: [
      { label: 'Overview', path: '/', icon: Gauge },
      { label: 'Live Map', path: '/map', icon: Map },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Water Bodies', path: '/water-bodies', icon: Droplets },
      { label: 'Missions', path: '/missions', icon: Route },
      { label: 'Hotspots', path: '/hotspots', icon: ScanSearch },
      { label: 'Verification', path: '/verification', icon: BadgeCheck },
    ],
  },
  {
    title: 'Autonomous Fleet',
    items: [
      { label: 'Drone', path: '/drone', icon: Bot },
      { label: 'USV', path: '/usv', icon: Ship },
      { label: 'Telemetry', path: '/telemetry', icon: Radio },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Perception', path: '/ai', icon: BrainCircuit },
      { label: 'Analytics', path: '/analytics', icon: Activity },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Waves size={18} />
        </div>

        <div>
          <div className="logo-title">NeerKaavalan</div>
          <div className="logo-subtitle">Autonomous Water Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div className="nav-section" key={section.title}>
            <div className="nav-section-title">{section.title}</div>

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot" />
          <span className="system-status-text">
            Fleet monitoring active
          </span>
        </div>
      </div>
    </aside>
  );
}