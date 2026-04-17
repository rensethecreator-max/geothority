"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Standard SaaS Package - ScrollReveal
 *
 * Premium scroll-triggered entrance animations. Wrap any section or element
 * to animate it into view as the user scrolls.
 *
 * Usage:
 *   <ScrollReveal animation="fade-up">
 *     <h2>Your Section</h2>
 *   </ScrollReveal>
 *
 *   // Stagger a grid of cards:
 *   {cards.map((card, i) => (
 *     <ScrollReveal key={i} animation="scale-up" delay={i * 150}>
 *       <Card {...card} />
 *     </ScrollReveal>
 *   ))}
 *
 * Animations: fade-up | fade-in | slide-left | slide-right | scale-up
 *
 * Respects prefers-reduced-motion. Elements animate once and stay visible.
 *
 * Required CSS (add to globals.css):
 *
 *   .scroll-reveal {
 *     opacity: 0;
 *     transition-property: opacity, transform;
 *     transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
 *   }
 *   .scroll-reveal.visible { opacity: 1; transform: none !important; }
 *   .scroll-reveal.fade-up { transform: translateY(30px); }
 *   .scroll-reveal.fade-in { transform: none; }
 *   .scroll-reveal.slide-left { transform: translateX(-40px); }
 *   .scroll-reveal.slide-right { transform: translateX(40px); }
 *   .scroll-reveal.scale-up { transform: scale(0.95); }
 *
 *   @media (prefers-reduced-motion: reduce) {
 *     .scroll-reveal {
 *       opacity: 1 !important;
 *       transform: none !important;
 *       transition: none !important;
 *     }
 *   }
 *
 *   @media (max-width: 640px) {
 *     .scroll-reveal.fade-up { transform: translateY(20px); }
 *     .scroll-reveal.slide-left { transform: translateX(-20px); }
 *     .scroll-reveal.slide-right { transform: translateX(20px); }
 *   }
 */

type Animation = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-up";

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation type. Default: "fade-up" */
  animation?: Animation;
  /** Delay in ms before animation starts (useful for stagger). Default: 0 */
  delay?: number;
  /** Duration in ms. Default: 600 */
  duration?: number;
  /** IntersectionObserver threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Additional className */
  className?: string;
  /** HTML tag to render. Default: "div" */
  as?: keyof JSX.IntrinsicElements;
}

export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 600,
  threshold = 0.1,
  className = "",
  as: Tag = "div",
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({ threshold });

  const Component = Tag as any;

  return (
    <Component
      ref={ref}
      className={`scroll-reveal ${animation} ${isVisible ? "visible" : ""} ${className}`.trim()}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
