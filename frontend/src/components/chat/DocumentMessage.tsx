import React, { useState } from "react";
import { FileText, FileArchive, FileSpreadsheet, File as FileIcon, FolderOpen, Loader2 } from "lucide-react";
import { decryptMediaBuffer } from "../../core/crypto/e2ee";

export interface DocumentMessageProps {
  messageId: string;
  filename: string;
  size: number;
  mimeType?: string;
  mediaUrl: string;
  mediaKey?: string;
  mediaIv?: string;
  isE2EE: boolean;
  onOpenFile?: (blobUrl: string, filename: string, mimeType: string) => void;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ГБ`;
}

function iconForMime(mime?: string): React.ReactNode {
  const m = mime || "";
  if (m.includes("pdf")) return <FileText className="w-7 h-7 text-red-400" />;
  if (m.includes("zip") || m.includes("rar") || m.includes("7z") || m.includes("tar")) return <FileArchive className="w-7 h-7 text-amber-400" />;
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) return <FileSpreadsheet className="w-7 h-7 text-emerald-400" />;
  return <FileIcon className="w-7 h-7 text-slate-400" />;
}

/**
 * R4 (M4.2): карточка документа до 2 ГБ. Для E2EE: download → decryptMediaBuffer
 * → blob-URL. Открытие (FileOpener на Android) — СТРОГО по явному тапу
 * пользователя (AGENTS §7.2 Anti-Loop). Кэш метаданных — file_cache (SQLite v21).
 */
export const DocumentMessage: React.FC<DocumentMessageProps> = ({
  messageId, filename, size, mimeType, mediaUrl, mediaKey, mediaIv, isE2EE, onOpenFile,
}) => {
  const [state, setState] = useState<"idle" | "downloading" | "opening">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (state !== "idle") return;
    setError(null);
    setState("downloading");
    try {
      const resp = await fetch(mediaUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const total = Number(resp.headers.get("content-length")) || size;
      const reader = resp.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) setProgress(Math.min(100, Math.round((received / total) * 100)));
        }
      }
      const encrypted = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let off = 0;
      for (const c of chunks) {
        encrypted.set(c, off);
        off += c.length;
      }

      let finalBlob: Blob;
      if (isE2EE && mediaKey && mediaIv) {
        const decrypted = await decryptMediaBuffer(encrypted.buffer as ArrayBuffer, mediaKey, mediaIv);
        finalBlob = new Blob([decrypted], { type: mimeType || "application/octet-stream" });
      } else {
        finalBlob = new Blob([encrypted], { type: mimeType || "application/octet-stream" });
      }
      const blobUrl = URL.createObjectURL(finalBlob);

      setState("opening");
      if (onOpenFile) {
        onOpenFile(blobUrl, filename, mimeType || "application/octet-stream");
      } else {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Файл открыт пользователем — возвращаем карточку в исходное состояние
      setState("idle");
      setProgress(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setState("idle");
      setProgress(0);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 w-full max-w-[300px]">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          {iconForMime(mimeType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-100 truncate" title={filename}>{filename}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {humanSize(size)}
            {isE2EE && <span className="text-emerald-400/80"> · 🔒 E2EE</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          disabled={state !== "idle"}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 flex-shrink-0"
          title={state === "idle" ? "Скачать и открыть" : "Загрузка…"}
          data-testid={`document-open-${messageId}`}
        >
          {state === "idle" ? <FolderOpen className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
        </button>
      </div>
      {state === "downloading" && (
        <div className="mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-xl bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-[10px] text-red-300">
          {error} — нажмите повторно
        </div>
      )}
    </div>
  );
};
