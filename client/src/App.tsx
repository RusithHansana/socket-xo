import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/**
 * App is intentionally a thin shell — context providers live inside
 * RootLayout (a layout route) so they have access to React Router hooks.
 */
function App() {
  return <RouterProvider router={router} />;
}

export default App;
