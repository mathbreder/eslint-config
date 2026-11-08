export async function salvar(): Promise<void> {
  await Promise.resolve();
}

export function executar(): Promise<void> {
  return salvar();
}
