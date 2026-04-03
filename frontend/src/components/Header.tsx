import type { MouseEvent } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

interface HeaderProps {
  backendReachable: boolean;
  currentPath: string;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  lastUpdatedLabel: string;
  navigation: readonly NavigationItem[];
  onNavigate: (href: string) => void;
  onRefresh: () => void;
}

function Header({
  backendReachable,
  currentPath,
  isAuthenticated,
  isRefreshing,
  lastUpdatedLabel,
  navigation,
  onNavigate,
  onRefresh,
}: HeaderProps) {
  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string): void {
    event.preventDefault();
    onNavigate(href);
  }

  return (
    <header className="site-header">
      <div className="site-header__line" aria-hidden="true" />
      <a
        className="site-header__brand"
        href="/"
        onClick={(event) => handleNavigate(event, "/")}
      >
        <span className="site-header__brand-mark" aria-hidden="true">
          <span className="site-header__brand-core" />
        </span>
        <div className="site-header__brand-copy">
          <p className="site-header__eyebrow">Welcome</p>
          <p className="site-header__title">Rubedo Forum</p>
          <p className="site-header__subtitle">story portal</p>
        </div>
      </a>

      <nav className="site-header__nav" aria-label="Primary">
        {navigation.map((link) => (
          <a
            className={`site-header__link ${
              currentPath === link.href ? "site-header__link--active" : ""
            }`}
            href={link.href}
            key={link.href}
            onClick={(event) => handleNavigate(event, link.href)}
          >
            <span className="site-header__link-dot" aria-hidden="true" />
            {link.label}
          </a>
        ))}
      </nav>

      <div className="site-header__actions">
        <span className="site-header__summary">
          {backendReachable ? "online" : "offline"} / {isAuthenticated ? "member" : "guest"} /{" "}
          {lastUpdatedLabel}
        </span>
        <button
          className="site-header__refresh"
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Syncing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}

export default Header;
