import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import { Switcher } from '@/shared/Switcher'
import { App } from './App'
import './glass.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Switcher current="glass" />
  </StrictMode>,
)
