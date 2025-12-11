import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import GlobalError from './GlobalError.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalError>
      <App />
    </GlobalError>
  </StrictMode>,
)
