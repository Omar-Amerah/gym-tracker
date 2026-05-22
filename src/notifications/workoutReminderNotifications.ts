import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getActiveDraftWorkout } from "@/db/workoutsRepository";

const WORKOUT_REMINDER_CHANNEL_ID = "workout-reminders";
const WORKOUT_REMINDER_IDENTIFIER = "unfinished-workout-reminder";
const WORKOUT_REMINDER_TYPE = "unfinished-workout";
const WORKOUT_REMINDER_SECONDS = 5 * 60;

let permissionRequestPromise: Promise<boolean> | null = null;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function prepareWorkoutReminderNotifications() {
  if (Platform.OS === "web") return false;

  if (permissionRequestPromise) {
    return permissionRequestPromise;
  }

  permissionRequestPromise = requestNotificationPermissions();

  try {
    return await permissionRequestPromise;
  } catch (error) {
    console.warn("Failed to prepare workout reminder notifications", error);
    return false;
  } finally {
    permissionRequestPromise = null;
  }
}

export async function scheduleWorkoutReminderNotificationIfNeeded() {
  if (Platform.OS === "web") return;

  try {
    const activeDraft = await getActiveDraftWorkout();
    if (!activeDraft) {
      await cancelWorkoutReminderNotifications();
      return;
    }

    const notificationsReady = await prepareWorkoutReminderNotifications();
    if (!notificationsReady) return;

    await Notifications.cancelScheduledNotificationAsync(
      WORKOUT_REMINDER_IDENTIFIER,
    );
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_REMINDER_IDENTIFIER,
      content: {
        title: "You have an unfinished workout",
        body: "Open Gym Tracker to finish logging it.",
        data: {
          type: WORKOUT_REMINDER_TYPE,
          workoutId: activeDraft.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: WORKOUT_REMINDER_SECONDS,
        channelId: WORKOUT_REMINDER_CHANNEL_ID,
      },
    });
  } catch (error) {
    console.warn("Failed to schedule workout reminder notification", error);
  }
}

export async function cancelWorkoutReminderNotifications({
  dismissPresented = false,
}: { dismissPresented?: boolean } = {}) {
  if (Platform.OS === "web") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      WORKOUT_REMINDER_IDENTIFIER,
    );

    if (!dismissPresented) return;

    const presentedNotifications =
      await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presentedNotifications
        .filter((notification) =>
          isWorkoutReminderRequest(notification.request),
        )
        .map((notification) =>
          Notifications.dismissNotificationAsync(
            notification.request.identifier,
          ),
        ),
    );
  } catch (error) {
    console.warn("Failed to cancel workout reminder notifications", error);
  }
}

export async function prepareWorkoutReminderNotificationsForActiveDraft() {
  if (Platform.OS === "web") return;

  try {
    const activeDraft = await getActiveDraftWorkout();
    if (activeDraft) {
      await prepareWorkoutReminderNotifications();
    }
  } catch (error) {
    console.warn("Failed to check active workout for reminders", error);
  }
}

async function requestNotificationPermissions() {
  await ensureWorkoutReminderChannel();

  const existingPermissions = await Notifications.getPermissionsAsync();
  if (allowsNotifications(existingPermissions)) {
    return true;
  }

  if (!existingPermissions.canAskAgain) {
    return false;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return allowsNotifications(requestedPermissions);
}

async function ensureWorkoutReminderChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(
    WORKOUT_REMINDER_CHANNEL_ID,
    {
      name: "Workout reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  );
}

function allowsNotifications(
  permissions: Notifications.NotificationPermissionsStatus,
) {
  return (
    permissions.granted ||
    permissions.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

function isWorkoutReminderRequest(request: Notifications.NotificationRequest) {
  return (
    request.identifier === WORKOUT_REMINDER_IDENTIFIER ||
    request.content.data?.type === WORKOUT_REMINDER_TYPE
  );
}
