import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import { formatMonthTitle, getCalendarDays } from "../workoutUtils";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type WorkoutDatePickerSheetProps = {
  calendarMonth: Date;
  onClose: () => void;
  onMoveMonth: (direction: -1 | 1) => void;
  onSelectDay: (day: number) => void;
  selectedDate: Date;
  visible: boolean;
};

export function WorkoutDatePickerSheet({
  calendarMonth,
  onClose,
  onMoveMonth,
  onSelectDay,
  selectedDate,
  visible,
}: WorkoutDatePickerSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.pickerHeader}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={() => onMoveMonth(-1)}
          style={({ pressed }) => [
            styles.pickerNavButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="chevron-left"
            size={25}
          />
        </Pressable>
        <Text style={styles.pickerTitle}>{formatMonthTitle(calendarMonth)}</Text>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() => onMoveMonth(1)}
          style={({ pressed }) => [
            styles.pickerNavButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="chevron-right"
            size={25}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {getCalendarDays(calendarMonth).map((day, index) => {
          const isSelected =
            day !== null &&
            selectedDate.getFullYear() === calendarMonth.getFullYear() &&
            selectedDate.getMonth() === calendarMonth.getMonth() &&
            selectedDate.getDate() === day;

          return day === null ? (
            <View key={`empty-${index}`} style={styles.calendarCell} />
          ) : (
            <Pressable
              accessibilityRole="button"
              key={`${calendarMonth.getMonth()}-${day}`}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.calendarCell,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.calendarPill,
                  isSelected && styles.calendarPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.calendarText,
                    isSelected && styles.calendarTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
