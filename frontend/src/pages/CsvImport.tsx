import { useState } from "react";
import { Link } from "react-router-dom";
import { importCsv } from "../api/client";

interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}

const TEMPLATE_CSV = "legal_name,dba,duns,facility_id\nAcme Produce Ltd,Acme Fresh,123456789,FAC-001\nPacific Seafood Inc,,987654321,FAC-002";

export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError("");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const data = await importCsv(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tavera_supplier_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-outline mb-2">
          <Link to="/suppliers" className="hover:text-primary transition-colors">
            Suppliers
          </Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-on-surface font-semibold">Import CSV</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-on-background mb-2">
          Import Suppliers
        </h1>
        <p className="text-base text-outline">
          Upload a CSV file to onboard new suppliers into the intelligence platform.
        </p>
      </div>

      {/* Format guide */}
      <div className="bg-surface-container rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">description</span>
          Expected Columns
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant/15">
                <th className="pb-2 pr-4">Column</th>
                <th className="pb-2 pr-4">Required</th>
                <th className="pb-2">Example</th>
              </tr>
            </thead>
            <tbody className="text-on-surface-variant">
              <tr className="border-b border-outline-variant/15/50">
                <td className="py-2 pr-4 font-mono text-xs text-on-surface">legal_name</td>
                <td className="py-2 pr-4">
                  <span className="text-error text-[10px] font-bold uppercase">Required</span>
                </td>
                <td className="py-2 text-xs">Acme Produce Ltd</td>
              </tr>
              <tr className="border-b border-outline-variant/15/50">
                <td className="py-2 pr-4 font-mono text-xs text-on-surface">dba</td>
                <td className="py-2 pr-4">
                  <span className="text-outline text-[10px] font-bold uppercase">Optional</span>
                </td>
                <td className="py-2 text-xs">Acme Fresh</td>
              </tr>
              <tr className="border-b border-outline-variant/15/50">
                <td className="py-2 pr-4 font-mono text-xs text-on-surface">duns</td>
                <td className="py-2 pr-4">
                  <span className="text-outline text-[10px] font-bold uppercase">Optional</span>
                </td>
                <td className="py-2 text-xs">123456789</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs text-on-surface">facility_id</td>
                <td className="py-2 pr-4">
                  <span className="text-outline text-[10px] font-bold uppercase">Optional</span>
                </td>
                <td className="py-2 text-xs">FAC-001</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          onClick={downloadTemplate}
          className="mt-4 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download template CSV
        </button>
      </div>

      {/* Upload zone */}
      {!result ? (
        <>
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              file
                ? "border-primary bg-primary-container/10"
                : "border-outline-variant bg-surface-container hover:border-outline"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <span className="material-symbols-outlined text-4xl text-outline mb-4 block">
                {file ? "description" : "cloud_upload"}
              </span>
              {file ? (
                <div>
                  <p className="text-lg font-semibold text-on-surface mb-1">{file.name}</p>
                  <p className="text-sm text-outline">
                    {(file.size / 1024).toFixed(1)} KB &middot; click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-on-surface mb-1">
                    Drop your CSV here or click to browse
                  </p>
                  <p className="text-sm text-outline">Max 10MB &middot; up to 5,000 rows</p>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="mt-4 bg-error-container/20 border border-error/30 text-error rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleImport}
              disabled={!file || uploading}
              className="flex-1 py-3 btn-primary hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                  Importing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">upload</span>
                  Import Suppliers
                </>
              )}
            </button>
            <Link
              to="/suppliers"
              className="px-6 py-3 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors font-medium text-sm flex items-center"
            >
              Cancel
            </Link>
          </div>
        </>
      ) : (
        /* Results */
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-xl p-6 text-center">
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                Imported
              </p>
              <p className="text-3xl font-bold text-secondary">{result.imported}</p>
            </div>
            <div className="bg-surface-container rounded-xl p-6 text-center">
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                Failed
              </p>
              <p className={`text-3xl font-bold ${result.failed > 0 ? "text-error" : "text-outline"}`}>
                {result.failed}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-surface-container rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/15">
                <h3 className="text-sm font-semibold text-on-surface">Row Errors</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-outline uppercase tracking-wider border-b border-outline-variant/15 bg-surface-container-low">
                      <th className="px-6 py-3">Row</th>
                      <th className="px-6 py-3">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-6 py-3 font-mono text-xs text-on-surface">{e.row}</td>
                        <td className="px-6 py-3 text-xs text-error">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Link
              to="/suppliers"
              className="flex-1 py-3 btn-primary hover:opacity-90 transition-all text-center"
            >
              View Supplier Directory
            </Link>
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                setError("");
              }}
              className="px-6 py-3 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors font-medium text-sm"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
