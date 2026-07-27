import { lazy, Suspense, useState } from "react";
import { Building2, MapPin, Sparkles } from "lucide-react";
import { InquiryForm } from "./InquiryForm";
import { ClientDataProvider } from "./ClientDataProvider";
import { trpc } from "@/lib/trpc";
import { company, getPageImage, serviceName, type SitePage } from "@/content/site";
import { getResponsiveMedia } from "@/content/responsive-media";

const LazyMapView = lazy(() => import("./Map").then(module => ({ default: module.MapView })));

type ServiceMapLocation = {
  id: number;
  latitude: number | null;
  longitude: number | null;
};

function ResponsiveImage({ src, sizes, ...props }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string }) {
  const media = getResponsiveMedia(src);
  if (!media) return <img src={src} {...props} />;

  const imageSizes = sizes || media.sizes;
  return (
    <picture className="responsive-picture">
      <source type="image/avif" srcSet={media.avifSrcSet} sizes={imageSizes} />
      <source type="image/webp" srcSet={media.fallbackSrcSet} sizes={imageSizes} />
      <img src={src} srcSet={media.fallbackSrcSet} sizes={imageSizes} {...props} />
    </picture>
  );
}

function InteriorHero({ page }: { page: SitePage }) {
  const isLegal = page.kind === "legal";
  const displayTitle = page.kind === "service" ? serviceName(page) : page.h1;
  return (
    <section className={isLegal ? "interior-hero legal" : "interior-hero"}>
      <div className="container interior-hero-grid">
        <div>
          <p className="eyebrow light">{page.kind === "service" ? "Professional property services" : "NYC Cleaning and Maintenance"}</p>
          <h1>{displayTitle}</h1>
          <p>{page.description}</p>
        </div>
        {!isLegal && (
          <div className="interior-image">
            <ResponsiveImage
              src={getPageImage(page)}
              alt={`${displayTitle} from NYC Cleaning and Maintenance`}
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceAreaMap() {
  const locations = trpc.projects.listLocations.useQuery(undefined, { retry: false });
  const mapConfig = trpc.system.mapConfig.useQuery(undefined, { retry: false });
  const [mapTilesUnavailable, setMapTilesUnavailable] = useState(false);
  const locationData = (locations.data ?? []) as ServiceMapLocation[];
  const markers = locationData.flatMap(location => (
    location.latitude !== null && location.longitude !== null
      ? [{ id: location.id, latitude: location.latitude, longitude: location.longitude }]
      : []
  ));
  const unresolvedCount = locationData.length - markers.length;

  let mapMessage = "Loading service locations…";
  if (locations.isError) {
    mapMessage = "Service-area locations are temporarily unavailable. Please check back shortly.";
  } else if (!locations.isLoading && locationData.length === 0) {
    mapMessage = "Service locations will appear here as they are added to the NYC Cleaning CMS.";
  } else if (!locations.isLoading && markers.length > 0) {
    mapMessage = unresolvedCount > 0
      ? `Showing ${markers.length} active service location${markers.length === 1 ? "" : "s"}. ${unresolvedCount} location${unresolvedCount === 1 ? " is" : "s are"} still being prepared.`
      : `Showing ${markers.length} active service location${markers.length === 1 ? "" : "s"} across New York City.`;
  } else if (!locations.isLoading) {
    mapMessage = "Service locations are being prepared for the map.";
  }

  if (mapTilesUnavailable && markers.length > 0) {
    mapMessage = "Map details are temporarily unavailable, but the service-location markers have loaded.";
  }

  return (
    <div className="map-container" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--background)", minHeight: "600px", position: "relative" }}>
      <Suspense fallback={<div className="h-[600px] w-full" aria-label="Loading service-area map" role="status" />}>
        <LazyMapView
          className="h-[600px]"
          googleMapsApiKey={mapConfig.data?.googleMapsApiKey}
          initialCenter={[40.7128, -74.0060]}
          initialZoom={11}
          markers={markers}
          onMapError={() => setMapTilesUnavailable(true)}
        />
      </Suspense>
      <div className="absolute bottom-4 left-4 right-4 max-w-xl rounded-xl border border-white/80 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg backdrop-blur sm:left-6 sm:right-auto">
        <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-gold" /><span>{mapMessage}</span></div>
      </div>
    </div>
  );
}

function ServiceAreaPageContent({ page }: { page: SitePage }) {
  return (
    <>
      <InteriorHero page={page} />
      <section className="section">
        <div className="container contact-page-grid">
          <div>
            <p className="eyebrow">Contact NYC Cleaning</p>
            <h2>Tell us how we can help.</h2>
            <p>Whether you manage an office, residential building, mixed-use property, or commercial facility, we’ll build a plan around your operating needs.</p>
            <div className="contact-details">
              <a href={`tel:${company.phoneHref}`}><span><Building2 /></span><div><small>Call</small><strong>{company.phoneDisplay}</strong></div></a>
              <a href={`mailto:${company.email}`}><span><Sparkles /></span><div><small>Email</small><strong>{company.email}</strong></div></a>
              <div><span><MapPin /></span><div><small>Mailing address</small><strong>{company.address}</strong></div></div>
            </div>
          </div>
          <InquiryForm sourcePath={page.path} heading="Request a free consultation" />
        </div>
      </section>
      <section className="section section-cream">
        <div className="container">
          <div className="section-heading split">
            <div><p className="eyebrow">Our footprint</p><h2>Serving properties across New York City.</h2></div>
            <p>We support commercial and residential buildings throughout the five boroughs. Explore our active service areas below.</p>
          </div>
          <ServiceAreaMap />
        </div>
      </section>
    </>
  );
}

export default function ServiceAreaPage({ page }: { page: SitePage }) {
  return <ClientDataProvider><ServiceAreaPageContent page={page} /></ClientDataProvider>;
}
