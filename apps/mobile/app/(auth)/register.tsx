import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!firstName || !lastName) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Check your email for a confirmation link');
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">Create Account</Text>

      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-base"
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />
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
        placeholder="Password (min 8 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-lg p-4 items-center mb-4"
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? 'Creating account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" className="self-center">
        <Text className="text-secondary text-sm">Already have an account? Sign in</Text>
      </Link>
    </View>
  );
}
