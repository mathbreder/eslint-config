export async function salvar(): Promise<void> {
  await Promise.resolve();
}

salvar().catch((error: unknown) => console.error(error));
