import type { SiteContentBlock } from "../api";
import type { StatusTone } from "../types/app";

export const HOME_PAGE_CONFIG_SLUG = "home_page_config";

export const HOME_SECTION_KEYS = ["history", "links", "rules", "gallery"] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export interface HomeMetricConfig {
  detail: string;
  id: string;
  label: string;
  tone: StatusTone;
  value: string;
}

export interface HomeLinkConfig {
  description: string;
  href: string;
  id: string;
  kicker: string;
  title: string;
}

export interface HomeRuleConfig {
  body: string;
  id: string;
  title: string;
}

export interface HomeConfig {
  version: 1;
  hero: {
    galleryButtonLabel: string;
    forumButtonLabel: string;
    postcardKicker: string;
    postcardTitle: string;
    terminalCommand: string;
    terminalPromptTemplate: string;
    terminalStatus: string;
  };
  heroMetrics: HomeMetricConfig[];
  history: {
    articleDescription: string;
    articleHeading: string;
    forumDescription: string;
    forumHeading: string;
    kicker: string;
    paragraphs: string[];
    sideKicker: string;
    sideTitle: string;
    spaceDescription: string;
    spaceHeading: string;
    title: string;
  };
  links: {
    items: HomeLinkConfig[];
    kicker: string;
    title: string;
  };
  rules: {
    items: HomeRuleConfig[];
    kicker: string;
    title: string;
  };
  gallery: {
    kicker: string;
    title: string;
  };
  layout: HomeSectionKey[];
}

const DEFAULT_HOME_CONFIG: HomeConfig = {
  version: 1,
  hero: {
    terminalCommand: "",
    terminalStatus: "",
    terminalPromptTemplate: "{{space}}@redgal:~$",
    forumButtonLabel: "进入讨论板",
    galleryButtonLabel: "查看照片墙",
    postcardKicker: "",
    postcardTitle: "",
  },
  heroMetrics: [],
  history: {
    kicker: "发展历程",
    title: "",
    paragraphs: [],
    sideKicker: "当前内容",
    sideTitle: "",
    articleHeading: "专栏",
    articleDescription: "",
    forumHeading: "讨论板",
    forumDescription: "",
    spaceHeading: "个人空间",
    spaceDescription: "",
  },
  links: {
    kicker: "板块导航",
    title: "",
    items: [],
  },
  rules: {
    kicker: "站内说明",
    title: "",
    items: [],
  },
  gallery: {
    kicker: "展示墙",
    title: "",
  },
  layout: ["history", "links", "rules", "gallery"],
};

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  history: "发展历程",
  links: "板块导航",
  rules: "规则说明",
  gallery: "首页展示墙",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeTone(value: unknown, fallback: StatusTone): StatusTone {
  if (value === "neutral" || value === "success" || value === "warn" || value === "accent") {
    return value;
  }
  return fallback;
}

function normalizeSectionLayout(value: unknown): HomeSectionKey[] {
  const input = Array.isArray(value) ? value : [];
  const result: HomeSectionKey[] = [];
  const seen = new Set<HomeSectionKey>();

  input.forEach((item) => {
    if (
      (item === "history" || item === "links" || item === "rules" || item === "gallery") &&
      !seen.has(item)
    ) {
      result.push(item);
      seen.add(item);
    }
  });

  HOME_SECTION_KEYS.forEach((section) => {
    if (!seen.has(section)) {
      result.push(section);
      seen.add(section);
    }
  });

  return result;
}

function normalizeHistoryParagraphs(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [];
  const normalized = items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return normalized.length ? normalized : [...DEFAULT_HOME_CONFIG.history.paragraphs];
}

function normalizeHeroMetrics(value: unknown): HomeMetricConfig[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: normalizeString(item.id, `metric-${index + 1}`),
        label: normalizeString(item.label, ""),
        value: normalizeString(item.value, ""),
        detail: normalizeString(item.detail, ""),
        tone: normalizeTone(item.tone, "neutral"),
      } as HomeMetricConfig;
    })
    .filter((item): item is HomeMetricConfig => Boolean(item));

  return normalized;
}

function normalizeLinkItems(value: unknown): HomeLinkConfig[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: normalizeString(item.id, `link-${index + 1}`),
        href: normalizeString(item.href, ""),
        kicker: normalizeString(item.kicker, ""),
        title: normalizeString(item.title, ""),
        description: normalizeString(item.description, ""),
      } as HomeLinkConfig;
    })
    .filter((item): item is HomeLinkConfig => Boolean(item));

  return normalized;
}

function normalizeRuleItems(value: unknown): HomeRuleConfig[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: normalizeString(item.id, `rule-${index + 1}`),
        title: normalizeString(item.title, ""),
        body: normalizeString(item.body, ""),
      } as HomeRuleConfig;
    })
    .filter((item): item is HomeRuleConfig => Boolean(item));

  return normalized;
}

function cloneMetricList(items: readonly HomeMetricConfig[]): HomeMetricConfig[] {
  return items.map((item) => ({ ...item }));
}

function cloneLinkList(items: readonly HomeLinkConfig[]): HomeLinkConfig[] {
  return items.map((item) => ({ ...item }));
}

function cloneRuleList(items: readonly HomeRuleConfig[]): HomeRuleConfig[] {
  return items.map((item) => ({ ...item }));
}

export function createDefaultHomeConfig(): HomeConfig {
  return {
    version: 1,
    hero: { ...DEFAULT_HOME_CONFIG.hero },
    heroMetrics: cloneMetricList(DEFAULT_HOME_CONFIG.heroMetrics),
    history: {
      ...DEFAULT_HOME_CONFIG.history,
      paragraphs: [...DEFAULT_HOME_CONFIG.history.paragraphs],
    },
    links: {
      ...DEFAULT_HOME_CONFIG.links,
      items: cloneLinkList(DEFAULT_HOME_CONFIG.links.items),
    },
    rules: {
      ...DEFAULT_HOME_CONFIG.rules,
      items: cloneRuleList(DEFAULT_HOME_CONFIG.rules.items),
    },
    gallery: { ...DEFAULT_HOME_CONFIG.gallery },
    layout: [...DEFAULT_HOME_CONFIG.layout],
  };
}

export function cloneHomeConfig(config: HomeConfig): HomeConfig {
  return {
    version: 1,
    hero: { ...config.hero },
    heroMetrics: cloneMetricList(config.heroMetrics),
    history: {
      ...config.history,
      paragraphs: [...config.history.paragraphs],
    },
    links: {
      ...config.links,
      items: cloneLinkList(config.links.items),
    },
    rules: {
      ...config.rules,
      items: cloneRuleList(config.rules.items),
    },
    gallery: { ...config.gallery },
    layout: normalizeSectionLayout(config.layout),
  };
}

export function normalizeHomeConfig(input: unknown): HomeConfig {
  const fallback = createDefaultHomeConfig();
  if (!isRecord(input)) {
    return fallback;
  }

  const hero = isRecord(input.hero) ? input.hero : {};
  const history = isRecord(input.history) ? input.history : {};
  const links = isRecord(input.links) ? input.links : {};
  const rules = isRecord(input.rules) ? input.rules : {};
  const gallery = isRecord(input.gallery) ? input.gallery : {};

  return {
    version: 1,
    hero: {
      terminalCommand: normalizeString(hero.terminalCommand, fallback.hero.terminalCommand),
      terminalStatus: normalizeString(hero.terminalStatus, fallback.hero.terminalStatus),
      terminalPromptTemplate: normalizeString(
        hero.terminalPromptTemplate,
        fallback.hero.terminalPromptTemplate,
      ),
      forumButtonLabel: normalizeString(hero.forumButtonLabel, fallback.hero.forumButtonLabel),
      galleryButtonLabel: normalizeString(hero.galleryButtonLabel, fallback.hero.galleryButtonLabel),
      postcardKicker: normalizeString(hero.postcardKicker, fallback.hero.postcardKicker),
      postcardTitle: normalizeString(hero.postcardTitle, fallback.hero.postcardTitle),
    },
    heroMetrics: normalizeHeroMetrics(input.heroMetrics),
    history: {
      kicker: normalizeString(history.kicker, fallback.history.kicker),
      title: normalizeString(history.title, fallback.history.title),
      paragraphs: normalizeHistoryParagraphs(history.paragraphs),
      sideKicker: normalizeString(history.sideKicker, fallback.history.sideKicker),
      sideTitle: normalizeString(history.sideTitle, fallback.history.sideTitle),
      articleHeading: normalizeString(history.articleHeading, fallback.history.articleHeading),
      articleDescription: normalizeString(history.articleDescription, fallback.history.articleDescription),
      forumHeading: normalizeString(history.forumHeading, fallback.history.forumHeading),
      forumDescription: normalizeString(history.forumDescription, fallback.history.forumDescription),
      spaceHeading: normalizeString(history.spaceHeading, fallback.history.spaceHeading),
      spaceDescription: normalizeString(history.spaceDescription, fallback.history.spaceDescription),
    },
    links: {
      kicker: normalizeString(links.kicker, fallback.links.kicker),
      title: normalizeString(links.title, fallback.links.title),
      items: normalizeLinkItems(links.items),
    },
    rules: {
      kicker: normalizeString(rules.kicker, fallback.rules.kicker),
      title: normalizeString(rules.title, fallback.rules.title),
      items: normalizeRuleItems(rules.items),
    },
    gallery: {
      kicker: normalizeString(gallery.kicker, fallback.gallery.kicker),
      title: normalizeString(gallery.title, fallback.gallery.title),
    },
    layout: normalizeSectionLayout(input.layout),
  };
}

export function parseHomeConfigFromBlock(block: SiteContentBlock | null | undefined): HomeConfig {
  const body = typeof block?.body === "string" ? block.body : "";
  if (!block || !body.trim()) {
    return createDefaultHomeConfig();
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    return normalizeHomeConfig(parsed);
  } catch {
    return createDefaultHomeConfig();
  }
}

export function resolveHomePrompt(template: string, spaceID: string): string {
  const normalizedTemplate = template.trim();
  if (!normalizedTemplate) {
    return `${spaceID}@redgal:~$`;
  }

  if (normalizedTemplate.includes("{{space}}")) {
    return normalizedTemplate.replaceAll("{{space}}", spaceID);
  }

  return normalizedTemplate;
}

export function serializeHomeConfig(config: HomeConfig): string {
  const normalized = normalizeHomeConfig(config);
  return JSON.stringify(normalized, null, 2);
}
