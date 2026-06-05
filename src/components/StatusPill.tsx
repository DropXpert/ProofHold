import { statusLabel, statusTone } from "@/lib/stateMachine";
import type { DealStatus } from "@/types/deal";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Hourglass,
  XCircle,
  CircleDot,
} from "lucide-react";

const toneClasses: Record<string, string> = {
  neutral: "border-edge bg-bg text-muted",
  info: "border-edge bg-accent-soft text-accent-ink",
  warn: "border-warning/30 bg-warning/10 text-warning",
  success: "border-accent/30 bg-accent-soft text-accent-ink",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

function StatusIcon({ status }: { status: DealStatus }) {
  const cls = "h-3.5 w-3.5";
  switch (status) {
    case "released":
    case "received_by_buyer":
      return <CheckCircle2 className={cls} />;
    case "funds_held":
    case "delivered_by_seller":
      return <ShieldCheck className={cls} />;
    case "awaiting_payment":
      return <Hourglass className={cls} />;
    case "query_open":
    case "proof_window":
      return <ShieldAlert className={cls} />;
    case "under_admin_review":
      return <Clock className={cls} />;
    case "refunded":
    case "partially_refunded":
      return <CircleDot className={cls} />;
    case "cancelled":
    case "expired":
      return <XCircle className={cls} />;
    default:
      return <CircleDot className={cls} />;
  }
}

export function StatusPill({
  status,
  className,
}: {
  status: DealStatus;
  className?: string;
}) {
  const tone = statusTone[status];
  return (
    <span className={cn("pill", toneClasses[tone], className)}>
      <StatusIcon status={status} />
      {statusLabel[status]}
    </span>
  );
}
