import { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../../lib/api';

type Announcement = {
  id: string;
  gym_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

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

function authorName(a: Announcement) {
  const parts = [a.author?.first_name, a.author?.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Admin';
}

function sortFeed(items: Announcement[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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

  const load = useCallback(async () => {
    try {
      const [data, gyms] = await Promise.all([
        apiFetch(`/gyms/${gymId}/announcements`),
        apiFetch('/gyms').catch(() => []),
      ]);
      setItems(sortFeed(data || []));
      const me = (gyms || []).find((m: any) => m.gym?.id === gymId);
      const roles: string[] = me?.roles || (me?.role ? [me.role] : []);
      setCanManage(roles.includes('admin'));
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
    Alert.alert('Delete announcement', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/gyms/${gymId}/announcements/${id}`, {
              method: 'DELETE',
            });
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
      const updated = await apiFetch(
        `/gyms/${gymId}/announcements/${item.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ pinned: !item.pinned }),
        }
      );
      setItems((xs) =>
        sortFeed(xs.map((x) => (x.id === item.id ? updated : x)))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update');
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-bold">Announcements</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {canManage
              ? 'Post updates for every member.'
              : 'Updates from your gym admins.'}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            className="bg-primary rounded-md px-3 py-2 ml-3"
            onPress={() => {
              setEditing(null);
              setComposerOpen(true);
            }}
          >
            <Text className="text-white text-sm font-semibold">+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Text className="text-gray-500 text-center mt-8">Loading...</Text>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-gray-700 mb-1">
            Nothing posted yet
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            {canManage
              ? 'Tap + New to share your first update with members.'
              : 'Check back later — your admins will post updates here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <View
              className={`rounded-xl p-4 border ${
                item.pinned
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-base font-semibold flex-1">
                  {item.title}
                </Text>
                {item.pinned && (
                  <View className="bg-green-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-semibold text-green-900">
                      PINNED
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-500 mt-0.5">
                {authorName(item)} · {relativeTime(item.created_at)}
              </Text>
              <Text className="mt-3 text-sm text-gray-800 leading-5">
                {item.body}
              </Text>

              {canManage && (
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-md bg-gray-100"
                    onPress={() => handleTogglePin(item)}
                  >
                    <Text className="text-xs font-medium text-gray-700">
                      {item.pinned ? 'Unpin' : 'Pin'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-md bg-gray-100"
                    onPress={() => {
                      setEditing(item);
                      setComposerOpen(true);
                    }}
                  >
                    <Text className="text-xs font-medium text-gray-700">
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-md bg-red-50"
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text className="text-xs font-medium text-red-700">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Composer
        visible={composerOpen}
        gymId={gymId as string}
        initial={editing}
        onClose={() => {
          setComposerOpen(false);
          setEditing(null);
        }}
        onSaved={(saved, mode) => {
          setItems((xs) =>
            sortFeed(
              mode === 'create'
                ? [saved, ...xs]
                : xs.map((x) => (x.id === saved.id ? saved : x))
            )
          );
          setComposerOpen(false);
          setEditing(null);
        }}
      />
    </View>
  );
}

function Composer({
  visible,
  gymId,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  gymId: string;
  initial: Announcement | null;
  onClose: () => void;
  onSaved: (item: Announcement, mode: 'create' | 'update') => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title || '');
      setBody(initial?.body || '');
      setPinned(!!initial?.pinned);
      setSaving(false);
    }
  }, [visible, initial]);

  const mode = initial ? 'update' : 'create';

  async function handleSubmit() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        pinned,
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-sm text-gray-500">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold">
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!title.trim() || !body.trim() || saving}
          >
            <Text
              className={`text-sm font-semibold ${
                !title.trim() || !body.trim() || saving
                  ? 'text-gray-400'
                  : 'text-primary'
              }`}
            >
              {saving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Publish'
                  : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          <Text className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={140}
            placeholder="e.g. Holiday hours this weekend"
            className="border border-gray-200 rounded-md px-3 py-2.5 text-base bg-white mb-4"
          />

          <Text className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Message
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            maxLength={4000}
            placeholder="Share the details with your members..."
            multiline
            textAlignVertical="top"
            className="border border-gray-200 rounded-md px-3 py-2.5 text-base bg-white mb-4 min-h-[160px]"
          />

          <TouchableOpacity
            className="flex-row items-center gap-2 py-2"
            onPress={() => setPinned((v) => !v)}
          >
            <View
              className={`h-5 w-5 rounded border items-center justify-center ${
                pinned ? 'bg-primary border-primary' : 'border-gray-300'
              }`}
            >
              {pinned && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
            <Text className="text-sm text-gray-700">
              Pin to top of announcements
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
