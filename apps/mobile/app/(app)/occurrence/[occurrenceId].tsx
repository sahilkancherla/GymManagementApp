import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import BackButton from '../../../components/BackButton';

type Profile = { id: string; first_name: string | null; last_name: string | null };
type SignupEntry = {
  id: string;
  user_id: string;
  checked_in: boolean;
  checked_in_at: string | null;
  profile: Profile | null;
};
type OccurrenceDetail = {
  id: string;
  date: string;
  start_time: string;
  is_cancelled: boolean;
  class: {
    id: string;
    name: string;
    gym_id: string;
    capacity: number | null;
    duration_minutes: number | null;
    program_id: string | null;
  } | null;
  coach: Profile | null;
  signups: SignupEntry[];
};
type Workout = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  date: string;
  class_ids: string[];
};

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

function getEndTime(startTime: string, durationMin: number | null): string | null {
  if (!durationMin) return null;
  try {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const period = endH >= 12 ? 'PM' : 'AM';
    const hour12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
    return `${hour12}:${String(endM).padStart(2, '0')} ${period}`;
  } catch {
    return null;
  }
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function profileName(p: Profile | null): string {
  if (!p) return 'Unknown';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
}

function profileInitials(p: Profile | null): string {
  const f = p?.first_name?.[0] || '';
  const l = p?.last_name?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

export default function OccurrenceDetailScreen() {
  const { occurrenceId, gymId } = useLocalSearchParams<{
    occurrenceId: string;
    gymId: string;
  }>();
  const router = useRouter();

  const [occurrence, setOccurrence] = useState<OccurrenceDetail | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch occurrence with signups from the occurrences list
      const occData = await apiFetch(
        `/gyms/${gymId}/occurrences?start=${occurrence?.date || ''}&end=${occurrence?.date || ''}`
      );
      // If we don't have the date yet, we need to fetch differently
      // We'll use a broader approach — find our occurrence in the response
      let occ: OccurrenceDetail | null = null;
      if (occData && Array.isArray(occData)) {
        occ = occData.find((o: any) => o.id === occurrenceId) || null;
      }

      if (occ) {
        setOccurrence(occ);
        // Fetch workouts if class has a program
        if (occ.class?.program_id) {
          try {
            const wkData = await apiFetch(
              `/programs/${occ.class.program_id}/workouts?start=${occ.date}&end=${occ.date}`
            );
            // Filter to workouts that apply to this class
            const applicable = (wkData || []).filter((w: Workout) =>
              w.class_ids.length === 0 || w.class_ids.includes(occ!.class!.id)
            );
            setWorkouts(applicable);
          } catch {
            setWorkouts([]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load occurrence:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gymId, occurrenceId, occurrence?.date]);

  // Initial load — we need to find the occurrence first to get the date
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        // Search a wide range to find the occurrence
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        const end = new Date(today);
        end.setDate(end.getDate() + 60);
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        const occData = await apiFetch(
          `/gyms/${gymId}/occurrences?start=${startStr}&end=${endStr}`
        );
        const occ = (occData || []).find((o: any) => o.id === occurrenceId);
        if (occ) {
          setOccurrence(occ);
          if (occ.class?.program_id) {
            try {
              const wkData = await apiFetch(
                `/programs/${occ.class.program_id}/workouts?start=${occ.date}&end=${occ.date}`
              );
              const applicable = (wkData || []).filter((w: Workout) =>
                w.class_ids.length === 0 || w.class_ids.includes(occ.class!.id)
              );
              setWorkouts(applicable);
            } catch {
              setWorkouts([]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load occurrence:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId, occurrenceId]);

  async function handleRefresh() {
    if (!occurrence) return;
    setRefreshing(true);
    try {
      const occData = await apiFetch(
        `/gyms/${gymId}/occurrences?start=${occurrence.date}&end=${occurrence.date}`
      );
      const occ = (occData || []).find((o: any) => o.id === occurrenceId);
      if (occ) {
        setOccurrence(occ);
        if (occ.class?.program_id) {
          const wkData = await apiFetch(
            `/programs/${occ.class.program_id}/workouts?start=${occ.date}&end=${occ.date}`
          );
          const applicable = (wkData || []).filter((w: Workout) =>
            w.class_ids.length === 0 || w.class_ids.includes(occ.class!.id)
          );
          setWorkouts(applicable);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignUp() {
    setSignUpLoading(true);
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not sign up');
    } finally {
      setSignUpLoading(false);
    }
  }

  async function handleCancelSignup() {
    setSignUpLoading(true);
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, { method: 'DELETE' });
      await handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not cancel');
    } finally {
      setSignUpLoading(false);
    }
  }

  const signups = occurrence?.signups || [];
  const isSignedUp = currentUserId ? signups.some((s) => s.user_id === currentUserId) : false;
  const capacity = occurrence?.class?.capacity ?? null;
  const atCapacity = capacity != null && signups.length >= capacity;
  const isCancelled = !!occurrence?.is_cancelled;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 bg-base justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </>
    );
  }

  if (!occurrence) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 bg-base justify-center items-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted mt-3 text-center">
            Could not load class details.
          </Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-accent font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const timeStr = formatTime(occurrence.start_time);
  const endTimeStr = getEndTime(occurrence.start_time, occurrence.class?.duration_minutes ?? null);
  const coachName = occurrence.coach ? profileName(occurrence.coach) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Back" />
          <Text className="text-xl font-bold text-ink px-1">{occurrence.class?.name || 'Class'}</Text>
        </View>
      <ScrollView
        className="flex-1 bg-base"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {/* Class info header */}
        <View className="bg-card border-b border-rule px-5 py-5">
          <Text className="text-sm text-ink-muted">{formatDateLabel(occurrence.date)}</Text>

          <View className="flex-row items-center mt-3 flex-wrap">
            <View className="flex-row items-center mr-4">
              <Ionicons name="time-outline" size={15} color={colors.inkSoft} />
              <Text className="text-sm text-ink-soft ml-1.5">
                {timeStr}{endTimeStr ? ` – ${endTimeStr}` : ''}
              </Text>
            </View>
            {occurrence.class?.duration_minutes && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="hourglass-outline" size={15} color={colors.inkSoft} />
                <Text className="text-sm text-ink-soft ml-1.5">
                  {occurrence.class.duration_minutes} min
                </Text>
              </View>
            )}
            {coachName && (
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={15} color={colors.inkSoft} />
                <Text className="text-sm text-ink-soft ml-1.5">{coachName}</Text>
              </View>
            )}
          </View>

          {/* Status badges */}
          {isCancelled && (
            <View className="bg-danger-soft self-start px-3 py-1 rounded-full mt-3">
              <Text className="text-xs font-bold text-danger uppercase">Cancelled</Text>
            </View>
          )}

          {/* Sign-up action */}
          {!isCancelled && (
            <View className="mt-4">
              {isSignedUp ? (
                <View className="flex-row gap-2">
                  <View className="flex-1 bg-accent-soft border border-accent-rule rounded-lg py-3 flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    <Text className="text-sm font-semibold text-accent-ink ml-1.5">You're signed up</Text>
                  </View>
                  <TouchableOpacity
                    className="border border-rule rounded-lg px-4 py-3 items-center justify-center"
                    onPress={handleCancelSignup}
                    disabled={signUpLoading}
                  >
                    {signUpLoading ? (
                      <ActivityIndicator size="small" color={colors.inkMuted} />
                    ) : (
                      <Text className="text-xs font-semibold text-ink-soft">Cancel</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : atCapacity ? (
                <View className="bg-sunken rounded-lg py-3 items-center">
                  <Text className="text-sm font-semibold text-ink-muted">Class Full</Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="bg-accent rounded-lg py-3 items-center"
                  onPress={handleSignUp}
                  disabled={signUpLoading}
                >
                  {signUpLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Sign Up</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Sign-ups section */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Sign-ups
            </Text>
            <Text className="text-xs text-ink-muted">
              {signups.length}{capacity != null ? ` / ${capacity}` : ''}
            </Text>
          </View>

          {signups.length === 0 ? (
            <View className="bg-card border border-rule rounded-xl p-5 items-center">
              <Ionicons name="people-outline" size={28} color={colors.inkFaint} />
              <Text className="text-sm text-ink-muted mt-2">No sign-ups yet</Text>
            </View>
          ) : (
            <View className="bg-card border border-rule rounded-xl overflow-hidden">
              {signups.map((signup, idx) => {
                const isCurrentUser = signup.user_id === currentUserId;
                return (
                  <View
                    key={signup.id}
                    className={`flex-row items-center px-4 py-3 ${
                      idx < signups.length - 1 ? 'border-b border-rule' : ''
                    }`}
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                        isCurrentUser ? 'bg-accent' : 'bg-soft'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isCurrentUser ? 'text-white' : 'text-ink-soft'
                        }`}
                      >
                        {profileInitials(signup.profile)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${isCurrentUser ? 'text-accent' : 'text-ink'}`}>
                        {profileName(signup.profile)}
                        {isCurrentUser ? ' (You)' : ''}
                      </Text>
                    </View>
                    {signup.checked_in && (
                      <View className="bg-accent-soft px-2 py-0.5 rounded-full flex-row items-center">
                        <Ionicons name="checkmark" size={11} color={colors.accent} />
                        <Text className="text-[10px] font-semibold text-accent-ink ml-0.5">
                          Checked In
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Workouts section */}
        <View className="px-5 pt-5">
          <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Workout
          </Text>

          {workouts.length === 0 ? (
            <View className="bg-card border border-rule rounded-xl p-5 items-center">
              <Ionicons name="barbell-outline" size={28} color={colors.inkFaint} />
              <Text className="text-sm text-ink-muted mt-2">No workout assigned for this class</Text>
            </View>
          ) : (
            workouts.map((workout) => {
              const isTime = workout.format === 'time';
              const formatLabel = isTime ? 'FOR TIME' : 'AMRAP';
              return (
                <View key={workout.id} className="bg-card border border-rule rounded-xl p-4 mb-3">
                  <View className="flex-row items-center mb-1">
                    <View
                      className={`px-2 py-0.5 rounded mr-2 ${
                        isTime ? 'bg-soft' : 'bg-accent-soft'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold tracking-wide ${
                          isTime ? 'text-ink-soft' : 'text-accent-ink'
                        }`}
                      >
                        {formatLabel}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-base font-bold text-ink mt-1">{workout.title}</Text>

                  {workout.description ? (
                    <Text className="text-sm text-ink-soft mt-1.5 leading-5">
                      {workout.description}
                    </Text>
                  ) : null}

                  {/* Leaderboard link */}
                  <TouchableOpacity
                    className="flex-row items-center mt-3 pt-3 border-t border-rule"
                    onPress={() =>
                      router.push(
                        `/(app)/workout/${workout.id}/leaderboard?gymId=${gymId}` as any
                      )
                    }
                  >
                    <Ionicons name="trophy-outline" size={15} color={colors.accent} />
                    <Text className="text-accent text-sm font-semibold ml-1.5">
                      View Results
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.accent} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}
