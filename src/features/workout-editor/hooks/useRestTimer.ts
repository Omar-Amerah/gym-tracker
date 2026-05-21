import { useCallback, useEffect, useState } from "react";
import { Vibration } from "react-native";

const DEFAULT_PRESETS = [50, 40, 30, 60, 90, 120, 150, 180];
const MAX_TIMER_SECONDS = 59 * 60 + 59;

export function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.min(MAX_TIMER_SECONDS, seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(
    2,
    "0",
  )}`;
}

export function useRestTimer() {
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState(
    DEFAULT_PRESETS[0],
  );
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_PRESETS[0],
  );
  const [isRunning, setIsRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning || !endsAt) return;

    const tick = () => {
      const nextRemaining = Math.max(
        0,
        Math.ceil((endsAt - Date.now()) / 1000),
      );
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        setIsRunning(false);
        setEndsAt(null);
        Vibration.vibrate(180);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, isRunning]);

  const startTimer = useCallback(
    (seconds?: number) => {
      const duration = Math.max(
        1,
        Math.min(seconds ?? selectedDurationSeconds, MAX_TIMER_SECONDS),
      );
      setSelectedDurationSeconds(duration);
      setRemainingSeconds(duration);
      setEndsAt(Date.now() + duration * 1000);
      setIsRunning(true);
    },
    [selectedDurationSeconds],
  );

  const pauseTimer = useCallback(() => {
    if (!isRunning || !endsAt) return;
    setRemainingSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    setIsRunning(false);
    setEndsAt(null);
  }, [endsAt, isRunning]);

  const resumeTimer = useCallback(() => {
    if (remainingSeconds <= 0) return;
    setEndsAt(Date.now() + remainingSeconds * 1000);
    setIsRunning(true);
  }, [remainingSeconds]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
      return;
    }

    if (remainingSeconds > 0) {
      resumeTimer();
      return;
    }

    startTimer();
  }, [isRunning, pauseTimer, remainingSeconds, resumeTimer, startTimer]);

  const resetTimer = useCallback(
    (seconds?: number) => {
      const duration = Math.max(
        1,
        Math.min(seconds ?? selectedDurationSeconds, MAX_TIMER_SECONDS),
      );
      setSelectedDurationSeconds(duration);
      setRemainingSeconds(duration);
      setEndsAt(null);
      setIsRunning(false);
    },
    [selectedDurationSeconds],
  );

  const stopTimer = useCallback(() => {
    setRemainingSeconds(0);
    setEndsAt(null);
    setIsRunning(false);
  }, []);

  const selectPreset = useCallback(
    (seconds: number) => {
      setSelectedDurationSeconds(seconds);
      startTimer(seconds);
    },
    [startTimer],
  );

  const addPreset = useCallback((seconds: number) => {
    const duration = Math.max(1, Math.min(seconds, MAX_TIMER_SECONDS));
    setPresets((current) =>
      current.includes(duration) ? current : [...current, duration],
    );
    setSelectedDurationSeconds(duration);
    setRemainingSeconds(duration);
  }, []);

  const removePreset = useCallback((seconds: number) => {
    setPresets((current) => current.filter((preset) => preset !== seconds));
    setSelectedDurationSeconds((current) =>
      current === seconds ? DEFAULT_PRESETS[0] : current,
    );
    setRemainingSeconds((current) =>
      current === seconds ? DEFAULT_PRESETS[0] : current,
    );
  }, []);

  const updatePreset = useCallback((oldSeconds: number, newSeconds: number) => {
    const duration = Math.max(1, Math.min(newSeconds, MAX_TIMER_SECONDS));
    setPresets((current) =>
      current.map((preset) => (preset === oldSeconds ? duration : preset)),
    );
    setSelectedDurationSeconds((current) =>
      current === oldSeconds ? duration : current,
    );
    setRemainingSeconds((current) => (current === oldSeconds ? duration : current));
  }, []);

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

  return {
    addPreset,
    endsAt,
    isRunning,
    movePreset,
    pauseTimer,
    presets,
    remainingSeconds,
    removePreset,
    resetTimer,
    resumeTimer,
    selectPreset,
    selectedDurationSeconds,
    startTimer,
    stopTimer,
    toggleTimer,
    updatePreset,
  };
}
