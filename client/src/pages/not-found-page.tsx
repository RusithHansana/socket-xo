import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="page">
      <h1>404 – Page Not Found</h1>
      <p className="page__description">The page you are looking for does not exist.</p>
      <Link className="link" to="/">
        Go home
      </Link>
    </main>
  );
}
