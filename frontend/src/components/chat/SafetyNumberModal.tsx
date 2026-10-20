import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  ScanLine,
  ClipboardCheck,
  BadgeCheck,
  Trash2,
} from "lucide-react";
import { GlassCard } from "../../ui/GlassCard";
import {
  calculateSafetyNumber,
  formatSafetyNumber,
  generateQRPayload,
  verifyQRPayload,
  generateQRDataUrl,
  type SafetyNumberUser,
} from "../../core/crypto/safety-number";
import { ensureLocalIdentityKeys, getPeerIdentityKey } from "../../core/crypto/e2ee";
import { storageManager } from "../../core/storage/storage-manager";

export interface SafetyNumberModalProps {
  chatId: string;
  peerId: string;
  peerName: string;
  /** Публичные identity-ключи собеседника (X25519 + опционально ECDSA), если известны. */
  peerIdentityKeyHex?: string | null;
  peerIdentityKeyECDSAHex?: string | null;
  onClose: () => void;
  onVerifiedChange?: (verified: boolean) => void;
}

/**
 * R3 (M3.2): экран QR-верификации и Safety Numbers.
 * Полностью локально: детерминированное 60-значное число из SHA-512 над
 * отсортированными identity-ключами обеих сторон; сервер не участвует.
 * Zero-Toast: все статусы и ошибки — инлайн внутри GlassCard.
 */
export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  chatId,
  peerId,
  peerName,
  peerIdentityKeyHex,
  peerIdentityKeyECDSAHex,
  onClose,
  onVerifiedChange,
}) => {
  const [blocks, setBlocks] = useState<string[]>([]);
  const [rawNumber, setRawNumber] = useState<string>("");
  const [myUser, setMyUser] = useState<SafetyNumberUser | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"qr" | "scan" | "manual">("qr");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const keys = await ensureLocalIdentityKeys();
        if (cancelled) return;
        const me: SafetyNumberUser = {
          id: localStorage.getItem("current_user_id") || localStorage.getItem("my_user_id") || "local",
          identityKeyHex: keys.ikPub,
        };
        setMyUser(me);

        // CRP-011: Получаем реальный открытый identityKey собеседника из E2EE сессии или бандла
        let resolvedPeerKey = peerIdentityKeyHex;
        if (!resolvedPeerKey) {
          resolvedPeerKey = await getPeerIdentityKey(peerId);
        }

        const peer: SafetyNumberUser = {
          id: peerId,
          identityKeyHex: resolvedPeerKey || peerId,
          identityKeyECDSAHex: peerIdentityKeyECDSAHex || undefined,
        };
        const sn = await calculateSafetyNumber(me, peer);
        if (cancelled) return;
        setRawNumber(sn);
        setBlocks(formatSafetyNumber(sn).split(" "));

        const payload = generateQRPayload(me, sn);
        const url = await generateQRDataUrl(payload);
        if (!cancelled) setQrDataUrl(url);

        const verified = await storageManager.getVerifiedPeer(peerId);
        if (!cancelled) setIsVerified(Boolean(verified && verified.safety_number === sn));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось вычислить число безопасности");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, peerIdentityKeyHex, peerIdentityKeyECDSAHex]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Буфер обмена недоступен");
    }
  };

  const handleVerify = async (method: string) => {
    await storageManager.saveVerifiedPeer(peerId, rawNumber, method);
    await storageManager.setChatVerified(chatId, true, rawNumber);
    setIsVerified(true);
    onVerifiedChange?.(true);
  };

  const handleUnverify = async () => {
    await storageManager.deleteVerifiedPeer(peerId);
    await storageManager.setChatVerified(chatId, false, null);
    setIsVerified(false);
    onVerifiedChange?.(false);
  };

  const handleScanVerify = async () => {
    if (!myUser || !scanInput.trim()) return;
    try {
      const result = await verifyQRPayload(scanInput.trim(), myUser);
      if (result.valid) {
        setScanResult({ ok: true, message: "Ключи совпадают — контакт подтверждён" });
        await handleVerify("qr");
      } else {
        setScanResult({ ok: false, message: result.error || "Ключи НЕ совпадают — вероятен перехват (MITM)" });
      }
    } catch (e) {
      setScanResult({ ok: false, message: e instanceof Error ? e.message : "Некорректный QR-payload" });
    }
  };

  const handleManualVerify = async () => {
    const normalized = scanInput.replace(/\D/g, "");
    if (normalized === rawNumber) {
      setScanResult({ ok: true, message: "Числа совпадают — контакт подтверждён" });
      await handleVerify("manual");
    } else {
      setScanResult({ ok: false, message: "Числа НЕ совпадают — сверьте внимательно или используйте QR" });
    }
  };

  const statusBadge = useMemo(() => {
    if (isVerified) {
      return (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Контакт верифицирован
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
        <ShieldAlert className="w-4 h-4" />
        Контакт не верифицирован
      </div>
    );
  }, [isVerified]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-slate-100">Проверка безопасности</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{peerName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 max-h-[60dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              {statusBadge}
              {isVerified && (
                <button
                  type="button"
                  onClick={handleUnverify}
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Снять верификацию
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 mb-4 font-mono text-sm text-slate-200 tabular-nums select-all">
              {blocks.map((b, i) => (
                <div key={i} className="text-center bg-white/5 rounded-lg py-1.5 border border-white/5">{b}</div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Скопировано" : "Копировать число"}
              </button>
              {["qr", "scan", "manual"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m as typeof mode); setScanResult(null); }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] border transition-colors ${
                    mode === m
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {m === "qr" ? "Мой QR" : m === "scan" ? "Сверить QR" : "Вручную"}
                </button>
              ))}
            </div>

            {mode === "qr" && qrDataUrl && (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-4">
                <img src={qrDataUrl} alt="QR код верификации" className="w-44 h-44 rounded-xl bg-white p-2" />
                <p className="text-[11px] text-slate-400 text-center">
                  Покажите этот QR собеседнику — пусть отсканирует и сравнит
                </p>
              </div>
            )}

            {(mode === "scan" || mode === "manual") && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-300">
                  {mode === "scan" ? <ScanLine className="w-4 h-4 text-purple-400" /> : <ClipboardCheck className="w-4 h-4 text-purple-400" />}
                  {mode === "scan"
                    ? "Вставьте JSON из QR-кода собеседника (веб-режим без камеры)"
                    : "Введите 60 цифр собеседника для сверки"}
                </div>
                <textarea
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-purple-500/50"
                  placeholder={mode === "scan" ? '{"v":1,"app":"gossip",...}' : "00000 00000 ..."}
                />
                <button
                  type="button"
                  onClick={mode === "scan" ? handleScanVerify : handleManualVerify}
                  disabled={!scanInput.trim()}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  <BadgeCheck className="w-4 h-4" />
                  Сверить и подтвердить
                </button>
                {scanResult && (
                  <div
                    className={`mt-2 rounded-xl px-3 py-2 text-[11px] border ${
                      scanResult.ok
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}
                  >
                    {scanResult.message}
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              <QrCode className="w-3 h-3 inline mr-1 -mt-0.5" />
              Число детерминировано вычисляется из открытых ключей обеих сторон (5200 раундов SHA-512).
              Совпадение чисел на обоих устройствах гарантирует отсутствие перехватчика. Верификация
              локальна и не синхронизируется между устройствами.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
