import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../../../lib/api';
import { supabase } from '../../../../../lib/supabase';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

export default function ProgramDetailScreen() {
  const { gymId, programId } = useLocalSearchParams<{ gymId: string; programId: string }>();
  const router = useRouter();
  const [programName, setProgramName] = useState<string>('Program');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    // Fetch program name from the gym's program list
    apiFetch(`/gyms/${gymId}/programs`)
      .then((data: any[]) => {
        const p = (data || []).find((pg: any) => pg.id === programId);
        if (p) setProgramName(p.name);
      })
      .catch(console.error);
  }, [gymId, programId]);

  useEffect(() => {
    loadWorkouts();
  }, [programId, selectedDate]);

  async function loadWorkouts() {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/programs/${programId}/workouts?start=${selectedDate}&end=${selectedDate}`
      );
      setWorkouts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function navigateDay(direction: number) {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
  }

  function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        {/* Custom header */}
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Programs" />
          <Text className="text-xl font-bold text-ink px-1">{programName}</Text>
        </View>

        <ScrollView className="flex-1">
          {/* Date navigation */}
          <View className="flex-row items-center justify-between px-5 py-3 bg-card border-b border-rule">
          <TouchableOpacity
            onPress={() => navigateDay(-1)}
            className="w-9 h-9 items-center justify-center rounded-full bg-soft"
          >
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text className="text-sm font-semibold text-ink">
            {formatDateLabel(selectedDate)}
          </Text>
          <TouchableOpacity
            onPress={() => navigateDay(1)}
            className="w-9 h-9 items-center justify-center rounded-full bg-soft"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pt-4 pb-8">
          {loading ? (
            <View className="items-center mt-16">
              <ActivityIndicator size="small" color={colors.accent} />
              <Text className="text-ink-muted text-sm mt-2">Loading workouts...</Text>
            </View>
          ) : workouts.length === 0 ? (
            <View className="items-center mt-16">
              <Ionicons name="barbell-outline" size={40} color={colors.inkMuted} />
              <Text className="text-ink-muted text-sm mt-3">No workouts for this day</Text>
            </View>
          ) : (
            workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                gymId={gymId!}
                userId={userId}
                router={router}
              />
            ))
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function WorkoutCard({
  workout,
  gymId,
  userId,
  router,
}: {
  workout: any;
  gymId: string;
  userId: string | null;
  router: any;
}) {
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [amrapRounds, setAmrapRounds] = useState('');
  const [amrapReps, setAmrapReps] = useState('');
  const [notes, setNotes] = useState('');
  const [rxScaled, setRxScaled] = useState<'rx' | 'scaled'>('rx');
  const [saving, setSaving] = useState(false);
  const [existingStat, setExistingStat] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadExistingStat();
  }, [workout.id, userId]);

  async function loadExistingStat() {
    if (!userId) {
      setLoadingStats(false);
      return;
    }
    try {
      const data = await apiFetch(`/workouts/${workout.id}/stats`);
      if (data && data.length > 0) {
        const userStat = data.find((s: any) => s.user_id === userId) ?? data[0];
        if (userStat.time_seconds != null) {
          setTimeMinutes(String(Math.floor(userStat.time_seconds / 60)));
          setTimeSeconds(String(userStat.time_seconds % 60));
        }
        if (userStat.amrap_rounds != null) setAmrapRounds(String(userStat.amrap_rounds));
        if (userStat.amrap_reps != null) setAmrapReps(String(userStat.amrap_reps));
        if (userStat.notes) setNotes(userStat.notes);
        if (userStat.rx_scaled) setRxScaled(userStat.rx_scaled);
        setExistingStat(userStat);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: any = {
        notes: notes || null,
        rx_scaled: rxScaled,
      };
      if (workout.format === 'time') {
        body.time_seconds = (parseInt(timeMinutes) || 0) * 60 + (parseInt(timeSeconds) || 0);
      } else {
        body.amrap_rounds = parseInt(amrapRounds) || 0;
        body.amrap_reps = parseInt(amrapReps) || 0;
      }
      await apiFetch(`/workouts/${workout.id}/stats`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setExistingStat(body);
      Alert.alert('Saved', 'Stats recorded');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    Alert.alert('Clear Stats', 'Are you sure you want to clear your stats for this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            if (existingStat?.id) {
              await apiFetch(`/workout-stats/${existingStat.id}`, { method: 'DELETE' });
            }
            setTimeMinutes('');
            setTimeSeconds('');
            setAmrapRounds('');
            setAmrapReps('');
            setNotes('');
            setRxScaled('rx');
            setExistingStat(null);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  const isTime = workout.format === 'time';
  const formatLabel = isTime ? 'FOR TIME' : 'AMRAP';

  return (
    <View className="bg-card border border-rule rounded-xl p-4 mb-4">
      {/* Format badge + title */}
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
        <Text className="text-sm text-ink-soft mt-1 leading-5">{workout.description}</Text>
      ) : null}

      {/* Leaderboard link */}
      <TouchableOpacity
        className="flex-row items-center mt-2"
        onPress={() =>
          router.push(
            `/(app)/workout/${workout.id}/leaderboard?gymId=${gymId}` as any
          )
        }
      >
        <Ionicons name="trophy-outline" size={14} color={colors.accent} />
        <Text className="text-accent text-xs font-semibold ml-1">View Leaderboard</Text>
      </TouchableOpacity>

      {/* Stat entry */}
      <View className="mt-4 pt-4 border-t border-rule">
        {loadingStats ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <>
            {/* Input fields */}
            {isTime ? (
              <View className="flex-row items-center mb-3">
                <TextInput
                  className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-card text-ink font-semibold"
                  placeholder="min"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  value={timeMinutes}
                  onChangeText={setTimeMinutes}
                />
                <Text className="text-lg mx-2 font-bold text-ink">:</Text>
                <TextInput
                  className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-card text-ink font-semibold"
                  placeholder="sec"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  value={timeSeconds}
                  onChangeText={setTimeSeconds}
                />
              </View>
            ) : (
              <View className="flex-row items-center mb-3">
                <TextInput
                  className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-card text-ink font-semibold"
                  placeholder="rnds"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  value={amrapRounds}
                  onChangeText={setAmrapRounds}
                />
                <Text className="text-lg mx-2 font-bold text-ink">+</Text>
                <TextInput
                  className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-card text-ink font-semibold"
                  placeholder="reps"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  value={amrapReps}
                  onChangeText={setAmrapReps}
                />
              </View>
            )}

            {/* Rx / Scaled toggle */}
            <View className="flex-row mb-3">
              <TouchableOpacity
                className={`px-4 py-1.5 rounded-full mr-2 ${
                  rxScaled === 'rx'
                    ? 'bg-accent'
                    : 'bg-soft border border-rule'
                }`}
                onPress={() => setRxScaled('rx')}
              >
                <Text
                  className={`text-xs font-semibold ${
                    rxScaled === 'rx' ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  Rx
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-1.5 rounded-full ${
                  rxScaled === 'scaled'
                    ? 'bg-accent'
                    : 'bg-soft border border-rule'
                }`}
                onPress={() => setRxScaled('scaled')}
              >
                <Text
                  className={`text-xs font-semibold ${
                    rxScaled === 'scaled' ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  Scaled
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-sm mb-3 bg-card text-ink"
              placeholder="Notes (optional)"
              placeholderTextColor={colors.inkMuted}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Action buttons */}
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-accent rounded-lg py-3 items-center"
                onPress={handleSave}
                disabled={saving}
              >
                <Text className="text-white text-sm font-semibold">
                  {saving ? 'Saving...' : existingStat ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>

              {existingStat ? (
                <TouchableOpacity
                  className="ml-2 bg-danger-soft rounded-lg py-3 px-4 items-center"
                  onPress={handleClear}
                >
                  <Text className="text-danger text-sm font-semibold">Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
