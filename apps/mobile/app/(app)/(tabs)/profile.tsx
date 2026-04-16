import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase, API_URL } from '../../../lib/supabase';
import { apiFetch } from '../../../lib/api';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiFetch('/profile');
      setProfile(data);
      setFirstName(data.first_name);
      setLastName(data.last_name);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const data = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      setProfile(data);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
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
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-6">Profile</Text>

      <TouchableOpacity className="items-center mb-6" onPress={handleAvatarUpload}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="w-20 h-20 rounded-full" />
        ) : (
          <View className="w-20 h-20 rounded-full bg-gray-200 justify-center items-center">
            <Text className="text-3xl font-bold text-gray-400">
              {firstName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <Text className="text-xs text-secondary mt-2">Change Photo</Text>
      </TouchableOpacity>

      <Text className="text-sm font-semibold text-gray-700 mb-1">First Name</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text className="text-sm font-semibold text-gray-700 mb-1">Last Name</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        value={lastName}
        onChangeText={setLastName}
      />

      <Text className="text-sm font-semibold text-gray-700 mb-1">Email</Text>
      <Text className="text-base text-gray-500 mb-4">{profile?.email || ''}</Text>

      <TouchableOpacity className="bg-primary rounded-lg p-4 items-center mb-4" onPress={handleSave}>
        <Text className="text-white text-base font-semibold">Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-red-500 rounded-lg p-4 items-center"
        onPress={handleSignOut}
      >
        <Text className="text-red-500 text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
