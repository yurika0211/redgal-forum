import type { MouseEvent } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

const SECTION_SUMMARY: Record<string, string> = {
  "/": "入口总览",
  "/stories": "文章与随想",
  "/forum": "讨论与留言",
  "/space": "收藏与空间",
  "/gallery": "展示与归档",
};

interface HeaderProps {
  currentPath: string;
  hidden: boolean;
  navigation: readonly NavigationItem[];
  onNavigate: (href: string) => void;
}

function Header({
  currentPath,
  hidden,
  navigation,
  onNavigate,
}: HeaderProps) {
  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string): void {
    event.preventDefault();
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
          <p className="site-header__subtitle">视觉小说交流站</p>
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
        <span className="site-header__summary">{SECTION_SUMMARY[currentPath] || "站点导览"}</span>
      </div>
    </header>
  );
}

export default Header;
