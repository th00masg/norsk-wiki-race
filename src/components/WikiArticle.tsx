"use client";

import { useRef, useEffect } from "react";

interface WikiArticleProps {
  html: string;
  onNavigate: (slug: string) => void;
  loading?: boolean;
}

/**
 * Renders Wikipedia HTML using direct DOM manipulation (ref-based).
 * The content div is ALWAYS mounted so the click handler can attach.
 * Loading state is shown as an overlay on top.
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
  // The content div is always mounted now, so contentRef.current is available on mount
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

  return (
    <div className="relative">
      {/* Loading overlay — shown on top of content, doesn't unmount the content div */}
      {loading && (
        <div className="absolute inset-0 z-10 bg-[#FAFBFC] rounded-xl border border-[#e2e8f0] flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#e2e8f0] border-t-[#2563EB] rounded-full animate-spin" />
            <span className="text-[#94A3B8] text-sm font-medium">
              Laster artikkel...
            </span>
          </div>
        </div>
      )}
      {/* Content div is ALWAYS mounted so the click handler attaches on first render */}
      <div ref={contentRef} className="wiki-content" />
    </div>
  );
}
