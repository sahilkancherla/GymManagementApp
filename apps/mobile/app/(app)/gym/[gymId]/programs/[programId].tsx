import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../../../lib/api';

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadWorkouts();
  }, [programId, selectedDate]);

  async function loadWorkouts() {
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
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
    setLoading(true);
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">Program Workouts</Text>

        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={() => navigateDay(-1)}>
            <Text className="text-sm font-semibold text-secondary">← Prev</Text>
          </TouchableOpacity>
          <Text className="text-sm font-semibold">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(1)}>
            <Text className="text-sm font-semibold text-secondary">Next →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text className="text-gray-500 text-center mt-8">Loading...</Text>
        ) : workouts.length === 0 ? (
          <Text className="text-gray-500 text-center mt-8">No workouts for this date.</Text>
        ) : (
          workouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)
        )}
      </View>
    </ScrollView>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [amrapRounds, setAmrapRounds] = useState('');
  const [amrapReps, setAmrapReps] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch(`/workouts/${workout.id}/stats`)
      .then((data) => {
        if (data && data.length > 0) {
          const s = data[0];
          if (s.time_seconds) {
            setTimeMinutes(String(Math.floor(s.time_seconds / 60)));
            setTimeSeconds(String(s.time_seconds % 60));
          }
          if (s.amrap_rounds !== null) setAmrapRounds(String(s.amrap_rounds));
          if (s.amrap_reps !== null) setAmrapReps(String(s.amrap_reps));
          if (s.notes) setNotes(s.notes);
          setSaved(true);
        }
      })
      .catch(console.error);
  }, [workout.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const body: any = { notes: notes || null };
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
      setSaved(true);
      Alert.alert('Saved', 'Stats recorded');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="bg-gray-100 rounded-lg p-4 mb-3">
      <Text className="text-base font-semibold">{workout.title}</Text>
      <Text className="text-xs text-gray-400 mt-0.5">{workout.format.toUpperCase()}</Text>
      {workout.description && (
        <Text className="text-sm text-gray-500 mt-1">{workout.description}</Text>
      )}

      <View className="mt-3 border-t border-gray-200 pt-3">
        {workout.format === 'time' ? (
          <View className="flex-row items-center mb-2">
            <TextInput
              className="border border-gray-200 rounded-md p-2 w-16 text-sm text-center bg-white"
              placeholder="min"
              keyboardType="numeric"
              value={timeMinutes}
              onChangeText={setTimeMinutes}
            />
            <Text className="text-lg mx-2 font-semibold">:</Text>
            <TextInput
              className="border border-gray-200 rounded-md p-2 w-16 text-sm text-center bg-white"
              placeholder="sec"
              keyboardType="numeric"
              value={timeSeconds}
              onChangeText={setTimeSeconds}
            />
          </View>
        ) : (
          <View className="flex-row items-center mb-2">
            <TextInput
              className="border border-gray-200 rounded-md p-2 w-16 text-sm text-center bg-white"
              placeholder="rounds"
              keyboardType="numeric"
              value={amrapRounds}
              onChangeText={setAmrapRounds}
            />
            <Text className="text-lg mx-2 font-semibold">+</Text>
            <TextInput
              className="border border-gray-200 rounded-md p-2 w-16 text-sm text-center bg-white"
              placeholder="reps"
              keyboardType="numeric"
              value={amrapReps}
              onChangeText={setAmrapReps}
            />
          </View>
        )}
        <TextInput
          className="border border-gray-200 rounded-md p-2 text-sm mb-2 bg-white"
          placeholder="Notes"
          value={notes}
          onChangeText={setNotes}
        />
        <TouchableOpacity
          className="bg-primary rounded-md p-2.5 items-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-sm font-semibold">
            {saving ? 'Saving...' : saved ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
