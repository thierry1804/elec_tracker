export default function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Chargement de la page">
      <div className="page-skeleton-bar page-skeleton-bar-lg" />
      <div className="page-skeleton-bar page-skeleton-bar-md" />
      <div className="page-skeleton-grid">
        <div className="page-skeleton-block" />
        <div className="page-skeleton-block" />
      </div>
    </div>
  );
}
