export const config = { ativo: true };

export function Page() {
  return <div>{String(config.ativo)}</div>;
}
