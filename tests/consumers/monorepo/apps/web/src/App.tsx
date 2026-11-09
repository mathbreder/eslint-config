import { useState } from 'react';

export function App({ ativo }: { ativo: boolean }) {
  if (ativo) {
    useState(0);
  }
  return null;
}
