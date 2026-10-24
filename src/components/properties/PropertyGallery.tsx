"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Expand } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const safeImages = images.length ? images : ["/images/properties/living-room.webp"];
  const [active, setActive] = useState(0);
  const previous = useCallback(() => setActive((current) => (current - 1 + safeImages.length) % safeImages.length), [safeImages.length]);
  const next = useCallback(() => setActive((current) => (current + 1) % safeImages.length), [safeImages.length]);

  return (
    <section className="property-gallery" aria-label={`${title} image gallery`} onKeyDown={(event) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }}>
      <div className="property-gallery__main">
        <Image src={safeImages[active]} alt={`${title}, image ${active + 1} of ${safeImages.length}`} fill priority sizes="(max-width: 900px) 100vw, 64vw" quality={85} />
        <span className="property-gallery__counter">0{active + 1} <i /> 0{safeImages.length}</span>
        <div className="property-gallery__controls">
          <button type="button" aria-label="Previous property image" onClick={previous}><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Next property image" onClick={next}><ArrowRight size={18} /></button>
        </div>
        <span className="property-gallery__expand"><Expand size={14} aria-hidden="true" /> IMAGE DETAILS</span>
      </div>
      <div className="property-gallery__thumbs" aria-label="Choose an image">
        {safeImages.map((image, index) => (
          <button className={index === active ? "is-active" : ""} type="button" key={image} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-pressed={index === active}>
            <Image src={image} alt="" fill sizes="(max-width: 900px) 28vw, 12vw" quality={70} />
          </button>
        ))}
      </div>
    </section>
  );
}
