import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// StrictMode intentionally omitted: its double-mount breaks the WebGL/postprocessing context.
createRoot(document.getElementById('root')!).render(<App />);
