"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Touch-friendly tooltip: works on hover (desktop) AND tap-to-toggle (mobile).
 * Replaces Radix Tooltip which has no native touch support.
 */

type Side = "top" | "bottom" | "left" | "right";

const sideClasses: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

interface TooltipContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  setOpen: () => {},
});

function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  // Provider kept for API compat; actual state lives in Tooltip.
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
}

function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { open, setOpen } = React.useContext(TooltipContext);

  const handleToggle = React.useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => !prev);
    },
    [setOpen]
  );

  // Close on outside tap
  React.useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    const id = requestAnimationFrame(() => {
      document.addEventListener("click", handler, { once: true });
      document.addEventListener("touchend", handler, { once: true });
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("click", handler);
      document.removeEventListener("touchend", handler);
    };
  }, [open, setOpen]);

  // Hover support only for true desktop pointer devices
  const canHover = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const handleMouseEnter = React.useCallback(() => {
    if (canHover) setOpen(true);
  }, [canHover, setOpen]);
  const handleMouseLeave = React.useCallback(() => {
    if (canHover) setOpen(false);
  }, [canHover, setOpen]);

  return (
    <div
      onClick={handleToggle}
      onTouchEnd={handleToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-flex"
    >
      {children}
    </div>
  );
}

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: Side; sideOffset?: number }
>(({ className, side = "top", sideOffset, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-[80] max-w-[min(280px,calc(100vw-2.5rem))] rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-xs leading-relaxed text-white shadow-xl shadow-black/50 break-words",
        "animate-in fade-in-0 zoom-in-95",
        sideClasses[side],
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      {...props}
    />
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
