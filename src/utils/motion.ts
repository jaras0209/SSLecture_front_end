/**
 * @file src/utils/motion.ts
 * @description Respect the system's "reduce motion" setting in scripted motion (the matching
 * CSS rule in main.css covers animations and transitions).
 */

/** Whether the user asked their system to reduce motion */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** Smooth scrolling, unless the user asked to reduce motion: then jump straight there */
export function scrollMotion(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
