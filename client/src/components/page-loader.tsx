export default function PageLoader() {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__spinner" aria-hidden="true" />
      {/* Visually-hidden text provides the accessible name for screen readers */}
      <span className="visually-hidden">Loading page…</span>
    </div>
  );
}
