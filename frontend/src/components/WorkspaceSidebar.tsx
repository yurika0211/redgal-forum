import UserAvatar from "./UserAvatar";

export type WorkspaceSidebarTone = "admin" | "space";

export type WorkspaceSidebarIconName =
  | "chart"
  | "grid"
  | "heart"
  | "key"
  | "layers"
  | "note"
  | "pen"
  | "pulse"
  | "radio"
  | "shield"
  | "sparkles"
  | "trophy"
  | "user"
  | "users"
  | "capsule";

export interface WorkspaceSidebarItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  icon: WorkspaceSidebarIconName;
}

export interface WorkspaceSidebarSection {
  id: string;
  kicker: string;
  title: string;
  description?: string;
  items: readonly WorkspaceSidebarItem[];
}

interface WorkspaceSidebarProps {
  activeItemId: string;
  className?: string;
  footerAvatarLabel: string;
  footerAvatarUrl?: string;
  footerBadge?: string;
  footerSubtitle: string;
  footerTitle: string;
  headerAvatarLabel: string;
  headerAvatarUrl?: string;
  headerBadge?: string;
  headerKicker: string;
  headerSubtitle: string;
  headerTitle: string;
  onItemSelect: (itemId: string) => void;
  sections: readonly WorkspaceSidebarSection[];
  tone?: WorkspaceSidebarTone;
}

function SidebarChevron() {
  return (
    <svg
      aria-hidden="true"
      className="workspace-sidebar__chevron"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SidebarIcon({ name }: { name: WorkspaceSidebarIconName }) {
  switch (name) {
    case "capsule":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M6.2 13.8 13.8 6.2a3.2 3.2 0 0 1 4.5 4.5l-7.6 7.6a3.2 3.2 0 0 1-4.5-4.5Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="m8 12 4-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "chart":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M4 15.5h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          <path d="M6.5 12.5V9.4M10 12.5V6.2M13.5 12.5V8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "grid":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <rect height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="4.2" x="3.2" y="3.2" />
          <rect height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="4.2" x="12.6" y="3.2" />
          <rect height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="4.2" x="3.2" y="12.6" />
          <rect height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="4.2" x="12.6" y="12.6" />
        </svg>
      );
    case "heart":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path
            d="M10 16.3 4.8 11.1a3.6 3.6 0 0 1 5.1-5.1L10 7l1.1-1a3.6 3.6 0 0 1 5.1 5.1L10 16.3Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      );
    case "key":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <circle cx="7" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10.2 10h6.6M13.6 10v2.2M16 10v1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "layers":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="m10 4.2 6 3.1-6 3.1-6-3 6-3.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
          <path d="m4.4 10.1 5.6 2.9 5.6-2.9M4.4 12.9l5.6 2.9 5.6-2.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      );
    case "note":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M6 3.8h5.8l2.2 2.3v9.3a.9.9 0 0 1-.9.9H6.9a.9.9 0 0 1-.9-.9V4.7a.9.9 0 0 1 .9-.9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
          <path d="M8 8.2h4M8 11h4M8 13.8h2.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "pen":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="m5.2 14.8 1-3.7L12.8 4.5a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1l-6.6 6.6-3.7 1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
          <path d="m11.7 5.6 2.7 2.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "pulse":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M3.5 10h3l1.5-3 3 6 1.6-3h3.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      );
    case "radio":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M4 6.5h12a1.2 1.2 0 0 1 1.2 1.2v6.6a1.2 1.2 0 0 1-1.2 1.2H4a1.2 1.2 0 0 1-1.2-1.2V7.7A1.2 1.2 0 0 1 4 6.5Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="m6.2 6.5 2-2.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          <circle cx="7.1" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M11.3 10.1h3.6M11.3 12.2h2.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "shield":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M10 3.4 15.4 5v4.4c0 3.3-2.2 5.4-5.4 7.2C6.8 14.8 4.6 12.7 4.6 9.4V5L10 3.4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
          <path d="m7.8 9.9 1.5 1.5 3-3.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      );
    case "sparkles":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="m10 3.8 1.2 3 3 .9-3 1-1.2 3-1.1-3-3.1-1 3.1-.9 1.1-3ZM15.2 11.8l.6 1.5 1.4.5-1.4.4-.6 1.5-.5-1.5-1.5-.4 1.5-.5.5-1.5ZM4.5 11.6l.7 1.8 1.7.6-1.7.6-.7 1.8-.7-1.8-1.7-.6 1.7-.6.7-1.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      );
    case "trophy":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M6.1 4.2h7.8v2.1a3.9 3.9 0 0 1-3.9 3.9 3.9 3.9 0 0 1-3.9-3.9V4.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
          <path d="M6.1 5.3H4.7a1.4 1.4 0 0 0-1.4 1.4v.1a2.7 2.7 0 0 0 2.7 2.7h.1M13.9 5.3h1.4a1.4 1.4 0 0 1 1.4 1.4v.1A2.7 2.7 0 0 1 14 9.5h-.1M10 10.2v3.1M7.2 16h5.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      );
    case "user":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <circle cx="10" cy="6.5" r="2.7" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4.7 15.3a5.8 5.8 0 0 1 10.6 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    case "users":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <circle cx="7.1" cy="7.1" r="2.1" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="13.3" cy="7.8" r="1.8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3.9 14.8a4 4 0 0 1 6.5-2.1M11.4 13.4a3.5 3.5 0 0 1 4.1 1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function WorkspaceSidebar({
  activeItemId,
  className,
  footerAvatarLabel,
  footerAvatarUrl,
  footerBadge,
  footerSubtitle,
  footerTitle,
  headerAvatarLabel,
  headerAvatarUrl,
  headerBadge,
  headerKicker,
  headerSubtitle,
  headerTitle,
  onItemSelect,
  sections,
  tone = "admin",
}: WorkspaceSidebarProps) {
  const rootClassName = ["workspace-sidebar", `workspace-sidebar--${tone}`, className]
    .filter(Boolean)
    .join(" ");
  const headerTone = tone === "space" ? "accent" : "neutral";
  const footerTone = footerBadge?.includes("认证") ? "success" : "neutral";

  return (
    <aside className={rootClassName}>
      <div className="workspace-sidebar__header">
        <div className="workspace-sidebar__brand">
          <UserAvatar
            className="workspace-sidebar__avatar"
            fallbackMode="monogram"
            label={headerAvatarLabel}
            shape="rounded"
            size="lg"
            src={headerAvatarUrl}
            statusTone={headerTone}
          />
          <div className="workspace-sidebar__brand-copy">
            <span className="workspace-sidebar__eyebrow">{headerKicker}</span>
            <strong>{headerTitle}</strong>
            <span>{headerSubtitle}</span>
          </div>
          <div className="workspace-sidebar__brand-meta">
            {headerBadge ? <span className="workspace-sidebar__meta-badge">{headerBadge}</span> : null}
            <SidebarChevron />
          </div>
        </div>
      </div>

      <div className="workspace-sidebar__body">
        {sections.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeItemId);

          return (
            <section
              className={`workspace-sidebar__section ${sectionActive ? "workspace-sidebar__section--active" : ""}`}
              key={section.id}
            >
              <div className="workspace-sidebar__section-head">
                <div className="workspace-sidebar__section-copy">
                  <span className="workspace-sidebar__eyebrow">{section.kicker}</span>
                  <strong>{section.title}</strong>
                </div>
              </div>
              {section.description ? <p className="workspace-sidebar__section-description">{section.description}</p> : null}
              <div className="workspace-sidebar__items">
                {section.items.map((item) => {
                  const active = item.id === activeItemId;
                  return (
                    <button
                      aria-current={active ? "page" : undefined}
                      className={`workspace-sidebar__item ${active ? "workspace-sidebar__item--active" : ""}`}
                      key={item.id}
                      onClick={() => onItemSelect(item.id)}
                      type="button"
                    >
                      <span className="workspace-sidebar__item-icon">
                        <SidebarIcon name={item.icon} />
                      </span>
                      <span className="workspace-sidebar__item-copy">
                        <span className="workspace-sidebar__item-label">{item.label}</span>
                        {item.description ? <span className="workspace-sidebar__item-description">{item.description}</span> : null}
                      </span>
                      {item.badge ? <span className="workspace-sidebar__item-badge">{item.badge}</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="workspace-sidebar__footer">
        <div className="workspace-sidebar__identity">
          <UserAvatar
            className="workspace-sidebar__avatar"
            fallbackMode="monogram"
            label={footerAvatarLabel}
            shape="rounded"
            size="lg"
            src={footerAvatarUrl}
            statusTone={footerTone}
          />
          <div className="workspace-sidebar__identity-copy">
            <strong>{footerTitle}</strong>
            <span>{footerSubtitle}</span>
          </div>
          {footerBadge ? <span className="workspace-sidebar__meta-badge">{footerBadge}</span> : null}
        </div>
      </div>
    </aside>
  );
}
