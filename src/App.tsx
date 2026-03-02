import { Routes, Route } from 'react-router-dom';
import { useAppData } from './hooks/useAppData';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Historique from './pages/Historique';
import Achats from './pages/Achats';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="historique" element={<Historique />} />
        <Route path="achats" element={<Achats />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const appData = useAppData();
  return (
    <AppProvider value={appData}>
      <AppRoutes />
    </AppProvider>
  );
}
