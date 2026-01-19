import './App.css'
import { observer } from 'mobx-react-lite';
import InfiniteGrid from './InfiniteGrid';


const App = observer(() => {

  return (
    <InfiniteGrid />
  )
});

export default App
