import { Hash } from "lucide-react";

export function TxHashLink({ hash, label }: { hash: string; label?: string }) {
  const short = `${hash.slice(0, 6)}…${hash.slice(-4)}`;
  return (
    <span
      title={hash}
      className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-bg px-2 py-0.5 font-mono text-[12px] text-ink"
    >
      <Hash className="h-3 w-3 text-muted" />
      {label ? <span className="font-sans text-muted">{label}</span> : null}
      <span>{short}</span>
    </span>
  );
}
