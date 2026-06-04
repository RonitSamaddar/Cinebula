/**
 * AlienCompanion — Animated alien character with spaceship, idle gestures,
 * speech bubbles with rec teasers, and tap interactions.
 */

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { REC_MESSAGES } from "@/data/alien-content";
import { SPACE_FACTS } from "@/data/space-facts";

type Gesture = "idle" | "blink" | "wave" | "bounce" | "look" | "dance" | "spin" | "excited" | "peek" | "sleepy" | "thinking";

interface AlienCompanionProps {
  /** When true, suppress rec bubbles (overlay open) */
  suppressBubbles?: boolean;
  /** Called when the alien's rec bubble is tapped (open rec dialog) */
  onRecTap?: () => void;
}

export default function AlienCompanion({ suppressBubbles = false, onRecTap }: AlienCompanionProps) {
  const [gesture, setGesture] = useState<Gesture>("idle");
  const [bubble, setBubble] = useState<string | null>(null);
  const [isRecBubble, setIsRecBubble] = useState(false);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bubbleHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recIndexRef = useRef(0);
  const suppressRef = useRef(suppressBubbles);
  suppressRef.current = suppressBubbles;

  // --- Idle gesture cycle: every 3-5s pick a random idle gesture ---
  useEffect(() => {
    const IDLE_GESTURES: Gesture[] = ["blink", "wave", "bounce", "look"];

    const scheduleGesture = () => {
      const delay = 3000 + Math.random() * 2000;
      gestureTimer.current = setTimeout(() => {
        const g = IDLE_GESTURES[Math.floor(Math.random() * IDLE_GESTURES.length)];
        setGesture(g);
        // Reset to idle after gesture duration
        setTimeout(() => setGesture("idle"), 800);
        scheduleGesture();
      }, delay);
    };

    // Start a slower idle state cycle (8-15s): thinking, sleepy, observing
    const idleStateTimer = setInterval(() => {
      const states: Gesture[] = ["thinking", "sleepy", "idle"];
      const s = states[Math.floor(Math.random() * states.length)];
      setGesture(s);
      setTimeout(() => setGesture("idle"), 2000);
    }, 8000 + Math.random() * 7000);

    scheduleGesture();
    return () => {
      if (gestureTimer.current) clearTimeout(gestureTimer.current);
      clearInterval(idleStateTimer);
    };
  }, []);

  // --- Rec bubble cycle: every 10s show a rec message for 8s ---
  useEffect(() => {
    const showBubble = () => {
      if (suppressRef.current) return;
      const msg = REC_MESSAGES[recIndexRef.current % REC_MESSAGES.length];
      recIndexRef.current++;
      setBubble(msg);
      setIsRecBubble(true);
      bubbleHideTimer.current = setTimeout(() => setBubble(null), 8000);
    };

    // First bubble after 12s, then every 25s
    const initialTimer = setTimeout(() => {
      showBubble();
      bubbleTimer.current = setInterval(showBubble, 25000);
    }, 12000);

    return () => {
      clearTimeout(initialTimer);
      if (bubbleTimer.current) clearInterval(bubbleTimer.current);
      if (bubbleHideTimer.current) clearTimeout(bubbleHideTimer.current);
    };
  }, []);

  // Suppress: hide current bubble when overlays open
  useEffect(() => {
    if (suppressBubbles && bubble) {
      setBubble(null);
    }
  }, [suppressBubbles, bubble]);

  // --- Tap handler: random gesture + space fact ---
  const handleTap = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const TAP_GESTURES: Gesture[] = ["dance", "spin", "excited", "peek", "bounce"];
    const g = TAP_GESTURES[Math.floor(Math.random() * TAP_GESTURES.length)];
    setGesture(g);
    setTimeout(() => setGesture("idle"), 1200);

    // Show random space fact
    const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
    if (bubbleHideTimer.current) clearTimeout(bubbleHideTimer.current);
    setBubble(fact);
    setIsRecBubble(false);
    bubbleHideTimer.current = setTimeout(() => setBubble(null), 5000);
  }, []);

  // Gesture → CSS class mapping
  const gestureClass = (() => {
    switch (gesture) {
      case "blink": return "alien-blink";
      case "wave": return "alien-wave";
      case "bounce": return "alien-bounce";
      case "look": return "alien-look";
      case "dance": return "alien-dance";
      case "spin": return "alien-spin";
      case "excited": return "alien-excited";
      case "peek": return "alien-peek";
      case "sleepy": return "alien-sleepy";
      case "thinking": return "alien-thinking";
      default: return "alien-hover";
    }
  })();

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        right: 8,
        bottom: 24,
        zIndex: 15,
      }}
    >
      {/* Speech bubble */}
      {bubble && (
        <div
          className={`absolute right-0 rounded-lg px-3 py-2 leading-snug text-white/90 ${isRecBubble ? "w-[220px] text-[11px]" : "w-[180px] text-[10px]"}`}
          style={{
            bottom: "calc(100% + 10px)",
            background: isRecBubble ? "rgba(14, 12, 24, 0.95)" : "rgba(14, 12, 24, 0.92)",
            border: isRecBubble ? "1px solid rgba(127, 255, 127, 0.5)" : "1px solid rgba(127, 255, 127, 0.35)",
            boxShadow: isRecBubble ? "0 0 24px 4px rgba(127, 255, 127, 0.15)" : "0 0 16px 2px rgba(127, 255, 127, 0.1)",
            animation: "bubble-in 250ms ease-out",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {bubble}
          {isRecBubble && (
            <button
              className="mt-2 w-full rounded-md py-1.5 text-[10px] font-bold tracking-wide text-black cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #7fff7f, #4aff4a)",
                boxShadow: "0 0 8px rgba(127, 255, 127, 0.3)",
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setBubble(null);
                onRecTap?.();
              }}
            >
              🛸 Show Recommendations
            </button>
          )}
          {/* Tail */}
          <div
            className="absolute"
            style={{
              bottom: -6,
              right: 24,
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `6px solid ${isRecBubble ? "rgba(127, 255, 127, 0.5)" : "rgba(127, 255, 127, 0.35)"}`,
            }}
          />
        </div>
      )}

      {/* Alien + Ship container */}
      <div
        className={`cursor-pointer select-none ${gestureClass}`}
        onPointerDown={handleTap}
        style={{ touchAction: "none", opacity: 0.7 }}
      >
        {/* Spaceship body — bigger */}
        <svg width="96" height="44" viewBox="0 0 96 44" fill="none" style={{ filter: "drop-shadow(0 0 12px rgba(127, 255, 127, 0.25))" }}>
          {/* Ship body */}
          <ellipse cx="48" cy="28" rx="48" ry="16" fill="url(#shipGrad2)" opacity="0.9" />
          {/* Window strip */}
          <ellipse cx="48" cy="25" rx="33" ry="8" fill="none" stroke="rgba(127, 255, 127, 0.3)" strokeWidth="0.8" />
          {/* Windows */}
          <circle cx="24" cy="25" r="3" fill="rgba(127, 255, 127, 0.5)" />
          <circle cx="36" cy="24" r="3" fill="rgba(127, 255, 127, 0.6)" />
          <circle cx="48" cy="23.5" r="3.2" fill="rgba(127, 255, 127, 0.65)" />
          <circle cx="60" cy="24" r="3" fill="rgba(127, 255, 127, 0.6)" />
          <circle cx="72" cy="25" r="3" fill="rgba(127, 255, 127, 0.5)" />
          {/* Dome */}
          <ellipse cx="48" cy="16" rx="19" ry="16" fill="url(#domeGrad2)" opacity="0.55" />
          {/* Glow under ship */}
          <ellipse cx="48" cy="42" rx="28" ry="4" fill="rgba(127, 255, 127, 0.12)" />
          {/* Rim highlight */}
          <ellipse cx="48" cy="14" rx="36" ry="3" fill="none" stroke="rgba(127, 255, 127, 0.08)" strokeWidth="0.5" />
          <defs>
            <linearGradient id="shipGrad2" x1="0" y1="14" x2="96" y2="42">
              <stop offset="0" stopColor="#2a2a40" />
              <stop offset="0.5" stopColor="#3d3d5c" />
              <stop offset="1" stopColor="#2a2a40" />
            </linearGradient>
            <radialGradient id="domeGrad2" cx="0.5" cy="0.6">
              <stop offset="0" stopColor="rgba(127, 255, 127, 0.18)" />
              <stop offset="1" stopColor="rgba(127, 255, 127, 0.02)" />
            </radialGradient>
          </defs>
        </svg>

        {/* Alien character inside dome — bigger & cuter */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: -10,
            transform: "translateX(-50%)",
            width: 44,
            height: 46,
          }}
        >
          <svg width="44" height="46" viewBox="0 0 44 46" fill="none">
            {/* Head — rounder, softer */}
            <ellipse cx="22" cy="20" rx="14" ry="15" fill="#5cff5c" opacity="0.88" />
            {/* Cheek blush — cute! */}
            <ellipse cx="10" cy="24" rx="4" ry="2.5" fill="#ff9fcf" opacity="0.2" />
            <ellipse cx="34" cy="24" rx="4" ry="2.5" fill="#ff9fcf" opacity="0.2" />
            {/* Eyes — bigger, rounder, cuter */}
            <ellipse cx="15" cy="18" rx="5" ry="5.5" fill="#0a2a0a" opacity="0.9" />
            <ellipse cx="29" cy="18" rx="5" ry="5.5" fill="#0a2a0a" opacity="0.9" />
            {/* Eye shine — bigger sparkle */}
            <circle cx="17" cy="16" r="2" fill="rgba(255,255,255,0.7)" />
            <circle cx="31" cy="16" r="2" fill="rgba(255,255,255,0.7)" />
            {/* Secondary eye shine — extra cute */}
            <circle cx="13.5" cy="20" r="1" fill="rgba(255,255,255,0.35)" />
            <circle cx="27.5" cy="20" r="1" fill="rgba(255,255,255,0.35)" />
            {/* Tiny happy mouth — cat smile :3 */}
            <path d="M18 27 Q20 29.5 22 27" stroke="#0a2a0a" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M22 27 Q24 29.5 26 27" stroke="#0a2a0a" strokeWidth="1" fill="none" opacity="0.5" />
            {/* Antennae — slightly longer */}
            <line x1="13" y1="7" x2="8" y2="0" stroke="#5cff5c" strokeWidth="1.5" opacity="0.7" />
            <circle cx="8" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            <line x1="31" y1="7" x2="36" y2="0" stroke="#5cff5c" strokeWidth="1.5" opacity="0.7" />
            <circle cx="36" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite 0.5s" }} />
          </svg>
        </div>
      </div>
    </div>
  );
}
