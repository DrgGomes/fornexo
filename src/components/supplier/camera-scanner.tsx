"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Controls = { stop: () => void };

export function CameraScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    let controls: Controls | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current || cancelled) return;
        controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
          if (!result) return;
          const text = result.getText();
          const now = Date.now();
          if (text === last.current.text && now - last.current.at < 2500) return;
          last.current = { text, at: now };
          cb.current(text);
        });
        if (cancelled) controls.stop();
      } catch {
        setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <p className="text-sm font-medium">Aponte para o código de barras do pedido</p>
        <button onClick={onClose} className="rounded-full bg-white/15 p-2" aria-label="Fechar câmera">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-36 w-[80%] max-w-md rounded-2xl ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {error && <p className="absolute inset-x-6 bottom-10 rounded-xl bg-red-600 p-3 text-center text-sm text-white">{error}</p>}
      </div>
    </div>
  );
}
