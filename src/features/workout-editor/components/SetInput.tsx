import { memo, useState } from "react";
import { TextInput, View, type StyleProp, type TextStyle } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type SetInputProps = {
  fieldId: string;
  focusedFieldId: string | null;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onContentSizeChange?: (height: number) => void;
  placeholder?: string;
  setFocusedFieldId: (fieldId: string | null) => void;
  style?: StyleProp<TextStyle>;
  value: string;
  width?: number;
};

export const SetInput = memo(function SetInput({
  fieldId,
  focusedFieldId,
  placeholder,
  keyboardType,
  multiline,
  onContentSizeChange,
  onChangeText,
  setFocusedFieldId,
  style,
  value,
  width,
}: SetInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const showFocus = isFocused || focusedFieldId === fieldId;

  return (
    <View
      style={[
        styles.setInputWrap,
        width ? { width } : null,
        multiline && styles.notesInputWrap,
      ]}
    >
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={() => {
          setIsFocused(false);
          setFocusedFieldId(null);
        }}
        onContentSizeChange={
          onContentSizeChange
            ? (event) => {
                const height = event.nativeEvent.contentSize.height;
                // Clamp to 38px until the content genuinely wraps to a second line (> 50px)
                const clampedHeight = height < 50 ? 38 : Math.min(120, height);
                onContentSizeChange(clampedHeight);
              }
            : undefined
        }
        onChangeText={onChangeText}
        onFocus={() => {
          setIsFocused(true);
          setFocusedFieldId(fieldId);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        scrollEnabled={multiline}
        style={[
          styles.setInput,
          width ? { width } : null,
          showFocus && styles.inputFocused,
          style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value ?? ""}
      />
    </View>
  );
});
