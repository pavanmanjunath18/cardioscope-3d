import { createRoot } from 'react-dom/client';
// Self-hosted fonts (no render-blocking request to Google Fonts).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import App from './App.tsx';

// StrictMode intentionally omitted: its double-mount breaks the WebGL/postprocessing context.
createRoot(document.getElementById('root')!).render(<App />);
