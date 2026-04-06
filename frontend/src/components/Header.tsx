import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: readonly NavigationItem[];
}

export interface HeaderNotificationItem {
  id: string;
  title: string;
  description: string;
  href?: string;
  timeLabel?: string;
  unread?: boolean;
}

interface HeaderProps {
  authHref: string;
  authLabel: string;
  currentPath: string;
  hidden: boolean;
  navigationGroups?: readonly NavigationGroup[];
  navigation: readonly NavigationItem[];
  notifications: readonly HeaderNotificationItem[];
  onNotificationClick: (notificationID: string, href?: string) => void;
  onNotificationsMarkAllRead: () => void;
  onNavigate: (href: string) => void;
  onToggleTheme: () => void;
  themeMode: "day" | "night";
  unreadNotificationCount: number;
  utilityHref: string;
  utilityLabel: string;
}

function Header({
  authHref,
  authLabel,
  currentPath,
  hidden,
  navigationGroups,
  navigation,
  notifications,
  onNotificationClick,
  onNotificationsMarkAllRead,
  onNavigate,
  onToggleTheme,
  themeMode,
  unreadNotificationCount,
  utilityHref,
  utilityLabel,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setNotificationOpen(false);
  }, [currentPath, hidden]);

  useEffect(() => {
    if (!notificationOpen) {
      return;
    }

    function handleDocumentMouseDown(event: globalThis.MouseEvent): void {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [notificationOpen]);

  function handleNavigate(event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) {
    event.preventDefault();
    setMenuOpen(false);
    setNotificationOpen(false);
    onNavigate(href);
  }

  function handleThemeToggle(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setMenuOpen(false);
    setNotificationOpen(false);
    onToggleTheme();
  }

  function handleNotificationClick(
    event: ReactMouseEvent<HTMLButtonElement>,
    notificationID: string,
    href?: string,
  ): void {
    event.preventDefault();
    setNotificationOpen(false);
    onNotificationClick(notificationID, href);
  }

  const groupedNavigation = navigationGroups?.filter((group) => group.items.length > 0) ?? [];
  const hasGroupedNavigation = groupedNavigation.length > 0;

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
        <svg className="site-header__menu-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path className="site-header__menu-path site-header__menu-path--top" d="M5 7h14" />
          <path className="site-header__menu-path site-header__menu-path--middle" d="M4 12h16" />
          <path className="site-header__menu-path site-header__menu-path--bottom" d="M5 17h14" />
        </svg>
      </button>

      <div
        className={`site-header__panel ${menuOpen ? "site-header__panel--open" : ""}`}
        id="site-header-panel"
      >
        <div className="site-header__panel-inner">
          <nav className="site-header__nav" aria-label="Primary">
            {hasGroupedNavigation
              ? groupedNavigation.map((group) => (
                  <div className="site-header__nav-group" key={group.id}>
                    <span className="site-header__nav-group-label">{group.label}</span>
                    <div className="site-header__nav-group-items">
                      {group.items.map((link) => (
                        <a
                          aria-current={currentPath === link.href ? "page" : undefined}
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
                    </div>
                  </div>
                ))
              : navigation.map((link) => (
                  <a
                    aria-current={currentPath === link.href ? "page" : undefined}
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
            <div className="site-header__action-buttons">
              <div className="site-header__notifications" ref={notificationsRef}>
                <button
                  aria-expanded={notificationOpen}
                  aria-label="打开通知中心"
                  className={`site-header__action site-header__notification-trigger ${
                    notificationOpen ? "site-header__notification-trigger--active" : ""
                  }`}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setNotificationOpen((current) => !current);
                  }}
                >
                  <span className="site-header__notification-icon" aria-hidden="true">◎</span>
                  <span>通知</span>
                  {unreadNotificationCount > 0 ? (
                    <span className="site-header__notification-badge" aria-hidden="true">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                </button>
                <section
                  className={`site-header__notification-panel ${
                    notificationOpen ? "site-header__notification-panel--open" : ""
                  }`}
                  aria-label="通知中心"
                >
                  <div className="site-header__notification-panel-head">
                    <strong>通知中心</strong>
                    <button
                      className="detail-inline-button"
                      type="button"
                      onClick={() => onNotificationsMarkAllRead()}
                    >
                      全部已读
                    </button>
                  </div>
                  {notifications.length ? (
                    <div className="site-header__notification-list">
                      {notifications.map((notification) => (
                        <button
                          className={`site-header__notification-item ${
                            notification.unread ? "site-header__notification-item--unread" : ""
                          }`}
                          key={notification.id}
                          type="button"
                          onClick={(event) =>
                            handleNotificationClick(event, notification.id, notification.href)
                          }
                        >
                          <span className="site-header__notification-title">{notification.title}</span>
                          <span className="site-header__notification-description">{notification.description}</span>
                          {notification.timeLabel ? (
                            <span className="site-header__notification-time">{notification.timeLabel}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="site-header__notification-empty">当前还没有通知。</p>
                  )}
                </section>
              </div>
              <button
                className="site-header__action site-header__action--auth"
                type="button"
                onClick={(event) => handleNavigate(event, authHref)}
              >
                {authLabel}
              </button>
              <button
                aria-label={themeMode === "night" ? "切换到浅色模式" : "切换到深色模式"}
                className="site-header__action"
                type="button"
                onClick={handleThemeToggle}
              >
                {themeMode === "night" ? "浅色模式" : "深色模式"}
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
