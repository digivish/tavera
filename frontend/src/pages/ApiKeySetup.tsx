import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setApiKey } from "../api/client";

export default function ApiKeySetup() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/suppliers";
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError("API key is required");
      return;
    }
    setApiKey(key.trim());
    navigate(redirect);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-surface-container rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-on-background mb-2">
          Welcome to tavera
        </h1>
        <p className="text-sm text-outline mb-6">
          Enter your API key to access the supplier intelligence platform.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError("");
              }}
              placeholder="tavera_..."
              className="w-full px-4 py-3 bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              autoFocus
            />
            {error && (
              <p className="text-error text-xs mt-1">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 btn-primary hover:opacity-90 transition-all"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
