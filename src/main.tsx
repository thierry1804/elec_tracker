import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { initTheme, subscribeToThemeChanges } from './lib/theme'
import App from './App'
import AuthGate from './components/AuthGate'
import './index.css'

initTheme()
subscribeToThemeChanges()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthGate>
        <App />
      </AuthGate>
    </HashRouter>
  </StrictMode>,
)
