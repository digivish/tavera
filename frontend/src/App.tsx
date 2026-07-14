import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ApiKeySetup from "./pages/ApiKeySetup";
import SupplierDirectory from "./pages/SupplierDirectory";
import SupplierDetail from "./pages/SupplierDetail";
import AlertsFeed from "./pages/AlertsFeed";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import CsvImport from "./pages/CsvImport";

function RequireApiKey({ children }: { children: React.ReactNode }) {
  const key = localStorage.getItem("tavera_api_key");
  if (!key) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<ApiKeySetup />} />
        <Route element={<RequireApiKey><Layout /></RequireApiKey>}>
          <Route path="/suppliers" element={<SupplierDirectory />} />
          <Route path="/suppliers/import" element={<CsvImport />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/alerts" element={<AlertsFeed />} />
          <Route path="/audits" element={<Placeholder title="Audit Reports" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Route>
        <Route path="*" element={<Navigate to="/suppliers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-5xl font-bold tracking-tight text-on-background mb-4">
        {title}
      </h1>
      <p className="text-outline">Coming soon.</p>
    </div>
  );
}
