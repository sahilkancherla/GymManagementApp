import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import { useGym } from '../../../lib/gym-context';
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
type GymMember = {
  user_id: string;
  profile: { first_name: string | null; last_name: string | null } | null;
  roles: string[];
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

function profileName(p: Profile | { first_name: string | null; last_name: string | null } | null): string {
  if (!p) return 'Unknown';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
}

function profileInitials(p: Profile | { first_name: string | null; last_name: string | null } | null): string {
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
  const { activeGym } = useGym();
  const canCheckIn = (activeGym?.roles || []).some((r: string) => r === 'admin' || r === 'coach');

  const [occurrence, setOccurrence] = useState<OccurrenceDetail | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);

  // Add member modal state
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [allMembers, setAllMembers] = useState<GymMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Scores by user_id → { workoutId → stat }
  const [scoresByUser, setScoresByUser] = useState<Map<string, Map<string, any>>>(new Map());

  // Score entry state
  const [scoringSignup, setScoringSignup] = useState<SignupEntry | null>(null);
  const [scoreTimeMin, setScoreTimeMin] = useState('');
  const [scoreTimeSec, setScoreTimeSec] = useState('');
  const [scoreRounds, setScoreRounds] = useState('');
  const [scoreReps, setScoreReps] = useState('');
  const [scoreNotes, setScoreNotes] = useState('');
  const [scoreRxScaled, setScoreRxScaled] = useState<'rx' | 'scaled'>('rx');
  const [scoreSaving, setScoreSaving] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

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
              loadAllScores(applicable);
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
          try {
            const wkData = await apiFetch(
              `/programs/${occ.class.program_id}/workouts?start=${occ.date}&end=${occ.date}`
            );
            const applicable = (wkData || []).filter((w: Workout) =>
              w.class_ids.length === 0 || w.class_ids.includes(occ.class!.id)
            );
            setWorkouts(applicable);
            loadAllScores(applicable);
          } catch {
            setWorkouts([]);
          }
        } else {
          setWorkouts([]);
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

  async function handleCheckIn(signupId: string) {
    setCheckInLoading(signupId);
    try {
      await apiFetch(`/occurrences/${occurrenceId}/check-in/${signupId}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not check in');
    } finally {
      setCheckInLoading(null);
    }
  }

  async function handleUndoCheckIn(signupId: string) {
    Alert.alert('Undo Check-in', 'Remove this check-in?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo',
        style: 'destructive',
        onPress: async () => {
          setCheckInLoading(signupId);
          try {
            await apiFetch(`/occurrences/${occurrenceId}/check-in/${signupId}`, {
              method: 'DELETE',
            });
            await handleRefresh();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not undo check-in');
          } finally {
            setCheckInLoading(null);
          }
        },
      },
    ]);
  }

  // Add member flow
  async function openAddMember() {
    setAddMemberVisible(true);
    setMemberSearch('');
    setMembersLoading(true);
    try {
      const data = await apiFetch(`/gyms/${gymId}/members`);
      setAllMembers(data || []);
    } catch {
      setAllMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleAddMember(userId: string) {
    setAddingUserId(userId);
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      setAddMemberVisible(false);
      await handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add member');
    } finally {
      setAddingUserId(null);
    }
  }

  async function loadAllScores(wks: Workout[]) {
    if (wks.length === 0) { setScoresByUser(new Map()); return; }
    try {
      const allStats = await Promise.all(
        wks.map((w) => apiFetch(`/workouts/${w.id}/stats`).then((d: any[]) => ({ workoutId: w.id, stats: d || [] })))
      );
      const map = new Map<string, Map<string, any>>();
      for (const { workoutId, stats } of allStats) {
        for (const stat of stats) {
          if (!map.has(stat.user_id)) map.set(stat.user_id, new Map());
          map.get(stat.user_id)!.set(workoutId, stat);
        }
      }
      setScoresByUser(map);
    } catch {
      setScoresByUser(new Map());
    }
  }

  function formatScoreInline(stat: any, format: string): string {
    if (format === 'time' && stat.time_seconds != null) {
      const min = Math.floor(stat.time_seconds / 60);
      const sec = stat.time_seconds % 60;
      return `${min}:${String(sec).padStart(2, '0')}`;
    }
    if (format === 'amrap') {
      return `${stat.amrap_rounds ?? 0} + ${stat.amrap_reps ?? 0}`;
    }
    return '';
  }

  // Score entry flow
  function openScoreEntry(signup: SignupEntry) {
    setScoringSignup(signup);
    setScoreTimeMin('');
    setScoreTimeSec('');
    setScoreRounds('');
    setScoreReps('');
    setScoreNotes('');
    setScoreRxScaled('rx');

    // If there's only one workout, pre-load existing stats for this user
    if (workouts.length === 1) {
      loadExistingScore(workouts[0].id, signup.user_id);
    }
  }

  async function loadExistingScore(workoutId: string, userId: string) {
    try {
      const data = await apiFetch(`/workouts/${workoutId}/stats`);
      const stat = (data || []).find((s: any) => s.user_id === userId);
      if (stat) {
        if (stat.time_seconds != null) {
          setScoreTimeMin(String(Math.floor(stat.time_seconds / 60)));
          setScoreTimeSec(String(stat.time_seconds % 60));
        }
        if (stat.amrap_rounds != null) setScoreRounds(String(stat.amrap_rounds));
        if (stat.amrap_reps != null) setScoreReps(String(stat.amrap_reps));
        if (stat.notes) setScoreNotes(stat.notes);
        if (stat.rx_scaled) setScoreRxScaled(stat.rx_scaled);
      }
    } catch {}
  }

  async function handleSaveScore(workoutId: string) {
    if (!scoringSignup) return;
    setScoreSaving(true);
    try {
      const workout = workouts.find((w) => w.id === workoutId);
      const body: any = {
        user_id: scoringSignup.user_id,
        notes: scoreNotes || null,
        rx_scaled: scoreRxScaled,
      };
      if (workout?.format === 'time') {
        body.time_seconds = (parseInt(scoreTimeMin) || 0) * 60 + (parseInt(scoreTimeSec) || 0);
      } else {
        body.amrap_rounds = parseInt(scoreRounds) || 0;
        body.amrap_reps = parseInt(scoreReps) || 0;
      }
      await apiFetch(`/workouts/${workoutId}/stats`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      Alert.alert('Saved', `Score recorded for ${profileName(scoringSignup.profile)}`);
      setScoringSignup(null);
      loadAllScores(workouts);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save score');
    } finally {
      setScoreSaving(false);
    }
  }

  const signups = occurrence?.signups || [];
  const isSignedUp = currentUserId ? signups.some((s) => s.user_id === currentUserId) : false;
  const capacity = occurrence?.class?.capacity ?? null;
  const atCapacity = capacity != null && signups.length >= capacity;
  const isCancelled = !!occurrence?.is_cancelled;
  const signedUpUserIds = new Set(signups.map((s) => s.user_id));

  // Filter members for add modal
  const filteredMembers = allMembers.filter((m) => {
    if (signedUpUserIds.has(m.user_id)) return false;
    if (!memberSearch.trim()) return true;
    const name = profileName(m.profile).toLowerCase();
    return name.includes(memberSearch.toLowerCase());
  });

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

        {/* Sign-ups / Attendance section */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              {canCheckIn ? 'Attendance' : 'Sign-ups'}
            </Text>
            <Text className="text-xs text-ink-muted">
              {canCheckIn
                ? `${signups.filter((s) => s.checked_in).length} checked in · ${signups.length} signed up`
                : `${signups.length}${capacity != null ? ` / ${capacity}` : ''}`
              }
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
                const isCheckingIn = checkInLoading === signup.id;
                return (
                  <View
                    key={signup.id}
                    className={`px-4 py-3 ${
                      idx < signups.length - 1 ? 'border-b border-rule' : ''
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                          signup.checked_in
                            ? 'bg-accent'
                            : isCurrentUser
                              ? 'bg-accent'
                              : 'bg-soft'
                        }`}
                      >
                        {signup.checked_in ? (
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        ) : (
                          <Text
                            className={`text-xs font-bold ${
                              isCurrentUser ? 'text-white' : 'text-ink-soft'
                            }`}
                          >
                            {profileInitials(signup.profile)}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className={`text-sm font-medium ${isCurrentUser ? 'text-accent' : 'text-ink'}`}>
                          {profileName(signup.profile)}
                          {isCurrentUser ? ' (You)' : ''}
                        </Text>
                        {signup.checked_in && (
                          <Text className="text-[10px] text-ink-muted mt-0.5">
                            Checked in
                          </Text>
                        )}
                      </View>
                      {canCheckIn && !isCancelled && (
                        signup.checked_in ? (
                          <TouchableOpacity
                            className="bg-accent-soft px-3 py-1.5 rounded-lg flex-row items-center"
                            onPress={() => handleUndoCheckIn(signup.id)}
                            disabled={isCheckingIn}
                          >
                            {isCheckingIn ? (
                              <ActivityIndicator size="small" color={colors.accent} />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                                <Text className="text-[11px] font-semibold text-accent-ink ml-1">
                                  Checked In
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            className="bg-accent px-3 py-1.5 rounded-lg"
                            onPress={() => handleCheckIn(signup.id)}
                            disabled={isCheckingIn}
                          >
                            {isCheckingIn ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text className="text-[11px] font-semibold text-white">Check In</Text>
                            )}
                          </TouchableOpacity>
                        )
                      )}
                      {!canCheckIn && signup.checked_in && (
                        <View className="bg-accent-soft px-2 py-0.5 rounded-full flex-row items-center">
                          <Ionicons name="checkmark" size={11} color={colors.accent} />
                          <Text className="text-[10px] font-semibold text-accent-ink ml-0.5">
                            Checked In
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Score display + entry button */}
                    {signup.checked_in && workouts.length > 0 && (() => {
                      const userScores = scoresByUser.get(signup.user_id);
                      const hasScore = userScores && userScores.size > 0;
                      return (
                        <View className="ml-11 mt-1.5">
                          {hasScore && workouts.map((w) => {
                            const stat = userScores.get(w.id);
                            if (!stat) return null;
                            return (
                              <View key={w.id} className="flex-row items-center mb-1">
                                <View className={`px-1.5 py-0.5 rounded mr-1.5 ${w.format === 'time' ? 'bg-soft' : 'bg-accent-soft'}`}>
                                  <Text className={`text-[9px] font-bold ${w.format === 'time' ? 'text-ink-soft' : 'text-accent-ink'}`}>
                                    {w.format === 'time' ? 'TIME' : 'AMRAP'}
                                  </Text>
                                </View>
                                <Text className="text-xs font-semibold text-ink">
                                  {formatScoreInline(stat, w.format)}
                                </Text>
                                {stat.rx_scaled && (
                                  <Text className="text-[10px] text-ink-muted ml-1.5">
                                    {stat.rx_scaled === 'rx' ? 'Rx' : 'Scaled'}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                          {canCheckIn && (
                            <TouchableOpacity
                              className="border border-rule rounded-lg py-1.5 px-3 flex-row items-center self-start mt-0.5"
                              onPress={() => openScoreEntry(signup)}
                            >
                              <Ionicons name="create-outline" size={13} color={colors.accent} />
                              <Text className="text-[11px] font-semibold text-accent ml-1">
                                {hasScore ? 'Update Score' : 'Enter Score'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </View>
          )}

          {/* Add Member button — admin/coach only */}
          {canCheckIn && !isCancelled && (
            <TouchableOpacity
              className="mt-3 border border-dashed border-rule rounded-xl py-3 flex-row items-center justify-center"
              onPress={openAddMember}
            >
              <Ionicons name="person-add-outline" size={16} color={colors.accent} />
              <Text className="text-sm font-semibold text-accent ml-2">Add Member</Text>
            </TouchableOpacity>
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

      {/* ========== Add Member Modal ========== */}
      <Modal
        visible={addMemberVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddMemberVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-base">
          <View className="px-4 pt-3 pb-2 border-b border-rule flex-row items-center justify-end">
            <TouchableOpacity onPress={() => setAddMemberVisible(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <View className="px-4 pt-3">
            <Text className="text-xl font-bold text-ink mb-3">Add Member to Class</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-sm bg-card text-ink"
              placeholder="Search members..."
              placeholderTextColor={colors.inkMuted}
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoFocus
            />
          </View>

          {membersLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              extraData={memberSearch}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-sm text-ink-muted">No members to add</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isAdding = addingUserId === item.user_id;
                return (
                  <View className="flex-row items-center py-3 border-b border-rule">
                    <View className="w-9 h-9 rounded-full bg-soft items-center justify-center mr-3">
                      <Text className="text-xs font-bold text-ink-soft">
                        {profileInitials(item.profile)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink">
                        {profileName(item.profile)}
                      </Text>
                      <Text className="text-[10px] text-ink-muted mt-0.5">
                        {item.roles.join(', ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className="bg-accent px-3 py-1.5 rounded-lg"
                      onPress={() => handleAddMember(item.user_id)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-[11px] font-semibold text-white">Add</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ========== Score Entry Modal ========== */}
      <Modal
        visible={scoringSignup !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScoringSignup(null)}
      >
        <SafeAreaView className="flex-1 bg-base">
          <View className="px-4 pt-3 pb-2 border-b border-rule flex-row items-center justify-end">
            <TouchableOpacity onPress={() => setScoringSignup(null)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
            <View className="mb-5">
              <Text className="text-xl font-bold text-ink">Enter Score</Text>
              {scoringSignup && (
                <Text className="text-sm text-ink-muted mt-1">
                  for {profileName(scoringSignup.profile)}
                </Text>
              )}
            </View>
            {workouts.map((workout) => {
              const isTime = workout.format === 'time';
              const formatLabel = isTime ? 'FOR TIME' : 'AMRAP';

              return (
                <View key={workout.id} className="bg-card border border-rule rounded-xl p-4 mb-4">
                  <View className="flex-row items-center mb-2">
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
                  <Text className="text-base font-bold text-ink mb-1">{workout.title}</Text>
                  {workout.description ? (
                    <Text className="text-sm text-ink-soft mb-3 leading-5">{workout.description}</Text>
                  ) : null}

                  <View className="border-t border-rule pt-3">
                    {/* Input fields */}
                    {isTime ? (
                      <View className="flex-row items-center mb-3">
                        <TextInput
                          className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-base text-ink font-semibold"
                          placeholder="min"
                          placeholderTextColor={colors.inkMuted}
                          keyboardType="numeric"
                          value={scoreTimeMin}
                          onChangeText={setScoreTimeMin}
                        />
                        <Text className="text-lg mx-2 font-bold text-ink">:</Text>
                        <TextInput
                          className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-base text-ink font-semibold"
                          placeholder="sec"
                          placeholderTextColor={colors.inkMuted}
                          keyboardType="numeric"
                          value={scoreTimeSec}
                          onChangeText={setScoreTimeSec}
                        />
                      </View>
                    ) : (
                      <View className="flex-row items-center mb-3">
                        <TextInput
                          className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-base text-ink font-semibold"
                          placeholder="rnds"
                          placeholderTextColor={colors.inkMuted}
                          keyboardType="numeric"
                          value={scoreRounds}
                          onChangeText={setScoreRounds}
                        />
                        <Text className="text-lg mx-2 font-bold text-ink">+</Text>
                        <TextInput
                          className="border border-rule rounded-lg px-3 py-2.5 w-20 text-sm text-center bg-base text-ink font-semibold"
                          placeholder="reps"
                          placeholderTextColor={colors.inkMuted}
                          keyboardType="numeric"
                          value={scoreReps}
                          onChangeText={setScoreReps}
                        />
                      </View>
                    )}

                    {/* Rx / Scaled */}
                    <View className="flex-row mb-3">
                      <TouchableOpacity
                        className={`px-4 py-1.5 rounded-full mr-2 ${
                          scoreRxScaled === 'rx' ? 'bg-accent' : 'bg-soft border border-rule'
                        }`}
                        onPress={() => setScoreRxScaled('rx')}
                      >
                        <Text className={`text-xs font-semibold ${
                          scoreRxScaled === 'rx' ? 'text-white' : 'text-ink-soft'
                        }`}>Rx</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`px-4 py-1.5 rounded-full ${
                          scoreRxScaled === 'scaled' ? 'bg-accent' : 'bg-soft border border-rule'
                        }`}
                        onPress={() => setScoreRxScaled('scaled')}
                      >
                        <Text className={`text-xs font-semibold ${
                          scoreRxScaled === 'scaled' ? 'text-white' : 'text-ink-soft'
                        }`}>Scaled</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Notes */}
                    <TextInput
                      className="border border-rule rounded-lg px-3 py-2.5 text-sm mb-3 bg-base text-ink"
                      placeholder="Notes (optional)"
                      placeholderTextColor={colors.inkMuted}
                      value={scoreNotes}
                      onChangeText={setScoreNotes}
                    />

                    {/* Save */}
                    <TouchableOpacity
                      className="bg-accent rounded-lg py-3 items-center"
                      onPress={() => handleSaveScore(workout.id)}
                      disabled={scoreSaving}
                    >
                      {scoreSaving ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white text-sm font-semibold">Save Score</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </>
  );
}
