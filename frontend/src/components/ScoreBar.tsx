import { scoreBarColor } from "../types/supplier";

interface Props {
  score: number | null;
}

export default function ScoreBar({ score }: Props) {
  const width = score ?? 0;
  const color = scoreBarColor(score);
  const display = score !== null ? `${Math.round(score)}%` : "N/A";
  const textColor =
    score === null
      ? "text-outline"
      : score >= 85
        ? "text-secondary"
        : score >= 65
          ? "text-tertiary"
          : "text-error";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-surface-variant h-2 rounded-full overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-sm font-bold tracking-tight ${textColor}`}>
        {display}
      </span>
    </div>
  );
}
