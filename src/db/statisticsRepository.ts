import { getDatabase } from "@/db/database";

export type StatsOverview = {
  activeDraftWorkoutId: string | null;
  activeDraftWorkoutName: string | null;
  averageWorkoutsPerWeekLast4Weeks: number;
  totalCompletedSets: number;
  totalCompletedWorkouts: number;
  totalExercisesPerformed: number;
  workoutsLast7Days: number;
  workoutsLast30Days: number;
  workoutsThisMonth: number;
  workoutsThisWeek: number;
};

export type TopExerciseStat = {
  completedSetCount: number;
  completedWorkoutCount: number;
  exerciseId: string | null;
  exerciseName: string;
  lastCompletedDate: string | null;
};

export type ExerciseProgressOption = {
  exerciseId: string | null;
  exerciseName: string;
  exerciseType: string | null;
  lastCompletedDate: string | null;
};

export type ExerciseProgressStat = {
  averageReps: number | null;
  averageTimeSeconds: number | null;
  averageWorkingWeightKg: number | null;
  bestDistance: number | null;
  bestEstimatedOneRepMax: number | null;
  bestPaceSecondsPerKm: number | null;
  bestReps: number | null;
  bestSetSummary: string | null;
  bestSessionVolumeKg: number | null;
  bestTotalReps: number | null;
  bestTotalTimeSeconds: number | null;
  bestWeightKg: number | null;
  bestWeightReps: number | null;
  exerciseId: string | null;
  exerciseName: string;
  exerciseType: string | null;
  lastPerformedDate: string | null;
  lastSummary: string | null;
  lastWorkoutName: string | null;
  latestBodyweightKg: number | null;
  longestTimeSeconds: number | null;
  timesPerformed: number;
  totalSets: number;
};

export type ExerciseTrendMetric =
  | "estimated1RM"
  | "bestWeight"
  | "volume"
  | "bestReps"
  | "bestTime"
  | "distance"
  | "pace";

export type ExerciseTrendPoint = {
  date: string;
  label: string;
  value: number;
  workoutId: string;
  workoutName: string;
};

export type PersonalRecord = {
  date: string;
  exerciseId: string | null;
  exerciseName: string;
  id: string;
  recordType:
    | "heaviest_weight"
    | "estimated_1rm"
    | "most_reps"
    | "longest_time"
    | "best_distance"
    | "best_session_volume";
  setSummary?: string;
  unit: "kg" | "reps" | "sec" | "km" | "volume";
  value: number;
  workoutId: string;
  workoutName: string;
};

export type WeeklyTrainingSummary = {
  completedSetCount: number;
  label: string;
  totalVolumeKg: number | null;
  weekEnd: string;
  weekStart: string;
  workoutCount: number;
};

export type BodyweightStats = {
  changeKg: number | null;
  firstBodyweightKg: number | null;
  firstDate: string | null;
  latestBodyweightKg: number | null;
  latestDate: string | null;
  loggedCount: number;
};

type CountRow = {
  count: number;
};

type DraftRow = {
  id: string;
  name: string;
};

type CompletedWorkoutRow = {
  bodyweightKg: number | null;
  createdAt: string;
  date: string;
  id: string;
  name: string;
  startTime: string | null;
  updatedAt: string;
};

type CompletedExerciseRow = {
  bodyweightKg: number | null;
  createdAt: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseNotes: string | null;
  exerciseType: string | null;
  sortOrder: number;
  startTime: string | null;
  updatedAt: string;
  workoutDate: string;
  workoutExerciseId: string;
  workoutId: string;
  workoutName: string;
};

type CompletedSetRow = {
  distance: number | null;
  kg: number | null;
  minutes: number | null;
  notes: string | null;
  reps: number | null;
  seconds: number | null;
  setOrder: number;
  setType: "warmup" | "normal" | "drop";
  workoutExerciseId: string;
};

type ExercisePerformance = CompletedExerciseRow & {
  sets: CompletedSetRow[];
};

export async function getStatsOverview(): Promise<StatsOverview> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<CompletedWorkoutRow>(
    `SELECT id, name, bodyweightKg, date, startTime, createdAt, updatedAt
     FROM workouts
     WHERE status = 'completed'`,
  );

  const totalSets = await db.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count
     FROM workout_sets ws
     INNER JOIN workout_exercises we ON we.id = ws.workoutExerciseId
     INNER JOIN workouts w ON w.id = we.workoutId
     WHERE w.status = 'completed'
       AND (
         ws.kg IS NOT NULL
         OR ws.reps IS NOT NULL
         OR ws.minutes IS NOT NULL
         OR ws.seconds IS NOT NULL
         OR ws.distance IS NOT NULL
         OR TRIM(COALESCE(ws.notes, '')) != ''
       )`,
  );
  const totalExercises = await db.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count
     FROM workout_exercises we
     INNER JOIN workouts w ON w.id = we.workoutId
     WHERE w.status = 'completed'`,
  );
  const activeDraft = await db.getFirstAsync<DraftRow>(
    `SELECT id, name
     FROM workouts
     WHERE status = 'draft'
     ORDER BY updatedAt DESC, createdAt DESC
     LIMIT 1`,
  );

  const now = new Date();
  const today = startOfDay(now);
  const thisWeekStart = startOfWeekMonday(today);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const last7DaysStart = addDays(today, -6);
  const last30DaysStart = addDays(today, -29);
  const last4WeeksStart = addDays(today, -27);

  return {
    totalCompletedWorkouts: workouts.length,
    workoutsThisWeek: countWorkoutsSince(workouts, thisWeekStart),
    workoutsThisMonth: countWorkoutsSince(workouts, thisMonthStart),
    workoutsLast7Days: countWorkoutsSince(workouts, last7DaysStart),
    workoutsLast30Days: countWorkoutsSince(workouts, last30DaysStart),
    averageWorkoutsPerWeekLast4Weeks:
      Math.round((countWorkoutsSince(workouts, last4WeeksStart) / 4) * 10) / 10,
    totalCompletedSets: totalSets?.count ?? 0,
    totalExercisesPerformed: totalExercises?.count ?? 0,
    activeDraftWorkoutId: activeDraft?.id ?? null,
    activeDraftWorkoutName: activeDraft
      ? activeDraft.name.trim() || "Untitled Workout"
      : null,
  };
}

export async function getTopExercises(limit = 5): Promise<TopExerciseStat[]> {
  const performances = await getCompletedExercisePerformances();
  const groups = new Map<
    string,
    {
      completedSetCount: number;
      exerciseId: string | null;
      exerciseName: string;
      lastCompletedDate: string | null;
      lastSortValue: number;
      workoutIds: Set<string>;
    }
  >();

  for (const performance of performances) {
    const key = getExerciseKey(performance);
    if (!key) continue;

    const current =
      groups.get(key) ??
      {
        completedSetCount: 0,
        exerciseId: performance.exerciseId ?? null,
        exerciseName: performance.exerciseName,
        lastCompletedDate: null,
        lastSortValue: Number.NEGATIVE_INFINITY,
        workoutIds: new Set<string>(),
      };
    const sortValue = getWorkoutSortValue(performance);

    current.workoutIds.add(performance.workoutId);
    current.completedSetCount += performance.sets.filter(isMeaningfulSet).length;
    if (sortValue > current.lastSortValue) {
      current.lastSortValue = sortValue;
      current.lastCompletedDate = performance.workoutDate;
      current.exerciseName = performance.exerciseName;
    }
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      exerciseId: group.exerciseId,
      exerciseName: group.exerciseName,
      completedWorkoutCount: group.workoutIds.size,
      completedSetCount: group.completedSetCount,
      lastCompletedDate: group.lastCompletedDate,
      lastSortValue: group.lastSortValue,
    }))
    .sort(
      (a, b) =>
        b.completedWorkoutCount - a.completedWorkoutCount ||
        b.completedSetCount - a.completedSetCount ||
        b.lastSortValue - a.lastSortValue,
    )
    .slice(0, Math.max(1, Math.min(Math.floor(limit), 10)))
    .map(({ lastSortValue: _lastSortValue, ...stat }) => stat);
}

export async function getExerciseProgressOptions(): Promise<
  ExerciseProgressOption[]
> {
  const performances = await getCompletedExercisePerformances();
  const options = new Map<
    string,
    ExerciseProgressOption & { lastSortValue: number }
  >();

  for (const performance of performances) {
    const key = getExerciseKey(performance);
    if (!key) continue;

    const sortValue = getWorkoutSortValue(performance);
    const current = options.get(key);
    if (!current || sortValue > current.lastSortValue) {
      options.set(key, {
        exerciseId: performance.exerciseId ?? null,
        exerciseName: performance.exerciseName,
        exerciseType: performance.exerciseType ?? null,
        lastCompletedDate: performance.workoutDate,
        lastSortValue: sortValue,
      });
    }
  }

  return [...options.values()]
    .sort((a, b) => b.lastSortValue - a.lastSortValue)
    .map(({ lastSortValue: _lastSortValue, ...option }) => option);
}

export async function getExerciseProgressStat({
  exerciseId,
  exerciseName,
}: {
  exerciseId?: string | null;
  exerciseName: string;
}): Promise<ExerciseProgressStat | null> {
  const performances = await getCompletedExercisePerformances();
  const trimmedExerciseId = exerciseId?.trim() || null;
  const normalisedName = normaliseExerciseName(exerciseName);

  let matches = trimmedExerciseId
    ? performances.filter(
        (performance) => performance.exerciseId === trimmedExerciseId,
      )
    : [];

  if (matches.length === 0 && normalisedName) {
    matches = performances.filter(
      (performance) =>
        normaliseExerciseName(performance.exerciseName) === normalisedName,
    );
  }

  if (matches.length === 0) return null;

  matches.sort(comparePerformanceDescending);
  const lastPerformance = matches[0];
  const allMeaningfulSets = matches.flatMap((performance) =>
    performance.sets.filter(isMeaningfulSet),
  );
  const preferredBestSets = allMeaningfulSets.filter(
    (set) => set.setType !== "warmup",
  );
  const bestCandidateSets =
    preferredBestSets.length > 0 ? preferredBestSets : allMeaningfulSets;
  const bestWeightSet = getBestWeightSet(bestCandidateSets);
  const bestOneRepMax = getBestEstimatedOneRepMax(bestCandidateSets);
  const bestSession = getBestSession(matches);
  const latestBodyweight = getLatestBodyweight(matches);
  const weightedSets = bestCandidateSets.filter((set) =>
    isPositiveNumber(set.kg),
  );
  const repsSets = bestCandidateSets.filter((set) => isPositiveNumber(set.reps));
  const timeSets = bestCandidateSets.filter((set) =>
    isPositiveNumber(getSetDurationSeconds(set)),
  );

  return {
    exerciseId: lastPerformance.exerciseId ?? null,
    exerciseName: lastPerformance.exerciseName,
    exerciseType: lastPerformance.exerciseType ?? null,
    latestBodyweightKg: latestBodyweight,
    timesPerformed: new Set(matches.map((performance) => performance.workoutId))
      .size,
    lastPerformedDate: lastPerformance.workoutDate,
    lastWorkoutName: lastPerformance.workoutName,
    lastSummary: formatSetSummary(lastPerformance.sets),
    bestSetSummary: getBestSetSummary(bestCandidateSets),
    bestWeightKg: bestWeightSet?.kg ?? null,
    bestWeightReps: bestWeightSet?.reps ?? null,
    bestEstimatedOneRepMax: bestOneRepMax,
    bestSessionVolumeKg: bestSession.volume || null,
    averageWorkingWeightKg: average(weightedSets.map((set) => set.kg)),
    averageReps: average(repsSets.map((set) => set.reps)),
    bestReps: getMaxNumber(bestCandidateSets.map((set) => set.reps)),
    longestTimeSeconds: getMaxNumber(
      bestCandidateSets.map(getSetDurationSeconds),
    ),
    bestTotalTimeSeconds: bestSession.time || null,
    bestTotalReps: bestSession.reps || null,
    averageTimeSeconds: average(timeSets.map(getSetDurationSeconds)),
    bestDistance: getMaxNumber(bestCandidateSets.map((set) => set.distance)),
    bestPaceSecondsPerKm: getBestPace(bestCandidateSets),
    totalSets: allMeaningfulSets.length,
  };
}

export async function getExerciseTrend({
  exerciseId,
  exerciseName,
  limit = 20,
  metric,
}: {
  exerciseId?: string | null;
  exerciseName: string;
  limit?: number;
  metric: ExerciseTrendMetric;
}): Promise<ExerciseTrendPoint[]> {
  const matches = await getMatchingExercisePerformances(exerciseId, exerciseName);
  const points = matches
    .sort(comparePerformanceAscending)
    .map((performance) => {
      const value = getTrendMetricValue(performance, metric);
      if (!isPositiveNumber(value)) return null;

      return {
        workoutId: performance.workoutId,
        workoutName: performance.workoutName,
        date: performance.workoutDate,
        value,
        label: formatTrendPointLabel(value, metric),
      };
    })
    .filter((point): point is ExerciseTrendPoint => point !== null);

  return points.slice(Math.max(0, points.length - Math.max(2, limit)));
}

export async function getPersonalRecords(limit = 5): Promise<PersonalRecord[]> {
  const performances = await getCompletedExercisePerformances();
  const records: PersonalRecord[] = [];

  for (const performance of performances) {
    const sets = getBestCandidateSets(performance.sets);
    const heaviest = getBestWeightSet(sets);
    const bestOneRepMax = getBestOneRepMaxSet(sets);
    const bestReps = getBestRepsSet(sets);
    const longestTime = getBestTimeSet(sets);
    const bestDistance = getBestDistanceSet(sets);
    const session = getSessionMetrics(performance);

    if (heaviest?.kg) {
      records.push(
        createRecord(performance, "heaviest_weight", heaviest.kg, "kg", heaviest),
      );
    }
    if (bestOneRepMax) {
      records.push(
        createRecord(
          performance,
          "estimated_1rm",
          bestOneRepMax.value,
          "kg",
          bestOneRepMax.set,
        ),
      );
    }
    if (bestReps?.reps) {
      records.push(
        createRecord(performance, "most_reps", bestReps.reps, "reps", bestReps),
      );
    }
    if (longestTime) {
      records.push(
        createRecord(
          performance,
          "longest_time",
          longestTime.value,
          "sec",
          longestTime.set,
        ),
      );
    }
    if (bestDistance?.distance) {
      records.push(
        createRecord(
          performance,
          "best_distance",
          bestDistance.distance,
          "km",
          bestDistance,
        ),
      );
    }
    if (session.volume > 0) {
      records.push(
        createRecord(
          performance,
          "best_session_volume",
          session.volume,
          "volume",
        ),
      );
    }
  }

  const bestByTypeAndExercise = new Map<string, PersonalRecord>();
  for (const record of records) {
    const key = `${record.exerciseId ?? normaliseExerciseName(record.exerciseName)}:${record.recordType}`;
    const current = bestByTypeAndExercise.get(key);
    if (!current || record.value > current.value) {
      bestByTypeAndExercise.set(key, record);
    }
  }

  return [...bestByTypeAndExercise.values()]
    .sort((a, b) => getRecordSortValue(b) - getRecordSortValue(a))
    .slice(0, Math.max(1, Math.min(Math.floor(limit), 100)));
}

export async function getWeeklyTrainingSummary(
  weeks = 4,
): Promise<WeeklyTrainingSummary[]> {
  const performances = await getCompletedExercisePerformances();
  const now = startOfDay(new Date());
  const thisWeekStart = startOfWeekMonday(now);
  const weekCount = Math.max(1, Math.min(Math.floor(weeks), 8));

  return Array.from({ length: weekCount }, (_, index) => {
    const weekStartDate = addDays(thisWeekStart, index * -7);
    const weekEndDate = addDays(weekStartDate, 6);
    const weekStartTime = weekStartDate.getTime();
    const weekEndTime = weekEndDate.getTime();
    const weekPerformances = performances.filter((performance) => {
      const date = parseWorkoutDate(performance.workoutDate);
      if (!date) return false;
      const time = startOfDay(date).getTime();
      return time >= weekStartTime && time <= weekEndTime;
    });
    const workoutIds = new Set(
      weekPerformances.map((performance) => performance.workoutId),
    );
    const sets = weekPerformances.flatMap((performance) =>
      performance.sets.filter(isMeaningfulSet),
    );
    const volume = sets.reduce((total, set) => total + getSetVolume(set), 0);

    return {
      weekStart: formatDateField(weekStartDate),
      weekEnd: formatDateField(weekEndDate),
      label:
        index === 0
          ? "This week"
          : index === 1
            ? "Last week"
            : `${index} weeks ago`,
      workoutCount: workoutIds.size,
      completedSetCount: sets.length,
      totalVolumeKg: volume > 0 ? Math.round(volume * 10) / 10 : null,
    };
  });
}

export async function getBodyweightStats(): Promise<BodyweightStats> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<CompletedWorkoutRow>(
    `SELECT id, name, bodyweightKg, date, startTime, createdAt, updatedAt
     FROM workouts
     WHERE status = 'completed'
       AND bodyweightKg IS NOT NULL
       AND bodyweightKg > 0`,
  );
  const ordered = workouts.sort(
    (a, b) => getWorkoutSortValue(a) - getWorkoutSortValue(b),
  );
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];

  return {
    latestBodyweightKg: latest?.bodyweightKg ?? null,
    latestDate: latest?.date ?? null,
    firstBodyweightKg: first?.bodyweightKg ?? null,
    firstDate: first?.date ?? null,
    changeKg:
      first && latest
        ? Math.round(((latest.bodyweightKg ?? 0) - (first.bodyweightKg ?? 0)) * 10) /
          10
        : null,
    loggedCount: ordered.length,
  };
}

async function getCompletedExercisePerformances() {
  const db = await getDatabase();
  const exercises = await db.getAllAsync<CompletedExerciseRow>(
    `SELECT
       we.id AS workoutExerciseId,
       we.exerciseId AS exerciseId,
       we.name AS exerciseName,
       COALESCE(we.exerciseType, e.exerciseType) AS exerciseType,
       we.notes AS exerciseNotes,
       we.sortOrder AS sortOrder,
       w.id AS workoutId,
       w.name AS workoutName,
       w.bodyweightKg AS bodyweightKg,
       w.date AS workoutDate,
       w.startTime AS startTime,
       w.createdAt AS createdAt,
       w.updatedAt AS updatedAt
     FROM workout_exercises we
     INNER JOIN workouts w ON w.id = we.workoutId
     LEFT JOIN exercises e ON e.id = we.exerciseId
     WHERE w.status = 'completed'`,
  );

  if (exercises.length === 0) return [];

  const workoutExerciseIds = exercises.map(
    (exercise) => exercise.workoutExerciseId,
  );
  const placeholders = workoutExerciseIds.map(() => "?").join(", ");
  const sets = await db.getAllAsync<CompletedSetRow>(
    `SELECT
       workoutExerciseId,
       setType,
       setOrder,
       distance,
       kg,
       reps,
       minutes,
       seconds,
       notes
     FROM workout_sets
     WHERE workoutExerciseId IN (${placeholders})
     ORDER BY workoutExerciseId ASC, setOrder ASC`,
    ...workoutExerciseIds,
  );
  const setsByExercise = new Map<string, CompletedSetRow[]>();

  for (const set of sets) {
    const currentSets = setsByExercise.get(set.workoutExerciseId) ?? [];
    currentSets.push(set);
    setsByExercise.set(set.workoutExerciseId, currentSets);
  }

  return exercises
    .map((exercise) => ({
      ...exercise,
      sets: setsByExercise.get(exercise.workoutExerciseId) ?? [],
    }))
    .sort(comparePerformanceDescending);
}

async function getMatchingExercisePerformances(
  exerciseId: string | null | undefined,
  exerciseName: string,
) {
  const performances = await getCompletedExercisePerformances();
  const trimmedExerciseId = exerciseId?.trim() || null;
  const normalisedName = normaliseExerciseName(exerciseName);

  let matches = trimmedExerciseId
    ? performances.filter(
        (performance) => performance.exerciseId === trimmedExerciseId,
      )
    : [];

  if (matches.length === 0 && normalisedName) {
    matches = performances.filter(
      (performance) =>
        normaliseExerciseName(performance.exerciseName) === normalisedName,
    );
  }

  return matches;
}

function getBestCandidateSets(sets: CompletedSetRow[]) {
  const meaningfulSets = sets.filter(isMeaningfulSet);
  const preferredSets = meaningfulSets.filter((set) => set.setType !== "warmup");
  return preferredSets.length > 0 ? preferredSets : meaningfulSets;
}

function getBestSession(matches: ExercisePerformance[]) {
  return matches
    .map(getSessionMetrics)
    .sort(
      (a, b) =>
        b.volume - a.volume ||
        b.reps - a.reps ||
        b.time - a.time ||
        b.distance - a.distance,
    )[0];
}

function getSessionMetrics(performance: ExercisePerformance) {
  const sets = performance.sets.filter(isMeaningfulSet);
  return {
    distance: sets.reduce((total, set) => total + (set.distance ?? 0), 0),
    reps: sets.reduce((total, set) => total + (set.reps ?? 0), 0),
    time: sets.reduce((total, set) => total + (getSetDurationSeconds(set) ?? 0), 0),
    volume: sets.reduce((total, set) => total + getSetVolume(set), 0),
  };
}

function getLatestBodyweight(matches: ExercisePerformance[]) {
  return (
    matches.find((performance) => isPositiveNumber(performance.bodyweightKg))
      ?.bodyweightKg ?? null
  );
}

function average(values: (number | null)[]) {
  const numbers = values.filter(isPositiveNumber);
  if (numbers.length === 0) return null;
  const total = numbers.reduce((sum, value) => sum + value, 0);
  return Math.round((total / numbers.length) * 10) / 10;
}

function getBestSetSummary(sets: CompletedSetRow[]) {
  const bestOneRepMax = getBestOneRepMaxSet(sets);
  if (bestOneRepMax) return formatSetValue(bestOneRepMax.set);

  const bestWeight = getBestWeightSet(sets);
  if (bestWeight) return formatSetValue(bestWeight);

  const bestReps = getBestRepsSet(sets);
  if (bestReps) return formatSetValue(bestReps);

  const bestTime = getBestTimeSet(sets);
  if (bestTime) return formatSetValue(bestTime.set);

  const bestDistance = getBestDistanceSet(sets);
  if (bestDistance) return formatSetValue(bestDistance);

  return null;
}

function getBestPace(sets: CompletedSetRow[]) {
  const paceValues = sets
    .map((set) => {
      const duration = getSetDurationSeconds(set);
      if (!duration || !isPositiveNumber(set.distance)) return null;
      return duration / set.distance;
    })
    .filter(isPositiveNumber);

  if (paceValues.length === 0) return null;
  return Math.round(Math.min(...paceValues));
}

function getTrendMetricValue(
  performance: ExercisePerformance,
  metric: ExerciseTrendMetric,
) {
  const sets = getBestCandidateSets(performance.sets);
  const session = getSessionMetrics(performance);

  switch (metric) {
    case "estimated1RM":
      return getBestEstimatedOneRepMax(sets);
    case "bestWeight":
      return getBestWeightSet(sets)?.kg ?? null;
    case "volume":
      return session.volume || null;
    case "bestReps":
      return getMaxNumber(sets.map((set) => set.reps));
    case "bestTime":
      return getMaxNumber(sets.map(getSetDurationSeconds)) ?? (session.time || null);
    case "distance":
      return getMaxNumber(sets.map((set) => set.distance)) ?? (session.distance || null);
    case "pace":
      return getBestPace(sets);
    default:
      return null;
  }
}

function formatTrendPointLabel(value: number, metric: ExerciseTrendMetric) {
  if (metric === "bestTime" || metric === "pace") {
    return formatDurationSeconds(Math.round(value));
  }
  if (metric === "bestReps") return `${formatNumber(value)} reps`;
  if (metric === "distance") return `${formatNumber(value)}km`;
  if (metric === "volume") return `${formatNumber(value)}kg`;
  return `${formatNumber(value)}kg`;
}

function getBestOneRepMaxSet(sets: CompletedSetRow[]) {
  const candidates = sets
    .filter((set) => isPositiveNumber(set.kg) && isPositiveNumber(set.reps))
    .map((set) => ({
      set,
      value: (set.kg ?? 0) * (1 + (set.reps ?? 0) / 30),
    }));

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.value - a.value)[0];
}

function getBestRepsSet(sets: CompletedSetRow[]) {
  return sets
    .filter((set) => isPositiveNumber(set.reps))
    .sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
}

function getBestTimeSet(sets: CompletedSetRow[]) {
  const candidates = sets
    .map((set) => ({ set, value: getSetDurationSeconds(set) }))
    .filter(
      (candidate): candidate is { set: CompletedSetRow; value: number } =>
        isPositiveNumber(candidate.value),
    );

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.value - a.value)[0];
}

function getBestDistanceSet(sets: CompletedSetRow[]) {
  return sets
    .filter((set) => isPositiveNumber(set.distance))
    .sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))[0];
}

function createRecord(
  performance: ExercisePerformance,
  recordType: PersonalRecord["recordType"],
  value: number,
  unit: PersonalRecord["unit"],
  set?: CompletedSetRow,
): PersonalRecord {
  return {
    id: `${performance.workoutExerciseId}:${recordType}`,
    exerciseId: performance.exerciseId ?? null,
    exerciseName: performance.exerciseName,
    recordType,
    value: Math.round(value * 10) / 10,
    unit,
    workoutId: performance.workoutId,
    workoutName: performance.workoutName,
    date: performance.workoutDate,
    setSummary: set ? formatSetValue(set) : undefined,
  };
}

function countWorkoutsSince(
  workouts: CompletedWorkoutRow[],
  startDate: Date,
) {
  const startTime = startDate.getTime();
  return workouts.filter((workout) => {
    const workoutDate = parseWorkoutDate(workout.date);
    return workoutDate !== null && startOfDay(workoutDate).getTime() >= startTime;
  }).length;
}

function comparePerformanceDescending(
  a: ExercisePerformance,
  b: ExercisePerformance,
) {
  return (
    getWorkoutSortValue(b) - getWorkoutSortValue(a) ||
    a.sortOrder - b.sortOrder
  );
}

function comparePerformanceAscending(
  a: ExercisePerformance,
  b: ExercisePerformance,
) {
  return (
    getWorkoutSortValue(a) - getWorkoutSortValue(b) ||
    a.sortOrder - b.sortOrder
  );
}

function getExerciseKey(performance: ExercisePerformance) {
  if (performance.exerciseId?.trim()) return `id:${performance.exerciseId}`;
  const normalisedName = normaliseExerciseName(performance.exerciseName);
  return normalisedName ? `name:${normalisedName}` : null;
}

function normaliseExerciseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isMeaningfulSet(set: CompletedSetRow) {
  return (
    set.kg !== null ||
    set.reps !== null ||
    set.minutes !== null ||
    set.seconds !== null ||
    set.distance !== null ||
    Boolean(set.notes?.trim())
  );
}

function getBestWeightSet(sets: CompletedSetRow[]) {
  return sets
    .filter((set) => isPositiveNumber(set.kg))
    .sort(
      (a, b) =>
        (b.kg ?? 0) - (a.kg ?? 0) ||
        (b.reps ?? 0) - (a.reps ?? 0),
    )[0];
}

function getBestEstimatedOneRepMax(sets: CompletedSetRow[]) {
  const estimates = sets
    .filter((set) => isPositiveNumber(set.kg) && isPositiveNumber(set.reps))
    .map((set) => (set.kg ?? 0) * (1 + (set.reps ?? 0) / 30));

  const best = getMaxNumber(estimates);
  return best === null ? null : Math.round(best * 10) / 10;
}

function getMaxNumber(values: (number | null)[]) {
  const numbers = values.filter(isPositiveNumber);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function isPositiveNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function getSetDurationSeconds(set: CompletedSetRow) {
  if (set.minutes === null && set.seconds === null) return null;
  return (set.minutes ?? 0) * 60 + (set.seconds ?? 0);
}

function getSetVolume(set: CompletedSetRow) {
  if (!isPositiveNumber(set.kg) || !isPositiveNumber(set.reps)) return 0;
  return set.kg * set.reps;
}

function formatSetSummary(sets: CompletedSetRow[]) {
  const values = sets.filter(isMeaningfulSet).map(formatSetValue);
  if (values.length === 0) return null;
  return values.join(", ");
}

function formatSetValue(set: CompletedSetRow) {
  const weight = isPositiveNumber(set.kg) ? `${formatNumber(set.kg)}kg` : null;
  const reps = isPositiveNumber(set.reps) ? formatNumber(set.reps) : null;
  const distance = isPositiveNumber(set.distance)
    ? `${formatNumber(set.distance)}km`
    : null;
  const durationSeconds = getSetDurationSeconds(set);
  const time = durationSeconds ? formatDurationSeconds(durationSeconds) : null;

  if (weight && reps) return `${weight} x ${reps}`;
  if (weight && time) return `${weight} x ${time}`;
  if (distance && time) return `${distance} - ${time}`;
  if (reps) return `${reps} reps`;
  if (time) return time;
  if (weight) return weight;
  if (distance) return distance;
  if (set.notes?.trim()) return "Note only";
  return "--";
}

function formatDurationSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function getWorkoutSortValue(
  row:
    | CompletedWorkoutRow
    | Pick<
        CompletedExerciseRow,
        "workoutDate" | "startTime" | "createdAt" | "updatedAt"
      >,
) {
  const dateValue =
    "date" in row ? row.date : row.workoutDate;
  const parsedDate = parseWorkoutDate(dateValue);
  const dateTime = parsedDate?.getTime() ?? Date.parse(row.createdAt);
  const safeDateTime = Number.isNaN(dateTime) ? 0 : dateTime;
  return safeDateTime + parseTimeOffset(row.startTime);
}

function getRecordSortValue(record: Pick<PersonalRecord, "date">) {
  const parsedDate = parseWorkoutDate(record.date);
  return parsedDate?.getTime() ?? 0;
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

function parseTimeOffset(value: string | null) {
  if (!value) return 0;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const [, hours, minutes] = match;
  return (Number(hours) * 60 + Number(minutes)) * 60 * 1000;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  return addDays(date, -diff);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateField(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()}`;
}
