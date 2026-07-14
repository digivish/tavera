import { useState } from "react";
import type { Infraction } from "../types/supplier";

interface Props {
  infractions: Infraction[];
}

const PAGE_SIZE = 5;

const severityStyle: Record<string, string> = {
  critical: "bg-error/20 text-error border border-error/30",
  moderate: "bg-tertiary/20 text-tertiary border border-tertiary/30",
  non_critical: "bg-surface-variant text-on-surface-variant border border-outline-variant",
};

const statusIcon: Record<string, { icon: string; cls: string }> = {
  resolved: { icon: "check_circle", cls: "text-secondary font-semibold" },
  pending_review: { icon: "schedule", cls: "text-on-surface-variant font-semibold" },
  active: { icon: "error_outline", cls: "text-error font-semibold" },
};

export default function InfractionTable({ infractions }: Props) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...infractions].sort(
    (a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime(),
  );

  const displayed = showAll ? sorted : sorted.slice(0, PAGE_SIZE);

  return (
    <div className="col-span-12 bg-surface-container rounded-xl ghost-border overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container-highest/50">
        <h3 className="text-lg font-semibold text-on-surface">Historical Infractions</h3>
        <span className="text-xs font-semibold text-on-surface-variant">
          Total Recorded: {infractions.length}
        </span>
      </div>

      {infractions.length === 0 ? (
        <p className="text-sm text-outline py-12 text-center">
          No infractions on record for this supplier.
        </p>
      ) : (
        <>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/15">
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Infraction Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Action Taken</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {displayed.map((inf) => {
                const st = statusIcon[inf.status] ?? statusIcon.pending_review;
                return (
                  <tr
                    key={inf.id}
                    className="hover:bg-surface-variant/30 border-b border-outline-variant/15/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {new Date(inf.reported_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {inf.infraction_type}
                      {inf.description && (
                        <span className="block text-xs text-outline mt-0.5">
                          {inf.description}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{inf.source}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${severityStyle[inf.severity] ?? severityStyle.non_critical}`}
                      >
                        {inf.severity.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {inf.action_taken || "--"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-xs ${st.cls}`}>
                        <span
                          className="material-symbols-outlined text-sm"
                          style={
                            inf.status === "resolved"
                              ? { fontVariationSettings: "'FILL' 1" }
                              : undefined
                          }
                        >
                          {st.icon}
                        </span>
                        {inf.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!showAll && infractions.length > PAGE_SIZE && (
            <div className="p-4 bg-surface-container-highest text-center">
              <button
                className="text-sm font-semibold text-primary hover:underline"
                onClick={() => setShowAll(true)}
              >
                View All {infractions.length} Historical Infractions
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
