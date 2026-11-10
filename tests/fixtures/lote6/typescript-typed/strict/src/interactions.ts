declare const promise: Promise<number>;
declare function fetchNumber(): Promise<number>;

promise;

if (promise) {
  void promise;
}

export async function delegated(): Promise<number> {
  return fetchNumber();
}

export const awaitedInTry = async (): Promise<number> => {
  try {
    return await fetchNumber();
  } catch {
    return 0;
  }
};
