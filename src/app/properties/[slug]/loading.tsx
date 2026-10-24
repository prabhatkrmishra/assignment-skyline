export default function PropertyDetailLoading() {
  return (
    <main id="main-content" className="detail-page detail-loading" aria-busy="true" aria-label="Loading residence details">
      <div className="detail-breadcrumb page-gutter"><span className="skeleton loading-bar loading-bar--breadcrumb" /></div>
      <div className="detail-topline page-gutter">
        <div className="detail-loading__title"><span className="skeleton loading-bar loading-bar--eyebrow" /><span className="skeleton loading-bar loading-bar--title" /><span className="skeleton loading-bar loading-bar--subtitle" /></div>
        <div className="detail-loading__price"><span className="skeleton loading-bar" /><span className="skeleton loading-bar loading-bar--price" /></div>
      </div>
      <div className="detail-main-grid page-gutter">
        <div className="detail-primary">
          <div className="property-gallery">
            <div className="property-gallery__main skeleton skeleton--image" />
            <div className="property-gallery__thumbs" aria-hidden="true"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
          </div>
          <div className="detail-loading__section"><span className="skeleton loading-bar loading-bar--eyebrow" /><span className="skeleton loading-bar loading-bar--title" /><span className="skeleton loading-bar loading-bar--subtitle" /><span className="skeleton loading-bar loading-bar--body" /></div>
        </div>
        <aside className="detail-aside"><div className="detail-price-card"><span className="skeleton loading-bar loading-bar--eyebrow" /><span className="skeleton loading-bar loading-bar--price" /><div className="detail-loading__specs"><span className="skeleton loading-bar" /><span className="skeleton loading-bar" /><span className="skeleton loading-bar" /></div><span className="skeleton loading-bar loading-bar--button" /></div></aside>
      </div>
    </main>
  );
}
