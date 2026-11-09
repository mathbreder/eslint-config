import { useState } from 'react';

export function App({ ativo }: { ativo: boolean }) {
  const [valor] = useState(0);
  if (ativo) {
    useState(1);
  }
  alert(`valor ${valor}`);
  return <div>{valor}</div>;
}
