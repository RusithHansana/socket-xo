import { Link } from 'react-router-dom';
import styles from './not-found-page.module.css';

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1>404 – Page Not Found</h1>
      <p className={styles.description}>The page you are looking for does not exist.</p>
      <Link className="link" to="/">
        Go home
      </Link>
    </main>
  );
}
