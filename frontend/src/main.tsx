import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" toastOptions={{
      style: { background: '#0f1220', color: '#e2e6f0', border: '1px solid #1c2040', fontFamily: 'DM Sans, sans-serif', fontSize: '.84rem' },
      success: { iconTheme: { primary: '#f5c842', secondary: '#000' } },
      error:   { iconTheme: { primary: '#ff4466', secondary: '#fff' } },
      duration: 3500,
    }} />
  </React.StrictMode>
);
