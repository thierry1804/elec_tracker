import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAppData } from './hooks/useAppData';
import { AppProvider } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import PageSkeleton from './components/PageSkeleton';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Historique = lazy(() => import('./pages/Historique'));
const Achats = lazy(() => import('./pages/Achats'));

const pageFallback = <PageSkeleton />;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Suspense fallback={pageFallback}><Dashboard /></Suspense>} />
        <Route path="historique" element={<Suspense fallback={pageFallback}><Historique /></Suspense>} />
        <Route path="achats" element={<Suspense fallback={pageFallback}><Achats /></Suspense>} />
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
