"use client";

import { useCallback } from "react";

interface WikiArticleProps {
  html: string;
  onNavigate: (slug: string) => void;
  loading?: boolean;
}

export default function WikiArticle({
  html,
  onNavigate,
  loading,
}: WikiArticleProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest(
        "a[data-wiki-slug]"
      ) as HTMLAnchorElement | null;
      if (!target) return;

      e.preventDefault();
      const slug = target.getAttribute("data-wiki-slug");
      if (slug) {
        onNavigate(decodeURIComponent(slug));
      }
    },
    [onNavigate]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Laster artikkel...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="wiki-content"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
