import type { Infraction } from "../types/supplier";

interface Props {
  infractions: Infraction[];
}

export default function RecidivismHeatmap({ infractions }: Props) {
  const now = new Date();
  const months: { label: string; count: number }[] = [];

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      count: 0,
    });
  }

  for (const inf of infractions) {
    const rd = new Date(inf.reported_date);
    const monthIndex = (now.getFullYear() - rd.getFullYear()) * 12 + (now.getMonth() - rd.getMonth());
    const idx = 23 - monthIndex;
    if (idx >= 0 && idx < 24) {
      months[idx].count += 1;
    }
  }

  function cellClass(count: number): string {
    if (count === 0) return "bg-surface-container-highest border border-outline-variant/30";
    if (count <= 2) return "bg-tertiary/60";
    return "bg-error";
  }

  const totalInfractions = infractions.length;

  return (
    <div className="col-span-12 bg-surface-container p-8 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">
            Violation Recidivism (24 Months)
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Historical frequency of compliance infractions
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-surface-container-highest border border-outline-variant rounded-sm" /> 0 Cases
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-tertiary/60 rounded-sm" /> 1-2 Cases
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-error rounded-sm" /> 3+ Cases
          </div>
        </div>
      </div>

      {totalInfractions === 0 ? (
        <p className="text-sm text-outline py-8 text-center">
          No infractions recorded in the past 24 months.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-24 gap-1 mb-4" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
            {months.map((m, i) => (
              <div
                key={i}
                className={`h-10 rounded-sm ${cellClass(m.count)}`}
                title={`${m.label}: ${m.count} infraction${m.count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-outline font-bold uppercase tracking-widest px-1">
            <span>{months[0]?.label}</span>
            <span>{months[11]?.label}</span>
            <span>{months[23]?.label}</span>
          </div>
        </>
      )}
    </div>
  );
}
