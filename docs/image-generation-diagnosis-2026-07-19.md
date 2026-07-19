# CMS Image-Generation Production Diagnosis

## Observed production failure

A Cloud Run stderr entry at `2026-07-19T04:36:59.267Z`, immediately after a failed `POST /api/trpc/article.generateCover?batch=1`, records the following sanitized provider message:

> `Vertex AI image generation failed (404 Not Found): { "error": { "code": 404, "message": "Publisher model projects/nyc-cleaning/locations/us-central1/publishers/google/models/imagen-4.0-generate-001 was not found or your project does not have access to it..."`

The deployed configuration requests `imagen-4.0-generate-001` through Imagen's `:predict` API in `us-central1`. The failure is therefore a model lifecycle/access problem, not a CMS validation, network, or UI issue.

## Official migration evidence

Google's current migration guidance states that Imagen models are deprecated and shut down beginning June 30, 2026. It directs applications to migrate to Gemini 3.x Image models, such as `gemini-3.1-flash-image`, use `generateContent` rather than the Imagen API, configure image response modalities, and prefer the `global` Vertex AI location for image models. [1]

The official Gemini image-generation guide shows the Vertex API request contract: authenticate with a bearer token; call the model `:generateContent` endpoint; send a `contents` user text part; and use `generationConfig.responseModalities` with `IMAGE` plus `imageConfig.aspectRatio`. [2]

The REST reference documents image data as a candidate content part's `inlineData` object, containing a MIME type and base64-encoded `data` payload. [3]

## Corrective direction

Migrate the production fallback from the retired Imagen `:predict` request to Gemini native image generation via a Vertex AI `:generateContent` request. Use `gemini-3.1-flash-image`, `global`, and a 3:2 image configuration when supported. Preserve safe editor-facing errors, but record normalized provider status/category and a bounded detail string in Cloud Run logs.

## References

[1] [Migrate from Imagen to a Gemini Image model](https://firebase.google.com/docs/ai-logic/imagen-models-migration)

[2] [Generate images with Gemini](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/image-generation)

[3] [Gemini Content REST reference](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/Content)

## Local validation — 2026-07-19

The rebuilt local CMS route was opened at `http://localhost:4175/admin`. At a 1280 px viewport, `document.documentElement.scrollWidth` and `document.body.scrollWidth` both measured 1280 px, while the computed horizontal overflow for `html`, `body`, and `#root` was `clip`. This verifies that the global page-level horizontal overflow guard is emitted and active. The rebuilt Dashboard CSS also emits `.bg-sidebar{background-color:var(--sidebar)}` and `.bg-popover{background-color:var(--popover)}`, plus explicit opaque Sonner toast rules, correcting the previously absent semantic CSS utilities.

The focused TypeScript check and production build both completed successfully. The full existing CI-safe test command was also run with local binaries but reported 24 failures across 11 pre-existing suites, including stale assertions for prior CMS styling, email configuration, secret-dependent database behavior, and SEO shell expectations. Those failures do not exercise the modified Gemini fallback or the semantic CSS utilities; the focused compilation and browser checks above passed.
