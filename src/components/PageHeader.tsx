import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  back = true,
  right,
}: {
  title: string;
  eyebrow?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {back ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="-ml-2 mt-1 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-edge/40 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="field-label">{eyebrow}</p>
          ) : null}
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
        </div>
      </div>
      {right}
    </div>
  );
}
