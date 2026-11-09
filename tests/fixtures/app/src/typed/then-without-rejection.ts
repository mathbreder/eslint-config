export async function salvar(): Promise<void> {
  await Promise.resolve();
}

export function executar(): void {
  salvar().then(() => undefined);
}
