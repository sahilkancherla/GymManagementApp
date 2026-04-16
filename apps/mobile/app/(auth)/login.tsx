import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link } from 'expo-router';
import { APP_NAME } from '@acuo/shared';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-3xl font-bold text-center mb-2">{APP_NAME}</Text>
      <Text className="text-base text-gray-500 text-center mb-8">Sign in to your account</Text>

      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-lg p-4 items-center mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/register" className="self-center">
        <Text className="text-secondary text-sm">Don't have an account? Sign up</Text>
      </Link>
    </View>
  );
}
