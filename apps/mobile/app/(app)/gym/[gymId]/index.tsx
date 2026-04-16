import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../lib/api';

export default function GymDetailScreen() {
  const { gymId } = useLocalSearchParams();
  const router = useRouter();
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/gyms/${gymId}`)
      .then(setGym)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gymId]);

  if (loading)
    return (
      <View className="flex-1 p-4 bg-white">
        <Text>Loading...</Text>
      </View>
    );
  if (!gym)
    return (
      <View className="flex-1 p-4 bg-white">
        <Text>Gym not found.</Text>
      </View>
    );

  const cards = [
    { title: 'Announcements', desc: 'Updates from your gym', route: `/(app)/gym/${gymId}/announcements` },
    { title: 'Programs', desc: 'View workout programs', route: `/(app)/gym/${gymId}/programs` },
    { title: 'Classes', desc: 'View class schedule', route: `/(app)/gym/${gymId}/classes` },
    { title: 'Plans', desc: 'View membership plans', route: `/(app)/gym/${gymId}/join` },
  ];

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">{gym.name}</Text>

        {cards.map((card) => (
          <TouchableOpacity
            key={card.title}
            className="p-4 bg-gray-100 rounded-lg mb-3"
            onPress={() => router.push(card.route as any)}
          >
            <Text className="text-base font-semibold">{card.title}</Text>
            <Text className="text-sm text-gray-500 mt-1">{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
