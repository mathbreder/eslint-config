export function getFilename(): string {
  // In CommonJS builds `__filename` is available
  return __filename;
}
