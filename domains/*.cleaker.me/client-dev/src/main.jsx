import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GuiProvider, QRouter } from 'this.gui';
import App from './App.jsx';
// BrowserRouter is owned by the app, and QRouter is this.gui's dynamic route registry context
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <GuiProvider>
        <QRouter>
          <App />
        </QRouter>
      </GuiProvider>
    </BrowserRouter>
  </React.StrictMode>
);


