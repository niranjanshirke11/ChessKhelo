import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import s from './Layout.module.css';
const TC: Record<string, string> = { Diamond: '#00d4ff', Platinum: '#a855f7', Gold: '#f5c842', Silver: '#C0C0C0', Bronze: '#CD7F32' };

const LINKS = [
  { to: '/app/play',        l: '♟  Play'        },
  { to: '/app/puzzles',     l: '🧩 Puzzles'      },
  { to: '/app/friends',     l: '👥 Friends'      },
  { to: '/app/leaderboard', l: '🏆 Leaderboard'  },
  { to: '/app/profile',     l: '📊 Profile'      },
  { to: '/app/pricing',     l: '💎 Premium'      },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={s.shell}>
      <nav className={s.nav}>
        <NavLink to="/app/play" className={s.logo}>Knight<span>OS</span></NavLink>

        <div className={s.links}>
          {LINKS.map(({ to, l }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `${s.tab}${isActive ? ' ' + s.active : ''}`}>{l}</NavLink>
          ))}
        </div>

        {user && (
          <div className={s.right}>
            <div className={s.chip}>
              <div className={s.av}>
                {user.avatar?.startsWith('http')
                  ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : user.avatar}
              </div>
              <div>
                <div className={s.un}>{user.username}</div>
                <div className={s.elo} style={{ color: TC[user.rankTier] || 'var(--gold)' }}>{user.rating} ELO</div>
              </div>
            </div>
            <span className="badge badge-gold" style={{ color: TC[user.rankTier], fontSize: '.62rem' }}>{user.rankTier}</span>
            <button className="btn btn-ghost btn-sm desktopOnly" onClick={async () => { await logout(); nav('/'); }}>Sign Out</button>
          </div>
        )}

        <button className={s.hamburger} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {menuOpen && (
        <div className={s.mobileMenu}>
          {LINKS.map(({ to, l }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `${s.mobileTab}${isActive ? ' ' + s.active : ''}`}
              onClick={() => setMenuOpen(false)}
            >{l}</NavLink>
          ))}
          {user && (
            <button className={s.mobileSignOut} onClick={async () => { setMenuOpen(false); await logout(); nav('/'); }}>
              🚪 Sign Out
            </button>
          )}
        </div>
      )}

      <main className={s.main}><Outlet /></main>
    </div>
  );
}
