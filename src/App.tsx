import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAppData } from './hooks/useAppData';
import { AppProvider } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Historique = lazy(() => import('./pages/Historique'));
const Achats = lazy(() => import('./pages/Achats'));

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Suspense fallback={null}><Dashboard /></Suspense>} />
        <Route path="historique" element={<Suspense fallback={null}><Historique /></Suspense>} />
        <Route path="achats" element={<Suspense fallback={null}><Achats /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const appData = useAppData();
  return (
    <AppProvider value={appData}>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </AppProvider>
  );
}
