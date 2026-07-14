import { useEffect, useRef, useState } from 'react';

interface StatsCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function StatsCounter({
  target,
  prefix = '',
  suffix = '',
  className = '',
}: StatsCounterProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            observer.unobserve(entry.target);

            const duration = 1600;
            const startTime = performance.now();

            const tick = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // easeOut cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.round(eased * target));

              if (progress < 1) {
                requestAnimationFrame(tick);
              } else {
                setValue(target);
              }
            };

            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const formatted = value.toLocaleString('es-AR');

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
