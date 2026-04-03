import type { CreateArticlePayload, SiteGalleryEntry } from "../api";

export type StatusTone = "neutral" | "success" | "warn" | "accent";

export interface HeroMetric {
  detail: string;
  label: string;
  tone?: StatusTone;
  value: string;
}

export interface AuthFormState {
  account: string;
  password: string;
}

export interface LoginState {
  pending: boolean;
  error: string;
}

export interface ProfileFormState {
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
}

export interface GalleryFormState {
  entry_type: SiteGalleryEntry["entry_type"];
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  extra_text: string;
  sort_order: string;
  active: boolean;
}

export interface ArticleFormState {
  title: string;
  summary: string;
  content: string;
  visibility: CreateArticlePayload["visibility"];
  tagsText: string;
}

export interface ThreadFormState {
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  tagsText: string;
}

export interface ReplyFormState {
  threadID: string;
  parentID: string;
  content: string;
  anonymous: boolean;
  sage: boolean;
}

export interface WallSubmissionFormState {
  title: string;
  content: string;
  imagesText: string;
}

export interface FormActionState<T> {
  pending: boolean;
  error: string;
  data: T | null;
  success: string;
}

export interface DisplayPortalPage {
  href: string;
  kicker: string;
  title: string;
  description: string;
}

export interface DisplayHighlight {
  id: string;
  kicker: string;
  title: string;
  body: string;
}

export interface DisplayPillar {
  id: string;
  title: string;
  description: string;
}

export interface DisplayActivity {
  id: string;
  label: string;
  title: string;
  description: string;
}

export interface DisplayJoinStep {
  id: string;
  step: string;
  title: string;
  description: string;
}

export interface DisplayAlbum {
  id: string;
  title: string;
  accent: string;
  caption: string;
}

export interface DisplayPolaroid {
  id: string;
  title: string;
  stamp: string;
  note: string;
}

export interface DisplayPaper {
  id: string;
  title: string;
  signature: string;
  body: string;
}

export interface DisplayTimeline {
  id: string;
  year: string;
  title: string;
  summary: string;
}

export interface DisplayTrack {
  id: string;
  title: string;
  mood: string;
  length: string;
  detail: string;
}
