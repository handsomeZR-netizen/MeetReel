import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { Switcher } from '@/shared/Switcher'
import { App } from './App'
import './night.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Switcher current="night" />
  </StrictMode>,
)
