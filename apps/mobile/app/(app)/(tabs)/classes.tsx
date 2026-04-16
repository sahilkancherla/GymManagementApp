import { View, Text } from 'react-native';

export default function ClassesScreen() {
  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Classes</Text>
      <Text className="text-gray-500 text-center mt-8">Select a gym to view classes.</Text>
    </View>
  );
}
