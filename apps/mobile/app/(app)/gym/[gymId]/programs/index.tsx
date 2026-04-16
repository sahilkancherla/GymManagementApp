import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../../lib/api';

export default function ProgramsScreen() {
  const { gymId } = useLocalSearchParams();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/gyms/${gymId}/programs`)
      .then(setPrograms)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gymId]);

  async function handleEnroll(programId: string) {
    try {
      await apiFetch(`/gyms/${gymId}/programs/${programId}/enroll`, { method: 'POST' });
      Alert.alert('Success', 'Enrolled in program');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Programs</Text>
      {loading ? (
        <Text className="text-gray-500 text-center mt-8">Loading...</Text>
      ) : programs.length === 0 ? (
        <Text className="text-gray-500 text-center mt-8">No programs available.</Text>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="flex-row items-center p-4 bg-gray-100 rounded-lg mb-3">
              <TouchableOpacity
                className="flex-1"
                onPress={() => router.push(`/(app)/gym/${gymId}/programs/${item.id}` as any)}
              >
                <Text className="text-base font-semibold">{item.name}</Text>
                {item.description && (
                  <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-primary rounded-md px-3 py-2"
                onPress={() => handleEnroll(item.id)}
              >
                <Text className="text-white text-xs font-semibold">Enroll</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
