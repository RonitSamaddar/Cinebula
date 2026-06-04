"use client";

import { useQueueStore } from "@/stores/queue-store";

export default function QueueBar({ onOpen }: { onOpen?: () => void }) {
  const count = useQueueStore((s) => s.items.length);

  return (
    <div
      className="pointer-events-auto shrink-0"
      style={{ zIndex: 20 }}
    >
      {/* Gradient border line */}
      <div
        className="h-[1.5px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #f0c246 30%, #f07c3e 50%, #f0c246 70%, transparent 100%)",
        }}
      />
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{
          background: "#07070c",
          paddingBottom: "max(env(safe-area-inset-bottom, 10px), 14px)",
        }}
      >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
          Tonight&apos;s Queue
        </span>
        <span className="font-mono text-[10px] text-white/30">—</span>
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums text-white"
          style={{ background: count > 0 ? "#7c6bf0" : "rgba(255,255,255,0.12)" }}
        >
          {count}
        </span>
        <span className="font-mono text-[10px] text-white/60">
          {count === 1 ? "pick" : "picks"} ready
        </span>
      </div>
      <button
        className="rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors active:scale-95"
        style={{
          background: "rgba(124, 107, 240, 0.25)",
          border: "1px solid rgba(124, 107, 240, 0.5)",
        }}
        onPointerUp={(e) => { e.stopPropagation(); onOpen?.(); }}
      >
        View Queue →
      </button>
      </div>
    </div>
  );
}
