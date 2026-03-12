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
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
        <div className="flex items-center gap-2 bg-card border border-card-border rounded-lg px-3 py-2">
          <span className="flex-1">{value.title}</span>
          <button
            onClick={() => {
              onSelect(null as unknown as { title: string; slug: string });
              setQuery("");
            }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Endre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 relative" ref={containerRef}>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Søk etter artikkel..."
        className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-foreground placeholder-gray-500 focus:outline-none focus:border-accent"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-card-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.slug}
              onClick={() => {
                onSelect({ title: r.title, slug: r.slug });
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent/20 border-b border-card-border last:border-b-0"
            >
              <div className="font-medium">{r.title}</div>
              {r.description && (
                <div className="text-xs text-gray-400 truncate">
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
