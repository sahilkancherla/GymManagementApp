import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../../lib/api';
import { colors } from '../../../../../lib/theme';

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-ink">Membership Plans</Text>
        <Text className="text-sm text-ink-soft mt-1">
          Choose a plan to get started.
        </Text>
      </View>

      {plans.length === 0 ? (
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-ink-muted text-sm mb-4">No plans available.</Text>
          <TouchableOpacity
            className="bg-accent rounded-lg px-5 py-3"
            onPress={() => handleJoin()}
            disabled={joining}
          >
            <Text className="text-white text-sm font-semibold">
              {joining ? 'Joining…' : 'Join without a plan'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: plan }) => (
            <View className="bg-card rounded-xl border border-rule p-4">
              <View className="mb-3">
                <Text className="text-base font-semibold text-ink">{plan.name}</Text>
                {plan.description && (
                  <Text className="text-sm text-ink-soft mt-1" numberOfLines={2}>
                    {plan.description}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-ink">
                  ${(plan.price_cents / 100).toFixed(2)}
                  <Text className="text-sm font-normal text-ink-muted">
                    {plan.billing_period ? ` / ${plan.billing_period}` : ''}
                    {plan.class_count ? ` · ${plan.class_count} classes` : ''}
                  </Text>
                </Text>
                <TouchableOpacity
                  className="bg-accent rounded-lg px-4 py-2"
                  onPress={() => handleJoin(plan.id)}
                  disabled={joining}
                >
                  <Text className="text-white text-sm font-semibold">
                    {joining ? '…' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity
              className="mt-4 border border-rule rounded-xl py-3 items-center"
              onPress={() => handleJoin()}
              disabled={joining}
            >
              <Text className="text-sm font-medium text-ink-soft">
                {joining ? 'Joining…' : 'Join without a plan'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}
