import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../lib/api';
import { useGym } from '../../../lib/gym-context';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';

type Signup = { user_id: string; [key: string]: any };

type Occurrence = {
  id: string;
  date: string;
  start_time: string;
  is_cancelled: boolean;
  class?: {
    id: string;
    name: string;
    capacity: number | null;
    duration_minutes: number | null;
  } | null;
  coach?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  signups: Signup[];
};

type ViewMode = 'day' | 'week' | 'month';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return toIso(new Date());
}

// Build 7 days starting from a given Monday (or Sunday, based on weekStart)
function buildWeekDays(weekStart: Date) {
  const today = todayIso();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push({
      date: d,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      iso: toIso(d),
      isToday: toIso(d) === today,
    });
  }
  return days;
}

// Get the Sunday that starts the week containing `date`
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// Build calendar grid for a month
function buildMonthGrid(year: number, month: number) {
  const today = todayIso();
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ dayNum: number; iso: string; isToday: boolean; inMonth: true } | { inMonth: false })[] = [];

  // Leading blanks
  for (let i = 0; i < startDow; i++) cells.push({ inMonth: false });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso = toIso(date);
    cells.push({ dayNum: d, iso, isToday: iso === today, inMonth: true });
  }

  // Trailing blanks to fill last row
  while (cells.length % 7 !== 0) cells.push({ inMonth: false });

  return cells;
}

function formatLocalTime(utcTimeStr: string, dateStr: string): string {
  try {
    const dt = new Date(`${dateStr}T${utcTimeStr}Z`);
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return utcTimeStr;
  }
}

function getEndTime(startTime: string, dateStr: string, durationMin: number | null): string | null {
  if (!durationMin) return null;
  try {
    const dt = new Date(`${dateStr}T${startTime}Z`);
    dt.setMinutes(dt.getMinutes() + durationMin);
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function ScheduleScreen() {
  const { activeGym } = useGym();
  const gymId = activeGym?.gym_id;
  const { width: screenWidth } = useWindowDimensions();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const monthGrid = useMemo(
    () => buildMonthGrid(monthYear.year, monthYear.month),
    [monthYear.year, monthYear.month]
  );

  // Derived date info for header
  const selDate = new Date(selectedDate + 'T00:00:00');
  const headerMonth = MONTH_NAMES[selDate.getMonth()];
  const headerYear = selDate.getFullYear();

  const loadOccurrences = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      const data = await apiFetch(
        `/gyms/${gymId}/occurrences?start=${selectedDate}&end=${selectedDate}`
      );
      setOccurrences((data || []).filter((o: any) => o.class));
    } catch {
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  }, [gymId, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadOccurrences();
    }, [loadOccurrences])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadOccurrences();
    setRefreshing(false);
  }

  async function handleSignUp(occId: string) {
    setActionLoading(occId);
    try {
      await apiFetch(`/occurrences/${occId}/signup`, { method: 'POST', body: JSON.stringify({}) });
      await loadOccurrences();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not sign up');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(occId: string) {
    setActionLoading(occId);
    try {
      await apiFetch(`/occurrences/${occId}/signup`, { method: 'DELETE' });
      await loadOccurrences();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not cancel sign-up');
    } finally {
      setActionLoading(null);
    }
  }

  // Navigation helpers
  function navigateDay(dir: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    setSelectedDate(toIso(d));
  }

  function navigateWeek(dir: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
    // Also select the same weekday in the new week
    const selDow = new Date(selectedDate + 'T00:00:00').getDay();
    const newSel = new Date(d);
    newSel.setDate(d.getDate() + selDow);
    setSelectedDate(toIso(newSel));
  }

  function navigateMonth(dir: number) {
    setMonthYear((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0) { m = 11; y--; }
      return { year: y, month: m };
    });
  }

  function selectDateFromMonth(iso: string) {
    setSelectedDate(iso);
  }

  function goToToday() {
    const now = new Date();
    const iso = toIso(now);
    setSelectedDate(iso);
    setWeekStart(getWeekStart(now));
    setMonthYear({ year: now.getFullYear(), month: now.getMonth() });
  }

  // No active gym
  if (!activeGym) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="calendar-outline" size={48} color={colors.inkFaint} />
          <Text className="text-base text-ink-muted mt-3 text-center">
            Join a gym to view the class schedule.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Week day cell width: fill screen with padding
  const weekCellSize = (screenWidth - 40) / 7; // 20px padding each side

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-ink">Schedule</Text>
          <Text className="text-sm text-ink-muted mt-0.5">
            {headerMonth} {headerYear}
          </Text>
        </View>
        <TouchableOpacity
          onPress={goToToday}
          className="bg-accent-soft px-3 py-1.5 rounded-lg"
        >
          <Text className="text-xs font-semibold text-accent-ink">Today</Text>
        </TouchableOpacity>
      </View>

      {/* View mode toggle */}
      <View className="flex-row mx-5 mb-3 bg-soft rounded-xl p-1">
        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => {
              setViewMode(mode);
              // Sync week/month state when switching
              if (mode === 'week') {
                setWeekStart(getWeekStart(new Date(selectedDate + 'T00:00:00')));
              } else if (mode === 'month') {
                const d = new Date(selectedDate + 'T00:00:00');
                setMonthYear({ year: d.getFullYear(), month: d.getMonth() });
              }
            }}
            className={`flex-1 py-2 rounded-lg items-center ${
              viewMode === mode ? 'bg-card' : ''
            }`}
            style={viewMode === mode ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            } : undefined}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                viewMode === mode ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day view date selector */}
      {viewMode === 'day' && (
        <View className="flex-row items-center justify-between px-5 py-3 bg-card border-b border-rule">
          <TouchableOpacity
            onPress={() => navigateDay(-1)}
            className="w-9 h-9 items-center justify-center rounded-full bg-soft"
          >
            <Ionicons name="chevron-back" size={16} color={colors.ink} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-base font-bold text-ink">
              {selDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              {MONTH_SHORT[selDate.getMonth()]} {selDate.getDate()}, {selDate.getFullYear()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigateDay(1)}
            className="w-9 h-9 items-center justify-center rounded-full bg-soft"
          >
            <Ionicons name="chevron-forward" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>
      )}

      {/* Week view date strip */}
      {viewMode === 'week' && (
        <View className="bg-card border-b border-rule">
          {/* Week nav arrows */}
          <View className="flex-row items-center justify-between px-3 pt-2 pb-1">
            <TouchableOpacity
              onPress={() => navigateWeek(-1)}
              className="w-7 h-7 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-back" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
            <Text className="text-xs font-semibold text-ink-muted">
              {MONTH_SHORT[weekDays[0].date.getMonth()]} {weekDays[0].dayNum} – {MONTH_SHORT[weekDays[6].date.getMonth()]} {weekDays[6].dayNum}
            </Text>
            <TouchableOpacity
              onPress={() => navigateWeek(1)}
              className="w-7 h-7 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
          {/* Day cells */}
          <View className="flex-row px-5 pb-3 pt-1">
            {weekDays.map((day) => {
              const isSelected = day.iso === selectedDate;
              return (
                <TouchableOpacity
                  key={day.iso}
                  onPress={() => setSelectedDate(day.iso)}
                  style={{ width: weekCellSize }}
                  className="items-center py-2"
                >
                  <Text
                    className={`text-[11px] font-semibold uppercase ${
                      isSelected ? 'text-accent' : day.isToday ? 'text-accent' : 'text-ink-muted'
                    }`}
                  >
                    {day.dayLabel}
                  </Text>
                  <View
                    className={`items-center justify-center mt-1 rounded-full ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                    style={{ width: 36, height: 36 }}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-white' : day.isToday ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {day.dayNum}
                    </Text>
                  </View>
                  {day.isToday && (
                    <View
                      className={`rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-accent'}`}
                      style={{ width: 4, height: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Month view calendar */}
      {viewMode === 'month' && (
        <View className="bg-card border-b border-rule px-5 pb-3">
          {/* Month nav */}
          <View className="flex-row items-center justify-between py-2">
            <TouchableOpacity
              onPress={() => navigateMonth(-1)}
              className="w-8 h-8 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-back" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-ink">
              {MONTH_NAMES[monthYear.month]} {monthYear.year}
            </Text>
            <TouchableOpacity
              onPress={() => navigateMonth(1)}
              className="w-8 h-8 items-center justify-center rounded-full"
            >
              <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View className="flex-row mb-1">
            {DAY_HEADERS.map((h, i) => (
              <View key={i} style={{ width: (screenWidth - 40) / 7 }} className="items-center">
                <Text className="text-[10px] font-semibold text-ink-muted uppercase">{h}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="flex-row flex-wrap">
            {monthGrid.map((cell, i) => {
              if (!cell.inMonth) {
                return <View key={`blank-${i}`} style={{ width: (screenWidth - 40) / 7, height: 40 }} />;
              }
              const isSelected = cell.iso === selectedDate;
              return (
                <TouchableOpacity
                  key={cell.iso}
                  onPress={() => selectDateFromMonth(cell.iso)}
                  style={{ width: (screenWidth - 40) / 7, height: 40 }}
                  className="items-center justify-center"
                >
                  <View
                    className={`items-center justify-center rounded-full ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                    style={{ width: 32, height: 32 }}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-white' : cell.isToday ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {cell.dayNum}
                    </Text>
                  </View>
                  {cell.isToday && !isSelected && (
                    <View
                      className="bg-accent rounded-full absolute bottom-0.5"
                      style={{ width: 4, height: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Class list */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-sm text-ink-muted mt-3">Loading classes...</Text>
          </View>
        ) : occurrences.length === 0 ? (
          <View className="items-center py-16 px-8">
            <View className="w-16 h-16 rounded-full bg-soft items-center justify-center mb-4">
              <Ionicons name="calendar-outline" size={28} color={colors.inkMuted} />
            </View>
            <Text className="text-base font-semibold text-ink mb-1">No Classes</Text>
            <Text className="text-sm text-ink-muted text-center">
              No classes scheduled for this day.
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-4">
            {occurrences.map((occ, index) => {
              const signups = occ.signups || [];
              const signedUp = currentUserId
                ? signups.some((s) => s.user_id === currentUserId)
                : false;
              const isCancelled = !!occ.is_cancelled;
              const capacity = occ.class?.capacity ?? null;
              const atCapacity = capacity != null && signups.length >= capacity;
              const isActionLoading = actionLoading === occ.id;

              const timeStr = formatLocalTime(occ.start_time, selectedDate);
              const endTimeStr = getEndTime(occ.start_time, selectedDate, occ.class?.duration_minutes ?? null);
              const coachName = occ.coach
                ? `${occ.coach.first_name || ''} ${occ.coach.last_name || ''}`.trim()
                : null;
              const spotsText = capacity != null
                ? `${signups.length}/${capacity} spots`
                : `${signups.length} signed up`;
              const spotsLeft = capacity != null ? capacity - signups.length : null;

              return (
                <View key={occ.id} className="flex-row mb-4">
                  {/* Time column */}
                  <View className="items-end pr-3 pt-1" style={{ width: 68 }}>
                    <Text className="text-sm font-semibold text-ink">{timeStr}</Text>
                    {endTimeStr && (
                      <Text className="text-xs text-ink-muted mt-0.5">{endTimeStr}</Text>
                    )}
                  </View>

                  {/* Timeline dot + line */}
                  <View className="items-center" style={{ width: 16 }}>
                    <View
                      className={`rounded-full ${isCancelled ? 'bg-ink-faint' : 'bg-accent'}`}
                      style={{ width: 8, height: 8, marginTop: 7 }}
                    />
                    {index < occurrences.length - 1 && (
                      <View className="bg-rule flex-1" style={{ width: 1.5, marginTop: 4 }} />
                    )}
                  </View>

                  {/* Class card */}
                  <View
                    className={`flex-1 ml-3 bg-card border rounded-xl overflow-hidden ${
                      isCancelled ? 'border-rule opacity-50' : signedUp ? 'border-accent' : 'border-rule'
                    }`}
                  >
                    {signedUp && !isCancelled && (
                      <View className="bg-accent" style={{ height: 3 }} />
                    )}

                    <View className="p-3.5">
                      <View className="flex-row items-start justify-between">
                        <Text
                          className={`text-[15px] font-bold flex-shrink ${
                            isCancelled ? 'text-ink-muted line-through' : 'text-ink'
                          }`}
                          numberOfLines={1}
                        >
                          {occ.class?.name}
                        </Text>
                        {isCancelled && (
                          <View className="bg-danger-soft px-2 py-0.5 rounded ml-2">
                            <Text className="text-[10px] font-bold text-danger uppercase">Cancelled</Text>
                          </View>
                        )}
                        {signedUp && !isCancelled && (
                          <View className="bg-accent-soft px-2 py-0.5 rounded ml-2 flex-row items-center">
                            <Ionicons name="checkmark-circle" size={11} color={colors.accent} />
                            <Text className="text-[10px] font-bold text-accent-ink ml-0.5 uppercase">Going</Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center mt-1.5 flex-wrap">
                        {occ.class?.duration_minutes ? (
                          <View className="flex-row items-center mr-3">
                            <Ionicons name="time-outline" size={12} color={colors.inkMuted} />
                            <Text className="text-xs text-ink-muted ml-1">
                              {occ.class.duration_minutes} min
                            </Text>
                          </View>
                        ) : null}
                        {coachName ? (
                          <View className="flex-row items-center mr-3">
                            <Ionicons name="person-outline" size={12} color={colors.inkMuted} />
                            <Text className="text-xs text-ink-muted ml-1">{coachName}</Text>
                          </View>
                        ) : null}
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={12} color={colors.inkMuted} />
                          <Text className="text-xs text-ink-muted ml-1">{spotsText}</Text>
                        </View>
                      </View>

                      {capacity != null && !isCancelled && (
                        <View className="mt-2.5">
                          <View className="bg-soft rounded-full overflow-hidden" style={{ height: 4 }}>
                            <View
                              className={`rounded-full ${atCapacity ? 'bg-ink-muted' : 'bg-accent'}`}
                              style={{
                                height: 4,
                                width: `${Math.min((signups.length / capacity) * 100, 100)}%`,
                              }}
                            />
                          </View>
                          {spotsLeft != null && spotsLeft > 0 && spotsLeft <= 3 && (
                            <Text className="text-[10px] text-accent font-semibold mt-1">
                              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                            </Text>
                          )}
                        </View>
                      )}

                      {!isCancelled && (
                        <View className="mt-3">
                          {signedUp ? (
                            <TouchableOpacity
                              className="border border-rule rounded-lg py-2 items-center"
                              onPress={() => handleCancel(occ.id)}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? (
                                <ActivityIndicator size="small" color={colors.inkMuted} />
                              ) : (
                                <Text className="text-xs font-semibold text-ink-soft">Cancel Sign-up</Text>
                              )}
                            </TouchableOpacity>
                          ) : !atCapacity ? (
                            <TouchableOpacity
                              className="bg-accent rounded-lg py-2 items-center"
                              onPress={() => handleSignUp(occ.id)}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text className="text-xs font-semibold text-white">Sign Up</Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View className="bg-sunken rounded-lg py-2 items-center">
                              <Text className="text-xs font-semibold text-ink-muted">Class Full</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
