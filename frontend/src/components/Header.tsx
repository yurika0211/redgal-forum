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
  const actionButtonClassName =
    "inline-flex items-center justify-center rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80";
  const desktopNavLinkClassName =
    "inline-flex items-center rounded-md px-2 py-1 text-sm text-[color:var(--text-main)] transition hover:bg-white/60";
  const desktopNavLinkActiveClassName =
    "bg-[color:var(--surface-tint-blue)] font-semibold text-[color:var(--text-strong)]";
  const mobileNavLinkClassName =
    "inline-flex items-center rounded-md px-2 py-1.5 text-sm text-[color:var(--text-main)] transition hover:bg-white/60";

  return (
    <header
      className={`sticky top-0 z-50 mx-auto mt-0.5 w-[calc(100%-12px)] md:w-[min(70vw,1600px)] rounded-b-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel-strong)]/95 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 ${
        hidden ? "pointer-events-none md:-translate-y-[112%] md:opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <a
          className="inline-flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-white/40"
          href="/"
          onClick={(event) => handleNavigate(event, "/")}
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] shadow-sm"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-[color:var(--color-lilac)]/70" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">redgal forum</span>
            <span className="block truncate text-sm font-semibold text-[color:var(--text-strong)]">百川乃大视觉小说研</span>
          </span>
        </a>

        <nav className="mx-2 hidden min-w-0 flex-1 flex-wrap items-center gap-1 md:flex" aria-label="Primary">
          {navigation.map((link) => (
            <a
              aria-current={currentPath === link.href ? "page" : undefined}
              className={`${desktopNavLinkClassName} ${
                currentPath === link.href ? desktopNavLinkActiveClassName : ""
              }`}
              href={link.href}
              key={link.href}
              onClick={(event) => handleNavigate(event, link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="relative" ref={notificationsRef}>
            <button
              aria-expanded={notificationOpen}
              aria-label="打开通知中心"
              className={actionButtonClassName}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setNotificationOpen((current) => !current);
              }}
            >
              <span aria-hidden="true">◎</span>
              <span>通知</span>
              {unreadNotificationCount > 0 ? (
                <span className="ml-1 rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </button>
            <section
              className={`absolute right-0 top-[calc(100%+8px)] z-20 w-[min(92vw,360px)] rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel-strong)] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition ${
                notificationOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
              aria-label="通知中心"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <strong className="text-sm text-[color:var(--text-strong)]">通知中心</strong>
                <button
                  className="text-xs text-[color:var(--text-muted)] underline-offset-2 transition hover:text-[color:var(--text-main)] hover:underline"
                  type="button"
                  onClick={() => onNotificationsMarkAllRead()}
                >
                  全部已读
                </button>
              </div>
              {notifications.length ? (
                <div className="grid max-h-80 gap-1 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      className={`grid gap-0.5 rounded-lg border px-2.5 py-2 text-left transition ${
                        notification.unread
                          ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)]/55"
                          : "border-transparent hover:border-[color:var(--line-soft)] hover:bg-white/45"
                      }`}
                      key={notification.id}
                      type="button"
                      onClick={(event) =>
                        handleNotificationClick(event, notification.id, notification.href)
                      }
                    >
                      <span className="text-sm font-medium text-[color:var(--text-strong)]">{notification.title}</span>
                      <span className="text-xs text-[color:var(--text-soft)]">{notification.description}</span>
                      {notification.timeLabel ? (
                        <span className="text-[11px] text-[color:var(--text-faint)]">{notification.timeLabel}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-3 text-sm text-[color:var(--text-muted)]">当前还没有通知。</p>
              )}
            </section>
          </div>
          <button
            className={actionButtonClassName}
            type="button"
            onClick={(event) => handleNavigate(event, authHref)}
          >
            {authLabel}
          </button>
          <button
            aria-label={themeMode === "night" ? "切换到浅色模式" : "切换到深色模式"}
            className={actionButtonClassName}
            type="button"
            onClick={handleThemeToggle}
          >
            {themeMode === "night" ? "浅色模式" : "深色模式"}
          </button>
          <button
            className={actionButtonClassName}
            type="button"
            onClick={(event) => handleNavigate(event, utilityHref)}
          >
            {utilityLabel}
          </button>
        </div>

        <button
          aria-controls="site-header-panel"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] md:hidden"
          type="button"
          onClick={() => {
            setMenuOpen((current) => !current);
          }}
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" aria-hidden="true">
            <path className="stroke-current" d="M5 7h14" fill="none" strokeLinecap="round" strokeWidth="1.8" />
            <path className="stroke-current" d="M4 12h16" fill="none" strokeLinecap="round" strokeWidth="1.8" />
            <path className="stroke-current" d="M5 17h14" fill="none" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>
      </div>

      <div
        className={`md:hidden ${menuOpen ? "max-h-[70vh] border-t border-[color:var(--line-soft)] opacity-100" : "max-h-0 opacity-0"} overflow-hidden transition-all duration-200`}
        id="site-header-panel"
      >
        <div className="grid gap-3 px-3 py-3">
          <nav className="grid gap-2" aria-label="Primary">
            {hasGroupedNavigation
              ? groupedNavigation.map((group) => (
                  <div className="grid gap-1" key={group.id}>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-faint)]">{group.label}</span>
                    <div className="grid gap-1">
                      {group.items.map((link) => (
                        <a
                          aria-current={currentPath === link.href ? "page" : undefined}
                          className={`${mobileNavLinkClassName} ${
                            currentPath === link.href ? desktopNavLinkActiveClassName : ""
                          }`}
                          href={link.href}
                          key={link.href}
                          onClick={(event) => handleNavigate(event, link.href)}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              : navigation.map((link) => (
                  <a
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`${mobileNavLinkClassName} ${
                      currentPath === link.href ? desktopNavLinkActiveClassName : ""
                    }`}
                    href={link.href}
                    key={link.href}
                    onClick={(event) => handleNavigate(event, link.href)}
                  >
                    {link.label}
                  </a>
                ))}
          </nav>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={actionButtonClassName}
              type="button"
              onClick={(event) => handleNavigate(event, authHref)}
            >
              {authLabel}
            </button>
            <button
              aria-label={themeMode === "night" ? "切换到浅色模式" : "切换到深色模式"}
              className={actionButtonClassName}
              type="button"
              onClick={handleThemeToggle}
            >
              {themeMode === "night" ? "浅色模式" : "深色模式"}
            </button>
            <button
              className={`${actionButtonClassName} col-span-2`}
              type="button"
              onClick={(event) => handleNavigate(event, utilityHref)}
            >
              {utilityLabel}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
