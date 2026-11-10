declare const anyValue: any;
declare const numbers: number[];
declare const text: string;
declare const maybe: string | undefined;
declare const record: { value?: string };
declare const nested: { count: number };
declare const promise: Promise<number>;
declare const kind: 'a' | 'b';
declare function fetchNumber(): Promise<number>;
declare function run(): void;
declare const unknownValue: unknown;

export const deleted = delete numbers[0];
export const forInKeys: string[] = [];
for (const key in numbers) {
  forInKeys.push(key);
}
if (promise) {
  void promise;
}
export type Redundant = any | string;
export const assertion = 1 as number;
export const unsafeAssignment: string = JSON.parse('1');
export const unsafeCall = anyValue();
export const unsafeMember = anyValue.prop;
export const unsafeEnum = ((level: Level) => level === 2)(Level.Low);
export function unsafeReturn(): string {
  return JSON.parse('"a"');
}
export const unaryMinus = -unknownValue;
export const plusMixed = nested + 'x';
export const templated = `${nested}`;
export class Box {
  private value = 1;
  method(): void {}
}
export const unbound = new Box().method;
export type Only = { value: number };
export { Only as Exported };
export const confusingVoid = (): number => {
  return run();
};
/** @deprecated use replacement */
export function oldFunction(): number {
  return 1;
}
export const deprecatedUse = oldFunction();
export type EmptyGenerated = {} & {};
export const voidOperator = void undefined;
export const spreadChars = [...text];
export enum Mixed {
  A = 1,
  B = 'b',
}
export const templateOnly = `${text}`;
export function pick<T = string>(value: T): T {
  return value;
}
export const pickedString = pick<string>('a');
export const converted = String(text);
export function unusedParam<T>(value: string): string {
  return value;
}
export enum Level {
  Low = 1,
  High = 2,
}
export const levelCompare = (count: number) => count === Level.Low;
export const enumAssignment: Level = numbers[0];
export const found = numbers.filter((n) => n > 1)[0];
export const included = numbers.indexOf(1) !== -1;
export const chained = maybe && maybe.length;
export class Holder {
  private readonly stored = 1;
  public read(): number {
    return this.stored;
  }
}
export const reduced = numbers.reduce((acc, item) => acc.concat([item]), [] as number[]);
export class Builder {
  configure(): Builder {
    return this;
  }
}
export const startsWithA = text.charAt(0) === 'a';
export class Pair {
  get label(): string {
    return '';
  }
  set label(_value: number) {}
}
export const sorted = numbers.sort();
export async function awaitReturn(): Promise<number> {
  try {
    return fetchNumber();
  } catch {
    return 0;
  }
}
export const exhaustive = (value: 'a' | 'b'): number => {
  switch (value) {
    case 'a':
      return 1;
  }
  return 0;
};
export const caught = promise.catch((reason) => reason);
export const misusedCallback = [1, 2].forEach(async () => {
  await fetchNumber();
});
export const doubled = (kind === 'a' ? 1 : 2) as number;
export const voidValue = fetchNumber().then(() => undefined);
export const unusedReference = maybe;
export type DuplicatedUnion = string | string;
export const reducedTotal = [text].length;
export const assignedBox: Box = new Box();
export const constructed: Map<string, number> = new Map();
export const withoutNonNull = record.value! == 'a';
export const nullishChain = record.value! ?? 'fallback';
export type Wrapped = string | void;
export type DictionaryType = { [key: string]: number };
export const optionalNumber = nested.count;
export function overloaded(value: string): void;
export function overloaded(value: number): void;
export function overloaded(value: string | number): void {
  void value;
}
export const emptyTemplate = '';
export const sameType = text as string;
