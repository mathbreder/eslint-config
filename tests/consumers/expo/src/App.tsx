import { useState } from 'react';
import { Text, View } from 'react-native';

export function App({ ativo }: { ativo: boolean }) {
  const [valor] = useState(0);
  if (ativo) {
    useState(1);
  }
  return (
    <View>
      <Text>{valor}</Text>
    </View>
  );
}
