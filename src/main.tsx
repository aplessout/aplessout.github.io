import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CatalogueProvider } from './store';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CatalogueProvider>
      <App />
    </CatalogueProvider>
  </StrictMode>
);
