import React from "react";
import { UserRound, Phone, Download, MessageCircle } from "lucide-react";

export interface ContactData {
  displayName: string;
  phoneNumbers: string[];
  emails?: string[];
  organization?: string;
}

/** R4 (M4.1): генератор vCard 4.0 (RFC 6350), строгие CRLF-разделители. */
export function generateVCard4(contact: ContactData): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `FN:${esc(contact.displayName)}`,
  ];
  if (contact.organization) lines.push(`ORG:${esc(contact.organization)}`);
  for (const phone of contact.phoneNumbers) {
    lines.push(`TEL;TYPE=CELL:${esc(phone)}`);
  }
  for (const email of contact.emails || []) {
    lines.push(`EMAIL;TYPE=HOME:${esc(email)}`);
  }
  lines.push(`UID:urn:uuid:gossip-${Date.now()}`, "END:VCARD");
  return lines.join("\r\n");
}

/**
 * R4 (M4.1): карточка контакта. Скачивание .vcf через Blob URL — без внешних
 * зависимостей; звонок tel:; переход в чат (если найден пользователь).
 */
export const ContactMessage: React.FC<{
  contact: ContactData;
  onStartChat?: (displayName: string) => void;
}> = ({ contact, onStartChat }) => {
  const initials = contact.displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleDownload = () => {
    const vcf = generateVCard4(contact);
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contact.displayName.replace(/[^\p{L}\p{N} _-]/gu, "") || "contact"}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const primaryPhone = contact.phoneNumbers[0];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 w-full max-w-[280px] flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/40 to-indigo-500/40 border border-purple-400/30 flex items-center justify-center text-sm font-bold text-purple-200 flex-shrink-0">
        {initials || <UserRound className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-100 truncate">{contact.displayName}</div>
        {contact.organization && (
          <div className="text-[10px] text-slate-400 truncate">{contact.organization}</div>
        )}
        {primaryPhone && (
          <div className="text-[11px] text-slate-300 font-mono mt-0.5">{primaryPhone}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {primaryPhone && (
          <a
            href={`tel:${primaryPhone.replace(/[^\d+]/g, "")}`}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-colors"
            title="Позвонить"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        {onStartChat && (
          <button
            type="button"
            onClick={() => onStartChat(contact.displayName)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-colors"
            title="Написать"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          title="Сохранить .vcf"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
