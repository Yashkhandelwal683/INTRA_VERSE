import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#16182a',
              color: '#f8fafc',
              border: '1px solid #252840',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#16182a' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#16182a' },
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
