import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import { Gallery } from './Gallery'
import './gallery.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
