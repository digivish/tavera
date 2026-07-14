import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSupplier, refreshScore } from "../api/client";
import InfractionTable from "../components/InfractionTable";
import RecidivismHeatmap from "../components/RecidivismHeatmap";
import ScoreGauge from "../components/ScoreGauge";
import StatusBadge from "../components/StatusBadge";
import type { SupplierDetail } from "../types/supplier";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getSupplier(id);
      setSupplier(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // The async loader updates state after the external API request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleRefreshScore = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      await refreshScore(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-outline">
        Loading...
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center">
        <p className="text-error mb-4">{error || "Supplier not found"}</p>
        <Link to="/suppliers" className="text-primary hover:underline text-sm">
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumbs & Actions */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-sm text-outline">
          <Link to="/suppliers" className="hover:text-primary transition-colors">
            Suppliers
          </Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-on-surface font-semibold">{supplier.legal_name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors text-sm"
            onClick={handleRefreshScore}
            disabled={refreshing}
          >
            <span className="material-symbols-outlined text-sm">
              {refreshing ? "sync" : "refresh"}
            </span>
            {refreshing ? "Refreshing..." : "Refresh Score"}
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Entity Resolution Hero Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container p-8 rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container/50" />
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-on-surface mb-1">
                {supplier.legal_name}
              </h1>
              <p className="text-on-surface-variant text-sm">
                {[
                  supplier.duns && `DUNS: ${supplier.duns}`,
                  supplier.facility_id && `Facility ID: ${supplier.facility_id}`,
                ]
                  .filter(Boolean)
                  .join(" | ") || "No identifiers on file"}
              </p>
            </div>
            <ScoreGauge score={supplier.unified_score} />
          </div>

          {/* Entity Resolution */}
          <div className="mt-8 pt-8 border-t border-outline-variant/15">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_tree</span>
              Legal Entity Resolution
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-container-low rounded-lg">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">
                  Registered Legal Entity
                </p>
                <p className="text-sm font-bold text-on-surface">
                  {supplier.registered_entity || supplier.legal_name}
                </p>
                {supplier.address && (
                  <p className="text-xs text-on-surface-variant mt-1">{supplier.address}</p>
                )}
              </div>
              <div className="p-4 bg-surface-container-low rounded-lg">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">
                  Trade Name (DBA)
                </p>
                <p className="text-sm font-bold text-on-surface">
                  {supplier.dba || "--"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Primary Operating Name</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-lg">
                <p className="text-[10px] font-bold text-outline uppercase mb-2">
                  Parent Organization
                </p>
                <p className="text-sm font-bold text-on-surface">
                  {supplier.parent_organization || "--"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Parent Entity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar card: status + metadata */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container p-8 rounded-xl">
          <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Status &amp; Metadata
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-outline uppercase tracking-wider">Status</span>
              <StatusBadge status={supplier.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-outline uppercase tracking-wider">Health Authority</span>
              <span className="text-sm font-semibold text-on-surface">
                {supplier.health_authority || "Unassigned"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-outline uppercase tracking-wider">Data Sources</span>
              <span className="text-sm font-semibold text-on-surface">
                {supplier.score_sources_available}/{supplier.score_sources_total} available
              </span>
            </div>
            {supplier.score_last_updated && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline uppercase tracking-wider">Last Scored</span>
                <span className="text-sm font-semibold text-on-surface">
                  {new Date(supplier.score_last_updated).toLocaleDateString()}
                </span>
              </div>
            )}
            {supplier.orgbook_match_confidence !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline uppercase tracking-wider">Match Confidence</span>
                <span className="text-sm font-semibold text-on-surface">
                  {Math.round(supplier.orgbook_match_confidence * 100)}%
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-outline uppercase tracking-wider">Added</span>
              <span className="text-sm font-semibold text-on-surface">
                {new Date(supplier.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Recidivism Heatmap */}
        <RecidivismHeatmap infractions={supplier.infractions} />

        {/* Infractions Table */}
        <InfractionTable infractions={supplier.infractions} />
      </div>
    </div>
  );
}
