import { View, Text } from 'react-native';

export default function ProgramsScreen() {
  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Programs</Text>
      <Text className="text-gray-500 text-center mt-8">Select a gym to view programs.</Text>
    </View>
  );
}
