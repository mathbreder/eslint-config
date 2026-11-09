import { useState } from 'react';

import { Text, View } from 'react-native';

import { label } from '@app/util';

import { helper } from './helpers';

export const App = ({ ativo }: { ativo: boolean }) => {
  const [valor] = useState(0);
  if (ativo) {
    useState(1);
  }
  return (
    <View>
      <Text>{label(valor) + helper()}</Text>
    </View>
  );
};
