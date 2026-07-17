# Full-Stack Content and CRM Starter Architecture

**Author:** Manus AI  
**Target repository:** `abba727/fullstack-content-crm-starter`  
**Distribution:** Private GitHub starter repository  
**Reference implementation:** NYC Cleaning CMS and inquiry CRM

## Purpose

The starter packages a reusable administrative backend and reference interface for websites that need **email/password authentication**, **user administration**, **content management**, **contact and quote inquiry CRM**, **Resend delivery**, **durable media storage**, and **AI-assisted article creation**. Tenant branding, recipients, prompts, canonical paths, session identifiers, and primary-administrator details must be configuration rather than application logic.

The starter is a deployable full-stack application rather than an npm library. This keeps the database schema, server procedures, admin interface, public reference forms, migrations, tests, and setup documentation versioned together. Future projects clone the repository, set configuration, apply the schema, and enable only the desired feature modules.

## Architectural Decisions

| Concern | Decision | Reason |
|---|---|---|
| Distribution | Private standalone starter repository | Preserves a complete, runnable reference application and supports versioned upgrades. |
| Authentication | Email/password enabled by default; Google provider exposed as an optional adapter seam; Manus OAuth is not required by starter features | Keeps authentication portable and aligned with the intended reuse model. |
| Sessions | Signed HTTP-only cookie containing user ID and session version | Supports revocation after logout, password changes, role changes, or account removal. |
| Authorization | Configurable role definitions with default `admin` and `content_manager` roles | Allows full administration while limiting content managers to content operations. |
| Feature composition | Explicit feature flags and dependency validation at startup | Allows CMS, CRM, email, storage, and AI capabilities to be enabled independently where dependencies permit. |
| API | tRPC routers composed from feature modules | Keeps end-to-end input/output types and central authorization middleware. |
| Persistence | Drizzle schema and repository modules | Separates workflow services from database query details. |
| Email | Provider-neutral `Mailer` contract with a Resend adapter | Makes templates and recipients reusable without coupling workflows to Resend internals. |
| Media | Provider-neutral `ObjectStorage` contract with the built-in storage adapter | Ensures generated and uploaded media persist independently from temporary provider URLs. |
| AI text | Provider-neutral structured-generation contract with a built-in LLM adapter | Allows strict JSON-schema outputs, model configuration, validation, retries, and testing with fakes. |
| AI images | Provider-neutral image-generation and vision-description contracts | Separates prompt policy from image provider, durable storage, and editable alt-text workflows. |
| Background work | None required | All requested workflows complete within user-initiated requests; no scheduler or always-on worker is needed. |

## Target Repository Structure

```text
client/
  src/
    app/
      starterConfig.ts
    components/admin/
      AdminShell.tsx
      FeatureGuard.tsx
    features/
      auth/
      users/
      content/
      crm/
    pages/
      AdminLogin.tsx
      AdminRegister.tsx
      AdminForgotPassword.tsx
      AdminResetPassword.tsx
      AdminUsers.tsx
      AdminArticles.tsx
      AdminInquiries.tsx
      ContactExample.tsx
drizzle/
  schema.ts
  migrations/
server/
  adapters/
    ai/
      builtInTextAdapter.ts
      builtInImageAdapter.ts
      builtInVisionAdapter.ts
    email/
      resendMailer.ts
    storage/
      builtInObjectStorage.ts
  config/
    env.ts
    starterConfig.ts
    validateConfig.ts
  modules/
    auth/
      auth.crypto.ts
      auth.repository.ts
      auth.router.ts
      auth.service.ts
      auth.types.ts
    users/
      users.repository.ts
      users.router.ts
      users.service.ts
      users.types.ts
    content/
      content.repository.ts
      content.router.ts
      content.service.ts
      content.types.ts
      content.validation.ts
    crm/
      crm.repository.ts
      crm.router.ts
      crm.service.ts
      crm.types.ts
      crm.validation.ts
    article-ai/
      articleAi.router.ts
      articleAi.service.ts
      articleAi.types.ts
      articleAi.validation.ts
      prompts.ts
    email/
      email.service.ts
      templates.ts
      types.ts
  routers.ts
shared/
  contracts/
  phone.ts
  roles.ts
docs/
  ADOPTION.md
  ARCHITECTURE.md
  CONFIGURATION.md
  DATABASE.md
  SECURITY.md
```

## Configuration Contract

The starter loads environment-backed settings once, validates feature dependencies, and passes a typed configuration object into router and service factories. Modules must not import tenant-specific environment variables directly.

```ts
export type StarterFeatures = {
  auth: boolean;
  userAdministration: boolean;
  content: boolean;
  crm: boolean;
  email: boolean;
  storage: boolean;
  aiText: boolean;
  aiImages: boolean;
  aiVisionDescriptions: boolean;
};

export type StarterConfig = {
  brand: {
    name: string;
    legalName?: string;
    primaryColor: string;
    supportEmail: string;
    siteUrl: string;
  };
  features: StarterFeatures;
  auth: {
    sessionCookieName: string;
    sessionKind: string;
    shortSessionMs: number;
    rememberedSessionMs: number;
    verificationCodeTtlMs: number;
    resendCooldownMs: number;
    maxCodeAttempts: number;
    primaryAdminEmail: string;
    primaryAdminName: string;
    roles: {
      administrator: string;
      contentManager: string;
    };
  };
  content: {
    canonicalRoot: string;
    defaultAuthorName: string;
    allowedCoverMimeTypes: string[];
    maxCoverBytes: number;
  };
  crm: {
    defaultInquiryType: string;
    inquiryTypes: string[];
    serviceTypes: string[];
    notificationRecipients: string[];
    defaultReplyTo: string;
    maxRecentSubmissions: number;
    rateLimitWindowMs: number;
  };
  ai: {
    editorialProfile: string;
    audience: string;
    tone: string;
    prohibitedClaims: string[];
    textModel?: string;
    visionModel?: string;
    imageModel?: string;
    imageQuality?: string;
    targetWordCount: number;
    minimumWordCount: number;
    maximumWordCount: number;
  };
};
```

## Required Environment Variables

| Variable | Required when | Purpose |
|---|---|---|
| `DATABASE_URL` | Any persistent feature enabled | Database connection. |
| `JWT_SECRET` | Authentication enabled | Session signing and verification-code hashing. |
| `PRIMARY_ADMIN_EMAIL` | User administration enabled | Protected bootstrap administrator identity. |
| `PRIMARY_ADMIN_NAME` | User administration enabled | Configurable bootstrap display name. |
| `APP_BASE_URL` | Authentication or content enabled | Registration/reset links and canonical URL base. |
| `RESEND_API_KEY` | Resend adapter enabled | Server-side Resend authentication. |
| `RESEND_FROM_EMAIL` | Resend adapter enabled | Verified sender identity. |
| `CONTACT_NOTIFICATION_EMAILS` | CRM notifications enabled | Comma-separated owner/team recipients. |
| `CONTACT_REPLY_TO_EMAIL` | CRM replies enabled | Reply-to identity for customer responses. |
| `BUILT_IN_FORGE_API_URL` | Built-in AI or storage adapter enabled | Server-side AI and storage API base. |
| `BUILT_IN_FORGE_API_KEY` | Built-in AI or storage adapter enabled | Server-side AI and storage API authentication. |

An `.env.example` file documents names only. It must never contain production values or private credentials.

## Adapter Contracts

```ts
export interface Mailer {
  send(message: {
    from: string;
    to: string[];
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ messageId: string | null }>;
}

export interface ObjectStorage {
  put(input: {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<{ key: string; url: string }>;
  getSignedUrl(key: string): Promise<string>;
}

export interface StructuredTextGenerator {
  generate<T>(input: {
    model?: string;
    system: string;
    user: string;
    schemaName: string;
    schema: Record<string, unknown>;
  }): Promise<T>;
}

export interface ImageGenerator {
  generate(input: {
    prompt: string;
    model?: string;
    quality?: string;
  }): Promise<{ sourceUrl: string; sourceKey?: string }>;
}

export interface VisionDescriber {
  describe(input: {
    imageUrl: string;
    context: string;
    model?: string;
  }): Promise<{ description: string }>;
}
```

## Module Responsibilities

| Module | Owns | Does not own |
|---|---|---|
| Authentication | Password hashing, verification codes, login throttling, sessions, remember-me duration, logout, password reset | User-list UI, email templates, tenant branding |
| User administration | Invitations, registration, roles, removal, primary-admin protection, audit events, session revocation | Password cryptography or provider transport |
| Content | Article validation, CRUD, draft/published states, canonical conflicts, media references | AI prompt construction or binary storage |
| CRM | Contact validation, US phone normalization, persistence, inquiry status, response history, delivery state | Resend SDK calls or hard-coded recipients |
| Email | Template rendering and delivery orchestration | Account persistence, article generation, CRM status transitions |
| Article AI | Topic-to-draft, title, SEO fields, image prompt, cover generation, vision description, retries and validation | Article publication or final editorial approval |
| Adapters | External provider invocation | Business policy, user-facing errors, authorization |

## Feature Dependency Rules

| Feature | Required dependencies |
|---|---|
| Authentication | Database, JWT secret |
| User administration | Authentication, email |
| Content management | Authentication |
| CRM persistence | Database |
| CRM notifications | CRM persistence, email |
| CRM replies | CRM persistence, authentication, email |
| AI article text | Authentication, content management, text generator |
| Uploaded cover images | Authentication, content management, storage |
| AI cover images | Authentication, content management, image generator, storage |
| AI image descriptions | Authentication, content management, vision describer, storage |

Startup validation fails with a specific configuration error when an enabled feature lacks a dependency. Disabled features are omitted from navigation and return a stable `NOT_FOUND` or feature-disabled result instead of attempting provider calls.

## AI Article Workflow

The article editor remains the approval boundary. AI results populate editable fields and never publish automatically.

| Capability | Input | Structured output | Quality controls |
|---|---|---|---|
| Topic-to-article | Topic or editorial brief | Markdown article body and word count | Tenant prompt profile, prohibited-claim rules, heading checks, word-count validation, one repair attempt |
| Title suggestion | Article body | Suggested title | Body-only grounding, maximum length, plain-text normalization |
| SEO support | Article body | SEO title, meta description, excerpt | Strict schema, field-specific lengths, normalization |
| Cover generation | Article body plus optional direction/title/excerpt | Durable cover URL and storage key | Body-derived prompt, configurable visual profile, provider error handling, persistent copy |
| Image description | Selected generated or uploaded cover | Editable alt text | Vision grounding, context-aware strict schema, fallback description |

The text adapter discovers or accepts a configured model, sends strict JSON-schema requests, validates provider output with Zod, and exposes stable domain errors. The image workflow must persist the chosen result before an article is saved. Temporary provider URLs are never treated as the system of record.

## Authentication and User Lifecycle

The default lifecycle is invite-only: a protected primary administrator invites another administrator or content manager, the recipient verifies a short-lived single-use code, and then sets a password. Forgot-password requests are enumeration-resistant and return the same public response whether an eligible account exists or not.

Sessions include a database-backed version. Login success is recorded; failed attempts are audited without storing submitted passwords. Logout, role changes, password changes, and account removal increment the session version so previously issued cookies become invalid. `rememberMe` controls a configurable longer duration instead of sharing the short-session expiry.

## CRM and Contact Messaging

Public contact submissions use a honeypot field, normalized email, tolerant US phone parsing, bounded message fields, and per-address rate limiting. Persistence occurs before notification delivery. A notification failure updates delivery state without losing the inquiry. Admin replies are persisted as pending before delivery and updated to sent or failed afterward, retaining the message for retry.

The CRM service accepts an array of notification recipients and a configurable reply-to identity. No personal or tenant email address appears in reusable templates or service code.

## Portability and Upgrade Strategy

Each starter release receives a semantic version tag and changelog entry. New projects clone a tagged release rather than the moving default branch. Projects record their source starter version in `starter.json`. Upgrade documentation lists schema migrations, changed configuration keys, adapter contract changes, and manual merge points.

NYC Cleaning remains an adoption example, but its branding and recipients are supplied through configuration in its own repository. The standalone starter contains neutral sample values such as `Example Company`, `admin@example.com`, and `/articles/`; it contains no customer reviews, production recipients, API keys, or tenant-specific editorial claims.
