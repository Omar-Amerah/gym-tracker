import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import {
  clearAllLocalData,
  exportBackupToCsvText,
  getDatabaseSummary,
  importBackupFromCsvText,
  resetSeedData,
} from "@/db/backupRepository";
import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";

import { BottomSheet } from "./bottom-sheet";

type DataBackupSheetProps = {
  onClose: () => void;
  onDataChanged?: () => Promise<void> | void;
  visible: boolean;
};

export function DataBackupSheet({
  onClose,
  onDataChanged,
  visible,
}: DataBackupSheetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isDataActionRunning = isExporting || isImporting || isClearing;

  const notifyDataChanged = useCallback(async () => {
    await onDataChanged?.();
  }, [onDataChanged]);

  const exportBackup = useCallback(async () => {
    if (isDataActionRunning) return;

    onClose();
    setIsExporting(true);
    try {
      const csvText = await exportBackupToCsvText();
      const file = new File(Paths.cache, `${createBackupFilename()}.csv`);
      file.create({ overwrite: true });
      file.write(csvText);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Export Gym Tracker Backup",
          mimeType: "text/csv",
        });
      } else {
        Alert.alert("Backup created", file.uri);
      }
    } catch (exportError) {
      console.error("Failed to export backup", exportError);
      Alert.alert("Export failed", "Could not create a backup file.");
    } finally {
      setIsExporting(false);
    }
  }, [isDataActionRunning, onClose]);

  const chooseImportFile = useCallback(async () => {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ["text/csv", "text/plain", "text/*", "application/vnd.ms-excel"],
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Import failed", "No backup file was selected.");
        return;
      }

      const backupText = await new File(asset.uri).text();
      if (!hasExpectedBackupMarkers(backupText)) {
        Alert.alert(
          "Invalid backup",
          "This file does not look like a Gym Tracker CSV backup.",
        );
        return;
      }

      Alert.alert(
        "Replace local data?",
        "Your current routines, exercises and workout logs will be replaced.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: () => {
              setIsImporting(true);
              void importBackupFromCsvText(backupText)
                .then(notifyDataChanged)
                .then(() => {
                  Alert.alert("Import complete.");
                })
                .catch((importError) => {
                  console.error("Failed to import backup", importError);
                  Alert.alert(
                    "Import failed",
                    "The backup could not be imported. Your data was not replaced.",
                  );
                })
                .finally(() => setIsImporting(false));
            },
          },
        ],
      );
    } catch (importError) {
      console.error("Failed to choose backup file", importError);
      Alert.alert("Import failed", "Could not read the selected backup file.");
    } finally {
      setIsImporting(false);
    }
  }, [notifyDataChanged]);

  const confirmImportBackup = useCallback(() => {
    if (isDataActionRunning) return;

    onClose();
    Alert.alert(
      "Import backup?",
      "This will replace your current local data with the selected backup. Export a backup first if you want to keep your current data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose File",
          onPress: () => {
            void chooseImportFile();
          },
        },
      ],
    );
  }, [chooseImportFile, isDataActionRunning, onClose]);

  const confirmClearLocalData = useCallback(() => {
    if (isDataActionRunning) return;

    onClose();
    Alert.alert(
      "Clear local data?",
      "This will permanently delete all routines, exercises and workout logs stored on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setIsClearing(true);
            void clearAllLocalData()
              .then(notifyDataChanged)
              .then(() => Alert.alert("Local data cleared."))
              .catch((clearError) => {
                console.error("Failed to clear local data", clearError);
                Alert.alert("Clear failed", "Could not clear local data.");
              })
              .finally(() => setIsClearing(false));
          },
        },
      ],
    );
  }, [isDataActionRunning, notifyDataChanged, onClose]);

  const confirmResetSeedData = useCallback(() => {
    if (isDataActionRunning) return;

    onClose();
    Alert.alert(
      "Reset seed data?",
      "This will clear local data and restore the default categories, exercises and routines.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setIsClearing(true);
            void resetSeedData()
              .then(notifyDataChanged)
              .then(() => Alert.alert("Seed data restored."))
              .catch((resetError) => {
                console.error("Failed to reset seed data", resetError);
                Alert.alert("Reset failed", "Could not restore seed data.");
              })
              .finally(() => setIsClearing(false));
          },
        },
      ],
    );
  }, [isDataActionRunning, notifyDataChanged, onClose]);

  const showDatabaseSummary = useCallback(async () => {
    if (isDataActionRunning) return;

    onClose();
    try {
      const summary = await getDatabaseSummary();
      Alert.alert("Database Summary", formatDatabaseSummary(summary));
    } catch (summaryError) {
      console.error("Failed to load database summary", summaryError);
      Alert.alert("Summary failed", "Could not load database counts.");
    }
  }, [isDataActionRunning, onClose]);

  return (
    <BottomSheet onClose={onClose} title="Data & Backup" visible={visible}>
      <BackupAction
        disabled={isDataActionRunning}
        icon="database-export-outline"
        label={isExporting ? "Exporting..." : "Export CSV Backup"}
        onPress={exportBackup}
      />
      <BackupAction
        disabled={isDataActionRunning}
        icon="database-import-outline"
        label={isImporting ? "Importing..." : "Import CSV Backup"}
        onPress={confirmImportBackup}
      />
      <BackupAction
        disabled={isDataActionRunning}
        icon="database-search-outline"
        label="Database Summary"
        onPress={() => {
          void showDatabaseSummary();
        }}
      />
      <BackupAction
        destructive
        disabled={isDataActionRunning}
        icon="trash-can-outline"
        label={isClearing ? "Clearing..." : "Clear Local Data"}
        onPress={confirmClearLocalData}
      />
      <BackupAction
        destructive
        disabled={isDataActionRunning}
        icon="database-refresh-outline"
        label="Reset Seed Data"
        onPress={confirmResetSeedData}
      />
    </BottomSheet>
  );
}

function BackupAction({
  destructive = false,
  disabled,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        disabled && styles.sheetActionDisabled,
        pressed && styles.sheetActionPressed,
      ]}
    >
      <MaterialCommunityIcons
        color={destructive ? "#ffaaa1" : colors.textPrimary}
        name={icon}
        size={24}
        style={styles.sheetIcon}
      />
      <Text style={[styles.sheetText, destructive && styles.deleteText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createBackupFilename() {
  const date = new Date();
  const value = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("-");
  return `gym-tracker-backup-${value}`;
}

function hasExpectedBackupMarkers(text: string) {
  return [
    "categories",
    "exercises",
    "routines",
    "routine_exercises",
    "workouts",
    "workout_exercises",
    "workout_sets",
  ].every((table) => text.includes(`# table: ${table}`));
}

function formatDatabaseSummary(summary: Record<string, number>) {
  const labels: Record<string, string> = {
    categories: "Categories",
    exercises: "Exercises",
    routines: "Routines",
    routine_exercises: "Routine Exercises",
    workouts: "Workouts",
    workout_exercises: "Workout Exercises",
    workout_sets: "Workout Sets",
    body_stats: "Body Stats",
  };

  return Object.entries(labels)
    .filter(([table]) => summary[table] !== undefined)
    .map(([table, label]) => `${label}: ${summary[table]}`)
    .join("\n");
}

const styles = StyleSheet.create({
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 48,
  },
  sheetActionDisabled: {
    opacity: 0.55,
  },
  sheetActionPressed: {
    opacity: animations.pressOpacity,
  },
  sheetIcon: {
    width: 34,
  },
  sheetText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
  },
  deleteText: {
    color: "#ffaaa1",
  },
});
