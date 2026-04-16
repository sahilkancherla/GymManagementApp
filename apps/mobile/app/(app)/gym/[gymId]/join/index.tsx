import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../../lib/api';

export default function JoinGymScreen() {
  const { gymId } = useLocalSearchParams();
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    apiFetch(`/gyms/${gymId}/plans`)
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gymId]);

  async function handleJoin(planId?: string) {
    setJoining(true);
    try {
      await apiFetch(`/gyms/${gymId}/join`, {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId || null }),
      });
      Alert.alert('Success', 'Joined gym successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setJoining(false);
    }
  }

  if (loading)
    return (
      <View className="flex-1 p-4 bg-white">
        <Text>Loading...</Text>
      </View>
    );

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Membership Plans</Text>
      {plans.length === 0 ? (
        <View className="items-center mt-8">
          <Text className="text-gray-500 mb-4">No plans available.</Text>
          <TouchableOpacity
            className="bg-primary rounded-md px-4 py-3"
            onPress={() => handleJoin()}
            disabled={joining}
          >
            <Text className="text-white text-sm font-semibold">
              {joining ? 'Joining...' : 'Join without a plan'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={({ item: plan }) => (
            <View className="flex-row items-center p-4 bg-gray-100 rounded-lg mb-3">
              <View className="flex-1">
                <Text className="text-base font-semibold">{plan.name}</Text>
                {plan.description && (
                  <Text className="text-sm text-gray-500 mt-0.5">{plan.description}</Text>
                )}
                <Text className="text-sm font-medium mt-1">
                  ${(plan.price_cents / 100).toFixed(2)}
                  {plan.billing_period && ` / ${plan.billing_period}`}
                  {plan.class_count && ` · ${plan.class_count} classes`}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-primary rounded-md px-4 py-2.5"
                onPress={() => handleJoin(plan.id)}
                disabled={joining}
              >
                <Text className="text-white text-sm font-semibold">{joining ? '...' : 'Select'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
