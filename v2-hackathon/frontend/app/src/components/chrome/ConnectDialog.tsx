"use client";

interface ConnectDialogProps {
  onConnect: () => void;
}

export default function ConnectDialog({ onConnect }: ConnectDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-6 rounded-2xl px-8 py-10"
        style={{
          background: "linear-gradient(145deg, rgba(20,18,35,0.95), rgba(10,8,20,0.98))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(181,108,255,0.08)",
          maxWidth: 320,
          width: "85vw",
        }}
      >
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(181,108,255,0.12)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b56cff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white/90">Connect to your TV</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Scan the QR code displayed on your LG TV to start exploring your personalized galaxy of shows.
          </p>
        </div>

        {/* Button */}
        <button
          onClick={onConnect}
          className="mt-2 w-full rounded-xl py-3.5 text-sm font-semibold tracking-wide text-white transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #b56cff, #7c3aed)",
            boxShadow: "0 4px 20px rgba(181,108,255,0.3)",
          }}
        >
          Scan QR Code
        </button>
      </div>
    </div>
  );
}
