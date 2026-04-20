import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../../../lib/api';
import { supabase } from '../../../../../lib/supabase';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

type ViewMode = 'day' | 'week' | 'month';
type PageTab = 'schedule' | 'history';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return toIso(new Date());
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatResult(stat: any, format: string): string {
  if (format === 'time' && stat.time_seconds != null) {
    const min = Math.floor(stat.time_seconds / 60);
    const sec = stat.time_seconds % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }
  if (format === 'amrap') {
    const rounds = stat.amrap_rounds ?? 0;
    const reps = stat.amrap_reps ?? 0;
    return `${rounds} + ${reps}`;
  }
  return '—';
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

function buildMonthGrid(year: number, month: number) {
  const today = todayIso();
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ dayNum: number; iso: string; isToday: boolean; inMonth: true } | { inMonth: false })[] = [];

  for (let i = 0; i < startDow; i++) cells.push({ inMonth: false });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso = toIso(date);
    cells.push({ dayNum: d, iso, isToday: iso === today, inMonth: true });
  }

  while (cells.length % 7 !== 0) cells.push({ inMonth: false });

  return cells;
}

export default function ProgramDetailScreen() {
  const { gymId, programId } = useLocalSearchParams<{ gymId: string; programId: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const [pageTab, setPageTab] = useState<PageTab>('schedule');
  const [program, setProgram] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Calendar state
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const monthGrid = useMemo(
    () => buildMonthGrid(monthYear.year, monthYear.month),
    [monthYear.year, monthYear.month],
  );

  const programName = program?.name || 'Program';

  const selDate = new Date(selectedDate + 'T00:00:00');
  const headerMonth = MONTH_NAMES[selDate.getMonth()];
  const headerYear = selDate.getFullYear();

  const weekCellSize = (screenWidth - 40) / 7;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    apiFetch(`/gyms/${gymId}/programs`)
      .then((data: any[]) => {
        const p = (data || []).find((pg: any) => pg.id === programId);
        if (p) setProgram(p);
      })
      .catch(console.error);
  }, [gymId, programId]);

  useEffect(() => {
    loadHistoryData();
  }, [programId]);

  useEffect(() => {
    loadWorkouts();
  }, [programId, selectedDate]);

  async function loadWorkouts() {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/programs/${programId}/workouts?start=${selectedDate}&end=${selectedDate}`,
      );
      setWorkouts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryData() {
    setHistoryLoading(true);
    try {
      const [historyData, signupsData] = await Promise.all([
        apiFetch(`/programs/${programId}/my-history`),
        apiFetch(`/programs/${programId}/my-signups`),
      ]);
      setHistory(historyData || []);
      setSignups(signupsData || []);
    } catch {
      setHistory([]);
      setSignups([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function refreshHistory() {
    loadHistoryData();
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

  function goToToday() {
    const now = new Date();
    const iso = toIso(now);
    setSelectedDate(iso);
    setWeekStart(getWeekStart(now));
    setMonthYear({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        {/* Custom header */}
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <View className="flex-row items-center justify-between">
            <BackButton label="Programs" />
            {pageTab === 'schedule' && (
              <TouchableOpacity
                onPress={goToToday}
                className="bg-accent-soft px-3 py-1.5 rounded-lg"
              >
                <Text className="text-xs font-semibold text-accent-ink">Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xl font-bold text-ink">{programName}</Text>
            {pageTab === 'schedule' && (
              <Text className="text-sm text-ink-muted">
                {headerMonth} {headerYear}
              </Text>
            )}
          </View>
        </View>

        {/* Program info */}
        {program && (program.description || program.start_date || program.end_date) && (
          <View className="px-5 pt-3 pb-2">
            {program.description ? (
              <Text className="text-sm text-ink-soft leading-5">{program.description}</Text>
            ) : null}
            <View className="flex-row flex-wrap gap-3 mt-2">
              {(program.start_date || program.end_date) && (
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={14} color={colors.inkMuted} />
                  <Text className="text-xs text-ink-muted ml-1">
                    {program.start_date && program.end_date
                      ? `${formatDateLabel(program.start_date)} – ${formatDateLabel(program.end_date)}`
                      : program.start_date
                        ? `Starts ${formatDateLabel(program.start_date)}`
                        : `Ends ${formatDateLabel(program.end_date)}`}
                  </Text>
                </View>
              )}
              {program.enrollment_count != null && (
                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={14} color={colors.inkMuted} />
                  <Text className="text-xs text-ink-muted ml-1">
                    {program.enrollment_count} enrolled
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Page tab toggle: Schedule / History */}
        <View className="flex-row mx-5 mt-3 mb-3 bg-soft rounded-xl p-1">
          {(['schedule', 'history'] as PageTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setPageTab(tab)}
              className={`flex-1 py-2 rounded-lg items-center ${
                pageTab === tab ? 'bg-card' : ''
              }`}
              style={pageTab === tab ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
              } : undefined}
            >
              <Text
                className={`text-xs font-semibold capitalize ${
                  pageTab === tab ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ========== SCHEDULE TAB ========== */}
        {pageTab === 'schedule' && (
          <>
            {/* View mode toggle */}
            <View className="flex-row mx-5 mb-3 bg-soft rounded-xl p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setViewMode(mode);
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
                            isSelected ? 'text-accent' : 'text-ink-muted'
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
                              isSelected ? 'text-white' : 'text-ink'
                            }`}
                          >
                            {day.dayNum}
                          </Text>
                        </View>
                        {day.isToday && (
                          <View className="bg-accent rounded-full mt-1" style={{ width: 5, height: 5 }} />
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

                <View className="flex-row mb-1">
                  {DAY_HEADERS.map((h, i) => (
                    <View key={i} style={{ width: (screenWidth - 40) / 7 }} className="items-center">
                      <Text className="text-[10px] font-semibold text-ink-muted uppercase">{h}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {monthGrid.map((cell, i) => {
                    if (!cell.inMonth) {
                      return <View key={`blank-${i}`} style={{ width: (screenWidth - 40) / 7, height: 40 }} />;
                    }
                    const isSelected = cell.iso === selectedDate;
                    return (
                      <TouchableOpacity
                        key={cell.iso}
                        onPress={() => setSelectedDate(cell.iso)}
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
                              isSelected ? 'text-white' : 'text-ink'
                            }`}
                          >
                            {cell.dayNum}
                          </Text>
                        </View>
                        {cell.isToday && (
                          <View className="bg-accent rounded-full absolute bottom-0.5" style={{ width: 5, height: 5 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Workouts list */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
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
                      onStatChange={refreshHistory}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          </>
        )}

        {/* ========== HISTORY TAB ========== */}
        {pageTab === 'history' && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {historyLoading ? (
              <View className="items-center py-16">
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <>
                {/* Class signups section */}
                <View className="px-5 pt-4">
                  <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 ml-1">
                    Class Attendance
                  </Text>
                  {signups.length === 0 ? (
                    <View className="bg-card border border-rule rounded-xl p-5 items-center mb-5">
                      <Ionicons name="calendar-outline" size={28} color={colors.inkFaint} />
                      <Text className="text-sm text-ink-muted mt-2 text-center">
                        No class sign-ups yet
                      </Text>
                    </View>
                  ) : (
                    <View className="mb-5">
                      {signups.map((signup: any) => {
                        const occ = signup.occurrence;
                        if (!occ) return null;
                        return (
                          <View
                            key={signup.id}
                            className={`bg-card border border-rule rounded-xl p-4 mb-2 ${
                              occ.is_cancelled ? 'opacity-50' : ''
                            }`}
                          >
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1 mr-3">
                                <Text className="text-base font-bold text-ink" numberOfLines={1}>
                                  {signup.class_name}
                                  {occ.is_cancelled ? ' (Cancelled)' : ''}
                                </Text>
                                <Text className="text-xs text-ink-muted mt-0.5">
                                  {formatDateLabel(occ.date)}
                                  {occ.start_time ? ` · ${formatTime(occ.start_time)}` : ''}
                                </Text>
                              </View>
                              <View className="items-end">
                                {signup.checked_in ? (
                                  <View className="bg-accent-soft px-2.5 py-1 rounded-full flex-row items-center">
                                    <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                                    <Text className="text-[10px] font-bold text-accent-ink ml-1 uppercase">
                                      Checked In
                                    </Text>
                                  </View>
                                ) : !occ.is_cancelled ? (
                                  <View className="bg-soft px-2.5 py-1 rounded-full">
                                    <Text className="text-[10px] font-bold text-ink-muted uppercase">
                                      Signed Up
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Workout results section */}
                <View className="px-5">
                  <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 ml-1">
                    Workout Results
                  </Text>
                  {history.length === 0 ? (
                    <View className="bg-card border border-rule rounded-xl p-5 items-center">
                      <Ionicons name="barbell-outline" size={28} color={colors.inkFaint} />
                      <Text className="text-sm text-ink-muted mt-2 text-center">
                        No completed workouts yet
                      </Text>
                    </View>
                  ) : (
                    history.map((item) => {
                      const isTime = item.format === 'time';
                      return (
                        <TouchableOpacity
                          key={item.id}
                          className="bg-card border border-rule rounded-xl p-4 mb-2"
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push(
                              `/(app)/workout/${item.id}/leaderboard?gymId=${gymId}` as any
                            )
                          }
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 mr-3">
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
                                    {isTime ? 'TIME' : 'AMRAP'}
                                  </Text>
                                </View>
                                {item.my_stat?.rx_scaled && (
                                  <View className={`px-2 py-0.5 rounded ${
                                    item.my_stat.rx_scaled === 'rx' ? 'bg-accent-soft' : 'bg-soft'
                                  }`}>
                                    <Text className={`text-[10px] font-bold uppercase ${
                                      item.my_stat.rx_scaled === 'rx' ? 'text-accent-ink' : 'text-ink-soft'
                                    }`}>
                                      {item.my_stat.rx_scaled}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text className="text-xs text-ink-muted mt-0.5">
                                {formatDateLabel(item.date)}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-lg font-bold text-ink">
                                {formatStatResult(item.my_stat, item.format)}
                              </Text>
                              <Text className="text-[10px] text-ink-muted mt-0.5">
                                {isTime ? 'time' : 'rounds + reps'}
                              </Text>
                            </View>
                          </View>
                          {/* Leaderboard hint */}
                          <View className="flex-row items-center justify-end mt-2">
                            <Ionicons name="trophy-outline" size={12} color={colors.inkMuted} />
                            <Text className="text-[11px] text-ink-muted ml-1 mr-0.5">Leaderboard</Text>
                            <Ionicons name="chevron-forward" size={12} color={colors.inkMuted} />
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

function WorkoutCard({
  workout,
  gymId,
  userId,
  router,
  onStatChange,
}: {
  workout: any;
  gymId: string;
  userId: string | null;
  router: any;
  onStatChange?: () => void;
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
      onStatChange?.();
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
            onStatChange?.();
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
