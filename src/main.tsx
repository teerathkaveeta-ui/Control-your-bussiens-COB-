import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Crash Detection for diagnostic purposes
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="background: #020617; color: #ef4444; padding: 20px; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: sans-serif;">
        <h1 style="font-size: 24px; margin-bottom: 10px;">Critical Boot Error</h1>
        <p style="color: #94a3b8; max-width: 300px; margin-bottom: 20px;">${message}</p>
        <button onclick="window.location.reload()" style="background: #10b981; color: #020617; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold;">Retry Startup</button>
      </div>
    `;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
