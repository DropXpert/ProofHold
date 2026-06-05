import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

export function WalletAddressBadge({
  address,
  label,
  className,
}: {
  address: string;
  label?: string;
  className?: string;
}) {
  const short = shortenAddress(address);
  return (
    <span
      title={address}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-edge bg-bg px-2.5 py-1 font-mono text-[12.5px] text-ink",
        className
      )}
    >
      <Wallet className="h-3.5 w-3.5 text-muted" />
      {label ? (
        <span className="font-sans text-muted">{label}</span>
      ) : null}
      <span>{short}</span>
    </span>
  );
}

function shortenAddress(addr: string) {
  const cleaned = addr.replace(/\s+/g, "");
  if (cleaned.length <= 14) return addr;
  return `${cleaned.slice(0, 6)}…${cleaned.slice(-4)}`;
}
