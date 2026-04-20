import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { apiFetch } from '../../../../lib/api';
import BackButton from '../../../../components/BackButton';

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
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-base" edges={['top']}>
          <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
            <BackButton label="Back" />
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-ink-muted">Loading...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  if (!gym)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-base" edges={['top']}>
          <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
            <BackButton label="Back" />
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-ink-muted">Gym not found.</Text>
          </View>
        </SafeAreaView>
      </>
    );

  const cards = [
    { title: 'Announcements', desc: 'Updates from your gym', route: `/(app)/gym/${gymId}/announcements` },
    { title: 'Programs', desc: 'View workout programs', route: `/(app)/gym/${gymId}/programs` },
    { title: 'Classes', desc: 'View class schedule', route: `/(app)/gym/${gymId}/classes` },
    { title: 'Plans', desc: 'View membership plans', route: `/(app)/gym/${gymId}/join` },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Back" />
          <Text className="text-xl font-bold text-ink px-1">{gym.name}</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            {cards.map((card) => (
              <TouchableOpacity
                key={card.title}
                className="p-4 bg-card border border-rule rounded-xl mb-3"
                onPress={() => router.push(card.route as any)}
              >
                <Text className="text-base font-semibold text-ink">{card.title}</Text>
                <Text className="text-sm text-ink-soft mt-1">{card.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
