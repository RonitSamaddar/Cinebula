/**
 * MenuDrawer — 280px left drawer with search, language & actor filters.
 * Slides in from left, blur backdrop, swipe-left to dismiss.
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { SearchFilters } from "@/lib/search";
import { useQueueStore } from "@/stores/queue-store";
import { useTVStore } from "@/stores/tv-store";
import { loginAndFetchGenres, fetchAllMovies, backendMoviesToShowsV2 } from "@/services/backend";
import type { Show, Category } from "@/types";
import QRScanner from "./QRScanner";

const DEFAULT_LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Korean", "Japanese", "Chinese", "Italian", "Portuguese", "Russian", "Arabic", "Bengali", "Dutch", "Greek", "Hebrew", "Persian", "Polish", "Serbian", "Swedish", "Tagalog", "Tamil", "Telugu", "Thai", "Turkish"];
const DEFAULT_GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller", "Western", "Family", "War"];
const DEFAULT_ACTORS = [
  "Bryan Cranston", "Aaron Paul", "Bob Odenkirk", "Millie Bobby Brown",
  "Pedro Pascal", "Emilia Clarke", "Kit Harington", "Jason Bateman",
  "Julia Garner", "Henry Cavill", "Anya Chalotra", "Oscar Isaac",
  "Zendaya", "Timothée Chalamet", "Florence Pugh", "Dev Patel",
  "Sandra Oh", "Jodie Comer", "Rami Malek", "Elisabeth Moss",
];

interface MenuDrawerProps {
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  /** Override default actor list (e.g. from backend). Falls back to built-in list. */
  actors?: string[];
  /** Override default language list (e.g. from backend). Falls back to built-in list. */
  languages?: string[];
  /** Whether ambient audio is currently playing */
  audioOn?: boolean;
  /** Toggle ambient audio on/off */
  onAudioToggle?: () => void;
  /** Open the queue panel */
  onViewQueue?: () => void;
  /** Backend Meilisearch — returns movie name suggestions */
  onBackendSearch?: (query: string) => Promise<string[]>;
  /** Called when user selects a movie from search suggestions — fly to it */
  onSelectMovie?: (movieName: string) => void;
  /** Called with show sets and dynamic categories when backend data loads after QR scan */
  onBackendShows?: (data: { z0: Show[]; z1: Show[]; z2: Show[]; z3: Show[] }, categories: Category[]) => void;
  /** Filter movies by genre/language via backend */
  onBackendFilter?: (genre: string, language: string) => Promise<void>;
}

export default function MenuDrawer({ onClose, onSearch, onReset, hasActiveFilters, actors, languages, audioOn = false, onAudioToggle, onViewQueue, onBackendSearch, onSelectMovie, onBackendShows, onBackendFilter }: MenuDrawerProps) {
  const LANGUAGES = languages ?? DEFAULT_LANGUAGES;
  const GENRES = DEFAULT_GENRES;
  const ACTORS = actors ?? DEFAULT_ACTORS;
  const queueCount = useQueueStore((s) => s.items.length);
  const { deviceId, setDeviceId, disconnect } = useTVStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [genreOpen, setGenreOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [actorInput, setActorInput] = useState("");
  const [actorOpen, setActorOpen] = useState(false);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragX = useRef({ active: false, startX: 0, currentX: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Debounced Meilisearch suggestions
  useEffect(() => {
    if (!onBackendSearch || query.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    setSuggestionsLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await onBackendSearch(query.trim());
      setSuggestions(results);
      setSuggestionsOpen(results.length > 0);
      setSuggestionsLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onBackendSearch]);

  const filteredGenres = genreInput
    ? GENRES.filter((g) => g.toLowerCase().includes(genreInput.toLowerCase()) && !selectedGenres.includes(g))
    : GENRES.filter((g) => !selectedGenres.includes(g));

  const filteredLangs = langInput
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(langInput.toLowerCase()) && !selectedLangs.includes(l))
    : LANGUAGES.filter((l) => !selectedLangs.includes(l));

  const filteredActors = actorInput
    ? ACTORS.filter((a) => a.toLowerCase().includes(actorInput.toLowerCase()) && !selectedActors.includes(a))
    : ACTORS.filter((a) => !selectedActors.includes(a));

  const hasAnyFilter = selectedGenres.length > 0 || selectedLangs.length > 0 || selectedActors.length > 0 || query.trim().length > 0;

  const handleGo = async () => {
    setLangOpen(false);
    setGenreOpen(false);
    setActorOpen(false);
    if ((selectedGenres.length > 0 || selectedLangs.length > 0) && onBackendFilter) {
      setFilterLoading(true);
      try {
        await onBackendFilter(selectedGenres.join(","), selectedLangs.join(","));
      } finally {
        setFilterLoading(false);
      }
    } else {
      onSearch({ query, genres: [], language: selectedLangs[0] || "", actor: selectedActors[0] || "" });
    }
  };

  const handleReset = () => {
    setQuery("");
    setGenreInput("");
    setSelectedGenres([]);
    setLangInput("");
    setSelectedLangs([]);
    setActorInput("");
    setSelectedActors([]);
    setGenreOpen(false);
    setLangOpen(false);
    setActorOpen(false);
    onReset();
  };

  // Swipe-left dismiss
  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragX.current = { active: true, startX: e.clientX, currentX: e.clientX };
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragX.current.active) return;
    dragX.current.currentX = e.clientX;
    const dx = Math.min(0, e.clientX - dragX.current.startX);
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${dx}px)`;
    }
  }, []);

  const onDragEnd = useCallback(() => {
    if (!dragX.current.active) return;
    dragX.current.active = false;
    const dx = dragX.current.currentX - dragX.current.startX;
    if (dx < -60) {
      onClose();
    } else if (drawerRef.current) {
      drawerRef.current.style.transform = "translateX(0)";
      drawerRef.current.style.transition = "transform 200ms ease-out";
      setTimeout(() => {
        if (drawerRef.current) drawerRef.current.style.transition = "";
      }, 200);
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 70,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: "fade-in 200ms ease-out",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed left-0 top-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          zIndex: 71,
          width: 280,
          background: "rgba(14, 12, 24, 0.97)",
          borderRight: "1px solid rgba(124, 107, 240, 0.2)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          animation: "drawer-in 250ms ease-out",
          touchAction: "pan-y",
        }}
        onPointerDown={(e) => { e.stopPropagation(); onDragStart(e); }}
        onPointerMove={(e) => { e.stopPropagation(); onDragMove(e); }}
        onPointerUp={(e) => { e.stopPropagation(); onDragEnd(); }}
        onPointerCancel={() => onDragEnd()}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3"
          style={{ paddingTop: "max(calc(env(safe-area-inset-top, 12px) + 16px), 28px)" }}
        >
          <h2
            className="text-[18px] font-semibold text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Explore
          </h2>
          <button
            className="text-white/40 active:text-white/70 text-[18px] p-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Search bar */}
        <div className="shrink-0 px-5 pb-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSuggestionsOpen(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") { setSuggestionsOpen(false); handleGo(); } }}
                onFocus={() => { if (suggestions.length > 0) setSuggestionsOpen(true); }}
                placeholder="Search shows…"
                className="flex-1 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/30 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>

            {/* Meilisearch suggestions dropdown */}
            {suggestionsOpen && (
              <div
                className="absolute left-0 right-0 mt-1 max-h-[200px] overflow-y-auto rounded-lg"
                style={{
                  zIndex: 10,
                  background: "rgba(14, 12, 24, 0.98)",
                  border: "1px solid rgba(124, 107, 240, 0.25)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {suggestionsLoading && (
                  <div className="px-3 py-2 text-[11px] text-white/30 font-mono">Searching…</div>
                )}
                {!suggestionsLoading && suggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-3 py-2 text-[11px] text-white/30 font-mono">No results</div>
                )}
                {suggestions.map((name) => (
                  <button
                    key={name}
                    className="w-full px-3 py-2 text-left text-[12px] text-white/80 hover:text-white active:bg-[rgba(124,107,240,0.15)] transition-colors"
                    onClick={() => {
                      setQuery(name);
                      setSuggestionsOpen(false);
                      if (onSelectMovie) {
                        onSelectMovie(name);
                      } else {
                        onSearch({ query: name, genres: [], language, actor });
                      }
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable filters */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-4"
          style={{ WebkitOverflowScrolling: "touch" }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Genre combobox */}
          <div className="relative mb-2">
            <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
              Genre
            </label>
            <input
              type="text"
              value={genreInput}
              onChange={(e) => { setGenreInput(e.target.value); setGenreOpen(true); }}
              onFocus={() => setGenreOpen(true)}
              placeholder="Type or select…"
              className="w-full rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {genreOpen && filteredGenres.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-[120px] overflow-y-auto rounded-lg" style={{ zIndex: 50, background: "rgba(14, 12, 24, 0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {filteredGenres.map((g) => (
                  <button key={g} onMouseDown={(e) => e.preventDefault()} className="w-full px-3 py-1 text-left text-[11px] text-white/70 hover:text-white active:bg-white/10" onClick={() => { setSelectedGenres(prev => [...prev, g]); setGenreInput(""); setGenreOpen(false); }}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language combobox */}
          <div className="relative mb-2">
            <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
              Language
            </label>
            <input
              type="text"
              value={langInput}
              onChange={(e) => { setLangInput(e.target.value); setLangOpen(true); }}
              onFocus={() => setLangOpen(true)}
              placeholder="Type or select…"
              className="w-full rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {langOpen && filteredLangs.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-[120px] overflow-y-auto rounded-lg" style={{ zIndex: 50, background: "rgba(14, 12, 24, 0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {filteredLangs.map((l) => (
                  <button key={l} onMouseDown={(e) => e.preventDefault()} className="w-full px-3 py-1 text-left text-[11px] text-white/70 hover:text-white active:bg-white/10" onClick={() => { setSelectedLangs(prev => [...prev, l]); setLangInput(""); setLangOpen(false); }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actor combobox */}
          <div className="relative mb-2">
            <label className="mb-1 block font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
              Actor
            </label>
            <input
              type="text"
              value={actorInput}
              onChange={(e) => { setActorInput(e.target.value); setActorOpen(true); }}
              onFocus={() => setActorOpen(true)}
              placeholder="Type or select…"
              className="w-full rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {actorOpen && filteredActors.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-[120px] overflow-y-auto rounded-lg" style={{ zIndex: 50, background: "rgba(14, 12, 24, 0.98)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {filteredActors.map((a) => (
                  <button key={a} onMouseDown={(e) => e.preventDefault()} className="w-full px-3 py-1 text-left text-[11px] text-white/70 hover:text-white active:bg-white/10" onClick={() => { setSelectedActors(prev => [...prev, a]); setActorInput(""); setActorOpen(false); }}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected filters chips */}
          {hasAnyFilter && (
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {selectedGenres.map((g) => (
                <span key={`g-${g}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white/80" style={{ background: "rgba(124,107,240,0.3)", border: "1px solid rgba(124,107,240,0.5)" }}>
                  {g}
                  <button className="text-white/50 hover:text-white" onClick={() => setSelectedGenres(prev => prev.filter(x => x !== g))}>×</button>
                </span>
              ))}
              {selectedLangs.map((l) => (
                <span key={`l-${l}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white/80" style={{ background: "rgba(69,201,160,0.3)", border: "1px solid rgba(69,201,160,0.5)" }}>
                  {l}
                  <button className="text-white/50 hover:text-white" onClick={() => setSelectedLangs(prev => prev.filter(x => x !== l))}>×</button>
                </span>
              ))}
              {selectedActors.map((a) => (
                <span key={`a-${a}`} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white/80" style={{ background: "rgba(224,160,51,0.3)", border: "1px solid rgba(224,160,51,0.5)" }}>
                  {a}
                  <button className="text-white/50 hover:text-white" onClick={() => setSelectedActors(prev => prev.filter(x => x !== a))}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* GO button */}
          <button
            disabled={filterLoading || !hasAnyFilter}
            className="mt-2 w-full rounded-lg py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white active:scale-[0.97] transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #7c6bf0, #b56cff)" }}
            onClick={handleGo}
          >
            {filterLoading ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[16px] animate-bounce">👽</span>
                <span className="text-[10px] tracking-wider animate-pulse">Searching the galaxy…</span>
              </div>
            ) : "GO"}
          </button>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <div
            className="shrink-0 px-5 pb-4"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 20px)" }}
          >
            <button
              className="w-full rounded-lg py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 active:text-white active:scale-[0.97] transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onClick={handleReset}
            >
              ↻ RESET ALL
            </button>
          </div>
        )}

        {/* Queue section */}
        <div
          className="shrink-0 border-t px-5 py-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <button
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 active:scale-[0.97] transition-all"
            style={{
              background: queueCount > 0 ? "rgba(124, 107, 240, 0.1)" : "rgba(255,255,255,0.04)",
              border: queueCount > 0 ? "1px solid rgba(124, 107, 240, 0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={onViewQueue}
          >
            <span className="flex items-center gap-2">
              <span className="text-[14px]">📺</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
                Tonight&apos;s Queue
              </span>
            </span>
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums text-white"
              style={{ background: queueCount > 0 ? "#7c6bf0" : "rgba(255,255,255,0.12)" }}
            >
              {queueCount}
            </span>
          </button>
        </div>

        {/* Sound toggle */}
        {onAudioToggle && (
          <div
            className="shrink-0 border-t px-5 py-3"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <button
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 active:scale-[0.97] transition-all"
              style={{
                background: audioOn ? "rgba(127, 255, 127, 0.08)" : "rgba(255,255,255,0.04)",
                border: audioOn ? "1px solid rgba(127, 255, 127, 0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={onAudioToggle}
            >
              <span className="flex items-center gap-2">
                <span className="text-[16px]">{audioOn ? "🔊" : "🔇"}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
                  Ambient Sound
                </span>
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: audioOn ? "rgba(127, 255, 127, 0.2)" : "rgba(255,255,255,0.08)",
                  color: audioOn ? "#7fff7f" : "rgba(255,255,255,0.35)",
                }}
              >
                {audioOn ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        )}

        {/* Connect to TV */}
        <div
          className="shrink-0 border-t px-5 py-3"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            paddingBottom: "max(env(safe-area-inset-bottom, 16px), 20px)",
          }}
        >
          <button
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 active:scale-[0.97] transition-all"
            style={{
              background: deviceId ? "rgba(127, 255, 127, 0.08)" : "rgba(255,255,255,0.04)",
              border: deviceId ? "1px solid rgba(127, 255, 127, 0.25)" : "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={() => {
              if (deviceId) {
                disconnect();
              } else {
                setScannerOpen(true);
              }
            }}
          >
            <span className="flex items-center gap-2">
              <span className="text-[14px]">{deviceId ? "📡" : "📺"}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
                {deviceId ? "Disconnect TV" : "Connect to TV"}
              </span>
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: deviceId ? "rgba(127, 255, 127, 0.2)" : "rgba(255,255,255,0.08)",
                color: deviceId ? "#7fff7f" : "rgba(255,255,255,0.35)",
              }}
            >
              {deviceId ? "ON" : "OFF"}
            </span>
          </button>


        </div>
      </div>

      {/* QR Scanner overlay */}
      {scannerOpen && (
        <QRScanner
          onScan={(id) => {
            setDeviceId(id);
            setScannerOpen(false);
            (async () => {
              const session = await loginAndFetchGenres(id);
              if (!session) return;
              const allMovies = await fetchAllMovies(session.token);
              if (allMovies?.movies?.length && onBackendShows) {
                const data = backendMoviesToShowsV2(allMovies);
                onBackendShows(data, []);
              }
            })();
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}
