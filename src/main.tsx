import React from 'react';
import ReactDOM from 'react-dom/client';
import { initBrowserAPI } from './api/browser-api';
import App from './App';
import './styles/global.css';

// Initialize browser API shim before rendering
initBrowserAPI();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
