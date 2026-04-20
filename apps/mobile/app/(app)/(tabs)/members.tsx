import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../lib/api';
import { useGym } from '../../../lib/gym-context';
import { colors } from '../../../lib/theme';

type SectionKey = 'members' | 'memberships';

type Member = {
  id: string;
  user_id: string;
  status: string;
  roles: string[];
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  type: 'monthly' | 'annual' | 'count';
  class_count: number | null;
  subscriber_count: number;
};

export default function MembersScreen() {
  const { activeGym, loading: gymLoading, isAdmin } = useGym();
  const gymId = activeGym?.gym_id;

  const [section, setSection] = useState<SectionKey>('members');

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'coach' | 'member'>('all');
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!gymId) {
      setMembers([]);
      setPlans([]);
      setLoading(false);
      return;
    }
    try {
      const [membersData, plansData] = await Promise.all([
        apiFetch(`/gyms/${gymId}/members`),
        apiFetch(`/gyms/${gymId}/plans`),
      ]);
      setMembers(membersData || []);
      setPlans(plansData || []);
    } catch (err) {
      console.error('Failed to load members/plans:', err);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // --- Members filtering ---
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && !(m.roles || []).includes(roleFilter)) return false;
      if (!q) return true;
      const name = `${m.profile?.first_name ?? ''} ${m.profile?.last_name ?? ''}`.toLowerCase();
      const email = (m.profile?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query, roleFilter]);

  const roleCounts = useMemo(() => {
    const c = { all: members.length, admin: 0, coach: 0, member: 0 };
    for (const m of members) {
      for (const r of m.roles || []) {
        if (r in c) c[r as keyof typeof c]++;
      }
    }
    return c;
  }, [members]);

  // --- Not admin or no gym ---
  if (!gymLoading && (!activeGym || !isAdmin)) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-ink">Members</Text>
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="lock-closed-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            Admin access required
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(0)}`;
  }

  function billingLabel(type: string) {
    if (type === 'monthly') return '/mo';
    if (type === 'annual') return '/yr';
    return 'pack';
  }

  function renderMember({ item }: { item: Member }) {
    const initials = `${(item.profile?.first_name?.[0] || '').toUpperCase()}${(item.profile?.last_name?.[0] || '').toUpperCase()}`;
    const isActive = item.status === 'active';

    return (
      <View
        className="bg-card border border-rule rounded-xl p-4 mb-3"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-soft border border-rule items-center justify-center mr-3">
            <Text className="text-xs font-bold text-ink-soft">{initials || '—'}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {item.profile?.first_name} {item.profile?.last_name}
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5" numberOfLines={1}>
              {item.profile?.email || '—'}
            </Text>
          </View>
          <View className="items-end ml-2">
            <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isActive ? 'bg-accent-soft' : 'bg-soft'}`}>
              <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-accent' : 'bg-ink-faint'}`} />
              <Text className={`text-[10px] font-semibold ${isActive ? 'text-accent-ink' : 'text-ink-muted'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View className="flex-row mt-1.5 gap-1">
              {(item.roles || []).map((role) => (
                <View key={role} className="bg-soft border border-rule rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-medium text-ink-soft capitalize">{role}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderPlan({ item }: { item: Plan }) {
    return (
      <View className="bg-card border border-rule rounded-xl p-4 mb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 min-w-0 mr-3">
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-end mt-1">
              <Text className="text-lg font-bold text-ink">
                {formatPrice(item.price_cents)}
              </Text>
              <Text className="text-xs text-ink-muted ml-1">
                {billingLabel(item.type)}
              </Text>
              {item.type === 'count' && item.class_count && (
                <Text className="text-xs text-ink-soft ml-2">
                  {item.class_count} classes
                </Text>
              )}
            </View>
          </View>
          <View className="bg-accent-soft rounded-full px-2.5 py-1 flex-row items-center">
            <Ionicons name="people" size={12} color={colors.accentInk} />
            <Text className="text-xs font-semibold text-accent-ink ml-1">
              {item.subscriber_count}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-ink">Members</Text>
        {activeGym?.gym?.name ? (
          <Text className="text-sm text-ink-muted mt-0.5">
            {activeGym.gym.name}
          </Text>
        ) : null}
      </View>

      {/* Section toggle */}
      <View className="px-5 mt-1 mb-3">
        <View className="flex-row bg-soft border border-rule rounded-lg p-1">
          {([
            { key: 'members' as SectionKey, label: 'Members', icon: 'people-outline' as const },
            { key: 'memberships' as SectionKey, label: 'Memberships', icon: 'card-outline' as const },
          ]).map((tab) => {
            const active = section === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className={`flex-1 flex-row items-center justify-center py-2 rounded-md ${active ? 'bg-card shadow-sm' : ''}`}
                onPress={() => setSection(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? colors.ink : colors.inkMuted}
                />
                <Text className={`text-sm font-semibold ml-1.5 ${active ? 'text-ink' : 'text-ink-muted'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : section === 'members' ? (
        <>
          {/* Role filter pills */}
          <View className="px-5 mb-3">
            <View className="flex-row gap-1.5">
              {(['all', 'admin', 'coach', 'member'] as const).map((r) => {
                const active = roleFilter === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRoleFilter(r)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      active
                        ? 'bg-ink border-ink'
                        : 'bg-card border-rule'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-xs font-semibold capitalize ${active ? 'text-white' : 'text-ink-soft'}`}>
                      {r}
                    </Text>
                    <Text className={`text-[10px] font-medium ml-1.5 ${active ? 'text-white/70' : 'text-ink-muted'}`}>
                      {roleCounts[r]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {filteredMembers.length === 0 ? (
            <View className="flex-1 justify-center items-center px-8">
              <Ionicons name="people-outline" size={48} color={colors.inkMuted} />
              <Text className="text-base text-ink-muted text-center mt-3">
                {members.length === 0 ? 'No members yet' : 'No members match filters'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderMember}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accent}
                />
              }
            />
          )}
        </>
      ) : (
        <>
          {plans.length === 0 ? (
            <View className="flex-1 justify-center items-center px-8">
              <Ionicons name="card-outline" size={48} color={colors.inkMuted} />
              <Text className="text-base text-ink-muted text-center mt-3">
                No membership plans yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={plans}
              keyExtractor={(item) => item.id}
              renderItem={renderPlan}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.accent}
                />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
