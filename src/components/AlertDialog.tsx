import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelLabel?: string;
  actionLabel: string;
  onAction: () => void;
  destructive?: boolean;
  busy?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  actionLabel,
  onAction,
  destructive,
  busy,
}: AlertDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === backdropRef.current) onOpenChange(false); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-edge bg-surface px-5 py-5 space-y-4 shadow-lift"
        style={{ animation: "alert-dialog-in 0.32s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="space-y-1">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="text-[12px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onAction}
            disabled={busy}
            className={cn(destructive ? "btn-danger" : "btn-primary")}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
