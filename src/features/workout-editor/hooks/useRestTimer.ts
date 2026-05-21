import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vibration } from "react-native";

export type RestTimerPreset = number;

const DEFAULT_PRESETS: RestTimerPreset[] = [50, 40, 30, 60, 90, 120, 150, 180];

export function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useRestTimer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [presets, setPresets] = useState<RestTimerPreset[]>(DEFAULT_PRESETS);
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState(50);
  const [remainingSeconds, setRemainingSeconds] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetToSelectedDuration = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
    setEndsAt(null);
    setRemainingSeconds(selectedDurationSeconds);
  }, [clearTimerInterval, selectedDurationSeconds]);

  const stopTimer = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
    setEndsAt(null);
    setRemainingSeconds(0);
  }, [clearTimerInterval]);

  const resetTimer = useCallback(
    (seconds?: number) => {
      const nextSeconds = seconds ?? selectedDurationSeconds;

      clearTimerInterval();
      setIsRunning(false);
      setEndsAt(null);
      setSelectedDurationSeconds(nextSeconds);
      setRemainingSeconds(nextSeconds);
    },
    [clearTimerInterval, selectedDurationSeconds],
  );

  const startTimer = useCallback(
    (seconds?: number) => {
      const nextSeconds =
        typeof seconds === "number" && seconds > 0
          ? seconds
          : remainingSeconds > 0
            ? remainingSeconds
            : selectedDurationSeconds;

      clearTimerInterval();

      setSelectedDurationSeconds(nextSeconds);
      setRemainingSeconds(nextSeconds);
      setEndsAt(Date.now() + nextSeconds * 1000);
      setIsRunning(true);
    },
    [clearTimerInterval, remainingSeconds, selectedDurationSeconds],
  );

  const pauseTimer = useCallback(() => {
    if (!isRunning || !endsAt) return;

    const nextRemainingSeconds = Math.max(
      0,
      Math.ceil((endsAt - Date.now()) / 1000),
    );

    clearTimerInterval();
    setIsRunning(false);
    setEndsAt(null);
    setRemainingSeconds(nextRemainingSeconds);
  }, [clearTimerInterval, endsAt, isRunning]);

  const resumeTimer = useCallback(() => {
    if (remainingSeconds <= 0) {
      startTimer(selectedDurationSeconds);
      return;
    }

    startTimer(remainingSeconds);
  }, [remainingSeconds, selectedDurationSeconds, startTimer]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
      return;
    }

    resumeTimer();
  }, [isRunning, pauseTimer, resumeTimer]);

  const selectPreset = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;

      clearTimerInterval();

      setSelectedDurationSeconds(seconds);
      setRemainingSeconds(seconds);
      setEndsAt(Date.now() + seconds * 1000);
      setIsRunning(true);
    },
    [clearTimerInterval],
  );

  const addPreset = useCallback((seconds: number) => {
    if (seconds <= 0) return;

    setPresets((current) => {
      if (current.includes(seconds)) return current;
      return [...current, seconds];
    });

    setSelectedDurationSeconds(seconds);
    setRemainingSeconds(seconds);
  }, []);

  const removePreset = useCallback(
    (seconds: number) => {
      setPresets((current) => {
        const nextPresets = current.filter((preset) => preset !== seconds);

        if (selectedDurationSeconds === seconds) {
          const fallbackPreset = nextPresets[0] ?? 50;
          setSelectedDurationSeconds(fallbackPreset);
          setRemainingSeconds(fallbackPreset);
          setIsRunning(false);
          setEndsAt(null);
          clearTimerInterval();
        }

        return nextPresets;
      });
    },
    [clearTimerInterval, selectedDurationSeconds],
  );

  const updatePreset = useCallback(
    (oldSeconds: number, newSeconds: number) => {
      if (newSeconds <= 0) return;

      setPresets((current) => {
        const withoutOldPreset = current.filter(
          (preset) => preset !== oldSeconds,
        );
        const withNewPreset = withoutOldPreset.includes(newSeconds)
          ? withoutOldPreset
          : [...withoutOldPreset, newSeconds];

        return withNewPreset;
      });

      if (selectedDurationSeconds === oldSeconds) {
        resetTimer(newSeconds);
      }
    },
    [resetTimer, selectedDurationSeconds],
  );

  const movePreset = useCallback((fromIndex: number, toIndex: number) => {
    setPresets((current) => {
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const next = [...current];
      const [preset] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, preset);
      return next;
    });
  }, []);

  const hasActiveTimer = remainingSeconds > 0;

  useEffect(() => {
    if (!isRunning || !endsAt) {
      clearTimerInterval();
      return;
    }

    clearTimerInterval();

    intervalRef.current = setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((endsAt - Date.now()) / 1000),
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds <= 0) {
        clearTimerInterval();
        setIsRunning(false);
        setEndsAt(null);
        Vibration.vibrate([0, 250, 120, 250]);
      }
    }, 250);

    return clearTimerInterval;
  }, [clearTimerInterval, endsAt, isRunning]);

  useEffect(() => {
    return clearTimerInterval;
  }, [clearTimerInterval]);

  return useMemo(
    () => ({
      presets,
      selectedDurationSeconds,
      remainingSeconds,
      isRunning,
      hasActiveTimer,
      startTimer,
      pauseTimer,
      resumeTimer,
      toggleTimer,
      resetTimer,
      resetToSelectedDuration,
      stopTimer,
      selectPreset,
      addPreset,
      removePreset,
      movePreset,
      updatePreset,
    }),
    [
      presets,
      selectedDurationSeconds,
      remainingSeconds,
      isRunning,
      hasActiveTimer,
      startTimer,
      pauseTimer,
      resumeTimer,
      toggleTimer,
      resetTimer,
      resetToSelectedDuration,
      stopTimer,
      selectPreset,
      addPreset,
      removePreset,
      movePreset,
      updatePreset,
    ],
  );
}

export type RestTimerController = ReturnType<typeof useRestTimer>;
