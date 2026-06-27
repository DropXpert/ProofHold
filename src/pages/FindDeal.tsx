import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";

export default function FindDeal() {
  const [id, setId] = useState("");
  const navigate = useNavigate();

  function open(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = id.trim();
    if (!cleaned) return;
    navigate(`/deal/${cleaned}/status`);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Open deal" title="Find an existing deal" />

      <form onSubmit={open} className="card space-y-4 px-5 py-5">
        <Field
          label="Deal ID"
          hint="Looks like PH-XXXX-XXXX. Paste a link or just the ID."
          required
        >
          <input
            className="input font-mono"
            placeholder="PH-XXXX-XXXX"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            autoFocus
          />
        </Field>
        <button type="submit" className="btn-primary w-full">
          <Search className="h-4 w-4" />
          Open deal
        </button>
      </form>
    </div>
  );
}
