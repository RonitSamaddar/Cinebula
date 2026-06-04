/**
 * MenuDrawer — 280px left drawer with search, language & actor filters.
 * Slides in from left, blur backdrop, swipe-left to dismiss.
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { SearchFilters } from "@/lib/search";
import { useQueueStore } from "@/stores/queue-store";
import { useTVStore } from "@/stores/tv-store";
import { initializeBackend, backendMoviesToShows } from "@/services/backend";
import { buildCategories } from "@/data/categories";
import type { Show, Category } from "@/types";
import QRScanner from "./QRScanner";

const DEFAULT_LANGUAGES = ["English", "Spanish", "Korean", "Japanese", "French", "German"];
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
  /** Called with show sets and dynamic categories when backend data loads after QR scan */
  onBackendShows?: (data: { z0: Show[]; z1: Show[]; z2: Show[] }, categories: Category[]) => void;
}

export default function MenuDrawer({ onClose, onSearch, onReset, hasActiveFilters, actors, languages, audioOn = false, onAudioToggle, onViewQueue, onBackendShows }: MenuDrawerProps) {
  const LANGUAGES = languages ?? DEFAULT_LANGUAGES;
  const ACTORS = actors ?? DEFAULT_ACTORS;
  const queueCount = useQueueStore((s) => s.items.length);
  const { deviceId, setDeviceId, disconnect } = useTVStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [actor, setActor] = useState("");
  const [actorOpen, setActorOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragX = useRef({ active: false, startX: 0, currentX: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const filteredLangs = language
    ? LANGUAGES.filter((l) => l.toLowerCase().includes(language.toLowerCase()))
    : LANGUAGES;

  const filteredActors = actor
    ? ACTORS.filter((a) => a.toLowerCase().includes(actor.toLowerCase()))
    : ACTORS;

  const handleGo = () => {
    setLangOpen(false);
    setActorOpen(false);
    onSearch({ query, genres: [], language, actor });
  };

  const handleReset = () => {
    setQuery("");
    setLanguage("");
    setActor("");
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
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGo(); }}
              placeholder="Search shows…"
              className="flex-1 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/30 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              className="shrink-0 rounded-lg px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c6bf0, #b56cff)",
              }}
              onClick={handleGo}
            >
              GO
            </button>
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
          {/* Language combobox */}
          <div className="relative mb-4">
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              Language
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setLangOpen(true); }}
              onFocus={() => setLangOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") { setLangOpen(false); handleGo(); } }}
              placeholder="Type or select…"
              className="w-full rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            {langOpen && filteredLangs.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-1 max-h-[140px] overflow-y-auto rounded-lg"
                style={{
                  zIndex: 5,
                  background: "rgba(14, 12, 24, 0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {filteredLangs.map((l) => (
                  <button
                    key={l}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-white/70 hover:text-white active:bg-white/10"
                    onClick={() => { setLanguage(l); setLangOpen(false); }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actor combobox */}
          <div className="relative mb-4">
            <label className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              Actor
            </label>
            <input
              type="text"
              value={actor}
              onChange={(e) => { setActor(e.target.value); setActorOpen(true); }}
              onFocus={() => setActorOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") { setActorOpen(false); handleGo(); } }}
              placeholder="Type or select…"
              className="w-full rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            {actorOpen && filteredActors.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-1 max-h-[140px] overflow-y-auto rounded-lg"
                style={{
                  zIndex: 5,
                  background: "rgba(14, 12, 24, 0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {filteredActors.map((a) => (
                  <button
                    key={a}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-white/70 hover:text-white active:bg-white/10"
                    onClick={() => { setActor(a); setActorOpen(false); }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
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

          {/* Show connected ID for validation */}
          {deviceId && (
            <div className="mt-2 rounded-lg px-3 py-2" style={{ background: "rgba(127, 255, 127, 0.05)", border: "1px solid rgba(127, 255, 127, 0.1)" }}>
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30 mb-1">Device ID</p>
              <p className="font-mono text-[11px] text-[#7fff7f] break-all">{deviceId}</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner overlay */}
      {scannerOpen && (
        <QRScanner
          onScan={(id) => {
            setDeviceId(id);
            setScannerOpen(false);
            initializeBackend(id).then((result) => {
              if (result && onBackendShows) {
                const categories = buildCategories(result.topGenres.map(g => g.genre));
                const data = backendMoviesToShows(result.topGenres, result.moviesByGenre, categories);
                onBackendShows(data, categories);
              }
            });
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}
