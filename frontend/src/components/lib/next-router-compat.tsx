// FILE: src/components/lib/next-router-compat.tsx
// (Works in CRA with react-router-dom; no Next.js imports)

import React from "react";
import { Link as RLink, useLocation, useNavigate } from "react-router-dom";

/** Allow string OR a function that receives `{ isActive }` like react-router's NavLink */
type ClassNameInput = string | ((args: { isActive: boolean }) => string);

// Use the real RRD Link props so spreading works nicely.
type BaseLinkProps = Omit<
  React.ComponentProps<typeof RLink>,
  "to" | "className" | "children"
> & {
  href: string;
  children: React.ReactNode;
  className?: ClassNameInput;
};

/** Optional extras for "active" logic */
type NavLinkExtras = {
  activeClassName?: string;
  /** If true, only exact path match marks active. Default: false (prefix match). */
  exact?: boolean;
};

export type RouterLinkProps = BaseLinkProps;
export type NavLinkProps = BaseLinkProps & NavLinkExtras;

/** Simple Link drop-in */
export function RouterLink({
  href,
  className,
  children,
  ...rest
}: RouterLinkProps) {
  const cls =
    typeof className === "function" ? className({ isActive: false }) : className;

  return (
    <RLink to={href} className={cls} {...rest}>
      {children}
    </RLink>
  );
}

/** NavLink with active-state class handling (small, dependency-free) */
export function NavLink({
  href,
  className,
  activeClassName,
  exact = false,
  children,
  ...rest
}: NavLinkProps) {
  const location = useLocation();

  // normalize to avoid trailing-slash mismatches
  const norm = (p: string) => (p && p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p);
  const current = norm(location.pathname || "");
  const target = norm(href);

  const isActive = exact
    ? current === target
    : current === target || current.startsWith(`${target}/`);

  const cls =
    typeof className === "function"
      ? className({ isActive })
      : [className, isActive && activeClassName].filter(Boolean).join(" ");

  return (
    <RLink to={href} className={cls} {...rest}>
      {children}
    </RLink>
  );
}

/** Tiny compat helpers for places that previously used Next's router */

// Equivalent-ish of `useLocation()` shape you might expect elsewhere
export function useLocationCompat() {
  const location = useLocation();
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  };
}

// Equivalent-ish of `useNavigate()` (replace/back convenience)
export function useNavigateCompat() {
  const navigate = useNavigate();
  return Object.assign(
    (to: string, opts?: { replace?: boolean; state?: unknown }) =>
      navigate(to, { replace: !!opts?.replace, state: opts?.state }),
    {
      push: (to: string) => navigate(to),
      replace: (to: string) => navigate(to, { replace: true }),
      back: () => navigate(-1),
    }
  );
}
