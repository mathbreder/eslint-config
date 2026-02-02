import { fileURLToPath } from 'node:url';

export function getFilename(): string {
  return fileURLToPath(import.meta.url);
}
