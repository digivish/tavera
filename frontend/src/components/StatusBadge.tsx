import type { SupplierStatus } from "../types/supplier";

const styles: Record<
  SupplierStatus,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  active: {
    bg: "bg-secondary-container/30",
    text: "text-secondary",
    border: "border-secondary/20",
    dot: "bg-secondary",
    label: "Active",
  },
  flagged: {
    bg: "bg-error-container/20",
    text: "text-error",
    border: "border-error/20",
    dot: "bg-error",
    label: "Critical Flag",
  },
  monitored: {
    bg: "bg-tertiary-container/20",
    text: "text-tertiary",
    border: "border-tertiary/20",
    dot: "bg-tertiary",
    label: "Monitored",
  },
  imported: {
    bg: "bg-surface-variant/30",
    text: "text-on-surface-variant",
    border: "border-outline-variant",
    dot: "bg-outline",
    label: "Imported",
  },
  mapped: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    dot: "bg-primary",
    label: "Mapped",
  },
  archived: {
    bg: "bg-surface-variant/20",
    text: "text-outline",
    border: "border-outline-variant",
    dot: "bg-outline",
    label: "Archived",
  },
};

interface Props {
  status: SupplierStatus;
}

export default function StatusBadge({ status }: Props) {
  const s = styles[status] ?? styles.imported;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
