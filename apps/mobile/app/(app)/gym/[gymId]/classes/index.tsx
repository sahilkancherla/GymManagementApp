import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { apiFetch } from '../../../../../lib/api';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

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

export default function ClassesScreen() {
  const { gymId } = useLocalSearchParams();
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOccurrences();
  }, [gymId]);

  async function loadOccurrences() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const data = await apiFetch(`/gyms/${gymId}/occurrences?start=${today}&end=${end}`);
      setOccurrences((data || []).filter((o: any) => o.class));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(occurrenceId: string) {
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, { method: 'POST' });
      Alert.alert('Success', 'Signed up for class');
      loadOccurrences();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const grouped = occurrences.reduce((acc: Record<string, any[]>, occ) => {
    if (!acc[occ.date]) acc[occ.date] = [];
    acc[occ.date].push(occ);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      title: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      data,
    }));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Back" />
          <Text className="text-xl font-bold text-ink px-1">Class Schedule</Text>
        </View>

        <View className="flex-1 px-4">
          {loading ? (
            <Text className="text-ink-muted text-center mt-8">Loading...</Text>
          ) : sections.length === 0 ? (
            <Text className="text-ink-muted text-center mt-8">No classes scheduled this week.</Text>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <Text className="text-xs font-semibold text-ink-muted mt-4 mb-2">{section.title}</Text>
              )}
              renderItem={({ item: occ }) => (
                <View
                  className={`flex-row items-center p-4 bg-card border border-rule rounded-xl mb-2 ${
                    occ.is_cancelled ? 'opacity-50' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">
                      {occ.class?.name}
                      {occ.is_cancelled && ' (Cancelled)'}
                    </Text>
                    <Text className="text-sm text-ink-soft mt-0.5">
                      {formatTime(occ.start_time)} · {occ.class?.duration_minutes}min
                      {occ.coach && ` · ${occ.coach.first_name}`}
                    </Text>
                    <Text className="text-xs text-ink-muted mt-0.5">
                      {occ.signups?.length || 0}
                      {occ.class?.capacity ? ` / ${occ.class.capacity}` : ''} signed up
                    </Text>
                  </View>
                  {!occ.is_cancelled && (
                    <TouchableOpacity
                      className="bg-accent rounded-lg px-3 py-2"
                      onPress={() => handleSignup(occ.id)}
                    >
                      <Text className="text-white text-xs font-semibold">Sign Up</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}
