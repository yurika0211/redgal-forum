import { startTransition, useCallback, useEffect, useState } from "react";
import {
  normalizePath,
  readCurrentPath,
  readForumEditorMode,
  readPublicProfileUsername,
  readSelectedAnonymousThreadID,
  readSelectedArticleID,
  readSelectedForumThreadID,
  readStoriesEditorMode,
  type RoutePath,
} from "../lib/routes";

interface UseAppRouteStateResult {
  routePath: RoutePath;
  selectedArticleID: string | null;
  isStoriesEditorMode: boolean;
  selectedForumThreadID: string | null;
  isForumEditorMode: boolean;
  selectedPublicProfileUsername: string | null;
  selectedAnonymousThreadID: string | null;
  navigate: (nextHref: string) => void;
}

type ViewTransitionLike = {
  finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
};

export function useAppRouteState(): UseAppRouteStateResult {
  const [routePath, setRoutePath] = useState<RoutePath>(() => readCurrentPath());
  const [selectedArticleID, setSelectedArticleID] = useState<string | null>(() =>
    readSelectedArticleID(),
  );
  const [isStoriesEditorMode, setIsStoriesEditorMode] = useState<boolean>(() =>
    readStoriesEditorMode(),
  );
  const [selectedForumThreadID, setSelectedForumThreadID] = useState<string | null>(() =>
    readSelectedForumThreadID(),
  );
  const [isForumEditorMode, setIsForumEditorMode] = useState<boolean>(() =>
    readForumEditorMode(),
  );
  const [selectedPublicProfileUsername, setSelectedPublicProfileUsername] = useState<string | null>(
    () => readPublicProfileUsername(),
  );
  const [selectedAnonymousThreadID, setSelectedAnonymousThreadID] = useState<string | null>(() =>
    readSelectedAnonymousThreadID(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handlePopstate(): void {
      setRoutePath(readCurrentPath());
      setSelectedArticleID(readSelectedArticleID());
      setIsStoriesEditorMode(readStoriesEditorMode());
      setSelectedForumThreadID(readSelectedForumThreadID());
      setIsForumEditorMode(readForumEditorMode());
      setSelectedPublicProfileUsername(readPublicProfileUsername());
      setSelectedAnonymousThreadID(readSelectedAnonymousThreadID());
    }

    window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, []);

  const navigate = useCallback((nextHref: string) => {
    const resolvedURL =
      typeof window !== "undefined"
        ? new URL(nextHref, window.location.origin)
        : new URL(`http://localhost${nextHref}`);
    const nextPath = normalizePath(resolvedURL.pathname);
    const nextArticleID = readSelectedArticleID(resolvedURL.pathname);
    const nextStoriesEditorMode = readStoriesEditorMode(resolvedURL.pathname);
    const nextForumEditorMode = readForumEditorMode(resolvedURL.pathname);
    const nextPublicProfileUsername = readPublicProfileUsername(resolvedURL.pathname);
    const nextThreadID =
      nextPath === "/forum" ? readSelectedForumThreadID(resolvedURL.pathname, resolvedURL.search) : null;
    const nextAnonymousThreadID =
      nextPath === "/anonymous" ? readSelectedAnonymousThreadID(resolvedURL.pathname) : null;

    if (
      typeof window !== "undefined" &&
      (window.location.pathname !== resolvedURL.pathname || window.location.search !== resolvedURL.search)
    ) {
      window.history.pushState({}, "", `${resolvedURL.pathname}${resolvedURL.search}`);
    }

    const applyRouteState = () => {
      startTransition(() => {
        setRoutePath(nextPath);
        setSelectedArticleID(nextArticleID);
        setIsStoriesEditorMode(nextStoriesEditorMode);
        setSelectedForumThreadID(nextThreadID);
        setIsForumEditorMode(nextForumEditorMode);
        setSelectedPublicProfileUsername(nextPublicProfileUsername);
        setSelectedAnonymousThreadID(nextAnonymousThreadID);
      });
    };

    const documentWithTransition: DocumentWithViewTransition | null =
      typeof document !== "undefined" ? (document as DocumentWithViewTransition) : null;

    if (documentWithTransition?.startViewTransition) {
      documentWithTransition.startViewTransition(() => {
        applyRouteState();
      });
    } else {
      applyRouteState();
    }

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return {
    routePath,
    selectedArticleID,
    isStoriesEditorMode,
    selectedForumThreadID,
    isForumEditorMode,
    selectedPublicProfileUsername,
    selectedAnonymousThreadID,
    navigate,
  };
}
