"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";

type ScrollToLatestProps = {
  containerId: string;
  anchorId: string;
  watchKey?: string;
};

function scrollToLatest(container: HTMLElement, behavior: ScrollBehavior) {
  container.scrollTo({
    top: container.dataset.scrollOrigin === "bottom" ? 0 : container.scrollHeight,
    behavior,
  });
}

function scheduleScrollToLatest(container: HTMLElement, behavior: ScrollBehavior) {
  requestAnimationFrame(() => {
    scrollToLatest(container, behavior);
    requestAnimationFrame(() => scrollToLatest(container, behavior));
  });
}

function distanceFromBottom(container: HTMLElement) {
  if (container.dataset.scrollOrigin === "bottom") {
    return Math.abs(container.scrollTop);
  }

  return container.scrollHeight - container.scrollTop - container.clientHeight;
}

export function ScrollToLatest({ containerId, anchorId, watchKey }: ScrollToLatestProps) {
  const [showJump, setShowJump] = useState(false);
  const mountedAtRef = useRef(0);

  useLayoutEffect(() => {
    const container = document.getElementById(containerId);
    const anchor = document.getElementById(anchorId);

    if (!container || !anchor) {
      return;
    }

    const update = () => setShowJump(distanceFromBottom(container) > 180);
    const settleDelays = [80, 180, 360, 720, 1200];
    mountedAtRef.current = Date.now();

    scrollToLatest(container, "auto");
    update();

    const timers = settleDelays.map((delay) =>
      window.setTimeout(() => {
        scheduleScrollToLatest(container, "auto");
        update();
      }, delay),
    );
    const resizeObserver = new ResizeObserver(() => {
      const recentlyMounted = Date.now() - mountedAtRef.current < 1800;

      if (recentlyMounted || distanceFromBottom(container) < 240) {
        scheduleScrollToLatest(container, "auto");
      }
      update();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(anchor);
    container.addEventListener("scroll", update, { passive: true });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
      container.removeEventListener("scroll", update);
    };
  }, [anchorId, containerId]);

  useEffect(() => {
    if (!watchKey) {
      return;
    }

    const container = document.getElementById(containerId);
    const anchor = document.getElementById(anchorId);

    if (!container || !anchor || distanceFromBottom(container) > 240) {
      return;
    }

    scheduleScrollToLatest(container, "smooth");
  }, [anchorId, containerId, watchKey]);

  function handleClick() {
    const container = document.getElementById(containerId);
    const anchor = document.getElementById(anchorId);

    if (container && anchor) {
      scrollToLatest(container, "smooth");
    }
  }

  if (!showJump) {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="absolute bottom-[142px] left-1/2 z-20 h-9 -translate-x-1/2 rounded-full border border-[#dfe5eb] bg-white px-3 text-[12px] font-semibold text-[#26303c] shadow-[0_8px_28px_rgba(31,45,61,0.14)] hover:bg-[#f7f9fb]"
      onClick={handleClick}
    >
      <ArrowDown className="size-3.5" aria-hidden="true" />
      Jump to latest
    </Button>
  );
}
