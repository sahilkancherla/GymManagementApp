import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase, API_URL } from '../../../lib/supabase';
import { apiFetch } from '../../../lib/api';
import { useGym } from '../../../lib/gym-context';
import { colors } from '../../../lib/theme';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
] as const;

export default function ProfileScreen() {
  const { activeGym } = useGym();

  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const gymId = activeGym?.gym_id;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (gymId) {
      apiFetch(`/gyms/${gymId}/my-subscriptions`)
        .then((data) => setSubscriptions(data || []))
        .catch(() => setSubscriptions([]));
    }
  }, [gymId]);

  async function loadProfile() {
    try {
      const data = await apiFetch('/profile');
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setGender(data.gender || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          gender,
        }),
      });
      setProfile(data);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const ext = uri.split('.').pop() || 'jpg';

    const formData = new FormData();
    formData.append('avatar', {
      uri,
      name: `avatar.${ext}`,
      type: `image/${ext}`,
    } as any);

    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }

      const data = await res.json();
      setProfile(data);
      Alert.alert('Success', 'Avatar updated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function getInitials() {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name Header */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={handleAvatarUpload} disabled={uploading}>
            {uploading ? (
              <View className="w-20 h-20 rounded-full bg-soft justify-center items-center">
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : profile?.avatar_url ? (
              <View>
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-20 h-20 rounded-full"
                />
                <View className="absolute bottom-0 right-0 bg-accent w-6 h-6 rounded-full justify-center items-center border-2 border-white">
                  <Ionicons name="camera" size={12} color="#ffffff" />
                </View>
              </View>
            ) : (
              <View>
                <View className="w-20 h-20 rounded-full bg-accent-soft justify-center items-center">
                  <Text className="text-2xl font-bold text-accent-ink">
                    {getInitials()}
                  </Text>
                </View>
                <View className="absolute bottom-0 right-0 bg-accent w-6 h-6 rounded-full justify-center items-center border-2 border-white">
                  <Ionicons name="camera" size={12} color="#ffffff" />
                </View>
              </View>
            )}
          </TouchableOpacity>

          <Text className="text-xl font-bold text-ink mt-3">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-ink-muted mt-0.5">
            {profile?.email || ''}
          </Text>
        </View>

        {/* Section: Personal Info */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Personal Info
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          <Text className="text-sm font-semibold text-ink mb-1">First Name</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.inkMuted}
          />

          <Text className="text-sm font-semibold text-ink mb-1">Last Name</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.inkMuted}
          />

          <Text className="text-sm font-semibold text-ink mb-2">Gender</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {GENDER_OPTIONS.map((opt) => {
              const selected = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  className={`px-3 py-2 rounded-lg border ${
                    selected
                      ? 'bg-accent-soft border-accent-rule'
                      : 'bg-base border-rule'
                  }`}
                  onPress={() => setGender(selected ? null : opt.value)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-accent-ink' : 'text-ink-soft'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            className="bg-accent rounded-lg py-3 items-center"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-sm font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: Membership */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Membership
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          {activeGym ? (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="fitness-outline" size={18} color={colors.accent} />
                <Text className="text-base font-semibold text-ink ml-2">
                  {activeGym.gym.name}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5 mb-2">
                {activeGym.roles.map((role) => (
                  <View
                    key={role}
                    className="bg-accent-soft px-2.5 py-1 rounded-full"
                  >
                    <Text className="text-xs font-semibold text-accent-ink capitalize">
                      {role}
                    </Text>
                  </View>
                ))}
              </View>
              {subscriptions.length > 0 ? (
                <View className="border-t border-rule pt-3 mt-1">
                  <Text className="text-xs text-ink-muted mb-1">
                    Your Memberships
                  </Text>
                  {subscriptions.map((sub: any) => (
                    <View key={sub.id} className="flex-row items-center mt-1.5">
                      <View className="w-1.5 h-1.5 rounded-full bg-accent mr-2" />
                      <Text className="text-sm text-ink">{sub.plan?.name || 'Plan'}</Text>
                      {sub.plan?.price_cents != null && (
                        <Text className="text-sm text-ink-muted ml-1">
                          ${(sub.plan.price_cents / 100).toFixed(2)}/{sub.plan.type === 'monthly' ? 'mo' : sub.plan.type === 'annual' ? 'yr' : sub.plan.type}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="border-t border-rule pt-3 mt-1">
                  <Text className="text-xs text-ink-muted">No active memberships</Text>
                </View>
              )}
            </>
          ) : (
            <View className="items-center py-4">
              <Text className="text-sm text-ink-muted">No active gym selected</Text>
            </View>
          )}
        </View>

        {/* Section: Account */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Account
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          <TouchableOpacity
            className="border border-danger rounded-lg py-3 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-danger text-sm font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
