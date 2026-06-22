import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/format";

const LABEL: Record<string, string> = {
  guard_passed: "Guard Passed",
  blocked: "Blocked",
  blocked_no_capital: "No Capital",
  executed: "Executed",
  proposed: "Proposed",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{LABEL[status] ?? status}</Badge>;
}

export function ActionBadge({ action }: { action: string }) {
  const a = action.toLowerCase();
  const tone = a === "buy" ? "pos" : a === "avoid" ? "neg" : "warn";
  return <Badge tone={tone}>{action}</Badge>;
}
