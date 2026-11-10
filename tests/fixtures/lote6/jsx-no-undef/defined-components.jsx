import { Painel } from './painel';
import { UI } from './ui';

const Local = () => <div />;

export const App = ({ extra }) => (
  <>
    <Painel />
    <Local />
    <UI.Button valor={extra?.valor} />
    <section />
  </>
);
