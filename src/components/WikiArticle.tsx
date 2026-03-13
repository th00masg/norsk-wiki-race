"use client";

import { useRef, useEffect, useCallback } from "react";

interface WikiArticleProps {
  html: string;
  onNavigate: (slug: string) => void;
  loading?: boolean;
}

/**
 * Renders Wikipedia HTML using direct DOM manipulation (ref-based).
 * This avoids React re-render cycles from interfering with scroll position.
 * The container innerHTML is only updated when `html` actually changes.
 */
export default function WikiArticle({
  html,
  onNavigate,
  loading,
}: WikiArticleProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>("");
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // Only touch the DOM when html actually changes
  useEffect(() => {
    if (!contentRef.current || !html || html === lastHtmlRef.current) return;
    lastHtmlRef.current = html;
    contentRef.current.innerHTML = html;
  }, [html]);

  // Attach click handler via DOM event (not React) to avoid re-render coupling
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
        "a[data-wiki-slug]"
      ) as HTMLAnchorElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const slug = target.getAttribute("data-wiki-slug");
      if (slug) {
        onNavigateRef.current(decodeURIComponent(slug));
      }
    }

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-card-border p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm font-[var(--font-fredoka)]">
            Laster artikkel...
          </span>
        </div>
      </div>
    );
  }

  return <div ref={contentRef} className="wiki-content" />;
}
