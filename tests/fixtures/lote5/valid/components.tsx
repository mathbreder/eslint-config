export const Mensagem = ({ texto }: { texto: string }) => <p>{texto}</p>;

export const Caixa = <T,>(props: { valor: T }) => <div>{String(props.valor)}</div>;

export const Vazio = () => <Componente />;

export const Multilinha = () => (
  <p>
    Olá, {nome}!
  </p>
);

export const Propriedades = () => (
  <A
    prop="1"
  />
);
