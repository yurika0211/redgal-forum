import { useEffect, useMemo, useState } from "react";

const ONBOARDING_STORAGE_KEY = "rubedo_onboarding_seen_v1";
const ONBOARDING_ACTIVE_SESSION_KEY = "rubedo_onboarding_active_v1";
const ONBOARDING_STEP_SESSION_KEY = "rubedo_onboarding_step_v1";

interface OnboardingTourProps {
  currentPath: string;
  isAuthenticated: boolean;
  onNavigate: (href: string) => void;
}

interface TourStep {
  title: string;
  body: string;
  targetSelector?: string;
  actionHref?: string;
  actionLabel?: string;
}

interface HighlightRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
}

function markOnboardingSeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  window.sessionStorage.removeItem(ONBOARDING_ACTIVE_SESSION_KEY);
  window.sessionStorage.removeItem(ONBOARDING_STEP_SESSION_KEY);
}

function readSessionStep(maxStepIndex: number): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const parsed = Number.parseInt(window.sessionStorage.getItem(ONBOARDING_STEP_SESSION_KEY) || "0", 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(maxStepIndex, parsed));
}

function persistOpenTour(stepIndex: number): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ONBOARDING_ACTIVE_SESSION_KEY, "1");
  window.sessionStorage.setItem(ONBOARDING_STEP_SESSION_KEY, String(stepIndex));
}

function resolveTargetRect(selector?: string): HighlightRect | null {
  if (!selector || typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width < 16 || rect.height < 16) {
    return null;
  }

  const padding = window.innerWidth < 760 ? 6 : 10;
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
  };
}

export default function OnboardingTour({
  currentPath,
  isAuthenticated,
  onNavigate,
}: OnboardingTourProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(ONBOARDING_ACTIVE_SESSION_KEY) === "1";
  });
  const [stepIndex, setStepIndex] = useState(() => readSessionStep(5));
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 760;
  const steps = useMemo<TourStep[]>(
    () => [
      {
        title: "先看顶部导航",
        body: "这里可以切换首页、专栏、论坛和展示墙。手机端从右上角菜单展开同样的入口。",
        targetSelector: isMobileViewport ? "button[aria-controls='site-header-panel']" : "header nav[aria-label='Primary']",
      },
      {
        title: "首页适合快速扫一遍",
        body: "首页会集中放公告、板块入口、活动时间线和社团展示，第一次来可以从这里判断要去哪个区域。",
        targetSelector: ".page-shell--home .page-scene",
        actionHref: "/",
        actionLabel: "回到首页",
      },
      {
        title: "内容阅读在专栏",
        body: "专栏用来放长文、活动纪要和作品整理。看到感兴趣的文章后，点进详情页阅读完整内容。",
        targetSelector: ".page-shell",
        actionHref: "/stories",
        actionLabel: "查看专栏",
      },
      {
        title: "讨论和发帖在论坛",
        body: "论坛承载主题串、回复和作品讨论。没有登录时部分内容可能只展示预览，登录后会看到更多操作。",
        targetSelector: ".page-shell",
        actionHref: "/forum",
        actionLabel: "进入论坛",
      },
      {
        title: "展示墙看图和归档",
        body: "展示墙适合浏览海报、活动图和社团归档。手机端会自动改成单列浏览，点开图片可以看大图。",
        targetSelector: ".page-shell",
        actionHref: "/gallery",
        actionLabel: "打开展示墙",
      },
      {
        title: isAuthenticated ? "个人空间记录你的内容" : "登录后解锁个人空间",
        body: isAuthenticated
          ? "个人空间里可以管理收藏、资料和个人记录，也会承接部分需要身份的站内操作。"
          : "登录后可以进入个人空间，后续发帖、收藏和个人资料都会从这里管理。",
        targetSelector: "header",
        actionHref: isAuthenticated ? "/space" : "/login",
        actionLabel: isAuthenticated ? "进入我的空间" : "去登录",
      },
    ],
    [isAuthenticated, isMobileViewport],
  );
  const activeStep = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(ONBOARDING_ACTIVE_SESSION_KEY) === "1") {
      setOpen(true);
      setStepIndex(readSessionStep(steps.length - 1));
      return undefined;
    }

    if (!hasSeenOnboarding()) {
      const timer = window.setTimeout(() => {
        persistOpenTour(0);
        setOpen(true);
      }, 650);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [steps.length]);

  useEffect(() => {
    if (open) {
      persistOpenTour(stepIndex);
    }
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updateHighlight(): void {
      setHighlightRect(resolveTargetRect(activeStep.targetSelector));
    }

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [activeStep.targetSelector, currentPath, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeTour();
      }
      if (event.key === "ArrowRight") {
        goNext();
      }
      if (event.key === "ArrowLeft") {
        goPrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  function openTour(): void {
    setStepIndex(0);
    persistOpenTour(0);
    setOpen(true);
  }

  function closeTour(): void {
    markOnboardingSeen();
    setOpen(false);
  }

  function goPrevious(): void {
    setStepIndex((current) => {
      const nextStep = Math.max(0, current - 1);
      persistOpenTour(nextStep);
      return nextStep;
    });
  }

  function goNext(): void {
    if (isLastStep) {
      closeTour();
      return;
    }
    setStepIndex((current) => {
      const nextStep = Math.min(steps.length - 1, current + 1);
      persistOpenTour(nextStep);
      return nextStep;
    });
  }

  function handleActionClick(): void {
    if (!activeStep.actionHref) {
      return;
    }
    onNavigate(activeStep.actionHref);
  }

  return (
    <>
      <button className="onboarding-launcher" type="button" onClick={openTour}>
        新手教程
      </button>

      {open ? (
        <div className="onboarding-tour" role="dialog" aria-modal="true" aria-labelledby="onboarding-tour-title">
          <button className="onboarding-tour__backdrop" type="button" aria-label="关闭新手教程" onClick={closeTour} />
          {highlightRect ? (
            <div
              className="onboarding-tour__highlight"
              style={{
                height: `${highlightRect.height}px`,
                left: `${highlightRect.left}px`,
                top: `${highlightRect.top}px`,
                width: `${highlightRect.width}px`,
              }}
              aria-hidden="true"
            />
          ) : null}

          <section className="onboarding-tour__panel">
            <div className="onboarding-tour__meta">
              <span>新手教程</span>
              <span>{stepIndex + 1} / {steps.length}</span>
            </div>
            <h2 id="onboarding-tour-title">{activeStep.title}</h2>
            <p>{activeStep.body}</p>

            <div className="onboarding-tour__dots" aria-label="教程进度">
              {steps.map((step, index) => (
                <button
                  aria-label={`跳到第 ${index + 1} 步：${step.title}`}
                  aria-current={index === stepIndex ? "step" : undefined}
                  className="onboarding-tour__dot"
                  key={step.title}
                  type="button"
                  onClick={() => {
                    persistOpenTour(index);
                    setStepIndex(index);
                  }}
                />
              ))}
            </div>

            <div className="onboarding-tour__actions">
              <button className="onboarding-tour__ghost" type="button" onClick={closeTour}>
                跳过
              </button>
              {activeStep.actionHref ? (
                <button className="onboarding-tour__ghost" type="button" onClick={handleActionClick}>
                  {activeStep.actionLabel}
                </button>
              ) : null}
              <button className="onboarding-tour__ghost" type="button" disabled={stepIndex === 0} onClick={goPrevious}>
                上一步
              </button>
              <button className="onboarding-tour__primary" type="button" onClick={goNext}>
                {isLastStep ? "完成" : "下一步"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
