"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { propertyTypes, type PropertySort } from "@/lib/properties/options";
import { shouldDeferPendingQuerySync, updateListingQuery } from "@/lib/properties/search-state";

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const latestQueryRef = useRef(searchParamsString);
  const pendingQueryRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(searchParams.get("q") ?? "");
  const [minDraft, setMinDraft] = useState(searchParams.get("minPrice") ?? "");
  const [maxDraft, setMaxDraft] = useState(searchParams.get("maxPrice") ?? "");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    if (shouldDeferPendingQuerySync(pendingQueryRef.current, searchParamsString)) return;
    const isOurNavigation = pendingQueryRef.current === searchParamsString;
    latestQueryRef.current = searchParamsString;
    pendingQueryRef.current = null;

    // Keep an in-progress text/price draft when our own URL update commits. Only
    // external URL changes (e.g. browser Back/Forward or pagination links) reset drafts.
    if (!isOurNavigation) {
      const committed = new URLSearchParams(searchParamsString);
      setSearchDraft(committed.get("q") ?? "");
      setMinDraft(committed.get("minPrice") ?? "");
      setMaxDraft(committed.get("maxPrice") ?? "");
      setPriceError("");
    }
  }, [searchParamsString]);

  useEffect(() => {
    const handlePopState = () => {
      pendingQueryRef.current = null;
      latestQueryRef.current = new URLSearchParams(window.location.search).toString();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateWith = useCallback((updates: Record<string, string>, mode: "push" | "replace" = "push") => {
    // Advance the local query snapshot before navigation so rapid filter changes compose
    // with one another instead of overwriting a transition that has not committed yet.
    const query = updateListingQuery(latestQueryRef.current, updates);
    latestQueryRef.current = query;
    pendingQueryRef.current = query;
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }, [pathname, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const queryNow = new URLSearchParams(window.location.search).get("q") ?? "";
      if (queryNow !== searchDraft.trim()) navigateWith({ q: searchDraft.trim() }, "replace");
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [navigateWith, searchDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const min = minDraft.trim() === "" ? undefined : Number(minDraft);
      const max = maxDraft.trim() === "" ? undefined : Number(maxDraft);
      if ((min !== undefined && (!Number.isSafeInteger(min) || min < 0)) || (max !== undefined && (!Number.isSafeInteger(max) || max < 0))) {
        setPriceError("Enter a positive price in rupees.");
        return;
      }
      if (min !== undefined && max !== undefined && min > max) {
        setPriceError("Minimum price must not exceed maximum price.");
        return;
      }
      setPriceError("");
      const current = new URLSearchParams(window.location.search);
      const nextMin = min === undefined ? "" : String(min);
      const nextMax = max === undefined ? "" : String(max);
      if ((current.get("minPrice") ?? "") !== nextMin || (current.get("maxPrice") ?? "") !== nextMax) {
        navigateWith({ minPrice: nextMin, maxPrice: nextMax }, "replace");
      }
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [minDraft, maxDraft, navigateWith]);

  const selectValue = (name: string, fallback = "") => searchParams.get(name) ?? fallback;
  const reset = () => {
    setSearchDraft("");
    setMinDraft("");
    setMaxDraft("");
    setPriceError("");
    latestQueryRef.current = "";
    pendingQueryRef.current = "";
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  return (
    <div className="filters-panel" aria-busy={isPending}>
      <div className="filters-panel__mobile-heading"><SlidersHorizontal size={17} aria-hidden="true" /> Refine your search</div>
      <div className="filter-field">
        <label htmlFor="property-search">Search by name or locality</label>
        <input id="property-search" type="search" autoComplete="off" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Try ‘Bandra’ or ‘garden’" />
      </div>

      <fieldset className="filter-fieldset">
        <legend>Price range <span>₹</span></legend>
        <div className="price-inputs">
          <label><span className="sr-only">Minimum price in rupees</span><input aria-label="Minimum price in rupees" inputMode="numeric" type="number" min="0" value={minDraft} onChange={(event) => setMinDraft(event.target.value)} placeholder="Min price" /></label>
          <span aria-hidden="true">—</span>
          <label><span className="sr-only">Maximum price in rupees</span><input aria-label="Maximum price in rupees" inputMode="numeric" type="number" min="0" value={maxDraft} onChange={(event) => setMaxDraft(event.target.value)} placeholder="Max price" /></label>
        </div>
        {priceError ? <p className="field-error" role="alert">{priceError}</p> : <p className="filter-help">Enter full rupee amounts, e.g. 15000000.</p>}
      </fieldset>

      <div className="filter-field">
        <label htmlFor="filter-bhk">Bedrooms</label>
        <select id="filter-bhk" value={selectValue("bhk")} onChange={(event) => navigateWith({ bhk: event.target.value })}>
          <option value="">Any configuration</option>
          {[1, 2, 3, 4].map((value) => <option value={value} key={value}>{value} BHK</option>)}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="filter-type">Property type</label>
        <select id="filter-type" value={selectValue("type")} onChange={(event) => navigateWith({ type: event.target.value })}>
          <option value="">All property types</option>
          {propertyTypes.map((type) => <option value={type} key={type}>{type}</option>)}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="filter-furnished">Furnishing</label>
        <select id="filter-furnished" value={selectValue("furnished")} onChange={(event) => navigateWith({ furnished: event.target.value })}>
          <option value="">Any furnishing</option>
          <option value="true">Furnished</option>
          <option value="false">Unfurnished</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="filter-sort">Sort by</label>
        <select id="filter-sort" value={selectValue("sort", "newest")} onChange={(event) => navigateWith({ sort: event.target.value as PropertySort })}>
          <option value="newest">Recently added</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>

      <button className="filters-reset" type="button" onClick={reset}><RotateCcw size={14} aria-hidden="true" /> Clear all filters</button>
    </div>
  );
}
