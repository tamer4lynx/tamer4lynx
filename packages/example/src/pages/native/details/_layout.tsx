import { Stack } from '@tamer4lynx/tamer-router';

export default function NativeDetailsLayout() {
  return (
    <Stack pathPrefix="/native/details">
      <Stack.Screen
        name="[id]"
        options={{ title: 'Detail', headerShown: false }}
      />
      <Stack.Screen
        name="edit"
        options={{ title: 'Edit' }}
      />
    </Stack>
  );
}
