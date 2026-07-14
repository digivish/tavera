import { scoreToRiskLevel } from "../types/supplier";

interface Props {
  score: number | null;
  size?: number;
}

export default function ScoreGauge({ score, size = 64 }: Props) {
  const strokeWidth = size * 0.125;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;

  const riskLevel = scoreToRiskLevel(score);
  const gaugeColor =
    riskLevel === "low"
      ? "text-secondary"
      : riskLevel === "moderate"
        ? "text-tertiary"
        : riskLevel === "high"
          ? "text-error"
          : "text-outline";

  const riskLabel =
    riskLevel === "low"
      ? "Low Risk"
      : riskLevel === "moderate"
        ? "Moderate Risk"
        : riskLevel === "high"
          ? "High Risk"
          : "No Data";

  const riskBg =
    riskLevel === "low"
      ? "bg-secondary/10 text-secondary border-secondary/30"
      : riskLevel === "moderate"
        ? "bg-tertiary/10 text-tertiary border-tertiary/30"
        : riskLevel === "high"
          ? "bg-error/10 text-error border-error/30"
          : "bg-surface-variant/20 text-outline border-outline-variant";

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="w-full h-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            className="text-surface-variant"
            cx={center}
            cy={center}
            fill="transparent"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
          <circle
            className={gaugeColor}
            cx={center}
            cy={center}
            fill="transparent"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={score !== null ? offset : circumference}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight text-on-surface"
          style={{ fontSize: size * 0.22 }}
        >
          {score !== null ? Math.round(score) : "--"}
        </span>
      </div>
      <span className={`px-3 py-1 rounded border text-xs font-bold uppercase ${riskBg}`}>
        {riskLabel}
      </span>
    </div>
  );
}
