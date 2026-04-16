import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../lib/api';

export default function HomeScreen() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [gymCode, setGymCode] = useState('');
  const [looking, setLooking] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadGyms();
    }, [])
  );

  async function loadGyms() {
    try {
      const data = await apiFetch('/gyms');
      setGyms(data || []);
    } catch (err) {
      console.error('Failed to load gyms:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    const q = gymCode.trim();
    if (!q) return;

    setLooking(true);
    try {
      const results = await apiFetch(`/gyms/search?q=${encodeURIComponent(q)}`);
      const gym = Array.isArray(results) ? results[0] : null;
      if (gym?.id) {
        setShowJoin(false);
        setGymCode('');
        router.push(`/(app)/gym/${gym.id}/join` as any);
      } else {
        Alert.alert('Not Found', 'No gym found with that name. Check the name and try again.');
      }
    } catch (err) {
      Alert.alert('Not Found', 'No gym found with that name. Check the name and try again.');
    } finally {
      setLooking(false);
    }
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">My Gyms</Text>
        <TouchableOpacity
          className="bg-primary rounded-md px-4 py-2"
          onPress={() => setShowJoin(!showJoin)}
        >
          <Text className="text-white text-sm font-semibold">
            {showJoin ? 'Cancel' : 'Join a Gym'}
          </Text>
        </TouchableOpacity>
      </View>

      {showJoin && (
        <View className="p-4 bg-gray-100 rounded-lg mb-4">
          <Text className="text-sm text-gray-600 mb-2">Search for a gym by name</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-200 rounded-md p-2 bg-white text-base"
              placeholder="Gym name"
              value={gymCode}
              onChangeText={setGymCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="bg-primary rounded-md px-4 justify-center"
              onPress={handleLookup}
              disabled={looking || !gymCode.trim()}
            >
              <Text className="text-white text-sm font-semibold">{looking ? '...' : 'Go'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <Text className="text-gray-500 text-center mt-8">Loading...</Text>
      ) : gyms.length === 0 ? (
        <Text className="text-gray-500 text-center mt-8">You haven't joined any gyms yet.</Text>
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(item) => item.gym?.id || item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="p-4 bg-gray-100 rounded-lg mb-3"
              onPress={() => router.push(`/(app)/gym/${item.gym?.id}` as any)}
            >
              <Text className="text-lg font-semibold">{item.gym?.name}</Text>
              <Text className="text-sm text-gray-500 mt-1 capitalize">{item.role}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
