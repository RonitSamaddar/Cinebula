/**
 * QRScanner — Full-screen camera overlay that scans QR codes.
 * Uses jsQR for reliable decoding from canvas pixel data.
 * Extracts deviceId from scanned QR text.
 */

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (deviceId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleResult = useCallback(
    (raw: string) => {
      if (scannedRef.current) return;
      let id = raw.trim();
      try {
        const parsed = JSON.parse(raw);
        if (parsed.deviceId) id = parsed.deviceId;
        else if (parsed.id) id = parsed.id;
      } catch {
        // not JSON — use raw string as ID
      }
      if (!id) return;
      scannedRef.current = true;
      stopCamera();
      onScan(id);
    },
    [onScan, stopCamera],
  );

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        requestAnimationFrame(scanFrame);
      } catch {
        setError("Camera access denied. Please allow camera permissions.");
      }
    }

    function scanFrame() {
      if (cancelled || scannedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
      if (code && code.data) {
        handleResult(code.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [handleResult, stopCamera]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 100,
        background: "rgba(0,0,0,0.92)",
        animation: "fade-in 200ms ease-out",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-[max(calc(env(safe-area-inset-top,12px)+12px),24px)] pb-3">
        <h2 className="text-[16px] font-semibold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Scan TV QR Code
        </h2>
        <button className="text-white/50 active:text-white text-[20px] p-2" onClick={() => { stopCamera(); onClose(); }}>
          ✕
        </button>
      </div>

      {error ? (
        <div className="px-8 text-center">
          <p className="text-[14px] text-red-400 mb-4">{error}</p>
          <button
            className="rounded-lg px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white active:scale-95"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
            onClick={() => { stopCamera(); onClose(); }}
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {/* Camera viewfinder */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              width: "min(80vw, 320px)",
              height: "min(80vw, 320px)",
              border: "2px solid rgba(124, 107, 240, 0.5)",
              boxShadow: "0 0 40px rgba(124, 107, 240, 0.15)",
            }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* Scan guide corners */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-left */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#7c6bf0] rounded-tl-lg" />
              {/* Top-right */}
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#7c6bf0] rounded-tr-lg" />
              {/* Bottom-left */}
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#7c6bf0] rounded-bl-lg" />
              {/* Bottom-right */}
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#7c6bf0] rounded-br-lg" />
              {/* Scanning line animation */}
              <div
                className="absolute left-4 right-4 h-[2px]"
                style={{
                  background: "linear-gradient(90deg, transparent, #7c6bf0, transparent)",
                  animation: "scan-line 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-[11px] text-white/40 font-mono uppercase tracking-wider">
            Point camera at TV QR code
          </p>

          {/* Hidden canvas for frame processing */}
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      <style jsx>{`
        @keyframes scan-line {
          0% { top: 15%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
