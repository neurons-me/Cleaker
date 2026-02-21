import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQRouter } from 'this.gui';
import Home from './routes/Home';
import Board from './routes/board';
// Register all route declarations in one place.
// React Router remains the only URL-matching/navigation engine.
function registerRoutes(addNode) {
  const add = (path, cfg = {}) => {
    const { id, element, ...rest } = cfg;
    addNode({
      id: id ?? path,
      path,
      element,
      ...rest,
    });
  };

  add('/', { id: 'home', element: <Home /> });
  add('/home', { id: 'home-redirect', element: <Navigate to="/" replace /> });
  add('/board', { id: 'board', element: <Board /> });
}

function RouteRegistry() {
  const { addNode } = useQRouter();
  // Register routes once (avoid StrictMode loops).
  useEffect(() => {
    registerRoutes(addNode);
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // QRouter already renders the Routes internally; we only need to register them here.
  return null;
}

export default function App() {
  return <RouteRegistry />;
}
