import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFlagged } from "../api/client";
import type { Infraction, SupplierDetail } from "../types/supplier";

function mostRecentInfraction(supplier: SupplierDetail): Infraction | null {
  if (supplier.infractions.length === 0) return null;
  return [...supplier.infractions].sort(
    (a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime(),
  )[0];
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return { icon: "gavel", cls: "text-error" };
    case "moderate":
      return { icon: "report_problem", cls: "text-tertiary" };
    default:
      return { icon: "info", cls: "text-on-surface-variant" };
  }
}

function borderClass(severity: string) {
  return severity === "critical"
    ? "border-l-4 border-l-error"
    : "border-l-4 border-l-tertiary";
}

export default function AlertsFeed() {
  const [flagged, setFlagged] = useState<SupplierDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getFlagged();
        setFlagged(data.suppliers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background mb-1">
            Real-Time Risk Feed
          </h1>
          <p className="text-base text-on-surface-variant">
            Live monitoring for flagged suppliers.
          </p>
        </div>
        <div className="flex bg-surface-container px-3 py-2 rounded-lg border border-outline-variant items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">
            wifi_tethering
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Live
          </span>
        </div>
      </header>

      {error && (
        <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-4 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-outline text-center py-12">Loading alerts...</p>
      ) : flagged.length === 0 ? (
        <div className="bg-surface-container rounded-xl overflow-hidden relative h-48 group mb-6">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-surface to-transparent">
            <h4 className="text-xl font-semibold text-primary mb-1">All Clear</h4>
            <p className="text-sm text-on-surface-variant">
              No flagged suppliers requiring attention.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {flagged.map((supplier) => {
            const recent = mostRecentInfraction(supplier);
            const sev = recent?.severity ?? "non_critical";
            const { icon, cls } = severityIcon(sev);
            const severityLabel = sev === "critical"
              ? "CRITICAL"
              : sev === "moderate"
                ? "ALERT"
                : "INFO";
            const severityPill =
              sev === "critical"
                ? "bg-error-container text-on-error-container"
                : sev === "moderate"
                  ? "bg-tertiary-container text-on-tertiary-container"
                  : "bg-surface-variant text-on-surface-variant";

            return (
              <div
                key={supplier.id}
                className={`bg-surface-container-lowest rounded-xl ${borderClass(sev)} overflow-hidden`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        className="text-xl font-semibold text-on-background hover:text-primary transition-colors"
                      >
                        {supplier.legal_name}
                      </Link>
                      {recent && (
                        <div className="flex items-center mt-1 gap-2">
                          <span
                            className={`material-symbols-outlined text-lg ${cls}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {icon}
                          </span>
                          <span className={`text-sm font-medium uppercase tracking-wider ${cls}`}>
                            {recent.infraction_type}
                          </span>
                        </div>
                      )}
                      {!recent && (
                        <p className="text-sm text-on-surface-variant mt-1">
                          Flagged — no recent infractions on record
                        </p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded ${severityPill}`}>
                      <span className="material-symbols-outlined text-sm">
                        {sev === "critical" ? "warning" : "error_outline"}
                      </span>
                      <span className="text-xs font-bold uppercase">{severityLabel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                        Health Authority
                      </p>
                      <p className="text-sm text-on-surface">
                        {supplier.health_authority || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                        {recent ? "Infraction Date" : "Flagged Since"}
                      </p>
                      <p className="text-sm text-on-surface">
                        {recent
                          ? new Date(recent.reported_date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date(supplier.updated_at).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-outline-variant/15 pt-4">
                    <Link
                      to={`/suppliers/${supplier.id}`}
                      className="flex-1 btn-primary py-2 text-xs uppercase tracking-wider hover:opacity-90 transition-all text-center"
                    >
                      View Details
                    </Link>
                    <button
                      className="px-4 border border-outline text-on-surface-variant rounded-lg flex items-center justify-center hover:bg-surface-variant transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/suppliers/${supplier.id}`,
                        );
                      }}
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center pb-12">
        <p className="text-xs text-outline uppercase tracking-wider">
          {flagged.length} flagged supplier{flagged.length !== 1 ? "s" : ""} · Updates in real time
        </p>
      </div>
    </div>
  );
}
