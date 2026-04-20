import { useEffect, useState, useMemo } from 'react';
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
type SortMode = 'ranked' | 'unsorted';

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

function hasResult(stat: any, format: string): boolean {
  if (format === 'time') return stat.time_seconds != null;
  if (format === 'amrap') return stat.amrap_rounds != null;
  return false;
}

// Sort comparator by workout format (time asc, amrap desc)
function resultComparator(format: string) {
  return (a: any, b: any) => {
    if (format === 'time') {
      const av = a.time_seconds;
      const bv = b.time_seconds;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    }
    if (format === 'amrap') {
      const ar = a.amrap_rounds;
      const br = b.amrap_rounds;
      if (ar == null && br == null) return 0;
      if (ar == null) return 1;
      if (br == null) return -1;
      if (br !== ar) return br - ar;
      return (b.amrap_reps ?? 0) - (a.amrap_reps ?? 0);
    }
    return 0;
  };
}

export default function LeaderboardScreen() {
  const { workoutId, gymId } = useLocalSearchParams<{ workoutId: string; gymId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('ranked');
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
  const format = workout?.format ?? 'time';

  // Apply gender filter
  const genderFiltered = useMemo(() => {
    if (genderFilter === 'all') return allStats;
    return allStats.filter((s: any) => s.profile?.gender === genderFilter);
  }, [allStats, genderFilter]);

  // Apply sort mode and compute ranks
  const { displayStats, userRank, totalRanked } = useMemo(() => {
    if (sortMode === 'unsorted') {
      // No sorting, no ranking — show in the order returned by the server
      return { displayStats: genderFiltered, userRank: null, totalRanked: genderFiltered.length };
    }

    // Ranked mode: Rx first (sorted by result), then Scaled (sorted by result), then no-result
    const withResults = genderFiltered.filter((s: any) => hasResult(s, format));
    const withoutResults = genderFiltered.filter((s: any) => !hasResult(s, format));

    const rxEntries = withResults.filter((s: any) => s.rx_scaled === 'rx');
    const scaledEntries = withResults.filter((s: any) => s.rx_scaled !== 'rx');

    const cmp = resultComparator(format);
    rxEntries.sort(cmp);
    scaledEntries.sort(cmp);

    // Assign ranks: Rx first, then Scaled continues numbering
    let rank = 1;
    const ranked: any[] = [];
    for (const s of rxEntries) {
      ranked.push({ ...s, displayRank: rank });
      rank++;
    }
    for (const s of scaledEntries) {
      ranked.push({ ...s, displayRank: rank });
      rank++;
    }
    for (const s of withoutResults) {
      ranked.push({ ...s, displayRank: null });
    }

    const total = rxEntries.length + scaledEntries.length;
    const userEntry = ranked.find((s) => s.user_id === currentUserId);
    const uRank = userEntry?.displayRank ?? null;

    return { displayStats: ranked, userRank: uRank, totalRanked: total };
  }, [genderFiltered, sortMode, format, currentUserId]);

  const isTime = format === 'time';
  const formatLabel = isTime ? 'FOR TIME' : format === 'amrap' ? 'AMRAP' : format?.toUpperCase() ?? '';

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function renderRankBadge(rank: number | null) {
    if (rank == null) {
      return (
        <View className="w-8 h-8 rounded-full items-center justify-center bg-soft">
          <Text className="text-[10px] text-ink-muted">—</Text>
        </View>
      );
    }

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

  function renderStatRow({ item, index }: { item: any; index: number }) {
    const isCurrentUser = item.user_id === currentUserId;
    const name = `${item.profile?.first_name ?? ''} ${item.profile?.last_name ?? ''}`.trim() || 'Unknown';
    const gender = item.profile?.gender;
    const rank = sortMode === 'ranked' ? item.displayRank : index + 1;

    // Show section header when transitioning from Rx to Scaled in ranked mode
    const isFirstScaled =
      sortMode === 'ranked' &&
      item.rx_scaled !== 'rx' &&
      hasResult(item, format) &&
      index > 0;
    const prevItem = index > 0 ? displayStats[index - 1] : null;
    const showScaledHeader =
      isFirstScaled && prevItem && (prevItem.rx_scaled === 'rx' || !hasResult(prevItem, format));

    return (
      <>
        {showScaledHeader && (
          <View className="px-4 pt-4 pb-2 bg-base">
            <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              Scaled
            </Text>
          </View>
        )}
        <View
          className={`flex-row items-center px-4 py-3 border-b border-rule ${
            isCurrentUser ? 'bg-accent-soft' : 'bg-card'
          }`}
        >
          {/* Rank */}
          <View className="mr-3">
            {sortMode === 'ranked' ? renderRankBadge(rank) : (
              <View className="w-8 h-8 rounded-full items-center justify-center bg-soft">
                <Text className="text-xs font-bold text-ink-soft">{index + 1}</Text>
              </View>
            )}
          </View>

          {/* Name + gender */}
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">
              {name}{isCurrentUser ? ' (You)' : ''}
            </Text>
            {gender ? (
              <Text className="text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">
                {gender === 'male' ? 'M' : gender === 'female' ? 'F' : ''}
              </Text>
            ) : null}
          </View>

          {/* Result */}
          <Text className="text-sm font-bold text-ink mr-2">
            {formatResult(item, format)}
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
      </>
    );
  }

  const genderOptions: { key: GenderFilter; label: string }[] = [
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
            data={displayStats}
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

                {/* Sort mode toggle */}
                <View className="flex-row mx-4 mb-3 bg-soft rounded-xl p-1">
                  <TouchableOpacity
                    onPress={() => setSortMode('ranked')}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      sortMode === 'ranked' ? 'bg-card' : ''
                    }`}
                    style={sortMode === 'ranked' ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      elevation: 2,
                    } : undefined}
                  >
                    <Text className={`text-xs font-semibold ${
                      sortMode === 'ranked' ? 'text-ink' : 'text-ink-muted'
                    }`}>
                      Ranked
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSortMode('unsorted')}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      sortMode === 'unsorted' ? 'bg-card' : ''
                    }`}
                    style={sortMode === 'unsorted' ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      elevation: 2,
                    } : undefined}
                  >
                    <Text className={`text-xs font-semibold ${
                      sortMode === 'unsorted' ? 'text-ink' : 'text-ink-muted'
                    }`}>
                      All Results
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Gender filter */}
                <View className="flex-row px-4 mb-3">
                  {genderOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      className={`px-4 py-1.5 rounded-full mr-2 ${
                        genderFilter === opt.key
                          ? 'bg-accent'
                          : 'bg-soft border border-rule'
                      }`}
                      onPress={() => setGenderFilter(opt.key)}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          genderFilter === opt.key ? 'text-white' : 'text-ink-soft'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Summary bar */}
                <View className="flex-row items-center justify-between px-4 mb-2">
                  <Text className="text-xs text-ink-muted">
                    {displayStats.length}{' '}
                    {displayStats.length === 1 ? 'result' : 'results'}
                  </Text>
                  {sortMode === 'ranked' && userRank != null && (
                    <Text className="text-xs font-semibold text-accent">
                      Your rank: #{userRank} / {totalRanked}
                    </Text>
                  )}
                </View>

                {/* Rx section header for ranked mode */}
                {sortMode === 'ranked' && displayStats.length > 0 && displayStats.some((s: any) => s.rx_scaled === 'rx' && hasResult(s, format)) && (
                  <View className="px-4 pt-1 pb-2">
                    <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Rx
                    </Text>
                  </View>
                )}
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
