declare const numbers: number[];
declare const text: string;
declare const maybe: string | undefined;
declare const record: { value?: string };
declare const nested: { count: number };
declare const promise: Promise<number>;
declare const kind: 'a' | 'b';
declare function fetchNumber(): Promise<number>;
declare function execute(): void;
declare const jsonValue: unknown;

export const kept = numbers.splice(0, 1);
export const forOfValues: string[] = [];
for (const value of numbers) {
  forOfValues.push(String(value));
}
export const awaited = await Promise.resolve(promise);
export type Narrow = string | number;
export const unknownParsed: unknown = JSON.parse('1');
export const typedCall = (callback: () => number): number => callback();
export const numericText = String(nested.count);
export const plusStrings = text + 'x';
export const plusNumbers = nested.count + numbers.length;
export const templateText = `${text}!`;
export const templateNumber = `${nested.count}`;
export class Box {
  private readonly value = 1;
  public read(): number {
    return this.value;
  }
  public method(): void {}
}
new Box().method();
export type Only = { value: number };
export type { Only as Exported };
export const execution = (): void => {
  execute();
};
export const voidFunction = (): void => {
  execute();
};
export const parsed = JSON.parse('"x"') as string;
export const nonEmpty = [] as string[];
export type ObjectShape = Record<string, number>;
export const spread = [...numbers];
export enum Mode {
  Fast = 'fast',
  Slow = 'slow',
}
export const modeText = Mode.Fast;
export function identity<T>(value: T): T {
  return value;
}
export const identityText = identity<string>('a');
export function describe<T extends string>(value: T): T {
  return value;
}
export const described = describe('a');
export const converted2 = Number(text);
export const found = numbers.find((n) => n > 1);
export const includesOne = numbers.includes(1);
export const optionalChained = maybe?.length;
export class Holder {
  public value = 1;
}
export const reduced = numbers.reduce<number[]>((acc, item) => acc.concat([item]), []);
export class Builder {
  public configure(): this {
    return this;
  }
}
export const startsWithA = text.startsWith('a');
export class Pair {
  public get label(): string {
    return '';
  }
  public set label(value: string) {
    if (value.length > 0) {
      return;
    }
  }
}
export const sortedCopy = [...numbers].sort((a, b) => a - b);
export async function awaitedReturn(): Promise<number> {
  try {
    return await fetchNumber();
  } catch {
    return 0;
  }
}
export const exhaustiveSwitch = (value: 'a' | 'b'): number => {
  switch (value) {
    case 'a':
      return 1;
    case 'b':
      return 2;
  }
  return 0;
};
export const caughtReason = promise.catch((reason: unknown) => reason);
[1, 2].forEach((value) => {
  if (value > 0) {
    return;
  }
});
export const kindIsKnown = kind;
export const deletedKey = { ...record };
export const readonlyList: readonly number[] = [1];
export const emptyObject: Record<string, never> = {};
export const jsonUnknown = jsonValue;
export const tupleOfTypes: [number, string] = [1, 'x'];
export const deprecatedFree = 2;
export const maybeNonNull = record.value ?? 'fallback';
export const dictionary: Record<string, number> = { a: 1 };
