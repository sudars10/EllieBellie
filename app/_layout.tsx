import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }}/>
      <Stack.Screen name="saved" options={{ headerShown: false }}/>
      <Stack.Screen name="reader" options={{ headerShown: false }}/>
    </Stack>
  );
}
