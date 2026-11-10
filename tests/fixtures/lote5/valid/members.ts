export type Usuario = {
  nome: string;
  idade?: number;
  readonly id: string;
};

export type Mensagem = { sucesso: boolean; detalhe: string };

export type Chamada = {
  (valor: string): void;
  metodo(): void;
};
