import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../../lib/api';
import { useGym } from '../../../lib/gym-context';
import { colors } from '../../../lib/theme';

type Program = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  enrollment_count: number;
  user_enrolled: boolean;
  user_eligible: boolean;
};

export default function ProgramsScreen() {
  const { activeGym, loading: gymLoading } = useGym();
  const isMember = (activeGym?.roles || []).includes('member');
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const gymId = activeGym?.gym_id;

  const loadData = useCallback(async () => {
    if (!gymId) {
      setPrograms([]);
      setEnrolledIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const programsData = await apiFetch(`/gyms/${gymId}/programs`);
      setPrograms(programsData || []);
      // Populate enrolledIds from server-provided user_enrolled field
      const enrolled = new Set<string>(
        (programsData || [])
          .filter((p: Program) => p.user_enrolled)
          .map((p: Program) => p.id)
      );
      setEnrolledIds(enrolled);
    } catch (err) {
      console.error('Failed to load programs:', err);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function toggleEnrollment(programId: string) {
    if (!gymId) return;
    const isEnrolled = enrolledIds.has(programId);

    setTogglingId(programId);
    try {
      if (isEnrolled) {
        await apiFetch(`/gyms/${gymId}/programs/${programId}/enroll`, {
          method: 'DELETE',
        });
        setEnrolledIds((prev) => {
          const next = new Set(prev);
          next.delete(programId);
          return next;
        });
      } else {
        await apiFetch(`/gyms/${gymId}/programs/${programId}/enroll`, {
          method: 'POST',
        });
        setEnrolledIds((prev) => new Set(prev).add(programId));
      }
      await loadData();
    } catch (err: any) {
      const msg = err.message || '';
      // If already enrolled (duplicate key), treat as enrolled and allow leave
      if (!isEnrolled && msg.includes('duplicate')) {
        setEnrolledIds((prev) => new Set(prev).add(programId));
      } else {
        Alert.alert('Error', msg || 'Something went wrong');
      }
    } finally {
      setTogglingId(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderProgram({ item }: { item: Program }) {
    const isEnrolled = enrolledIds.has(item.id);
    const isEligible = item.user_eligible !== false; // default true for backwards compat
    const isToggling = togglingId === item.id;
    const startLabel = formatDate(item.start_date);
    const endLabel = formatDate(item.end_date);
    const dateRange =
      startLabel && endLabel
        ? `${startLabel} - ${endLabel}`
        : startLabel
          ? `Starts ${startLabel}`
          : endLabel
            ? `Ends ${endLabel}`
            : null;

    return (
      <View className="bg-card border border-rule rounded-xl p-4 mb-3">
        <Text className="text-base font-bold text-ink">{item.name}</Text>

        {item.description ? (
          <Text className="text-[13px] text-ink-soft mt-1" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {dateRange ? (
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={14} color={colors.inkMuted} />
            <Text className="text-xs text-ink-muted ml-1">{dateRange}</Text>
          </View>
        ) : null}

        <View className="flex-row items-center mt-2">
          <Ionicons name="people-outline" size={14} color={colors.inkMuted} />
          <Text className="text-xs text-ink-muted ml-1">
            {item.enrollment_count ?? 0} enrolled
          </Text>
        </View>

        <View className="flex-row mt-3 gap-2">
          <TouchableOpacity
            className="flex-1 bg-soft border border-rule rounded-lg py-2.5 items-center"
            onPress={() =>
              router.push(`/(app)/gym/${gymId}/programs/${item.id}` as any)
            }
          >
            <Text className="text-sm font-semibold text-ink">View Workouts</Text>
          </TouchableOpacity>

          {isMember && isEligible && (
            <TouchableOpacity
              className={`flex-1 rounded-lg py-2.5 items-center flex-row justify-center ${
                isEnrolled
                  ? 'bg-accent-soft border border-accent-rule'
                  : 'bg-accent'
              }`}
              onPress={() => toggleEnrollment(item.id)}
              disabled={isToggling}
            >
              {isToggling ? (
                <ActivityIndicator
                  size="small"
                  color={isEnrolled ? colors.accentInk : '#ffffff'}
                />
              ) : isEnrolled ? (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.accentInk}
                  />
                  <Text className="text-sm font-semibold text-accent-ink ml-1">
                    Enrolled
                  </Text>
                </>
              ) : (
                <Text className="text-sm font-semibold text-white">Enroll</Text>
              )}
            </TouchableOpacity>
          )}

          {isMember && !isEligible && !isEnrolled && (
            <View className="flex-1 rounded-lg py-2.5 items-center flex-row justify-center bg-soft border border-rule">
              <Ionicons name="lock-closed-outline" size={14} color={colors.inkMuted} />
              <Text className="text-xs font-medium text-ink-muted ml-1">
                Membership required
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // No active gym
  if (!gymLoading && !activeGym) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-ink">Programs</Text>
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="barbell-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            Join a gym to view programs
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-ink">Programs</Text>
        {activeGym?.gym?.name ? (
          <Text className="text-sm text-ink-muted mt-0.5">
            {activeGym.gym.name}
          </Text>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : programs.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="barbell-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            No programs available
          </Text>
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={renderProgram}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
