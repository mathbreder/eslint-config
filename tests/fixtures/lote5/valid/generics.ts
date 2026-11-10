export type Lista = Array<string>;

export type Mapa = Map<string, number>;

export type Resposta<T> = Promise<T>;

export class Caixa<T> {
  valor: T;

  constructor(valor: T) {
    this.valor = valor;
  }
}

export interface Par<A, B> {
  a: A;
  b: B;
}
