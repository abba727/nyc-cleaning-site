# Phase 2 Blog CMS Architecture Handoff

The second phase should add an authenticated editorial backend without replacing the public rendering system completed in Phase 1. Public articles should continue to be server-rendered, canonical, sitemap-listed documents; the CMS becomes the controlled source of future article content and publication state.

## Editorial roles and workflow

| Role | Capabilities |
| --- | --- |
| Administrator | Manage authors, edit any post, publish or unpublish, schedule publication, restore revisions, and manage article categories. |
| Editor | Create, edit, preview, submit, and publish posts; review author submissions; restore non-destructive revisions. |
| Author | Create and edit own drafts, upload approved media, preview, and submit for review; cannot publish directly. |

The recommended lifecycle is `draft` → `in_review` → `published`, with `archived` available for removal from active discovery while retaining revision history. Publication must always record the publishing user and a UTC timestamp. A post that is withdrawn after publication should retain its canonical URL and either return the last approved content or a deliberate `410` decision; it must not silently redirect to the homepage.

## Proposed data model

| Entity | Essential fields |
| --- | --- |
| `posts` | `id`, immutable `slug`, `title`, `excerpt`, structured body content, `status`, `authorId`, `publishedAt`, SEO title, meta description, canonical override, social image key/URL, `createdAt`, and `updatedAt`. |
| `post_revisions` | `id`, `postId`, complete versioned content snapshot, editor identity, change note, and UTC creation timestamp. |
| `categories` | `id`, unique slug, display name, description, and indexability setting. |
| `post_categories` | Composite relation between posts and categories. |
| `media` | `id`, S3 key, delivery URL, filename, MIME type, byte size, width, height, alt text, uploader identity, and UTC creation timestamp. |

Article bodies should use a validated structured-block format rather than arbitrary executable HTML. Images belong in S3; the database stores only metadata and object references. Slugs should be immutable after first publication unless an administrator confirms a redirect from the old canonical URL.

## Application architecture

The existing Manus authentication and role field can protect an `/admin/insights` workspace. Backend procedures should use protected role checks for drafts, review actions, publication, revision retrieval, and media metadata. The public route resolver should read published posts only, fall back to the Phase 1 preserved article dataset during migration, and keep route-specific SSR metadata in the initial response.

| Surface | Recommended behavior |
| --- | --- |
| `/admin/insights` | Searchable list with status, author, updated date, filters, and pagination. |
| `/admin/insights/new` | Accessible editor with title, slug preview, excerpt, article blocks, SEO fields, social image, and save/submit actions. |
| `/admin/insights/:id` | Edit, preview, revision history, validation, and workflow actions appropriate to the current role. |
| `/category/blog/` | Curated public archive sourced from published CMS posts and grouped by month/category. |
| `/:article-slug/` | Server-rendered published article with canonical metadata, structured data, breadcrumbs, and related internal links. |

## Legacy-content migration

Import the audited Phase 1 article dataset into `posts` with each existing slug and canonical URL unchanged. Preserve the original title, body, excerpt, and known publication date. Do not invent authors, dates, ratings, engagement counts, or testimonials. After import, compare every source article to the rendered CMS document and keep the static dataset available as a rollback source until parity is confirmed.

The importer should be idempotent, keyed by canonical slug, and run as a controlled migration rather than at application startup. A migration report should list imported, updated, skipped, and conflicted records. Any slug conflict must block publication until an editor resolves it.

## SEO and publishing safeguards

Every publish action should require a non-empty title, unique immutable slug, excerpt, complete body, valid SEO title and description lengths, useful social image alt text, and an indexability decision. Publication should invalidate or refresh the sitemap and archive data without depending on a long-running process. Preview routes must be authenticated and `noindex`.

The public renderer should continue to emit absolute canonical URLs on `https://www.nyccleaning.co`, Open Graph and Twitter metadata, `Article` plus breadcrumb structured data, and a stable `lastmod` value in the sitemap. Deleting a published article should be replaced by archive/unpublish controls and an explicit URL-retirement workflow.

## Security and quality gates

The editor must sanitize structured content, reject executable markup, validate upload type and size, rate-limit write operations, and enforce permissions on every server procedure rather than relying on hidden UI controls. Autosave should be version-aware to prevent one editor from overwriting another editor’s newer update.

Vitest coverage should include role enforcement, draft isolation, slug uniqueness, content validation, migration idempotency, revision creation, publish/unpublish transitions, sitemap visibility, canonical metadata, and preservation of all migrated article routes. Browser validation should cover keyboard editing, mobile preview, unsaved-change warnings, error recovery, and the complete author-to-editor publishing workflow.

## Phase 2 acceptance criteria

Phase 2 is ready when authorized staff can create, edit, preview, submit, approve, publish, archive, and restore article revisions; unauthenticated users cannot access drafts or admin procedures; every existing article URL retains content and canonical metadata; new published articles appear in the archive and sitemap; media is stored outside the application filesystem; and automated tests verify permissions, persistence, SSR SEO output, and publication-state transitions.

