import React from "react";
import { CheckCircle2, Radio } from "lucide-react";

function StatusBadge({ status, resolved }) {
  const isCompleted =
    status === "Completed" ||
    status === "Resolved" ||
    resolved === 1 ||
    resolved === true;

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
        <CheckCircle2 size={13} className="text-emerald-400" />
        Resolved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm animate-pulse">
      <Radio size={13} className="text-amber-400 animate-spin" />
      Active
    </span>
  );
}

export default React.memo(StatusBadge);
