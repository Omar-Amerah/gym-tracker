import type {
  ExerciseTrendMetric,
  PersonalRecord,
} from "@/db/statisticsRepository";

export function formatDateShort(value: string | null) {
  if (!value) return "--";

  const parsed = parseWorkoutDate(value);
  if (!parsed) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatWeight(value: number | null | undefined) {
  return formatWeightKg(value);
}

export function formatWeightKg(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${formatNumber(value)}kg`;
}

export function formatVolumeKg(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value).toLocaleString("en-GB")}kg volume`;
}

export function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${formatNumber(value)}km`;
}

export function formatDurationSeconds(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "--";
  if (value < 60) return `${value}s`;

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEstimatedOneRepMax(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${formatNumber(value)}kg`;
}

export function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(2)}x BW`;
}

export function formatPace(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "--";
  return `${formatDurationSeconds(Math.round(value))}/km`;
}

export function formatRecordValue(record: PersonalRecord) {
  switch (record.unit) {
    case "kg":
      return formatWeightKg(record.value);
    case "reps":
      return `${formatNumber(record.value)} reps`;
    case "sec":
      return formatDurationSeconds(record.value);
    case "km":
      return formatDistance(record.value);
    case "volume":
      return formatVolumeKg(record.value);
    default:
      return formatNumber(record.value);
  }
}

export function formatRecordType(recordType: PersonalRecord["recordType"]) {
  switch (recordType) {
    case "heaviest_weight":
      return "Heaviest Weight";
    case "estimated_1rm":
      return "Estimated 1RM";
    case "most_reps":
      return "Most Reps";
    case "longest_time":
      return "Longest Time";
    case "best_distance":
      return "Best Distance";
    case "best_session_volume":
      return "Best Session Volume";
    default:
      return "Record";
  }
}

export function formatTrendMetricLabel(metric: ExerciseTrendMetric) {
  switch (metric) {
    case "estimated1RM":
      return "Estimated 1RM";
    case "bestWeight":
      return "Best Weight";
    case "volume":
      return "Session Volume";
    case "bestReps":
      return "Best Reps";
    case "bestTime":
      return "Best Time";
    case "distance":
      return "Distance";
    case "pace":
      return "Pace";
    default:
      return "Trend";
  }
}

export function calculateEstimatedOneRepMax(kg: number, reps: number) {
  if (kg <= 0 || reps <= 0) return null;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export function calculateVolume(kg: number, reps: number) {
  if (kg <= 0 || reps <= 0) return null;
  return kg * reps;
}

export function pluralise(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function parseWorkoutDate(value: string) {
  const trimmed = value.trim();
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
