export const Condicional = ({ ativo }: { ativo: boolean }) => ativo ? (
  <Painel
    titulo="Exemplo"
  >
    Conteúdo
  </Painel>
) : null;

export const Propriedades = () => (
  <A
    b="1"
    c="2"
  />
);
