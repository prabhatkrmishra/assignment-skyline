/**
 * @fileoverview Card displaying a single property summary.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Card displaying a single property summary in listing grids.
 *
 * @scope
 * - Property discovery and filtering.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module properties/PropertyCard
 */
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, BedDouble, MapPin, Ruler } from "lucide-react";
import { formatArea, formatPrice } from "@/lib/properties/format";
import type { Property } from "@/lib/properties/types";

interface PropertyCardProps {
  property: Property;
  index?: number;
  showIndex?: boolean;
}

/** Card displaying a single property summary in listing grids. */
export function PropertyCard({ property, index, showIndex = false }: PropertyCardProps) {
  const cover = property.images[0] ?? "/images/properties/living-room.webp";
  return (
    <article className="property-card" style={index === undefined ? undefined : { "--card-index": index } as CSSProperties}>
      <Link className="property-card__visual" href={`/properties/${property.slug}`} data-property-link aria-label={`View ${property.title}`}>
        <Image
          src={cover}
          alt={`${property.bhk} BHK ${property.propertyType.toLowerCase()} in ${property.locality}`}
          fill
          sizes="(max-width: 620px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={80}
        />
        <span className="property-card__type">{property.propertyType}</span>
        {showIndex && index !== undefined ? <span className="property-card__index">0{index + 1}</span> : null}
        <span className="property-card__arrow"><ArrowUpRight size={18} strokeWidth={1.6} aria-hidden="true" /></span>
      </Link>
      <div className="property-card__content">
        <div className="property-card__location"><MapPin size={13} strokeWidth={1.8} aria-hidden="true" /><span>{property.locality}, {property.city}</span></div>
        <div className="property-card__heading">
          <h3><Link href={`/properties/${property.slug}`} data-property-link>{property.title}</Link></h3>
          <strong>{formatPrice(property.price)}</strong>
        </div>
        <div className="property-card__specs">
          <span><BedDouble size={15} aria-hidden="true" /> {property.bhk} BHK</span>
          <span><Ruler size={14} aria-hidden="true" /> {formatArea(property.areaSqft)}</span>
          <span className="property-card__furnished">{property.furnished ? "Furnished" : "Unfurnished"}</span>
        </div>
      </div>
    </article>
  );
}
