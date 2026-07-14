import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSuppliers, type ListParams } from "../api/client";
import ScoreBar from "../components/ScoreBar";
import StatusBadge from "../components/StatusBadge";
import type { Supplier } from "../types/supplier";

export default function SupplierDirectory() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: ListParams = {
        page,
        page_size: pageSize,
        sort_by: "created_at",
        sort_order: "desc",
      };
      if (search.trim()) params.search = search.trim();
      if (riskFilter) params.risk_level = riskFilter;

      const data = await listSuppliers(params);
      setSuppliers(data.suppliers);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, riskFilter]);

  useEffect(() => {
    // The async loader updates state after the external API request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  // Summary stats (server provides total; flagged count via separate filtered query)
  const [flaggedCount, setFlaggedCount] = useState(0);
  useEffect(() => {
    listSuppliers({ risk_level: "high", page_size: 1 })
      .then((d) => setFlaggedCount(d.total))
      .catch(() => {});
  }, []);

  // Average score from loaded suppliers
  const scores = suppliers
    .map((s) => s.unified_score)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background mb-1">
            Supplier Intelligence
          </h1>
          <p className="text-base text-outline">
            Comprehensive directory of British Columbia food suppliers and risk
            profiles.
          </p>
        </div>
        <Link
          to="/suppliers/import"
          className="flex items-center gap-2 px-4 py-2 btn-primary text-sm hover:opacity-90 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Onboard Supplier
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-surface-container p-8 rounded-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-2">
            Total Suppliers
          </p>
          <p className="text-2xl font-bold text-primary">{total.toLocaleString()}</p>
        </div>
        <div className="md:col-span-1 bg-surface-container p-8 rounded-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-2">
            High Risk Flagged
          </p>
          <p className="text-2xl font-bold text-error">{flaggedCount}</p>
        </div>
        <div className="md:col-span-2 bg-primary-container p-8 rounded-xl text-on-primary-container flex justify-between items-center overflow-hidden relative">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-primary-container/70 mb-2">
              Average Resilience Score
            </p>
            <p className="text-2xl font-bold text-on-primary-container">
              {avgScore !== null ? `${avgScore}%` : "N/A"}
            </p>
            <p className="text-sm text-on-primary-container/80 mt-2">
              {avgScore !== null && avgScore >= 80
                ? "Regional safety standards are currently optimal."
                : "Based on available supplier data."}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container rounded-xl ghost-border overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-outline-variant bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary w-56"
              />
            </div>
            <select
              className="px-4 py-2 border border-outline-variant bg-surface-container-low rounded-lg text-sm text-on-surface"
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="high">High Risk</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <span className="text-sm text-outline shrink-0">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total.toLocaleString()}{" "}
            results
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/15 text-xs font-semibold uppercase tracking-wider text-outline bg-surface-container-low">
                <th className="px-6 py-4">Supplier Legal Name</th>
                <th className="px-6 py-4">Health Authority</th>
                <th className="px-6 py-4 text-center w-56">
                  Unified Supplier Score
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-outline">
                    Loading...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-outline">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-surface-variant hover:bg-surface-variant/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          to={`/suppliers/${s.id}`}
                          className="font-semibold text-on-surface hover:text-primary transition-colors"
                        >
                          {s.legal_name}
                        </Link>
                        {s.dba && (
                          <span className="text-xs text-outline italic">
                            {s.dba}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                        {s.health_authority || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBar score={s.unified_score} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/suppliers/${s.id}`}
                        className="text-outline hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          more_vert
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <footer className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-t border-outline-variant/15 bg-surface-container-low rounded-xl">
          <div className="flex items-center gap-4 text-sm text-outline">
            <span>Rows per page:</span>
            <select
              className="bg-surface-container border border-outline-variant rounded px-2 py-1 text-on-surface"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-4">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
              {total.toLocaleString()} results
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2 md:mt-0">
            <button
              className="p-2 text-outline hover:text-primary transition-colors disabled:opacity-30"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              <span className="material-symbols-outlined">first_page</span>
            </button>
            <button
              className="p-2 text-outline hover:text-primary transition-colors disabled:opacity-30"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                      ? i + 1
                      : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    className={`w-8 h-8 flex items-center justify-center rounded font-medium transition-colors ${
                      pageNum === page
                        ? "bg-primary text-on-primary"
                        : "hover:bg-surface-variant text-on-surface"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="px-2 text-outline">...</span>
                  <button
                    className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded text-on-surface"
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              className="p-2 text-outline hover:text-primary transition-colors disabled:opacity-30"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <button
              className="p-2 text-outline hover:text-primary transition-colors disabled:opacity-30"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              <span className="material-symbols-outlined">last_page</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
