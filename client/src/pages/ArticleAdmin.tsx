import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ARTICLE_BODY_MIN_GENERATION_LENGTH, ARTICLE_GENERATED_WORDS, ARTICLE_SEO_LIMITS, ARTICLE_TOPIC_MAX_LENGTH, ARTICLE_TOPIC_MIN_LENGTH } from "@shared/articleSeo";
import { getArticlePublicationState, type ArticlePublicationState } from "@shared/articleScheduling";
import { canonicalInsightPath, INSIGHT_CANONICAL_ROOT, normalizeArticleSlug } from "@shared/articleUrls";
import { Check, Eye, FilePlus2, ImageUp, Pencil, Search, Sparkles, Trash2 } from "lucide-react";
import { ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type EditorStatus = "draft" | "published";
type EditorFilterStatus = "all" | ArticlePublicationState;
type GeneratedField = "excerpt" | "seoTitle" | "metaDescription";
type GenerationTarget = "article" | GeneratedField;

const GENERATED_FIELD_LABELS: Record<GeneratedField, string> = {
  excerpt: "excerpt",
  seoTitle: "SEO title",
  metaDescription: "meta description",
};

type ArticleFormState = {
  id?: number;
  path: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyText: string;
  seoTitle: string;
  metaDescription: string;
  authorName: string;
  coverImageUrl: string;
  coverImageKey: string | null;
  coverImageAlt: string;
  sourceUrl: string;
  status: EditorStatus;
  publishedAt: Date | null;
};

const EMPTY_FORM: ArticleFormState = {
  path: INSIGHT_CANONICAL_ROOT,
  slug: "",
  title: "",
  excerpt: "",
  bodyText: "",
  seoTitle: "",
  metaDescription: "",
  authorName: "NYC Cleaning",
  coverImageUrl: "",
  coverImageKey: null,
  coverImageAlt: "",
  sourceUrl: "",
  status: "draft",
  publishedAt: null,
};

function blocksToText(blocks: Array<{ type: "h2" | "h3" | "p" | "li"; text: string }> | null | undefined) {
  return (blocks ?? []).map(block => {
    if (block.type === "h2") return `## ${block.text}`;
    if (block.type === "h3") return `### ${block.text}`;
    if (block.type === "li") return `- ${block.text}`;
    return block.text;
  }).join("\n\n");
}

function textToBlocks(value: string) {
  return value.split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
    if (line.startsWith("### ")) return { type: "h3" as const, text: line.slice(4).trim() };
    if (line.startsWith("## ")) return { type: "h2" as const, text: line.slice(3).trim() };
    if (line.startsWith("- ")) return { type: "li" as const, text: line.slice(2).trim() };
    return { type: "p" as const, text: line };
  });
}

function toDateTimeLocalValue(value: Date | null) {
  if (!value) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function publicationLabel(state: ArticlePublicationState) {
  return state === "scheduled" ? "Scheduled" : state === "published" ? "Published" : "Draft";
}

export function coverGenerationErrorMessage(message: string) {
  if (/unexpected token\s*['"]?</i.test(message) || /not valid json/i.test(message) || /<html/i.test(message)) {
    return "The image service returned a temporary invalid response. Please choose Generate image again in a moment.";
  }
  return message || "The image could not be generated. Please try again in a moment.";
}

export default function ArticleAdmin() {
  const utils = trpc.useUtils();
  const articleQuery = trpc.article.adminList.useQuery(undefined, { retry: false });
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EditorFilterStatus>("all");
  const [page, setPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<{ url: string; key: string | null } | null>(null);
  const [urlOverrides, setUrlOverrides] = useState({ slug: false, path: false });
  const [generatingField, setGeneratingField] = useState<GenerationTarget | null>(null);
  const [generationErrors, setGenerationErrors] = useState<Partial<Record<GenerationTarget, string>>>({});
  const perPage = 12;

  const createArticle = trpc.article.create.useMutation({
    onSuccess: async () => {
      toast.success("Article created");
      await utils.article.adminList.invalidate();
      setForm(EMPTY_FORM);
      setImagePrompt("");
      setGeneratedImage(null);
      setUrlOverrides({ slug: false, path: false });
    },
    onError: error => toast.error(error.message),
  });
  const updateArticle = trpc.article.update.useMutation({
    onSuccess: async () => {
      toast.success("Article updated");
      await Promise.all([utils.article.adminList.invalidate(), utils.article.listPublished.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const removeArticle = trpc.article.remove.useMutation({
    onSuccess: async () => {
      toast.success("Article deleted");
      await Promise.all([utils.article.adminList.invalidate(), utils.article.listPublished.invalidate()]);
      setForm(EMPTY_FORM);
    },
    onError: error => toast.error(error.message),
  });
  const uploadCover = trpc.article.uploadCover.useMutation({
    onSuccess: result => {
      setForm(current => ({ ...current, coverImageUrl: result.url, coverImageKey: result.key }));
      toast.success("Cover uploaded");
    },
    onError: error => toast.error(error.message),
  });
  const generateCover = trpc.article.generateCover.useMutation({
    onSuccess: result => {
      setGeneratedImage(result);
      toast.success("Image generated. Review it before using it as the cover.");
    },
    onError: error => toast.error(coverGenerationErrorMessage(error.message)),
  });
  const generateSeoFields = trpc.article.generateSeoFields.useMutation();
  const generateArticleMutation = trpc.article.generateArticle.useMutation();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (articleQuery.data ?? []).filter(article => {
      const matchesStatus = statusFilter === "all" || getArticlePublicationState(article) === statusFilter;
      const matchesText = !needle || article.title.toLowerCase().includes(needle) || article.path.toLowerCase().includes(needle);
      return matchesStatus && matchesText;
    });
  }, [articleQuery.data, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const visibleArticles = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => setPage(1), [query, statusFilter]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const updateField = <K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const updateTitle = (title: string) => {
    setForm(current => {
      const slug = current.id || urlOverrides.slug ? current.slug : normalizeArticleSlug(title);
      const path = current.id || urlOverrides.path ? current.path : canonicalInsightPath(slug);
      return {
        ...current,
        title,
        slug,
        path,
        seoTitle: current.seoTitle || title,
        coverImageAlt: current.coverImageAlt || `${title} — NYC Cleaning insights`,
      };
    });
  };

  const updateSlug = (value: string) => {
    const slug = normalizeArticleSlug(value);
    setUrlOverrides(current => ({ ...current, slug: true }));
    setForm(current => ({
      ...current,
      slug,
      path: urlOverrides.path ? current.path : canonicalInsightPath(slug),
    }));
  };

  const updateCanonicalPath = (value: string) => {
    setUrlOverrides(current => ({ ...current, path: true }));
    updateField("path", value);
  };

  const startNewArticle = () => {
    setForm(EMPTY_FORM);
    setImagePrompt("");
    setGeneratedImage(null);
    setUrlOverrides({ slug: false, path: false });
    setGeneratingField(null);
    setGenerationErrors({});
  };

  const selectArticle = (article: NonNullable<typeof articleQuery.data>[number]) => {
    setForm({
      id: article.id,
      path: article.path,
      slug: article.slug ?? normalizeArticleSlug(article.path.split("/").filter(Boolean).at(-1) ?? article.title),
      title: article.title,
      excerpt: article.excerpt ?? article.description,
      bodyText: blocksToText(article.body ?? article.blocks),
      seoTitle: article.seoTitle ?? article.title,
      metaDescription: article.metaDescription ?? article.description,
      authorName: article.authorName ?? "NYC Cleaning",
      coverImageUrl: article.coverImageUrl,
      coverImageKey: article.coverImageKey ?? null,
      coverImageAlt: article.coverImageAlt,
      sourceUrl: article.sourceUrl ?? "",
      status: article.status,
      publishedAt: article.publishedAt,
    });
    setShowPreview(false);
    setGeneratedImage(null);
    setImagePrompt("");
    setUrlOverrides({ slug: true, path: true });
    setGeneratingField(null);
    setGenerationErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = (status = form.status) => ({
    path: form.path,
    slug: form.slug,
    title: form.title,
    excerpt: form.excerpt,
    body: textToBlocks(form.bodyText),
    seoTitle: form.seoTitle,
    metaDescription: form.metaDescription,
    authorName: form.authorName,
    coverImageUrl: form.coverImageUrl,
    coverImageKey: form.coverImageKey,
    coverImageAlt: form.coverImageAlt,
    sourceUrl: form.sourceUrl,
    status,
    publishedAt: status === "published" ? form.publishedAt ?? new Date() : null,
  });

  const save = (status = form.status) => {
    const publishedAt = status === "published" ? form.publishedAt ?? new Date() : null;
    const payload = { ...buildPayload(status), publishedAt };
    if (form.id) updateArticle.mutate({ id: form.id, ...payload });
    else createArticle.mutate(payload);
    setForm(current => ({ ...current, status, publishedAt }));
  };

  const updateStatus = (status: EditorStatus) => {
    setForm(current => ({
      ...current,
      status,
      publishedAt: status === "published" ? current.publishedAt ?? new Date() : null,
    }));
  };

  const startImageGeneration = () => {
    const body = form.bodyText.trim();
    if (body.length < ARTICLE_BODY_MIN_GENERATION_LENGTH) {
      toast.error(`Write at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters in the Article Body before generating a cover image.`);
      return;
    }
    generateCover.reset();
    generateCover.mutate({
      body,
      direction: imagePrompt.trim() || undefined,
      title: form.title || undefined,
      excerpt: form.excerpt || undefined,
    });
  };

  const generateFromBody = async (target: GeneratedField) => {
    const body = form.bodyText.trim();
    setGenerationErrors(current => ({ ...current, [target]: undefined }));
    if (body.length < ARTICLE_BODY_MIN_GENERATION_LENGTH) {
      setGenerationErrors(current => ({
        ...current,
        [target]: `Write at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters in the Article Body before generating ${GENERATED_FIELD_LABELS[target]}.`,
      }));
      return;
    }

    setGeneratingField(target);
    try {
      const result = await generateSeoFields.mutateAsync({ body });
      setForm(current => ({
        ...current,
        ...(target === "excerpt" ? { excerpt: result.excerpt } : {}),
        ...(target === "seoTitle" ? { seoTitle: result.seoTitle } : {}),
        ...(target === "metaDescription" ? { metaDescription: result.metaDescription } : {}),
      }));
      toast.success(`${GENERATED_FIELD_LABELS[target][0].toUpperCase()}${GENERATED_FIELD_LABELS[target].slice(1)} generated. Review and edit it before saving.`);
    } catch (error) {
      setGenerationErrors(current => ({
        ...current,
        [target]: error instanceof Error ? error.message : "The text could not be generated. Please try again.",
      }));
    } finally {
      setGeneratingField(null);
    }
  };

  const generateArticleFromTopic = async () => {
    const topic = form.bodyText.trim();
    setGenerationErrors(current => ({ ...current, article: undefined }));
    if (topic.length < ARTICLE_TOPIC_MIN_LENGTH) {
      setGenerationErrors(current => ({
        ...current,
        article: `Write at least ${ARTICLE_TOPIC_MIN_LENGTH} characters describing the article topic.`,
      }));
      return;
    }
    if (topic.length > ARTICLE_TOPIC_MAX_LENGTH) {
      setGenerationErrors(current => ({
        ...current,
        article: `Keep the topic or brief under ${ARTICLE_TOPIC_MAX_LENGTH.toLocaleString()} characters.`,
      }));
      return;
    }

    const existingWordCount = topic.split(/\s+/).filter(Boolean).length;
    const looksLikeDraft = existingWordCount >= 40 || /^##\s+/m.test(topic);
    if (looksLikeDraft && !window.confirm("Generate Article will replace the current Article Body. Continue?")) return;

    setGeneratingField("article");
    try {
      const result = await generateArticleMutation.mutateAsync({ topic });
      setForm(current => ({ ...current, bodyText: result.article }));
      toast.success(`Article generated at approximately ${result.wordCount} words. Review and edit it before saving.`);
    } catch (error) {
      setGenerationErrors(current => ({
        ...current,
        article: error instanceof Error ? error.message : "The article could not be generated. Refine the topic and try again.",
      }));
    } finally {
      setGeneratingField(null);
    }
  };

  const generateControl = (target: GeneratedField, guidance: ReactNode) => (
    <>
      <div className="admin-field-footer">
        <small>{guidance}</small>
        <button
          type="button"
          className="admin-generate-link"
          onClick={() => void generateFromBody(target)}
          disabled={generatingField !== null}
          aria-label={`Generate ${GENERATED_FIELD_LABELS[target]} from Article Body`}
        >
          {generatingField === target ? <Spinner className="size-3.5" /> : <Sparkles aria-hidden="true" />}
          {generatingField === target ? "Generating…" : "Generate"}
        </button>
      </div>
      {generationErrors[target] ? <p className="admin-inline-error" role="alert">{generationErrors[target]}</p> : null}
    </>
  );

  const onCoverSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose an image no larger than 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      uploadCover.mutate({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif", base64 });
    };
    reader.readAsDataURL(file);
  };

  const isSaving = createArticle.isPending || updateArticle.isPending;
  const previewBlocks = textToBlocks(form.bodyText);
  const currentPublicationState = getArticlePublicationState(form);
  const isScheduled = currentPublicationState === "scheduled";

  return (
    <div className="admin-workspace">
      <header className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Owner workspace</p>
          <h1>Insights editor</h1>
          <p>Create, edit, preview, and publish articles. Public URLs remain unchanged unless you edit the canonical path.</p>
        </div>
        <div className="admin-heading-actions">
          <Button variant="outline" onClick={() => setShowPreview(value => !value)}><Eye />{showPreview ? "Close preview" : "Preview"}</Button>
          <Button variant="outline" onClick={startNewArticle}><FilePlus2 />New article</Button>
          <Button onClick={() => save()} disabled={isSaving}><Check />{isSaving ? "Saving…" : "Save"}</Button>
        </div>
      </header>

      {showPreview ? (
        <section className="admin-preview" aria-label="Article preview">
          {form.coverImageUrl ? <img src={form.coverImageUrl} alt={form.coverImageAlt} /> : null}
          <p className="admin-eyebrow">Preview · {publicationLabel(currentPublicationState)}</p>
          <h2>{form.title || "Untitled article"}</h2>
          <p className="admin-preview-excerpt">{form.excerpt}</p>
          <div className="admin-preview-body">
            {previewBlocks.map((block, index) => {
              if (block.type === "h2") return <h3 key={index}>{block.text}</h3>;
              if (block.type === "h3") return <h4 key={index}>{block.text}</h4>;
              if (block.type === "li") return <li key={index}>{block.text}</li>;
              return <p key={index}>{block.text}</p>;
            })}
          </div>
        </section>
      ) : null}

      <div className="admin-columns">
        <section className="admin-editor-panel">
          <div className="admin-section-title"><Pencil /><div><h2>{form.id ? "Edit article" : "New article"}</h2><p>{form.id ? `Article #${form.id}` : "Start as a draft, then publish when ready."}</p></div></div>
          <div className="admin-form-grid">
            <div className="admin-field admin-field-wide"><Label htmlFor="article-title">Title</Label><Input id="article-title" value={form.title} onChange={event => updateTitle(event.target.value)} /></div>
            <div className="admin-field"><Label htmlFor="article-slug">Slug</Label><Input id="article-slug" value={form.slug} onChange={event => updateSlug(event.target.value)} placeholder="generated-from-the-title" /><small>{form.id || urlOverrides.slug ? "Custom slug preserved. Edit only when you intentionally want a different URL." : "Generated automatically from the title."}</small></div>
            <div className="admin-field"><Label htmlFor="article-path">Canonical path</Label><Input id="article-path" value={form.path} onChange={event => updateCanonicalPath(event.target.value)} placeholder="/generated-from-the-title/" /><small>{form.id || urlOverrides.path ? "Custom canonical path preserved." : "Generated automatically as /{slug}/ to match existing Insights."}</small></div>
            <div className="admin-field admin-field-wide">
              <Label htmlFor="article-body">Article Body</Label>
              <Textarea id="article-body" className="admin-body-input" rows={18} value={form.bodyText} onChange={event => updateField("bodyText", event.target.value)} placeholder="Enter a topic or short brief, then choose Generate Article. You can also write manually using ## for headings, ### for subheadings, and - for list items." />
              <div className="admin-field-footer">
                <small>Enter a topic or brief to create an approximately {ARTICLE_GENERATED_WORDS.target}-word article with headings. Generated text remains fully editable.</small>
                <button type="button" className="admin-generate-link" onClick={() => void generateArticleFromTopic()} disabled={generatingField !== null} aria-label="Generate article from the topic entered in Article Body">
                  {generatingField === "article" ? <Spinner className="size-3.5" /> : <Sparkles aria-hidden="true" />}
                  {generatingField === "article" ? "Generating…" : "Generate Article"}
                </button>
              </div>
              {generationErrors.article ? <p className="admin-inline-error" role="alert">{generationErrors.article}</p> : null}
            </div>
            <div className="admin-field admin-field-wide"><Label htmlFor="article-excerpt">Excerpt</Label><Textarea id="article-excerpt" className="admin-excerpt-input" rows={8} value={form.excerpt} onChange={event => updateField("excerpt", event.target.value)} placeholder="Generate a summary from the Article Body, or write your own." />{generateControl("excerpt", `Generated excerpts use up to ${ARTICLE_SEO_LIMITS.excerpt} characters and remain fully editable.`)}</div>
            <div className="admin-field"><Label htmlFor="article-author">Author</Label><Input id="article-author" value={form.authorName} onChange={event => updateField("authorName", event.target.value)} /></div>
            <div className="admin-field"><Label htmlFor="article-status">Publishing</Label><select id="article-status" value={form.status} onChange={event => updateStatus(event.target.value as EditorStatus)}><option value="draft">Keep as draft</option><option value="published">Publish or schedule</option></select><small>Current state: <strong>{publicationLabel(currentPublicationState)}</strong></small></div>
            <div className="admin-field"><Label htmlFor="article-published-at">Publish date and time</Label><Input id="article-published-at" type="datetime-local" value={toDateTimeLocalValue(form.publishedAt)} onChange={event => updateField("publishedAt", event.target.value ? new Date(event.target.value) : null)} disabled={form.status === "draft"} /><small>{form.status === "draft" ? "Choose “Publish or schedule” to set a date." : isScheduled ? "This Insight will become public automatically at this time." : "Use the current or an earlier time to publish immediately."}</small></div>
          </div>

          <div className="admin-subsection">
            <h3>Cover image</h3>
            <div className="admin-cover-row">
              {form.coverImageUrl ? <img src={form.coverImageUrl} alt={form.coverImageAlt} /> : <div className="admin-cover-placeholder"><ImageUp /><span>No cover selected</span></div>}
              <div className="admin-cover-controls">
                <Label className="admin-upload-button" htmlFor="article-cover"><ImageUp />{uploadCover.isPending ? "Uploading…" : "Upload image"}</Label>
                <Input id="article-cover" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onCoverSelected} disabled={uploadCover.isPending} />
                <Label htmlFor="article-cover-url">Or image URL</Label><Input id="article-cover-url" value={form.coverImageUrl} onChange={event => updateField("coverImageUrl", event.target.value)} />
                <Label htmlFor="article-cover-alt">Image description</Label><Input id="article-cover-alt" value={form.coverImageAlt} onChange={event => updateField("coverImageAlt", event.target.value)} />
                <div className="admin-ai-image">
                  <Label htmlFor="article-image-prompt">Generate image with AI</Label>
                  <Textarea id="article-image-prompt" rows={5} value={imagePrompt} onChange={event => setImagePrompt(event.target.value)} placeholder="Optional: add a camera angle, mood, location detail, or other visual direction. The article body always determines the main subject." />
                  <Button type="button" variant="outline" onClick={startImageGeneration} disabled={generateCover.isPending}><Sparkles />{generateCover.isPending ? "Generating…" : generatedImage ? "Regenerate image" : "Generate image"}</Button>
                  <small>The existing Article Body determines the image subject. Optional direction only refines the look. The result will not replace the cover until you approve it.</small>
                  {generateCover.error ? <p className="admin-inline-error" role="alert">{coverGenerationErrorMessage(generateCover.error.message)}</p> : null}
                </div>
              </div>
            </div>
            {generatedImage ? <div className="admin-generated-cover"><img src={generatedImage.url} alt="Newly generated article cover preview" /><div><strong>Generated preview</strong><p>Review the image carefully. Select it only if it accurately represents the article and NYC Cleaning.</p><Button type="button" onClick={() => { updateField("coverImageUrl", generatedImage.url); updateField("coverImageKey", generatedImage.key); setGeneratedImage(null); toast.success("Generated image selected as the cover"); }}><Check />Use this image</Button></div></div> : null}
          </div>

          <div className="admin-subsection">
            <h3>Search preview</h3>
            <div className="admin-form-grid">
              <div className="admin-field admin-field-wide"><Label htmlFor="article-seo-title">SEO title</Label><Input id="article-seo-title" value={form.seoTitle} onChange={event => updateField("seoTitle", event.target.value)} placeholder="Generate from the Article Body, or write your own." />{generateControl("seoTitle", `Generated SEO titles use up to ${ARTICLE_SEO_LIMITS.seoTitle} characters.`)}</div>
              <div className="admin-field admin-field-wide"><Label htmlFor="article-meta">Meta description</Label><Textarea id="article-meta" rows={3} value={form.metaDescription} onChange={event => updateField("metaDescription", event.target.value)} placeholder="Generate from the Article Body, or write your own." />{generateControl("metaDescription", `Generated meta descriptions use up to ${ARTICLE_SEO_LIMITS.metaDescription} characters.`)}</div>
            </div>
          </div>

          <div className="admin-editor-actions">
            {form.id ? <Button variant="destructive" onClick={() => { if (window.confirm("Delete this article permanently?")) removeArticle.mutate({ id: form.id! }); }} disabled={removeArticle.isPending}><Trash2 />Delete</Button> : <span />}
            <div><Button variant="outline" onClick={() => save("draft")} disabled={isSaving}>Save draft</Button><Button onClick={() => save("published")} disabled={isSaving}>{isScheduled ? "Schedule article" : form.status === "published" ? "Update published article" : "Publish article"}</Button></div>
          </div>
        </section>

        <aside className="admin-library-panel">
          <div className="admin-library-heading"><div><h2>Article library</h2><p>{filtered.length} of {articleQuery.data?.length ?? 0} articles</p></div></div>
          <div className="admin-library-filters">
            <label className="admin-search"><Search /><Input aria-label="Search articles" placeholder="Search title or path" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as EditorFilterStatus)}><option value="all">All statuses</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option></select>
          </div>
          {articleQuery.isLoading ? <p className="admin-empty">Loading articles…</p> : null}
          {articleQuery.error ? <p className="admin-empty">{articleQuery.error.message}</p> : null}
          {!articleQuery.isLoading && visibleArticles.length === 0 ? <p className="admin-empty">No articles match these filters.</p> : null}
          <div className="admin-article-list">
            {visibleArticles.map(article => (
              <button key={article.id} className={form.id === article.id ? "is-active" : ""} onClick={() => selectArticle(article)}>
                <img src={article.coverImageUrl} alt="" />
                <span><strong>{article.title}</strong><small>{article.path}</small>{(() => { const state = getArticlePublicationState(article); return <em data-status={state}>{publicationLabel(state)}</em>; })()}</span>
              </button>
            ))}
          </div>
          <div className="admin-pagination"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page} of {pageCount}</span><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next</Button></div>
        </aside>
      </div>
    </div>
  );
}
