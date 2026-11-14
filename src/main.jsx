import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startMonitoring } from './lib/monitoring';
import './index.css';

startMonitoring();
createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
