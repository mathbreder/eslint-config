export const runWindow = (): void => {
  window.eval('executar()');
};
export const runGlobal = (): void => {
  globalThis.eval('executar()');
};
