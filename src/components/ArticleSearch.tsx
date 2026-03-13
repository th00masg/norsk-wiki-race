"use client";

import { useState, useEffect, useRef } from "react";

interface SearchResult {
  title: string;
  slug: string;
  description: string;
}

interface ArticleSearchProps {
  label: string;
  value: { title: string; slug: string } | null;
  onSelect: (result: { title: string; slug: string }) => void;
}

export default function ArticleSearch({
  label,
  value,
  onSelect,
}: ArticleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (value) {
    return (
      <div className="mb-3">
        <label className="block text-sm text-foreground/40 mb-1 font-[var(--font-fredoka)]">
          {label}
        </label>
        <div className="flex items-center gap-2 bg-background/30 border border-card-border rounded-xl px-4 py-2.5">
          <span className="flex-1 font-[var(--font-fredoka)]">{value.title}</span>
          <button
            onClick={() => {
              onSelect(null as unknown as { title: string; slug: string });
              setQuery("");
            }}
            className="text-foreground/40 hover:text-pink text-sm font-[var(--font-fredoka)] transition-colors"
          >
            Endre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 relative" ref={containerRef}>
      <label className="block text-sm text-foreground/40 mb-1 font-[var(--font-fredoka)]">
        {label}
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Sok etter artikkel..."
        className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-2.5 text-foreground placeholder-foreground/30 focus:outline-none focus:border-pink transition-colors font-[var(--font-fredoka)]"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-card-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.slug}
              onClick={() => {
                onSelect({ title: r.title, slug: r.slug });
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-pink/10 border-b border-card-border last:border-b-0 transition-colors"
            >
              <div className="font-[var(--font-fredoka)] font-medium">{r.title}</div>
              {r.description && (
                <div className="text-xs text-foreground/30 truncate">
                  {r.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
