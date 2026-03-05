import styles from './page-loader.module.css';

export default function PageLoader() {
  return (
    <div className={styles.pageLoader} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {/* Visually-hidden text provides the accessible name for screen readers */}
      <span className="visually-hidden">Loading page…</span>
    </div>
  );
}
