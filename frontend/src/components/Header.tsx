import { useEffect, useState, type MouseEvent } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

interface HeaderProps {
  authHref: string;
  authLabel: string;
  currentPath: string;
  hidden: boolean;
  navigation: readonly NavigationItem[];
  onNavigate: (href: string) => void;
  summary: string;
  utilityHref: string;
  utilityLabel: string;
}

function Header({
  authHref,
  authLabel,
  currentPath,
  hidden,
  navigation,
  onNavigate,
  summary,
  utilityHref,
  utilityLabel,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath, hidden]);

  function handleNavigate(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) {
    event.preventDefault();
    setMenuOpen(false);
    onNavigate(href);
  }

  return (
    <header className={`site-header ${hidden ? "site-header--hidden" : ""}`}>
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
          <p className="site-header__eyebrow">绯月回廊</p>
          <p className="site-header__title">Rubedo Forum</p>
          <p className="site-header__subtitle">视觉小说社团与内容归档</p>
        </div>
      </a>

      <button
        aria-controls="site-header-panel"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
        className={`site-header__menu ${menuOpen ? "site-header__menu--open" : ""}`}
        type="button"
        onClick={() => {
          setMenuOpen((current) => !current);
        }}
      >
        <span className="site-header__menu-line" />
        <span className="site-header__menu-line" />
        <span className="site-header__menu-line" />
      </button>

      <div
        className={`site-header__panel ${menuOpen ? "site-header__panel--open" : ""}`}
        id="site-header-panel"
      >
        <div className="site-header__panel-inner">
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
            <span className="site-header__summary">{summary}</span>
            <div className="site-header__action-buttons">
              <button
                className="site-header__action site-header__action--auth"
                type="button"
                onClick={(event) => handleNavigate(event, authHref)}
              >
                {authLabel}
              </button>
              <button
                className="site-header__action site-header__refresh"
                type="button"
                onClick={(event) => handleNavigate(event, utilityHref)}
              >
                {utilityLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
