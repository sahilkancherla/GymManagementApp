import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../../lib/api';
import { supabase } from '../../../../lib/supabase';
import { colors } from '../../../../lib/theme';
import BackButton from '../../../../components/BackButton';

type GenderFilter = 'all' | 'male' | 'female';

function formatResult(
  stat: { time_seconds?: number | null; amrap_rounds?: number | null; amrap_reps?: number | null },
  format: string
): string {
  if (format === 'time') {
    if (stat.time_seconds == null) return '\u2014';
    const m = Math.floor(stat.time_seconds / 60);
    const s = stat.time_seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (format === 'amrap') {
    if (stat.amrap_rounds == null) return '\u2014';
    return stat.amrap_reps ? `${stat.amrap_rounds} + ${stat.amrap_reps}` : `${stat.amrap_rounds}`;
  }
  return '\u2014';
}

function genderLabel(gender: string | null | undefined): string {
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  return '';
}

export default function LeaderboardScreen() {
  const { workoutId, gymId } = useLocalSearchParams<{ workoutId: string; gymId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GenderFilter>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/workouts/${workoutId}/leaderboard`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workoutId]);

  const workout = data?.workout;
  const allStats: any[] = data?.stats ?? [];

  const filteredStats =
    filter === 'all'
      ? allStats
      : allStats.filter((s: any) => s.profile?.gender === filter);

  function getRank(stat: any): number {
    if (filter === 'all') return stat.rank;
    return stat.gender_rank;
  }

  const isTime = workout?.format === 'time';
  const formatLabel = isTime ? 'FOR TIME' : workout?.format === 'amrap' ? 'AMRAP' : workout?.format?.toUpperCase() ?? '';

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function renderRankBadge(rank: number) {
    let badgeClass = 'bg-soft';
    let textClass = 'text-ink-soft';

    if (rank === 1) {
      badgeClass = 'bg-accent';
      textClass = 'text-white';
    } else if (rank === 2 || rank === 3) {
      badgeClass = 'bg-accent-soft border border-accent-rule';
      textClass = 'text-accent-ink';
    }

    return (
      <View className={`w-8 h-8 rounded-full items-center justify-center ${badgeClass}`}>
        <Text className={`text-xs font-bold ${textClass}`}>#{rank}</Text>
      </View>
    );
  }

  function renderStatRow({ item }: { item: any }) {
    const rank = getRank(item);
    const isCurrentUser = item.user_id === currentUserId;
    const name = `${item.profile?.first_name ?? ''} ${item.profile?.last_name ?? ''}`.trim() || 'Unknown';
    const gender = item.profile?.gender;

    return (
      <View
        className={`flex-row items-center px-4 py-3 border-b border-rule ${
          isCurrentUser ? 'bg-accent-soft' : 'bg-card'
        }`}
      >
        {/* Rank */}
        <View className="mr-3">{renderRankBadge(rank)}</View>

        {/* Name + gender */}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">{name}</Text>
          {gender ? (
            <Text className="text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">
              {genderLabel(gender)}
            </Text>
          ) : null}
        </View>

        {/* Result */}
        <Text className="text-sm font-bold text-ink mr-2">
          {formatResult(item, workout?.format)}
        </Text>

        {/* Rx/Scaled badge */}
        {item.rx_scaled ? (
          <View
            className={`px-2 py-0.5 rounded ${
              item.rx_scaled === 'rx' ? 'bg-accent-soft' : 'bg-soft'
            }`}
          >
            <Text
              className={`text-[10px] font-bold uppercase ${
                item.rx_scaled === 'rx' ? 'text-accent-ink' : 'text-ink-soft'
              }`}
            >
              {item.rx_scaled}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const filterOptions: { key: GenderFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'male', label: 'Men' },
    { key: 'female', label: 'Women' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        {/* Custom header */}
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Back" />
          <Text className="text-xl font-bold text-ink px-1">Leaderboard</Text>
        </View>

      <View className="flex-1 bg-base">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color={colors.accent} />
            <Text className="text-ink-muted text-sm mt-2">Loading leaderboard...</Text>
          </View>
        ) : !workout ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-ink-muted text-sm">Workout not found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStats}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <>
                {/* Workout info card */}
                <View className="mx-4 mt-4 mb-3 bg-card border border-rule rounded-xl p-4">
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
                  <Text className="text-lg font-bold text-ink">{workout.title}</Text>
                  <Text className="text-xs text-ink-muted mt-1">
                    {formatDate(workout.date)}
                  </Text>
                  {workout.program?.name ? (
                    <Text className="text-xs text-ink-soft mt-1">
                      {workout.program.name}
                    </Text>
                  ) : null}
                  {workout.description ? (
                    <Text className="text-sm text-ink-soft mt-2 leading-5">
                      {workout.description}
                    </Text>
                  ) : null}
                </View>

                {/* Filter toggle */}
                <View className="flex-row px-4 mb-3">
                  {filterOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      className={`px-4 py-1.5 rounded-full mr-2 ${
                        filter === opt.key
                          ? 'bg-accent'
                          : 'bg-soft border border-rule'
                      }`}
                      onPress={() => setFilter(opt.key)}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          filter === opt.key ? 'text-white' : 'text-ink-soft'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Count */}
                <View className="px-4 mb-2">
                  <Text className="text-xs text-ink-muted">
                    {filteredStats.length}{' '}
                    {filteredStats.length === 1 ? 'result' : 'results'}
                  </Text>
                </View>
              </>
            }
            renderItem={renderStatRow}
            ListEmptyComponent={
              <View className="items-center mt-12">
                <Ionicons name="trophy-outline" size={36} color={colors.inkMuted} />
                <Text className="text-ink-muted text-sm mt-3">No results yet</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
      </SafeAreaView>
    </>
  );
}
