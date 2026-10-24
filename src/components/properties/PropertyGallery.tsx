"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const safeImages = images.length ? images : ["/images/properties/living-room.webp"];
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previous = useCallback(() => setActive((current) => (current - 1 + safeImages.length) % safeImages.length), [safeImages.length]);
  const next = useCallback(() => setActive((current) => (current + 1) % safeImages.length), [safeImages.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (expanded && !dialog.open) dialog.showModal();
    else if (!expanded && dialog.open) dialog.close();
  }, [expanded]);

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
        <button className="property-gallery__expand" type="button" onClick={() => setExpanded(true)} aria-haspopup="dialog">
          <Expand size={14} aria-hidden="true" /> ENLARGE IMAGE
        </button>
      </div>
      <div className="property-gallery__thumbs" aria-label="Choose an image">
        {safeImages.map((image, index) => (
          <button className={index === active ? "is-active" : ""} type="button" key={image} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-pressed={index === active}>
            <Image src={image} alt="" fill sizes="(max-width: 900px) 28vw, 12vw" quality={70} />
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="property-lightbox"
        aria-label={`${title} image viewer`}
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setExpanded(false);
        }}
      >
        <div className="property-lightbox__frame">
          <div className="property-lightbox__topline">
            <p>{title}</p>
            <span>{String(active + 1).padStart(2, "0")} / {String(safeImages.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Close image viewer">Close <span aria-hidden="true">×</span></button>
          </div>
          <div className="property-lightbox__image">
            <Image src={safeImages[active]} alt={`${title}, enlarged image ${active + 1} of ${safeImages.length}`} fill sizes="94vw" quality={85} />
          </div>
          {safeImages.length > 1 ? (
            <div className="property-lightbox__controls">
              <button type="button" onClick={previous} aria-label="Previous enlarged image"><ArrowLeft size={20} aria-hidden="true" /></button>
              <button type="button" onClick={next} aria-label="Next enlarged image"><ArrowRight size={20} aria-hidden="true" /></button>
            </div>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}
