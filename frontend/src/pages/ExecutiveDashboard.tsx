import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecentInfractions, listSuppliers, type RecentInfraction } from "../api/client";

interface DashboardStats {
  total: number;
  avgScore: number | null;
  criticalCount: number;
  compliantCount: number;
  flaggedCount: number;
  sourcesAvailable: number;
  sourcesTotal: number;
}

const statusBadge: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending_review: {
    bg: "bg-tertiary/10",
    text: "text-tertiary",
    dot: "bg-tertiary",
    label: "Review Pending",
  },
  resolved: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    dot: "bg-secondary",
    label: "Resolved",
  },
  active: {
    bg: "bg-error/10",
    text: "text-error",
    dot: "bg-error animate-pulse",
    label: "CRITICAL",
  },
};

const sourceTag: Record<string, string> = {
  "Fraser Health": "bg-red-500/10 text-red-400 border border-red-500/20",
  VCH: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    avgScore: null,
    criticalCount: 0,
    compliantCount: 0,
    flaggedCount: 0,
    sourcesAvailable: 0,
    sourcesTotal: 0,
  });
  const [recentInfractions, setRecentInfractions] = useState<RecentInfraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [supplierData, infractionData] = await Promise.all([
          listSuppliers({ page_size: 100 }),
          getRecentInfractions(10),
        ]);

        const suppliers = supplierData.suppliers;
        const scores = suppliers
          .map((s) => s.unified_score)
          .filter((s): s is number => s !== null);

        setStats({
          total: supplierData.total,
          avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          criticalCount: suppliers.filter((s) => s.status === "flagged").length,
          compliantCount: suppliers.filter((s) => s.status === "active").length,
          flaggedCount: suppliers.filter((s) => s.status === "flagged" || s.status === "monitored").length,
          sourcesAvailable: suppliers.reduce((a, s) => a + s.score_sources_available, 0),
          sourcesTotal: suppliers.reduce((a, s) => a + s.score_sources_total, 0),
        });

        setRecentInfractions(infractionData);
      } catch {
        // Stats and infractions will stay at defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const gaugeScore = stats.avgScore ?? 0;
  const gaugeOffset = 552.92 - (gaugeScore / 100) * 552.92;
  const riskLabel =
    stats.avgScore === null
      ? "NO DATA"
      : stats.avgScore >= 85
        ? "HEALTHY"
        : stats.avgScore >= 65
          ? "MODERATE"
          : "AT RISK";
  const riskLevel =
    stats.avgScore === null
      ? "nodata"
      : stats.avgScore >= 85
        ? "healthy"
        : stats.avgScore >= 65
          ? "moderate"
          : "atrisk";
  const riskColors: Record<string, string> = {
    healthy: "secondary",
    moderate: "tertiary",
    atrisk: "error",
    nodata: "outline-variant",
  };
  const gaugeColor = riskColors[riskLevel];
  const complianceColor = stats.criticalCount === 0 ? "secondary" : "error";
  const riskPill =
    stats.avgScore === null
      ? "bg-surface-variant/20 text-outline border-outline-variant"
      : stats.avgScore >= 85
        ? "bg-secondary/10 text-secondary border border-secondary/20"
        : stats.avgScore >= 65
          ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
          : "bg-error/10 text-error border border-error/20";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-on-background mb-2">
          The Bistro Group
        </h1>
        <p className="text-lg text-outline font-medium">
          Intelligent Food Safety &amp; Supplier Resilience
        </p>
      </div>

      {loading ? (
        <p className="text-outline text-center py-12">Loading dashboard...</p>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Hero: Portfolio Risk Gauge */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container rounded-xl p-8 flex flex-col relative overflow-hidden">
            <div className={`absolute left-0 top-0 h-full w-1 bg-${gaugeColor}`} />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-on-surface mb-1">
                  Total Portfolio Risk
                </h2>
                <p className="text-sm text-outline">
                  Aggregate health index across {stats.total} managed suppliers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${riskPill}`}
                >
                  {riskLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-12 py-4">
              {/* Gauge */}
              <div className="relative flex items-center justify-center w-48 h-48 shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    className="text-surface-variant"
                    cx="96"
                    cy="96"
                    fill="transparent"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <circle
                    className={`text-${gaugeColor} transition-all duration-1000`}
                    cx="96"
                    cy="96"
                    fill="transparent"
                    r="88"
                    stroke="currentColor"
                    strokeDasharray="552.92"
                    strokeDashoffset={gaugeOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold text-on-surface">
                    {stats.avgScore ?? "--"}
                  </span>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">
                    Unified Score
                  </span>
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                <div className="p-5 bg-surface-container-high rounded-xl">
                  <p className="text-[10px] text-outline uppercase font-bold mb-2">
                    Critical Flags
                  </p>
                  <p className="text-2xl font-bold text-error">
                    {String(stats.criticalCount).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-outline mt-2 font-medium">
                    Requiring action
                  </p>
                </div>
                <div className="p-5 bg-surface-container-high rounded-xl">
                  <p className="text-[10px] text-outline uppercase font-bold mb-2">
                    Compliant
                  </p>
                  <p className="text-2xl font-bold text-on-surface">
                    {String(stats.compliantCount).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-secondary mt-2 flex items-center font-bold">
                    <span className="material-symbols-outlined text-[14px] mr-1">
                      verified
                    </span>
                    Active suppliers
                  </p>
                </div>
                <div className="p-5 bg-surface-container-high rounded-xl">
                  <p className="text-[10px] text-outline uppercase font-bold mb-2">
                    Data Coverage
                  </p>
                  <p className="text-2xl font-bold text-on-surface">
                    {stats.total > 0
                      ? `${Math.round((stats.sourcesAvailable / Math.max(1, stats.sourcesTotal)) * 100)}%`
                      : "--"}
                  </p>
                  <p className="text-[10px] text-outline mt-2 font-medium">
                    {stats.sourcesAvailable}/{stats.sourcesTotal} source slots filled
                  </p>
                </div>
                <div className="p-5 bg-surface-container-high rounded-xl">
                  <p className="text-[10px] text-outline uppercase font-bold mb-2">
                    Monitoring
                  </p>
                  <p className="text-2xl font-bold text-tertiary">
                    {stats.flaggedCount > 0 ? stats.flaggedCount : "All Clear"}
                  </p>
                  <p className="text-[10px] text-outline mt-2 font-medium">
                    Suppliers under watch
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Card */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container rounded-xl p-8 flex flex-col relative">
            <div className={`absolute left-0 top-0 h-full w-1 bg-${complianceColor}`} />
            <div className="flex items-center gap-3 mb-8">
              <span
                className={`material-symbols-outlined text-${complianceColor} text-2xl`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <h3 className="text-xl font-bold text-on-surface">Compliance Status</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className={`w-16 h-16 bg-${complianceColor}/10 rounded-full flex items-center justify-center mb-4 border border-${complianceColor}/20`}>
                <span className={`material-symbols-outlined text-3xl text-${complianceColor}`}>
                  check_circle
                </span>
              </div>
              <p className={`text-xl font-bold text-${complianceColor} mb-2`}>
                {stats.criticalCount === 0 ? "Audit-Ready" : "Action Needed"}
              </p>
              <p className="text-sm text-outline mb-8 leading-relaxed">
                {stats.criticalCount === 0
                  ? "Your documentation and supplier trails meet all regulatory standards for the current period."
                  : `${stats.criticalCount} supplier${stats.criticalCount > 1 ? "s" : ""} require immediate attention.`}
              </p>
              <div className="w-full space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-outline border-b border-outline-variant/15 pb-3">
                  <span className="uppercase tracking-wider">Total Suppliers</span>
                  <span className="text-on-surface">{stats.total}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-outline border-b border-outline-variant/15 pb-3">
                  <span className="uppercase tracking-wider">Avg. Resilience</span>
                  <span className="text-on-surface">
                    {stats.avgScore !== null ? `${stats.avgScore}%` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-outline border-b border-outline-variant/15 pb-3">
                  <span className="uppercase tracking-wider">Flagged</span>
                  <span className={stats.flaggedCount > 0 ? "text-error" : "text-secondary"}>
                    {stats.flaggedCount}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/suppliers"
              className="mt-8 w-full py-3.5 btn-primary hover:opacity-90 transition-opacity uppercase tracking-widest text-xs text-center"
            >
              View All Suppliers
            </Link>
          </div>

          {/* Critical Alerts Feed */}
          <div className="col-span-12 bg-surface-container rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-error text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Recent Infractions
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                  Live Monitoring
                </span>
              </div>
            </div>

            {recentInfractions.length === 0 ? (
              <p className="text-sm text-outline py-8 text-center">
                No infractions recorded across any supplier.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-outline uppercase tracking-widest border-b border-outline-variant/15">
                      <th className="pb-5 font-bold">Source</th>
                      <th className="pb-5 font-bold">Supplier</th>
                      <th className="pb-5 font-bold">Infraction Details</th>
                      <th className="pb-5 font-bold">Date Reported</th>
                      <th className="pb-5 font-bold">Status</th>
                      <th className="pb-5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {recentInfractions.map((inf) => {
                      const src = sourceTag[inf.source] ?? sourceTag.VCH;
                      const st = statusBadge[inf.status] ?? statusBadge.pending_review;
                      return (
                        <tr
                          key={inf.id}
                          className="group hover:bg-surface-variant/30 transition-colors"
                        >
                          <td className="py-5">
                            <span
                              className={`px-2.5 py-1 text-[10px] font-extrabold rounded ${src}`}
                            >
                              {inf.source.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-5">
                            <p className="font-bold text-on-surface">{inf.supplier_name}</p>
                            {inf.health_authority && (
                              <p className="text-xs text-outline">{inf.health_authority}</p>
                            )}
                          </td>
                          <td className="py-5 max-w-xs">
                            <p className="text-sm font-medium text-on-surface-variant truncate">
                              {[inf.infraction_type, inf.description]
                                .filter(Boolean)
                                .join(": ") || "--"}
                            </p>
                          </td>
                          <td className="py-5 text-sm text-outline font-medium">
                            {new Date(inf.reported_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-5">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${st.bg} ${st.text} border`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-2`} />
                              {st.label}
                            </span>
                          </td>
                          <td className="py-5 text-right">
                            <Link
                              to={`/suppliers/${inf.id.split("-")[0]}`}
                              className="text-primary font-bold text-xs hover:text-on-surface transition-colors uppercase tracking-wider"
                            >
                              View Supplier
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hero Image */}
          <div className="col-span-12 rounded-xl overflow-hidden h-72 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container/80 via-primary-container/20 to-transparent" />
            <div className="absolute bottom-8 left-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg backdrop-blur-sm border border-primary/30">
                  <span className="material-symbols-outlined text-primary text-xl">hub</span>
                </div>
                <p className="text-on-surface font-bold text-2xl">
                  Real-Time Risk Intelligence
                </p>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">
                Monitoring {stats.total} suppliers across British Columbia health authorities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
