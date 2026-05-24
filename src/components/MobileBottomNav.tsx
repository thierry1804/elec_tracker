import { NavLink } from 'react-router-dom';
import { IconAchats, IconDashboard, IconParametres, IconReleves } from './nav/NavIcons';
import './MobileBottomNav.css';

const items = [
  { to: '/', end: true, label: 'Dashboard', Icon: IconDashboard },
  { to: '/releves', label: 'Relevés', Icon: IconReleves },
  { to: '/achats', label: 'Achats', Icon: IconAchats },
  { to: '/parametres', label: 'Paramètres', Icon: IconParametres },
] as const;

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation principale">
      {items.map(({ to, label, Icon, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={'end' in rest ? rest.end : undefined}
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
