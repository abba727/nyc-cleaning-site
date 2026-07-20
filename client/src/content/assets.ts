export const brandAssets = {
  logo: "/media/nyc-cleaning-logo_aabc7372.webp",
  hero: "/media/nyc-cleaning-hero-v2_40f4e363.png",
  heroResponsive: {
    small: "/media/nyc-cleaning-hero-960_893ae0c0.webp",
    large: "/media/nyc-cleaning-hero-1440_264bf728.webp",
  },
  aboutTeam: "/media/nyc-cleaning-who-we-are-team-20260716_3cda4186.webp",
  careers: "/media/nyc-cleaning-janitorial-v2_90b970d8.png",
  contact: "/media/nyc-cleaning-contact-hero-20260716_3e0ac94a.png",
  serviceArea: "/media/nyc-cleaning-property-maintenance-v2_6606af1d.png",
  commercialCleaning: "/media/nyc-cleaning-editorial-corrected_d52b94b5.png",
  deepCleaning: "/media/nyc-cleaning-deep-cleaning-v2_f503466f.png",
  commonArea: "/media/nyc-cleaning-common-area-v2_94e14b83.png",
  staffing: "/media/nyc-cleaning-staffing-v2_30b09bf9.png",
  houseCleaning: "/media/nyc-cleaning-house-cleaning-v2_07befc0d.png",
  propertyMaintenance: "/media/nyc-cleaning-property-maintenance-v2_6606af1d.png",
  repair: "/media/nyc-cleaning-repair-v2_920ec7b7.png",
  buildingMaintenance: "/media/nyc-cleaning-building-maintenance-v2_48d85e19.png",
  janitorial: "/media/nyc-cleaning-janitorial-v2_90b970d8.png",
  maintenanceManagement: "/media/nyc-cleaning-maintenance-management-v2_57ecbbe8.png",
  doorman: "/media/nyc-cleaning-doorman-v2_a294c98f.png",
  garbageBin: "/media/nyc-cleaning-garbage-bin-v2_e04ea805.png",
  officeCleaning: "/media/nyc-cleaning-office-cleaning-v2_9470169a.png",
  porter: "/media/nyc-cleaning-porter-v2_06cbeb37.png",
  apartmentCleaning: "/media/nyc-cleaning-apartment-cleaning-v2_6ad72f22.png",
  pricing: "/media/nyc-cleaning-pricing-v2_83d318af.png",
  propertyCleaning: "/media/nyc-cleaning-property-cleaning-v2_2b2acf31.png",
  sweepingTrash: "/media/nyc-cleaning-sweeping-trash-v2_d7cadf79.png",
} as const;

export const homepageServiceImages: Record<string, string> = {
  "/services/commercial-cleaning-nyc/": "/media/nyc-cleaning-commercial-cleaning-960_e899c41e.webp",
  "/services/office-commercial-cleaning-services-nyc/": "/media/nyc-cleaning-office-cleaning-960_700ef7e1.webp",
  "/services/apartment-cleaning-services-nyc/": "/media/nyc-cleaning-apartment-cleaning-960_50e88f76.webp",
  "/services/deep-cleaning-services-nyc/": "/media/nyc-cleaning-deep-cleaning-960_ea45d272.webp",
  "/services/porter-services-nyc/": "/media/nyc-cleaning-porter-960_f95fb53f.webp",
  "/services/common-area-maintenance-services-nyc/": "/media/nyc-cleaning-common-area-960_077feced.webp",
};

export type BrandAssetKey = keyof typeof brandAssets;
