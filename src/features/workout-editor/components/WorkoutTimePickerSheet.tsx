import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { TimePickerTarget } from "../types";
import { formatTimeField, parseTimeField } from "../workoutUtils";

const TIME_OPTION_HEIGHT = 42;

type WorkoutTimePickerSheetProps = {
  currentTime: string;
  onClose: () => void;
  onSetNow: () => void;
  onUpdateTime: (part: "hour" | "minute", value: string) => void;
  target: TimePickerTarget;
  visible: boolean;
};

export function WorkoutTimePickerSheet({
  currentTime,
  onClose,
  onSetNow,
  onUpdateTime,
  target,
  visible,
}: WorkoutTimePickerSheetProps) {
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const selectedTime = target
    ? parseTimeField(currentTime || formatTimeField(new Date()))
    : null;

  useEffect(() => {
    if (!visible || !selectedTime) return;

    const hourIndex = Number(selectedTime.hour);
    const minuteIndex = Number(selectedTime.minute);
    const timer = setTimeout(() => {
      hourScrollRef.current?.scrollTo({
        animated: false,
        y: Math.max(0, (hourIndex - 2) * TIME_OPTION_HEIGHT),
      });
      minuteScrollRef.current?.scrollTo({
        animated: false,
        y: Math.max(0, (minuteIndex - 2) * TIME_OPTION_HEIGHT),
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [selectedTime, visible]);

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.sheetTitle}>
        {target === "endTime" ? "End Time" : "Start Time"}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSetNow}
        style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          color={colors.accent}
          name="clock-check-outline"
          size={24}
          style={styles.sheetIcon}
        />
        <Text style={styles.sheetText}>Use Current Time</Text>
      </Pressable>
      <View style={styles.timePicker}>
        <ScrollView
          ref={hourScrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.timeColumn}
        >
          {Array.from({ length: 24 }, (_, index) =>
            String(index).padStart(2, "0"),
          ).map((hour) => (
            <Pressable
              accessibilityRole="button"
              key={hour}
              onPress={() => onUpdateTime("hour", hour)}
              style={[
                styles.timeOption,
                selectedTime?.hour === hour && styles.timeOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  selectedTime?.hour === hour &&
                    styles.timeOptionTextSelected,
                ]}
              >
                {hour}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.timeDivider}>:</Text>
        <ScrollView
          ref={minuteScrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.timeColumn}
        >
          {Array.from({ length: 60 }, (_, index) =>
            String(index).padStart(2, "0"),
          ).map((minute) => (
            <Pressable
              accessibilityRole="button"
              key={minute}
              onPress={() => onUpdateTime("minute", minute)}
              style={[
                styles.timeOption,
                selectedTime?.minute === minute && styles.timeOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  selectedTime?.minute === minute &&
                    styles.timeOptionTextSelected,
                ]}
              >
                {minute}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
