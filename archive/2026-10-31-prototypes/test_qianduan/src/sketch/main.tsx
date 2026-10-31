import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css'
import { Switcher } from '@/shared/Switcher'
import { App } from './App'
import './sketch.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Switcher current="sketch" />
  </StrictMode>,
)
