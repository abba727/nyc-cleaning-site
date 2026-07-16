export type ServiceContent = {
  summary: string;
  intro: string;
  benefits: [string, string, string, string];
  relatedPaths: [string, string, string];
};

export const serviceContentByPath: Record<string, ServiceContent> = {
  "/services/common-area-maintenance-services-nyc/": {
    summary: "We keep shared building spaces clean, orderly, and welcoming with maintenance plans built around your property’s traffic and schedule.",
    intro: "We maintain the shared spaces that shape every resident, tenant, and visitor’s first impression. From lobbies and hallways to elevators and amenity areas, we build a practical cleaning schedule around your property’s traffic, surfaces, and operating needs.",
    benefits: [
      "Create a cleaner, more welcoming experience in lobbies, corridors, elevators, and shared amenities.",
      "Reduce visible wear by matching cleaning methods to the surfaces and traffic patterns in your building.",
      "Keep waste, dust, and everyday buildup from affecting the appearance of common spaces.",
      "Give residents, tenants, and visitors greater confidence in how the property is managed.",
    ],
    relatedPaths: [
      "/services/porter-services-nyc/",
      "/services/building-maintenance-nyc/",
      "/services/sweeping-trash-nyc/",
    ],
  },
  "/services/janitorial-staffing-nyc/": {
    summary: "We provide dependable janitorial staff for New York properties that need consistent coverage without managing every hiring detail in-house.",
    intro: "We provide trained janitorial professionals for properties that need dependable day-to-day coverage. Whether you need ongoing staff or support for a specific schedule, we align responsibilities, hours, and supervision with the way your facility operates.",
    benefits: [
      "Maintain reliable cleaning coverage without carrying the full burden of recruiting and onboarding staff.",
      "Adjust staffing levels and schedules as your property’s operating needs change.",
      "Give occupants and visitors a consistently clean, professional environment.",
      "Keep your internal team focused on operations while we coordinate janitorial responsibilities.",
    ],
    relatedPaths: [
      "/services/maintenance-staffing-nyc/",
      "/services/janitorial-services-nyc/",
      "/services/commercial-janitorial-cleaning-services-nyc/",
    ],
  },
  "/services/house-cleaning-service-nyc/": {
    summary: "We provide flexible house cleaning that gives New Yorkers a cleaner, more comfortable home and more time for everything else.",
    intro: "We make it easier to keep your home clean without giving up your limited free time. Our team tailors the visit to your space, priorities, and preferred schedule so you receive practical help where it matters most.",
    benefits: [
      "Come home to a cleaner, more comfortable living environment.",
      "Reclaim time that would otherwise be spent on routine cleaning tasks.",
      "Choose a schedule and scope that fit your household rather than a rigid checklist.",
      "Reduce dust and everyday buildup across frequently used rooms and surfaces.",
    ],
    relatedPaths: [
      "/services/apartment-cleaning-services-nyc/",
      "/services/deep-cleaning-services-nyc/",
      "/services/property-cleaning-services-nyc/",
    ],
  },
  "/services/deep-cleaning-services-nyc/": {
    summary: "We deliver detailed deep cleaning for spaces that need more attention than routine upkeep can provide.",
    intro: "We address the buildup, overlooked surfaces, and high-use areas that routine cleaning may not reach. Our deep cleaning plans focus the work where your property needs it most, helping reset the space and create a cleaner foundation for ongoing care.",
    benefits: [
      "Remove accumulated dust, grime, and residue from frequently missed areas.",
      "Refresh kitchens, bathrooms, fixtures, and other high-use surfaces more thoroughly.",
      "Create a cleaner starting point before recurring service, a move, or an important event.",
      "Improve the overall appearance and comfort of the space with focused, detailed work.",
    ],
    relatedPaths: [
      "/services/house-cleaning-service-nyc/",
      "/services/apartment-cleaning-services-nyc/",
      "/services/commercial-cleaning-nyc/",
    ],
  },
  "/services/property-maintenance-services-nyc/": {
    summary: "We coordinate proactive property maintenance that supports safer operations, stronger presentation, and long-term asset care.",
    intro: "We help owners and managers keep New York properties operating smoothly through coordinated, proactive maintenance. We build the scope around your building’s condition, recurring needs, and priorities so routine care is handled before small issues become larger disruptions.",
    benefits: [
      "Protect property condition and appearance through consistent, planned upkeep.",
      "Reduce avoidable disruptions by identifying and addressing routine needs earlier.",
      "Support tenant satisfaction with cleaner, safer, better-maintained spaces.",
      "Simplify oversight by coordinating recurring maintenance through one responsive team.",
    ],
    relatedPaths: [
      "/services/building-maintenance-management-nyc/",
      "/services/building-repair-and-maintenance-services-nyc/",
      "/services/commercial-building-maintenance-nyc/",
    ],
  },
  "/services/building-repair-and-maintenance-services-nyc/": {
    summary: "We combine routine building care with responsive repair support to help properties remain safe, functional, and presentable.",
    intro: "We handle routine building upkeep and practical repair needs through one coordinated service plan. By aligning inspections, maintenance tasks, and responsive support with your operations, we help you protect the property and limit avoidable interruptions.",
    benefits: [
      "Keep building systems and shared areas functioning more reliably.",
      "Address routine repair needs before small issues create larger operational problems.",
      "Support a safer, more presentable environment for occupants and visitors.",
      "Reduce the time your team spends coordinating separate maintenance vendors.",
    ],
    relatedPaths: [
      "/services/property-maintenance-services-nyc/",
      "/services/building-maintenance-nyc/",
      "/services/building-maintenance-management-nyc/",
    ],
  },
  "/services/commercial-building-maintenance-nyc/": {
    summary: "We maintain commercial buildings with coordinated care that supports daily operations, tenant experience, and property value.",
    intro: "We provide commercial building maintenance that keeps day-to-day property needs organized and visible. Our plans reflect the building’s use, operating hours, recurring tasks, and priorities so your team has dependable support without unnecessary disruption.",
    benefits: [
      "Keep commercial spaces functional, orderly, and ready for daily business activity.",
      "Limit unplanned interruptions through consistent attention to routine maintenance needs.",
      "Strengthen tenant and visitor impressions with a professionally maintained property.",
      "Coordinate cleaning and upkeep around operating hours and building access requirements.",
    ],
    relatedPaths: [
      "/services/building-maintenance-management-nyc/",
      "/services/building-repair-and-maintenance-services-nyc/",
      "/services/property-maintenance-services-nyc/",
    ],
  },
  "/services/commercial-janitorial-cleaning-services-nyc/": {
    summary: "We provide commercial janitorial cleaning plans tailored to your facility, operating hours, and hygiene priorities.",
    intro: "We keep offices, retail spaces, facilities, and other commercial properties clean through consistent janitorial service. We shape the scope and schedule around your operation so essential cleaning is completed with minimal interference to staff, customers, and daily activity.",
    benefits: [
      "Maintain a cleaner, healthier environment for employees, customers, and visitors.",
      "Present a consistently professional space that reflects well on your organization.",
      "Schedule cleaning around business hours to reduce disruption.",
      "Combine routine cleaning, restroom care, and waste handling in one coordinated plan.",
    ],
    relatedPaths: [
      "/services/janitorial-services-nyc/",
      "/services/office-commercial-cleaning-services-nyc/",
      "/services/janitorial-staffing-nyc/",
    ],
  },
  "/services/janitorial-services-nyc/": {
    summary: "We deliver reliable janitorial services that keep New York commercial properties clean, safe, and ready for daily use.",
    intro: "We provide recurring janitorial care for commercial properties that need dependable cleaning and responsive support. We tailor tasks and frequency to your facility so high-use areas, restrooms, shared spaces, and waste needs receive consistent attention.",
    benefits: [
      "Maintain a clean, professional setting throughout the workweek.",
      "Support healthier shared spaces with consistent attention to high-touch and high-use areas.",
      "Choose service times that fit your occupancy and operating schedule.",
      "Simplify recurring cleaning through one clearly defined scope and point of contact.",
    ],
    relatedPaths: [
      "/services/commercial-janitorial-cleaning-services-nyc/",
      "/services/janitorial-office-cleaning-services-nyc/",
      "/services/janitorial-staffing-nyc/",
    ],
  },
  "/services/building-maintenance-management-nyc/": {
    summary: "We organize building maintenance responsibilities into one accountable plan for smoother operations and clearer oversight.",
    intro: "We help property teams organize recurring maintenance, cleaning coordination, and day-to-day building needs. Our management approach creates a clear scope, schedule, and line of responsibility so important work stays visible and your operations remain easier to manage.",
    benefits: [
      "Gain clearer oversight of recurring building-care responsibilities.",
      "Reduce missed tasks through an organized schedule and defined service scope.",
      "Improve tenant experience with more consistent care across shared areas.",
      "Free your internal team from coordinating every routine maintenance detail.",
    ],
    relatedPaths: [
      "/services/property-maintenance-services-nyc/",
      "/services/building-maintenance-nyc/",
      "/services/maintenance-staffing-nyc/",
    ],
  },
  "/services/building-maintenance-nyc/": {
    summary: "We provide recurring building maintenance for residential and mixed-use properties across New York City.",
    intro: "We keep residential and mixed-use buildings clean, orderly, and better prepared for everyday demands. By coordinating routine upkeep around your property’s needs, we help owners and managers support occupants while protecting the appearance and condition of the building.",
    benefits: [
      "Maintain cleaner, safer shared areas for residents, tenants, and guests.",
      "Protect finishes and building condition through consistent routine care.",
      "Reduce management workload with a dependable maintenance schedule.",
      "Support tenant satisfaction with a property that feels cared for every day.",
    ],
    relatedPaths: [
      "/services/building-maintenance-management-nyc/",
      "/services/common-area-maintenance-services-nyc/",
      "/services/porter-services-nyc/",
    ],
  },
  "/services/doorman-services-nyc/": {
    summary: "We provide professional doorman coverage that supports building security, hospitality, and smooth front-entry operations.",
    intro: "We provide trained doormen who create a welcoming presence while supporting access control and everyday front-desk needs. We align coverage and responsibilities with your building so residents, tenants, guests, and deliveries are handled professionally.",
    benefits: [
      "Create a professional first impression for residents, tenants, and visitors.",
      "Support safer entry management through attentive access and visitor handling.",
      "Improve package, delivery, and guest coordination at the building entrance.",
      "Give property teams dependable front-of-house coverage matched to the schedule.",
    ],
    relatedPaths: [
      "/services/porter-services-nyc/",
      "/services/building-maintenance-management-nyc/",
      "/services/common-area-maintenance-services-nyc/",
    ],
  },
  "/services/garbage-bin-cleaning-nyc/": {
    summary: "We clean and sanitize garbage bins to reduce odors, buildup, and unsanitary conditions around waste areas.",
    intro: "We clean garbage bins and waste-area equipment that regular trash collection leaves behind. By coordinating service with your property’s collection routine, we help keep these high-impact areas cleaner, more manageable, and less disruptive to occupants and neighbors.",
    benefits: [
      "Reduce persistent odors around garbage storage and collection areas.",
      "Remove residue and buildup that can attract insects and other pests.",
      "Create a cleaner waste-handling environment for staff and occupants.",
      "Coordinate bin care with your existing collection and property schedule.",
    ],
    relatedPaths: [
      "/services/sweeping-trash-nyc/",
      "/services/common-area-maintenance-services-nyc/",
      "/services/property-maintenance-services-nyc/",
    ],
  },
  "/services/janitorial-office-cleaning-services-nyc/": {
    summary: "We combine office cleaning and janitorial care in a schedule designed around your workplace and team.",
    intro: "We provide office cleaning and janitorial support that keeps workspaces ready for employees and visitors. We tailor the service to your floor plan, occupancy, operating hours, and priorities so routine care happens consistently and with minimal interruption.",
    benefits: [
      "Give employees and visitors a cleaner, more comfortable workplace.",
      "Keep desks, shared areas, restrooms, and high-use spaces consistently presentable.",
      "Schedule service before, during, or after business hours as operations require.",
      "Consolidate routine office cleaning and janitorial tasks into one practical plan.",
    ],
    relatedPaths: [
      "/services/office-commercial-cleaning-services-nyc/",
      "/services/janitorial-services-nyc/",
      "/services/commercial-janitorial-cleaning-services-nyc/",
    ],
  },
  "/services/maintenance-staffing-nyc/": {
    summary: "We supply skilled maintenance personnel who integrate with your property’s schedule, responsibilities, and operating standards.",
    intro: "We provide maintenance staff for properties that need reliable hands-on support without managing the entire hiring process internally. We define coverage around your building’s responsibilities and schedule so the right tasks receive consistent attention.",
    benefits: [
      "Fill recurring maintenance needs without adding every role to your internal payroll.",
      "Scale coverage as property demands, schedules, or portfolios change.",
      "Keep routine upkeep moving with personnel assigned to a clear scope.",
      "Reduce management pressure by giving daily maintenance needs dependable coverage.",
    ],
    relatedPaths: [
      "/services/janitorial-staffing-nyc/",
      "/services/building-maintenance-management-nyc/",
      "/services/property-maintenance-services-nyc/",
    ],
  },
  "/services/office-commercial-cleaning-services-nyc/": {
    summary: "We clean offices and commercial workplaces with flexible plans that support healthier teams and a stronger professional image.",
    intro: "We keep offices and commercial workspaces clean, organized, and ready for business. We build the plan around your layout, occupancy, client traffic, and hours so your workplace receives reliable care without getting in the way of daily operations.",
    benefits: [
      "Create a cleaner workplace that supports employee comfort and focus.",
      "Make a stronger impression on clients, partners, and visitors.",
      "Reduce disruption with service times aligned to your business schedule.",
      "Focus resources on the rooms and high-use areas that matter most to your team.",
    ],
    relatedPaths: [
      "/services/janitorial-office-cleaning-services-nyc/",
      "/services/commercial-cleaning-nyc/",
      "/services/commercial-janitorial-cleaning-services-nyc/",
    ],
  },
  "/services/porter-services-nyc/": {
    summary: "We provide on-site porter support that keeps busy properties clean, orderly, and responsive throughout the day.",
    intro: "We place dependable porter support where ongoing attention matters most. From common-area touchups and waste handling to everyday presentation needs, we tailor the role and schedule to your property so our team handles small issues before problems accumulate.",
    benefits: [
      "Keep lobbies, elevators, corridors, and other shared areas presentable throughout the day.",
      "Address spills, waste, and everyday cleaning needs more quickly.",
      "Support smoother property operations with visible, on-site assistance.",
      "Match porter responsibilities and hours to your building’s traffic and priorities.",
    ],
    relatedPaths: [
      "/services/common-area-maintenance-services-nyc/",
      "/services/building-maintenance-nyc/",
      "/services/doorman-services-nyc/",
    ],
  },
  "/services/apartment-cleaning-services-nyc/": {
    summary: "We provide apartment cleaning for residents, owners, and managers who need reliable care tailored to the space.",
    intro: "We clean New York apartments with a practical scope built around the unit, its condition, and the people who use it. Whether the need is recurring care or a more detailed visit, we focus on the rooms and surfaces that will make the greatest difference.",
    benefits: [
      "Enjoy a cleaner apartment without spending your limited time on every routine task.",
      "Choose priorities that reflect your unit rather than a generic checklist.",
      "Prepare a home for move-in, move-out, guests, or a fresh start.",
      "Reduce dust and buildup in kitchens, bathrooms, living areas, and bedrooms.",
    ],
    relatedPaths: [
      "/services/house-cleaning-service-nyc/",
      "/services/deep-cleaning-services-nyc/",
      "/services/common-area-maintenance-services-nyc/",
    ],
  },
  "/services/commercial-cleaning-nyc/": {
    summary: "We deliver commercial cleaning plans that keep New York workplaces professional, hygienic, and ready for business.",
    intro: "We clean commercial properties across New York City with plans shaped around each facility’s use, traffic, and operating hours. From routine workplace care to focused cleaning priorities, we help you maintain a professional environment while your team stays focused on the business.",
    benefits: [
      "Present a cleaner, more professional environment to customers and visitors.",
      "Support employee comfort with consistent care for shared and high-use spaces.",
      "Minimize operational disruption through flexible service scheduling.",
      "Protect floors, fixtures, and finishes with cleaning matched to the property.",
    ],
    relatedPaths: [
      "/services/office-commercial-cleaning-services-nyc/",
      "/services/commercial-janitorial-cleaning-services-nyc/",
      "/services/commercial-cleaning-services-prices-nyc/",
    ],
  },
  "/services/doorman-nyc/": {
    summary: "We support safer, more welcoming building entrances with professional doorman service tailored to your property.",
    intro: "We help residential and mixed-use properties create a secure, welcoming front entrance. Our doorman coverage is shaped around your schedule and building procedures so visitor access, deliveries, and everyday resident needs are handled with professionalism.",
    benefits: [
      "Strengthen entry oversight with attentive visitor and access handling.",
      "Create a polished welcome for residents, guests, and prospective tenants.",
      "Improve package and delivery coordination at the front entrance.",
      "Give building management reliable coverage aligned with property procedures.",
    ],
    relatedPaths: [
      "/services/doorman-services-nyc/",
      "/services/porter-services-nyc/",
      "/services/building-maintenance-nyc/",
    ],
  },
  "/services/commercial-cleaning-services-prices-nyc/": {
    summary: "We explain the factors behind commercial cleaning prices and build a transparent plan around your actual property needs.",
    intro: "We make commercial cleaning pricing easier to understand by tying the scope to your property, frequency, service hours, and priorities. Instead of forcing a standard package, we review what the space actually requires and recommend a plan that balances cleanliness, operations, and budget.",
    benefits: [
      "Understand which property and scheduling factors influence the cost of service.",
      "Avoid paying for tasks or frequencies that do not fit your operation.",
      "Compare options through a clearly defined scope rather than an unclear flat estimate.",
      "Plan cleaning expenses around the standards your property needs to maintain.",
    ],
    relatedPaths: [
      "/services/commercial-cleaning-nyc/",
      "/services/office-commercial-cleaning-services-nyc/",
      "/services/property-cleaning-services-nyc/",
    ],
  },
  "/services/property-cleaning-services-nyc/": {
    summary: "We provide coordinated property cleaning for commercial, residential, and mixed-use buildings across New York City.",
    intro: "We help owners and managers keep complete properties clean, presentable, and easier to operate. By matching the cleaning scope to your building type, traffic, shared spaces, and schedule, we create a practical plan that supports occupants and protects the property’s appearance.",
    benefits: [
      "Maintain consistent cleanliness across entrances, shared areas, and occupied spaces.",
      "Adapt service frequency to building traffic and operational demands.",
      "Improve occupant and visitor impressions with a well-cared-for property.",
      "Coordinate multiple cleaning needs through one clear plan and point of contact.",
    ],
    relatedPaths: [
      "/services/common-area-maintenance-services-nyc/",
      "/services/commercial-cleaning-nyc/",
      "/services/property-maintenance-services-nyc/",
    ],
  },
  "/services/sweeping-trash-nyc/": {
    summary: "We keep exterior areas and waste zones cleaner through scheduled sweeping, trash removal, and practical site care.",
    intro: "We handle sweeping and trash removal for properties that need cleaner sidewalks, entrances, exterior areas, and waste zones. We coordinate the work around collection schedules and property traffic so these visible spaces remain more orderly and easier to manage.",
    benefits: [
      "Improve curb appeal by removing litter and debris from high-visibility exterior areas.",
      "Reduce odors and unsanitary buildup around waste-handling locations.",
      "Discourage pests by keeping trash areas cleaner and more orderly.",
      "Support smoother collection days with service aligned to your property schedule.",
    ],
    relatedPaths: [
      "/services/garbage-bin-cleaning-nyc/",
      "/services/porter-services-nyc/",
      "/services/property-maintenance-services-nyc/",
    ],
  },
};

export const getServiceContent = (path: string) => serviceContentByPath[path];
