import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../../lib/api';
import { colors } from '../../../../lib/theme';
import BackButton from '../../../../components/BackButton';

type Announcement = {
  id: string;
  gym_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  program_id: string | null;
  plan_id: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type TargetOpt = { id: string; name: string };

function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function authorInitials(a: Announcement) {
  const f = a.author?.first_name?.[0] || '';
  const l = a.author?.last_name?.[0] || '';
  return (f + l).toUpperCase() || 'A';
}

function authorName(a: Announcement) {
  const parts = [a.author?.first_name, a.author?.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Admin';
}

function sortFeed(items: Announcement[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function AnnouncementsScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [programs, setPrograms] = useState<TargetOpt[]>([]);
  const [plans, setPlans] = useState<TargetOpt[]>([]);

  const programsById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);
  const plansById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const load = useCallback(async () => {
    try {
      const [data, gyms] = await Promise.all([
        apiFetch(`/gyms/${gymId}/announcements`),
        apiFetch('/gyms').catch(() => []),
      ]);
      setItems(sortFeed(data || []));
      const me = (gyms || []).find((m: any) => m.gym?.id === gymId);
      const roles: string[] = me?.roles || (me?.role ? [me.role] : []);
      const isAdmin = roles.includes('admin');
      setCanManage(isAdmin);

      if (isAdmin) {
        const [progs, pls] = await Promise.all([
          apiFetch(`/gyms/${gymId}/programs`).catch(() => []),
          apiFetch(`/gyms/${gymId}/plans`).catch(() => []),
        ]);
        setPrograms((progs || []).map((p: any) => ({ id: p.id, name: p.name })));
        setPlans((pls || []).map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete(id: string) {
    Alert.alert('Delete Announcement', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/gyms/${gymId}/announcements/${id}`, { method: 'DELETE' });
            setItems((xs) => xs.filter((x) => x.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  async function handleTogglePin(item: Announcement) {
    try {
      const updated = await apiFetch(`/gyms/${gymId}/announcements/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ pinned: !item.pinned }),
      });
      setItems((xs) => sortFeed(xs.map((x) => (x.id === item.id ? updated : x))));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update');
    }
  }

  function getTargetLabel(item: Announcement): string | null {
    if (item.program_id) {
      const p = programsById.get(item.program_id);
      return p ? `Program: ${p.name}` : 'Program';
    }
    if (item.plan_id) {
      const p = plansById.get(item.plan_id);
      return p ? `Membership: ${p.name}` : 'Membership';
    }
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        {/* Custom header */}
        <View className="px-4 pt-1 pb-2 border-b border-rule bg-base flex-row items-center justify-between">
          <View>
            <BackButton label="Back" />
            <Text className="text-xl font-bold text-ink px-1">Announcements</Text>
          </View>
          {canManage && (
            <TouchableOpacity
              onPress={() => {
                setEditing(null);
                setComposerOpen(true);
              }}
            >
              <Ionicons name="add-circle" size={26} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

      <View className="flex-1 bg-base">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 justify-center items-center px-8">
            <View className="w-16 h-16 rounded-full bg-soft items-center justify-center mb-4">
              <Ionicons name="megaphone-outline" size={28} color={colors.inkMuted} />
            </View>
            <Text className="text-base font-semibold text-ink mb-1">
              {canManage ? 'No announcements yet' : 'Nothing posted yet'}
            </Text>
            <Text className="text-sm text-ink-muted text-center">
              {canManage
                ? 'Tap + to share your first update with members.'
                : 'Check back later for updates from your gym.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.accent}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => {
              const targetLabel = getTargetLabel(item);
              const wasEdited =
                item.updated_at &&
                new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 60_000;

              return (
                <View
                  className={`rounded-xl border p-4 ${
                    item.pinned
                      ? 'border-accent-rule bg-accent-soft'
                      : 'border-rule bg-card'
                  }`}
                >
                  {/* Author row */}
                  <View className="flex-row items-start">
                    <View className="w-9 h-9 rounded-full bg-accent items-center justify-center mr-3">
                      <Text className="text-xs font-bold text-white">
                        {authorInitials(item)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="text-[15px] font-bold text-ink mr-2">
                          {item.title}
                        </Text>
                        {item.pinned && (
                          <View className="bg-accent-soft border border-accent-rule px-1.5 py-0.5 rounded flex-row items-center mr-1">
                            <Ionicons name="pin" size={9} color={colors.accentInk} />
                            <Text className="text-[9px] font-bold text-accent-ink ml-0.5 uppercase">
                              Pinned
                            </Text>
                          </View>
                        )}
                        {targetLabel && (
                          <View className="bg-soft border border-rule px-1.5 py-0.5 rounded flex-row items-center">
                            <Ionicons
                              name={item.program_id ? 'layers-outline' : 'card-outline'}
                              size={9}
                              color={colors.inkSoft}
                            />
                            <Text className="text-[9px] font-semibold text-ink-soft ml-0.5">
                              {targetLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-ink-muted mt-0.5">
                        <Text className="font-medium text-ink-soft">{authorName(item)}</Text>
                        {' '}· {relativeTime(item.created_at)}
                        {wasEdited ? ' · edited' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Body */}
                  <Text className="text-[13px] text-ink-soft mt-3 leading-5">
                    {item.body}
                  </Text>

                  {/* Admin actions */}
                  {canManage && (
                    <View className="flex-row gap-2 mt-3 pt-3 border-t border-rule">
                      <TouchableOpacity
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-soft border border-rule"
                        onPress={() => handleTogglePin(item)}
                      >
                        <Ionicons
                          name={item.pinned ? 'pin-outline' : 'pin'}
                          size={12}
                          color={colors.inkSoft}
                        />
                        <Text className="text-xs font-medium text-ink-soft ml-1">
                          {item.pinned ? 'Unpin' : 'Pin'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-soft border border-rule"
                        onPress={() => {
                          setEditing(item);
                          setComposerOpen(true);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={12} color={colors.inkSoft} />
                        <Text className="text-xs font-medium text-ink-soft ml-1">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-danger-soft"
                        onPress={() => handleDelete(item.id)}
                      >
                        <Ionicons name="trash-outline" size={12} color={colors.danger} />
                        <Text className="text-xs font-medium text-danger ml-1">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        <Composer
          visible={composerOpen}
          gymId={gymId as string}
          initial={editing}
          programs={programs}
          plans={plans}
          onClose={() => {
            setComposerOpen(false);
            setEditing(null);
          }}
          onSaved={(saved, mode) => {
            setItems((xs) =>
              sortFeed(mode === 'create' ? [saved, ...xs] : xs.map((x) => (x.id === saved.id ? saved : x)))
            );
            setComposerOpen(false);
            setEditing(null);
          }}
        />
      </View>
      </SafeAreaView>
    </>
  );
}

function Composer({
  visible,
  gymId,
  initial,
  programs,
  plans,
  onClose,
  onSaved,
}: {
  visible: boolean;
  gymId: string;
  initial: Announcement | null;
  programs: TargetOpt[];
  plans: TargetOpt[];
  onClose: () => void;
  onSaved: (item: Announcement, mode: 'create' | 'update') => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [target, setTarget] = useState<'gym' | 'program' | 'plan'>('gym');
  const [programId, setProgramId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || '');
      setBody(initial?.body || '');
      setPinned(!!initial?.pinned);
      if (initial?.program_id) {
        setTarget('program');
        setProgramId(initial.program_id);
      } else if (initial?.plan_id) {
        setTarget('plan');
        setPlanId(initial.plan_id);
      } else {
        setTarget('gym');
        setProgramId(null);
        setPlanId(null);
      }
      setSaving(false);
    }
  }, [visible, initial]);

  const mode = initial ? 'update' : 'create';
  const canSubmit =
    !saving &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (target !== 'program' || programId) &&
    (target !== 'plan' || planId);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        pinned,
        program_id: target === 'program' ? programId : null,
        plan_id: target === 'plan' ? planId : null,
      };
      const saved = initial
        ? await apiFetch(`/gyms/${gymId}/announcements/${initial.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/gyms/${gymId}/announcements`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      onSaved(saved, mode);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const targetOptions = [
    { key: 'gym' as const, label: 'Whole Gym', icon: 'globe-outline' as const },
    { key: 'program' as const, label: 'Program', icon: 'layers-outline' as const },
    { key: 'plan' as const, label: 'Membership', icon: 'card-outline' as const },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-base"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-rule bg-card">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-sm text-ink-muted">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-base font-bold text-ink">
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit}>
            <Text
              className={`text-sm font-bold ${canSubmit ? 'text-accent' : 'text-ink-faint'}`}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Publish' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={140}
            placeholder="e.g. Holiday hours this weekend"
            placeholderTextColor={colors.inkMuted}
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-card mb-1"
          />
          <Text className="text-[11px] text-ink-muted text-right mb-4">
            {title.length}/140
          </Text>

          {/* Body */}
          <Text className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Message
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            maxLength={4000}
            placeholder="Share the details with your members..."
            placeholderTextColor={colors.inkMuted}
            multiline
            textAlignVertical="top"
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-card mb-1"
            style={{ minHeight: 140 }}
          />
          <Text className="text-[11px] text-ink-muted text-right mb-4">
            {body.length}/4000
          </Text>

          {/* Audience */}
          <Text className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            Audience
          </Text>
          <View className="flex-row bg-soft rounded-xl p-1 mb-2">
            {targetOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setTarget(opt.key)}
                className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
                  target === opt.key ? 'bg-card' : ''
                }`}
                style={
                  target === opt.key
                    ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    : undefined
                }
              >
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={target === opt.key ? colors.ink : colors.inkMuted}
                />
                <Text
                  className={`text-[11px] font-semibold ml-1 ${
                    target === opt.key ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Program selector */}
          {target === 'program' && (
            <View className="mb-2">
              {programs.length === 0 ? (
                <Text className="text-xs text-ink-muted py-2">No programs available</Text>
              ) : (
                programs.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setProgramId(p.id)}
                    className={`flex-row items-center px-3 py-2.5 rounded-lg border mb-1.5 ${
                      programId === p.id
                        ? 'border-accent bg-accent-soft'
                        : 'border-rule bg-card'
                    }`}
                  >
                    {programId === p.id && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    )}
                    <Text
                      className={`text-sm font-medium ${
                        programId === p.id ? 'text-accent-ink ml-2' : 'text-ink'
                      }`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Plan selector */}
          {target === 'plan' && (
            <View className="mb-2">
              {plans.length === 0 ? (
                <Text className="text-xs text-ink-muted py-2">No membership plans available</Text>
              ) : (
                plans.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPlanId(p.id)}
                    className={`flex-row items-center px-3 py-2.5 rounded-lg border mb-1.5 ${
                      planId === p.id
                        ? 'border-accent bg-accent-soft'
                        : 'border-rule bg-card'
                    }`}
                  >
                    {planId === p.id && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    )}
                    <Text
                      className={`text-sm font-medium ${
                        planId === p.id ? 'text-accent-ink ml-2' : 'text-ink'
                      }`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <Text className="text-[11px] text-ink-muted mb-4">
            {target === 'gym'
              ? 'Visible to every active member of this gym.'
              : target === 'program'
                ? 'Only members enrolled in this program will see it.'
                : 'Only members with this membership plan will see it.'}
          </Text>

          {/* Pinned toggle */}
          <TouchableOpacity
            className="flex-row items-center py-2 mb-4"
            onPress={() => setPinned((v) => !v)}
          >
            <View
              className={`h-5 w-5 rounded border items-center justify-center ${
                pinned ? 'bg-accent border-accent' : 'border-rule bg-card'
              }`}
            >
              {pinned && <Ionicons name="checkmark" size={13} color="#ffffff" />}
            </View>
            <Ionicons name="pin" size={13} color={colors.inkSoft} style={{ marginLeft: 8 }} />
            <Text className="text-sm text-ink-soft ml-1">Pin to top of announcements</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
