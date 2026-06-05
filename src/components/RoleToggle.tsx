import { useDealStore } from "@/store/dealStore";
import { cn } from "@/lib/cn";

export function RoleToggle() {
  const role = useDealStore((s) => s.viewerRole);
  const setRole = useDealStore((s) => s.setViewerRole);

  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-edge bg-bg p-1 text-[12px]">
      <Option
        active={role === "seller"}
        onClick={() => setRole("seller")}
        label="View as seller"
      />
      <Option
        active={role === "buyer"}
        onClick={() => setRole("buyer")}
        label="View as buyer"
      />
    </div>
  );
}

function Option({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-pill px-3 py-1 font-medium transition",
        active ? "bg-surface text-ink shadow-receipt" : "text-muted"
      )}
    >
      {label}
    </button>
  );
}
