'use client';

// Общий хедер сайта — один и тот же на Home, Best Picks, Blog и About.
// Активный пункт навигации определяется по текущему пути; содержимое
// бейджа справа передаётся через props (на Home — дата выбранного дня,
// на Best Picks — название раздела, по умолчанию — сегодняшняя дата).
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { getTodayLabel } from '@/lib/api';
import { useAuth } from './AuthContext';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/best-picks', label: 'Best Picks' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function SiteHeader({ badge }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, openAuth, handleSignOut } = useAuth();

  const badgeContent = badge || (
    <>
      <i className="fa-regular fa-calendar"></i> <span>{getTodayLabel(0)}</span>
    </>
  );

  return (
    <>
      <header>
        <a className="brand" href="/">
          <img
            src="/logo.webp"
            alt="GameTips"
            width={598}
            height={128}
            className="brand-logo"
          />
        </a>
        <nav className="main-nav">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={isActive(pathname, link.href) ? 'active' : ''}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user ? (
            <div className="user-chip" title={user.email}>
              <span className="user-avatar">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
              <span className="user-name">{user.name}</span>
              <button
                className="user-signout"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button className="signin-btn" onClick={openAuth}>
              <i className="fa-solid fa-user"></i>
              <span className="signin-label">Sign in</span>
            </button>
          )}
          <div className="date-badge">{badgeContent}</div>
          <button
            className="burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <i className={menuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={isActive(pathname, link.href) ? 'active' : ''}
          >
            {link.label}
          </a>
        ))}
        {user ? (
          <button className="mobile-auth-btn" onClick={handleSignOut}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign out ({user.name})
          </button>
        ) : (
          <button
            className="mobile-auth-btn"
            onClick={() => {
              setMenuOpen(false);
              openAuth();
            }}
          >
            <i className="fa-solid fa-user"></i> Sign in
          </button>
        )}
      </div>
    </>
  );
}
