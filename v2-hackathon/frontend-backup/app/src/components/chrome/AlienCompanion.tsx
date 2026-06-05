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
  const [brandPhase, setBrandPhase] = useState(0); // 0=mcd, 1=redbull, 2=nike
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

  // --- Brand rotation: swap McDonald's / Red Bull every 60s ---
  useEffect(() => {
    const brandTimer = setInterval(() => {
      setBrandPhase((prev) => (prev + 1) % 3);
    }, 60000);
    return () => clearInterval(brandTimer);
  }, []);

  // --- Rec bubble cycle: every 60s show a rec message for 10s ---
  useEffect(() => {
    const showBubble = () => {
      if (suppressRef.current) return;
      const msg = REC_MESSAGES[recIndexRef.current % REC_MESSAGES.length];
      recIndexRef.current++;
      setBubble(msg);
      setIsRecBubble(true);
      bubbleHideTimer.current = setTimeout(() => setBubble(null), 10000);
    };

    // First bubble after 30s, then every 60s
    const initialTimer = setTimeout(() => {
      showBubble();
      bubbleTimer.current = setInterval(showBubble, 60000);
    }, 30000);

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

  // --- Tap handler: gesture + open recommendations ---
  const handleTap = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const TAP_GESTURES: Gesture[] = ["dance", "spin", "excited", "peek", "bounce"];
    const g = TAP_GESTURES[Math.floor(Math.random() * TAP_GESTURES.length)];
    setGesture(g);
    setTimeout(() => setGesture("idle"), 1200);

    // Open recommendations
    setBubble(null);
    onRecTap?.();
  }, [onRecTap]);

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
      {/* Thought bubble — pops from alien's head, entire box is clickable */}
      {bubble && (
        <div
          className={`absolute right-0 rounded-2xl px-3 py-1 leading-snug text-white/90 cursor-pointer whitespace-nowrap ${isRecBubble ? "text-[9px]" : "text-[8px]"}`}
          style={{
            bottom: "calc(100% + 20px)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: "0.03em",
            background: isRecBubble ? "rgba(20, 15, 40, 0.95)" : "rgba(14, 12, 24, 0.92)",
            border: isRecBubble ? "1px solid rgba(140, 100, 255, 0.4)" : "1px solid rgba(140, 100, 255, 0.25)",
            boxShadow: isRecBubble ? "0 0 20px 3px rgba(140, 100, 255, 0.12)" : "0 0 12px 2px rgba(140, 100, 255, 0.08)",
            animation: "bubble-in 250ms ease-out",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setBubble(null);
            if (isRecBubble) onRecTap?.();
          }}
        >
          {bubble}
          {/* Thought dots — 3 circles trailing down to alien head */}
          <div className="absolute" style={{ bottom: -8, right: 30, width: 8, height: 8, borderRadius: "50%", background: "rgba(140, 100, 255, 0.35)" }} />
          <div className="absolute" style={{ bottom: -14, right: 22, width: 5, height: 5, borderRadius: "50%", background: "rgba(140, 100, 255, 0.25)" }} />
          <div className="absolute" style={{ bottom: -18, right: 16, width: 3, height: 3, borderRadius: "50%", background: "rgba(140, 100, 255, 0.15)" }} />
        </div>
      )}

      {/* Alien + Ship container — alien sits on top of saucer, no dome */}
      <div
        className={`cursor-pointer select-none ${gestureClass}`}
        onPointerDown={handleTap}
        style={{ touchAction: "none", opacity: 0.75, overflow: "visible", position: "relative", width: 125, height: 117 }}
      >
        {/* Alien character — sitting on saucer rim, 1.3× scale */}
        <svg
          width="78" height="75" viewBox="0 -4 60 62"
          fill="none"
          style={{ overflow: "visible", position: "absolute", left: 23, top: 0, zIndex: 2 }}
        >
          {/* Antennae */}
          <line x1="18" y1="8" x2="12" y2="0" stroke="#5cff5c" strokeWidth="1.8" opacity="0.7" />
          <circle cx="12" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
          <line x1="42" y1="8" x2="48" y2="0" stroke="#5cff5c" strokeWidth="1.8" opacity="0.7" />
          <circle cx="48" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite 0.5s" }} />

          {/* Head — round, green */}
          <ellipse cx="30" cy="18" rx="14" ry="14" fill="#5cff5c" opacity="0.9" />

          {/* Eyes — large, dark */}
          <ellipse cx="24" cy="16" rx="4.5" ry="5" fill="#0a2a0a" opacity="0.9" />
          <ellipse cx="36" cy="16" rx="4.5" ry="5" fill="#0a2a0a" opacity="0.9" />
          {/* Eye shine */}
          <circle cx="25.5" cy="14.5" r="1.8" fill="rgba(255,255,255,0.7)" />
          <circle cx="37.5" cy="14.5" r="1.8" fill="rgba(255,255,255,0.7)" />

          {/* Mouth — gentle smile */}
          <path d="M25 24 Q30 27 35 24" stroke="#0a2a0a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />

          {/* Body / Torso — dark blue t-shirt */}
          <rect x="16" y="30" width="28" height="24" rx="6" fill="#1a2744" opacity="0.95" />
          {/* Slight collar */}
          <path d="M22 30 Q30 33 38 30" stroke="#2a3a5c" strokeWidth="0.8" fill="none" />

          {/* Brand logo — transparent PNG on dark shirt */}
          <image href={brandPhase === 0 ? "/mcd-logo.png" : brandPhase === 1 ? "/redbull-logo.png" : "/nike-logo.png"} x="18" y="33" width="24" height="20" preserveAspectRatio="xMidYMid meet" />
        </svg>

        {/* Spaceship — flat saucer below the alien with thrust */}
        <svg
          width="125" height="50" viewBox="0 0 96 40"
          fill="none"
          style={{ position: "absolute", left: 0, bottom: 0, zIndex: 1, filter: "drop-shadow(0 0 10px rgba(127, 255, 127, 0.2))" }}
        >
          {/* Saucer body */}
          <ellipse cx="48" cy="14" rx="48" ry="14" fill="url(#shipGradSimple)" opacity="0.9" />
          {/* Window strip */}
          <circle cx="20" cy="12" r="2.5" fill="rgba(127, 255, 127, 0.5)" />
          <circle cx="34" cy="10" r="2.5" fill="rgba(127, 255, 127, 0.6)" />
          <circle cx="48" cy="9.5" r="3" fill="rgba(127, 255, 127, 0.65)" />
          <circle cx="62" cy="10" r="2.5" fill="rgba(127, 255, 127, 0.6)" />
          <circle cx="76" cy="12" r="2.5" fill="rgba(127, 255, 127, 0.5)" />
          {/* Thrust / exhaust downward */}
          <ellipse cx="48" cy="28" rx="18" ry="3" fill="rgba(127, 255, 127, 0.25)" />
          <ellipse cx="48" cy="32" rx="12" ry="2.5" fill="rgba(127, 255, 127, 0.15)" />
          <ellipse cx="48" cy="36" rx="7" ry="2" fill="rgba(127, 255, 127, 0.08)" />
          {/* Thrust particles */}
          <circle cx="42" cy="30" r="1" fill="rgba(127, 255, 127, 0.3)" style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }} />
          <circle cx="54" cy="31" r="0.8" fill="rgba(127, 255, 127, 0.25)" style={{ animation: "pulse-dot 1.5s ease-in-out infinite 0.3s" }} />
          <circle cx="48" cy="34" r="1.2" fill="rgba(127, 255, 127, 0.2)" style={{ animation: "pulse-dot 1.5s ease-in-out infinite 0.7s" }} />
          <circle cx="45" cy="37" r="0.7" fill="rgba(127, 255, 127, 0.12)" style={{ animation: "pulse-dot 2s ease-in-out infinite 1s" }} />
          <circle cx="51" cy="38" r="0.6" fill="rgba(127, 255, 127, 0.1)" style={{ animation: "pulse-dot 2s ease-in-out infinite 0.5s" }} />
          <defs>
            <linearGradient id="shipGradSimple" x1="0" y1="0" x2="96" y2="28">
              <stop offset="0" stopColor="#2a2a40" />
              <stop offset="0.5" stopColor="#3d3d5c" />
              <stop offset="1" stopColor="#2a2a40" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
