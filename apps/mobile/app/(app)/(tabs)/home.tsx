import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../lib/api';
import { useGym } from '../../../lib/gym-context';
import { colors } from '../../../lib/theme';

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function HomeScreen() {
  const { gyms, activeGym, setActiveGymId, loading: gymLoading, refresh, isAdmin } = useGym();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Join gym state
  const [showJoin, setShowJoin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const gymId = activeGym?.gym_id;

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoadingAnn(true);
    try {
      const data = await apiFetch(`/gyms/${gymId}/announcements`);
      const sorted = (data || [])
        .sort((a: Announcement, b: Announcement) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 3);
      setAnnouncements(sorted);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoadingAnn(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadData();
    }, [loadData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    await loadData();
    setRefreshing(false);
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const results = await apiFetch(`/gyms/search?q=${encodeURIComponent(q)}`);
      const list = Array.isArray(results) ? results : [];
      setSearchResults(list);
      if (list.length === 0) {
        setSearchError('No gyms found. Check the name and try again.');
      }
    } catch (err: any) {
      setSearchError(err?.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function selectGymToJoin(gym: any) {
    setShowJoin(false);
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
    router.push(`/(app)/gym/${gym.id}/join` as any);
  }

  // No gyms — empty state
  if (!gymLoading && gyms.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <Text className="text-2xl font-bold text-ink mb-2">Welcome</Text>
          <Text className="text-base text-ink-soft mb-6">
            You haven't joined any gyms yet. Search for a gym to get started.
          </Text>

          <View className="bg-card border border-rule rounded-xl p-5">
            <Text className="text-sm font-semibold text-ink mb-3">Join a Gym</Text>
            <Text className="text-sm text-ink-muted mb-3">Search for a gym by name</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base"
                placeholder="Gym name"
                placeholderTextColor={colors.inkMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-accent rounded-lg px-4 justify-center"
                onPress={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="search" size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Search error */}
            {searchError && (
              <View className="mt-3 bg-danger-soft rounded-lg px-3 py-2.5">
                <Text className="text-danger text-sm">{searchError}</Text>
              </View>
            )}

            {/* Search results */}
            {searchResults && searchResults.length > 0 && (
              <View className="mt-3">
                {searchResults.map((gym: any) => (
                  <TouchableOpacity
                    key={gym.id}
                    className="flex-row items-center justify-between border border-rule rounded-lg px-3 py-3 mb-2 bg-base"
                    onPress={() => selectGymToJoin(gym)}
                  >
                    <Text className="text-base font-semibold text-ink flex-shrink" numberOfLines={1}>
                      {gym.name}
                    </Text>
                    <View className="flex-row items-center ml-2">
                      <Text className="text-sm font-medium text-accent mr-1">Join</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (gymLoading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const hasMultipleGyms = gyms.length > 1;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Gym Switcher Modal */}
      <Modal visible={showSwitcher} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowSwitcher(false)}
        >
          <Pressable
            className="bg-card rounded-t-2xl px-5 pt-5 pb-10"
            onPress={() => {}}
          >
            <Text className="text-lg font-bold text-ink mb-4">Switch Gym</Text>
            {gyms.map((g) => {
              const isActive = g.gym_id === activeGym?.gym_id;
              return (
                <TouchableOpacity
                  key={g.gym_id}
                  className={`flex-row items-center p-3 rounded-xl mb-2 ${
                    isActive ? 'bg-accent-soft' : 'bg-base'
                  }`}
                  onPress={() => {
                    setActiveGymId(g.gym_id);
                    setShowSwitcher(false);
                  }}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-base font-semibold ${
                        isActive ? 'text-accent-ink' : 'text-ink'
                      }`}
                    >
                      {g.gym.name}
                    </Text>
                    <Text className="text-xs text-ink-muted capitalize mt-0.5">
                      {g.roles.join(', ')}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-row items-center flex-shrink"
              onPress={() => hasMultipleGyms && setShowSwitcher(true)}
              activeOpacity={hasMultipleGyms ? 0.6 : 1}
            >
              <Text className="text-2xl font-bold text-ink" numberOfLines={1}>
                {activeGym?.gym.name}
              </Text>
              {hasMultipleGyms && (
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.inkSoft}
                  style={{ marginLeft: 4, marginTop: 2 }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-3"
              onPress={() => {
                setShowJoin(!showJoin);
                setSearchResults(null);
                setSearchError(null);
                setSearchQuery('');
              }}
            >
              <Ionicons
                name={showJoin ? 'close-circle-outline' : 'add-circle-outline'}
                size={26}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Role pills */}
          {activeGym && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {activeGym.roles.map((role) => (
                <View key={role} className="bg-accent-soft px-2.5 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-accent-ink capitalize">
                    {role}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Join Gym Search (inline) */}
        {showJoin && (
          <View className="bg-card border border-rule rounded-xl p-4 mb-5">
            <Text className="text-sm text-ink-muted mb-2">Search for a gym by name</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base"
                placeholder="Gym name"
                placeholderTextColor={colors.inkMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-accent rounded-lg px-4 justify-center"
                onPress={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Go</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Search error */}
            {searchError && (
              <View className="mt-3 bg-danger-soft rounded-lg px-3 py-2.5">
                <Text className="text-danger text-sm">{searchError}</Text>
              </View>
            )}

            {/* Search results */}
            {searchResults && searchResults.length > 0 && (
              <View className="mt-3">
                {searchResults.map((gym: any) => (
                  <TouchableOpacity
                    key={gym.id}
                    className="flex-row items-center justify-between border border-rule rounded-lg px-3 py-3 mb-2 bg-base"
                    onPress={() => selectGymToJoin(gym)}
                  >
                    <Text className="text-base font-semibold text-ink flex-shrink" numberOfLines={1}>
                      {gym.name}
                    </Text>
                    <View className="flex-row items-center ml-2">
                      <Text className="text-sm font-medium text-accent mr-1">Join</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Announcements Card */}
        <View className="flex-row items-center justify-between mb-2 ml-1">
          <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Announcements
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.push(`/(app)/gym/${gymId}/announcements` as any)}
          >
            <Text className="text-xs font-semibold text-accent mr-0.5">
              {isAdmin ? 'Manage' : 'View All'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          {loadingAnn ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : announcements.length === 0 ? (
            <View className="items-center py-4">
              <Ionicons name="megaphone-outline" size={28} color={colors.inkFaint} />
              <Text className="text-sm text-ink-muted mt-2">No announcements yet</Text>
              {isAdmin && (
                <TouchableOpacity
                  className="mt-3 bg-accent rounded-lg px-4 py-2"
                  onPress={() => router.push(`/(app)/gym/${gymId}/announcements` as any)}
                >
                  <Text className="text-white text-sm font-semibold">Create Announcement</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            announcements.map((ann, idx) => {
              const isExpanded = expandedId === ann.id;
              return (
                <TouchableOpacity
                  key={ann.id}
                  className={idx < announcements.length - 1 ? 'mb-3 pb-3 border-b border-rule' : ''}
                  onPress={() => setExpandedId(isExpanded ? null : ann.id)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center mb-1">
                    {ann.pinned && (
                      <View className="bg-accent-soft px-2 py-0.5 rounded mr-2">
                        <Text className="text-[10px] font-bold text-accent-ink">PINNED</Text>
                      </View>
                    )}
                    <Text className="text-xs text-ink-muted">{relativeTime(ann.created_at)}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-ink">{ann.title}</Text>
                  {isExpanded && ann.body ? (
                    <Text className="text-sm text-ink-soft mt-1.5 leading-5">{ann.body}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quick Actions */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Quick Actions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          className="mb-5"
        >
          <TouchableOpacity
            className="bg-card border border-rule rounded-xl p-4 items-center w-28"
            onPress={() => router.push('/(app)/(tabs)/schedule' as any)}
          >
            <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
              <Ionicons name="calendar-outline" size={22} color={colors.accent} />
            </View>
            <Text className="text-sm font-semibold text-ink">Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-card border border-rule rounded-xl p-4 items-center w-28"
            onPress={() => router.push('/(app)/(tabs)/programs' as any)}
          >
            <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
              <Ionicons name="barbell-outline" size={22} color={colors.accent} />
            </View>
            <Text className="text-sm font-semibold text-ink">Programs</Text>
          </TouchableOpacity>

          {isAdmin && gymId && (
            <TouchableOpacity
              className="bg-card border border-rule rounded-xl p-4 items-center w-28"
              onPress={() => router.push('/(app)/(tabs)/members' as any)}
            >
              <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
                <Ionicons name="people-outline" size={22} color={colors.accent} />
              </View>
              <Text className="text-sm font-semibold text-ink">Members</Text>
            </TouchableOpacity>
          )}

          {isAdmin && gymId && (
            <TouchableOpacity
              className="bg-card border border-rule rounded-xl p-4 items-center w-28"
              onPress={() => router.push(`/(app)/gym/${gymId}/announcements` as any)}
            >
              <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
                <Ionicons name="megaphone-outline" size={22} color={colors.accent} />
              </View>
              <Text className="text-sm font-semibold text-ink">Announce</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
