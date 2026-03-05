import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { initTheme, subscribeToSystemTheme } from './lib/theme'
import App from './App'
import './index.css'

initTheme()
subscribeToSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
