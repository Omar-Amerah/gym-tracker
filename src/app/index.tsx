import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym Tracker</Text>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Start Workout</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Workout History</Text>
      </Pressable>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Exercises</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});
