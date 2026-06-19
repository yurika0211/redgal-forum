import { lazy, Suspense, useEffect, useState } from "react";
import { PORTAL_MEMORY_COVER_URLS } from "./portalMemoryAssets";

const PortalMemoryCanvas = lazy(() => import("./PortalMemoryCanvas"));

function canUseWebGL(): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  return Boolean(context);
}

function PortalMemoryFallback() {
  return (
    <div className="portal-memory-fallback">
      {PORTAL_MEMORY_COVER_URLS.map((url, index) => (
        <img alt="" className={`portal-memory-fallback__card portal-memory-fallback__card--${index + 1}`} key={url} src={url} />
      ))}
    </div>
  );
}

export default function PortalMemoryScene() {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglReady(canUseWebGL());
  }, []);

  if (!webglReady) {
    return <PortalMemoryFallback />;
  }

  return (
    <Suspense fallback={<PortalMemoryFallback />}>
      <PortalMemoryCanvas />
    </Suspense>
  );
}
