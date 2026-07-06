// src/components/Reveal.tsx
//
// Lightweight scroll-reveal. Wrap any section/card to fade+rise it into view
// once. Honors prefers-reduced-motion (renders visible immediately). Requires
// eo-motion.css (.eo-reveal / .eo-will-animate / .is-in).
//
// Content is VISIBLE by default — animation is progressive enhancement.
// Elements already in the viewport when React mounts are shown immediately
// (no animation). Only below-fold elements get the hidden→reveal transition.
//
//   <Reveal>            <FeatureCard/> </Reveal>
//   <Reveal variant="left" delay={120}> ... </Reveal>
//   <Reveal as="section" className="py-16"> ... </Reveal>

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  variant?: "up" | "left" | "scale";
  delay?: number;          // ms
  once?: boolean;
  as?: ElementType;
}

export default function Reveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
  once = true,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [willAnimate, setWillAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    // If already in viewport — show immediately, skip animation entirely
    const { top, bottom } = el.getBoundingClientRect();
    if (bottom > 0 && top < window.innerHeight) {
      setShown(true);
      return;
    }

    // Below (or above) fold: arm the hidden state then watch for entry
    setWillAnimate(true);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        });
      },
      // rootMargin 120px: start animating 120px before element enters viewport
      { threshold: 0.05, rootMargin: "0px 0px 120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  // Class logic:
  // - Initial (before useEffect): no eo-will-animate → element is visible
  // - In viewport on mount: shown=true → "eo-reveal is-in" → visible, no animation
  // - Below fold: willAnimate=true, shown=false → "eo-reveal eo-will-animate" → hidden
  // - After scroll into view: willAnimate=true, shown=true → "eo-reveal is-in" → transition fires
  const hiddenClass = willAnimate && !shown ? " eo-will-animate" : "";
  const shownClass = shown ? " is-in" : "";

  return (
    <Tag
      ref={ref as never}
      data-eo={variant === "up" ? undefined : variant}
      className={`eo-reveal${hiddenClass}${shownClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
