import { NavLink } from 'react-router-dom';
import { IconAchats, IconDashboard, IconParametres, IconReleves } from './nav/NavIcons';
import { labelAchatsNav, useCompteurMode } from '../lib/compteurMode';
import './MobileBottomNav.css';

export default function MobileBottomNav() {
  const achatsLabel = labelAchatsNav(useCompteurMode());
  const items = [
    { to: '/', end: true, label: 'Dashboard', Icon: IconDashboard },
    { to: '/releves', label: 'Relevés', Icon: IconReleves },
    { to: '/achats', label: achatsLabel, Icon: IconAchats },
    { to: '/parametres', label: 'Paramètres', Icon: IconParametres },
  ] as const;
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation principale">
      {items.map(({ to, label, Icon, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={'end' in rest ? rest.end : undefined}
          aria-label={label}
          className={({ isActive }) =>
            `mobile-bottom-nav-link${isActive ? ' mobile-bottom-nav-link-active' : ''}`
          }
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
