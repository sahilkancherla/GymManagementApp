import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../../lib/api';
import { colors } from '../../../../lib/theme';
import BackButton from '../../../../components/BackButton';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  type: 'monthly' | 'annual' | 'count';
  class_count: number | null;
  is_active: boolean;
  program_ids: string[];
};

type ProgramInfo = {
  id: string;
  name: string;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  classes_used: number;
  period_start: string | null;
  period_end: string | null;
  plan?: Plan;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function typeLabel(type: string): string {
  if (type === 'monthly') return '/month';
  if (type === 'annual') return '/year';
  if (type === 'count') return ' per pack';
  return '';
}

function typeBadge(type: string): string {
  if (type === 'monthly') return 'Monthly';
  if (type === 'annual') return 'Annual';
  if (type === 'count') return 'Class Pack';
  return type;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MembershipsScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, ProgramInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const subscribedPlanIds = new Set(
    subscriptions
      .filter((s) => s.status === 'active')
      .map((s) => s.plan_id || (s.plan as any)?.id)
      .filter(Boolean)
  );

  useEffect(() => {
    loadData();
  }, [gymId]);

  async function loadData() {
    try {
      const [plansData, subsData, programsData] = await Promise.all([
        apiFetch(`/gyms/${gymId}/plans`),
        apiFetch(`/gyms/${gymId}/my-subscriptions`),
        apiFetch(`/gyms/${gymId}/programs`),
      ]);
      setPlans((plansData || []).filter((p: Plan) => p.is_active));
      setSubscriptions(subsData || []);
      const pMap = new Map<string, ProgramInfo>();
      for (const p of programsData || []) {
        pMap.set(p.id, { id: p.id, name: p.name });
      }
      setProgramsMap(pMap);
    } catch (err) {
      console.error('Failed to load membership data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  async function handleSubscribe(planId: string, planName: string) {
    Alert.alert(
      'Subscribe',
      `Subscribe to ${planName}? Payment integration coming soon — this will register your membership.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setSubscribingId(planId);
            try {
              await apiFetch(`/gyms/${gymId}/join`, {
                method: 'POST',
                body: JSON.stringify({ plan_id: planId }),
              });
              await loadData();
              Alert.alert('Success', 'You have been subscribed!');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not subscribe');
            } finally {
              setSubscribingId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        {/* Custom header */}
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base">
          <BackButton label="Back" />
          <Text className="text-xl font-bold text-ink px-1">Memberships</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Active subscriptions */}
            {subscriptions.length > 0 && (
              <View className="px-5 pt-5">
                <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 ml-1">
                  Your Active Plans
                </Text>
                {subscriptions.map((sub) => (
                  <View
                    key={sub.id}
                    className="bg-accent-soft border border-accent-rule rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                        <Text className="text-base font-bold text-ink ml-2">
                          {sub.plan?.name || 'Membership'}
                        </Text>
                      </View>
                      <View className="bg-accent px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-bold text-white uppercase">Active</Text>
                      </View>
                    </View>

                    {sub.plan && (
                      <View className="mt-2">
                        <Text className="text-sm text-ink-soft">
                          {formatPrice(sub.plan.price_cents)}{typeLabel(sub.plan.type)}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row flex-wrap gap-3 mt-2">
                      {sub.plan?.type === 'count' && sub.plan.class_count && (
                        <View className="flex-row items-center">
                          <Ionicons name="ticket-outline" size={13} color={colors.inkMuted} />
                          <Text className="text-xs text-ink-muted ml-1">
                            {sub.classes_used}/{sub.plan.class_count} classes used
                          </Text>
                        </View>
                      )}
                      {sub.period_end && (
                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={13} color={colors.inkMuted} />
                          <Text className="text-xs text-ink-muted ml-1">
                            Renews {formatDate(sub.period_end)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Available plans */}
            <View className="px-5 pt-5">
              <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 ml-1">
                Available Plans
              </Text>

              {plans.length === 0 ? (
                <View className="bg-card border border-rule rounded-xl p-6 items-center">
                  <Ionicons name="pricetag-outline" size={32} color={colors.inkFaint} />
                  <Text className="text-sm text-ink-muted mt-3 text-center">
                    No membership plans available at this gym yet.
                  </Text>
                </View>
              ) : (
                plans.map((plan) => {
                  const isSubscribed = subscribedPlanIds.has(plan.id);
                  const isSubscribing = subscribingId === plan.id;

                  return (
                    <View
                      key={plan.id}
                      className={`border rounded-xl mb-3 overflow-hidden ${
                        isSubscribed
                          ? 'border-accent bg-card'
                          : 'border-rule bg-card'
                      }`}
                    >
                      <View className="p-4">
                        {/* Plan header */}
                        <View className="flex-row items-start justify-between mb-1">
                          <View className="flex-1 mr-3">
                            <Text className="text-base font-bold text-ink">{plan.name}</Text>
                          </View>
                          <View className="bg-soft px-2.5 py-1 rounded-full">
                            <Text className="text-[10px] font-bold text-ink-soft uppercase">
                              {typeBadge(plan.type)}
                            </Text>
                          </View>
                        </View>

                        {/* Price */}
                        <View className="flex-row items-baseline mt-1">
                          <Text className="text-2xl font-bold text-ink">
                            {formatPrice(plan.price_cents)}
                          </Text>
                          <Text className="text-sm text-ink-muted ml-1">
                            {typeLabel(plan.type)}
                          </Text>
                        </View>

                        {/* Description */}
                        {plan.description ? (
                          <Text className="text-sm text-ink-soft mt-2 leading-5">
                            {plan.description}
                          </Text>
                        ) : null}

                        {/* Features */}
                        <View className="mt-3">
                          {plan.type === 'count' && plan.class_count && (
                            <View className="flex-row items-center mb-1.5">
                              <Ionicons name="checkmark" size={14} color={colors.accent} />
                              <Text className="text-sm text-ink-soft ml-2">
                                {plan.class_count} classes included
                              </Text>
                            </View>
                          )}
                          {plan.type === 'monthly' && (
                            <View className="flex-row items-center mb-1.5">
                              <Ionicons name="checkmark" size={14} color={colors.accent} />
                              <Text className="text-sm text-ink-soft ml-2">
                                Unlimited classes per month
                              </Text>
                            </View>
                          )}
                          {plan.type === 'annual' && (
                            <View className="flex-row items-center mb-1.5">
                              <Ionicons name="checkmark" size={14} color={colors.accent} />
                              <Text className="text-sm text-ink-soft ml-2">
                                Unlimited classes for a full year
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Programs included */}
                        <View className="mt-3 pt-3 border-t border-rule">
                          <View className="flex-row items-center mb-1.5">
                            <Ionicons name="barbell-outline" size={14} color={colors.inkMuted} />
                            <Text className="text-xs font-semibold text-ink-muted ml-1.5 uppercase">
                              Programs Included
                            </Text>
                          </View>
                          {(!plan.program_ids || plan.program_ids.length === 0) ? (
                            <View className="flex-row items-center ml-0.5">
                              <Ionicons name="checkmark" size={14} color={colors.accent} />
                              <Text className="text-sm text-ink-soft ml-2">All programs</Text>
                            </View>
                          ) : (
                            plan.program_ids.map((pid) => {
                              const prog = programsMap.get(pid);
                              return (
                                <View key={pid} className="flex-row items-center ml-0.5 mb-0.5">
                                  <Ionicons name="checkmark" size={14} color={colors.accent} />
                                  <Text className="text-sm text-ink-soft ml-2">
                                    {prog?.name || 'Program'}
                                  </Text>
                                </View>
                              );
                            })
                          )}
                        </View>

                        {/* Action button */}
                        <View className="mt-3">
                          {isSubscribed ? (
                            <View className="bg-accent-soft border border-accent-rule rounded-lg py-3 flex-row items-center justify-center">
                              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                              <Text className="text-sm font-semibold text-accent-ink ml-1.5">
                                Current Plan
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              className="bg-accent rounded-lg py-3 items-center"
                              onPress={() => handleSubscribe(plan.id, plan.name)}
                              disabled={isSubscribing}
                            >
                              {isSubscribing ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text className="text-sm font-semibold text-white">
                                  Subscribe
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Stripe note */}
              <View className="flex-row items-center mt-2 px-1">
                <Ionicons name="lock-closed-outline" size={12} color={colors.inkMuted} />
                <Text className="text-[11px] text-ink-muted ml-1.5">
                  Payment processing coming soon via Stripe
                </Text>
              </View>
            </View>
          </>
        )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
