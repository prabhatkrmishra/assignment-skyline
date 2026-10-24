import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BedDouble, Building2, CarFront, Check, MapPin, Ruler, ShieldCheck, Sun } from "lucide-react";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { getPropertyBySlug, getSimilarProperties } from "@/lib/properties/repository";
import { formatArea, formatPrice } from "@/lib/properties/format";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) return { title: "Residence not found", robots: { index: false, follow: false } };
  const description = `${property.bhk} BHK ${property.propertyType.toLowerCase()} in ${property.locality}, ${property.city}. ${formatArea(property.areaSqft)} of considered living, priced at ${formatPrice(property.price)}.`;
  return {
    title: `${property.title} — ${property.locality}`,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      type: "article",
      title: `${property.title} | Skyline Residences`,
      description,
      images: [{ url: property.images[0] ?? "/images/landing/tower-poster.webp", alt: property.title }],
    },
  };
}

export default async function PropertyDetailPage({ params }: RouteContext) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) notFound();
  const similar = getSimilarProperties(slug);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.locality}, ${property.city}, ${property.state}, India`)}`;
  const specs = [
    { icon: BedDouble, value: `${property.bhk} BHK`, label: "BEDROOMS" },
    { icon: Ruler, value: formatArea(property.areaSqft), label: "SUPER AREA" },
    { icon: Building2, value: `${property.floor} of ${property.totalFloors}`, label: "FLOOR" },
    { icon: CarFront, value: `${property.parking} ${property.parking === 1 ? "space" : "spaces"}`, label: "PARKING" },
  ];

  return (
    <main id="main-content" className="detail-page">
      <nav className="detail-breadcrumb page-gutter" aria-label="Breadcrumb">
        <Link href="/"><span>Home</span></Link><span aria-hidden="true">/</span><Link href="/properties">Residences</Link><span aria-hidden="true">/</span><span aria-current="page">{property.locality}</span>
      </nav>

      <div className="detail-topline page-gutter">
        <div><span className="eyebrow">THE SKYLINE COLLECTION / {property.propertyType.toUpperCase()}</span><h1>{property.title}</h1><p><MapPin size={15} aria-hidden="true" /> {property.locality}, {property.city}, {property.state}</p></div>
        <div className="detail-topline__price"><span>GUIDE PRICE</span><strong>{formatPrice(property.price)}</strong><small>Indicative price · fictional listing</small></div>
      </div>

      <div className="detail-main-grid page-gutter">
        <div className="detail-primary">
          <PropertyGallery images={property.images} title={property.title} />
          <section className="detail-overview" aria-labelledby="overview-heading">
            <div className="detail-section-heading"><span className="eyebrow">A CLOSER LOOK</span><h2 id="overview-heading">A home with <em>intention.</em></h2></div>
            <p>{property.description}</p>
            <div className="detail-spec-grid">
              {specs.map(({ icon: Icon, value, label }) => <div key={label}><Icon size={19} strokeWidth={1.4} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>)}
            </div>
          </section>

          <section className="detail-amenities" aria-labelledby="amenities-heading">
            <div className="detail-section-heading"><span className="eyebrow">THE SMALL THINGS, CONSIDERED</span><h2 id="amenities-heading">Made for the <em>everyday.</em></h2></div>
            <ul className="amenities-list">{property.amenities.map((amenity) => <li key={amenity}><Check size={15} aria-hidden="true" />{amenity}</li>)}</ul>
          </section>

          <section className="location-card" aria-labelledby="location-heading">
            <div className="location-card__copy"><span className="eyebrow">A PLACE IN THE CITY</span><h2 id="location-heading">Well placed.<br /><em>Well connected.</em></h2><p>{property.locality}, {property.city}, {property.state}, India</p><a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Open in Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a></div>
            <div className="location-card__visual"><Image src="/images/properties/terrace.webp" alt="Landscaped terrace representing the calm of the neighbourhood" fill sizes="(max-width: 800px) 100vw, 36vw" quality={75} /><div className="location-card__pin"><MapPin size={22} aria-hidden="true" /><span>{property.locality.toUpperCase()}</span></div><span className="location-card__coordinates">INDIA · RESIDENTIAL COLLECTION</span></div>
          </section>
        </div>

        <aside className="detail-aside">
          <div className="detail-price-card">
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <p className="detail-price-card__label">Guide price</p>
            <strong>{formatPrice(property.price)}</strong>
            <div className="detail-price-card__rule" />
            <div><span>TYPE</span><b>{property.propertyType}</b></div>
            <div><span>FURNISHING</span><b>{property.furnished ? "Furnished" : "Unfurnished"}</b></div>
            <div><span>AREA</span><b>{formatArea(property.areaSqft)}</b></div>
            <a className="button button--dark detail-price-card__button" href="#enquiry">Arrange a private visit <ArrowUpRight size={16} aria-hidden="true" /></a>
            <p className="detail-price-card__note"><ShieldCheck size={14} aria-hidden="true" /> No obligation. A considered conversation.</p>
          </div>
          <div className="detail-aside__note"><Sun size={20} strokeWidth={1.3} aria-hidden="true" /><p>Spaces shaped around daylight, quiet and the things that make a place yours.</p></div>
        </aside>
      </div>

      <div className="detail-enquiry-wrap page-gutter" id="enquiry"><EnquiryForm propertySlug={property.slug} propertyTitle={property.title} /></div>

      {similar.length ? <section className="similar-section section-space" aria-labelledby="similar-heading"><div className="section-heading page-gutter"><div><span className="eyebrow">YOU MAY ALSO LIKE</span><h2 id="similar-heading">A few more <em>possibilities.</em></h2><p>Homes in the same neighbourhood or with a similar layout.</p></div><Link className="text-link" href="/properties">View all homes <ArrowUpRight size={15} aria-hidden="true" /></Link></div><div className="property-grid page-gutter">{similar.map((item, index) => <PropertyCard property={item} index={index} key={item.id} />)}</div></section> : null}

      <div className="detail-back page-gutter"><Link className="text-link" href="/properties"><ArrowLeft size={15} aria-hidden="true" /> Back to residences</Link></div>
    </main>
  );
}
