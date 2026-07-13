import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Eye, FilePlus2, ImageUp, Pencil, Search, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type EditorStatus = "draft" | "published";

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
  path: "/blog/",
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

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

export default function ArticleAdmin() {
  const utils = trpc.useUtils();
  const articleQuery = trpc.article.adminList.useQuery(undefined, { retry: false });
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EditorStatus>("all");
  const [page, setPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const perPage = 12;

  const createArticle = trpc.article.create.useMutation({
    onSuccess: async () => {
      toast.success("Article created");
      await utils.article.adminList.invalidate();
      setForm(EMPTY_FORM);
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (articleQuery.data ?? []).filter(article => {
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
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
      const slug = current.id || current.slug ? current.slug : makeSlug(title);
      const path = current.id || current.path !== "/blog/" ? current.path : `/blog/${slug}/`;
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

  const selectArticle = (article: NonNullable<typeof articleQuery.data>[number]) => {
    setForm({
      id: article.id,
      path: article.path,
      slug: article.slug ?? makeSlug(article.path.split("/").filter(Boolean).at(-1) ?? article.title),
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
    if (form.id) updateArticle.mutate({ id: form.id, ...buildPayload(status) });
    else createArticle.mutate(buildPayload(status));
    setForm(current => ({ ...current, status }));
  };

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
          <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}><FilePlus2 />New article</Button>
          <Button onClick={() => save()} disabled={isSaving}><Check />{isSaving ? "Saving…" : "Save"}</Button>
        </div>
      </header>

      {showPreview ? (
        <section className="admin-preview" aria-label="Article preview">
          {form.coverImageUrl ? <img src={form.coverImageUrl} alt={form.coverImageAlt} /> : null}
          <p className="admin-eyebrow">Preview · {form.status}</p>
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
            <div className="admin-field"><Label htmlFor="article-slug">Slug</Label><Input id="article-slug" value={form.slug} onChange={event => updateField("slug", makeSlug(event.target.value))} /></div>
            <div className="admin-field"><Label htmlFor="article-path">Canonical path</Label><Input id="article-path" value={form.path} onChange={event => updateField("path", event.target.value)} /></div>
            <div className="admin-field admin-field-wide"><Label htmlFor="article-excerpt">Excerpt</Label><Textarea id="article-excerpt" rows={3} value={form.excerpt} onChange={event => updateField("excerpt", event.target.value)} /></div>
            <div className="admin-field admin-field-wide"><Label htmlFor="article-body">Article body</Label><Textarea id="article-body" className="admin-body-input" rows={16} value={form.bodyText} onChange={event => updateField("bodyText", event.target.value)} placeholder="Use ## for section headings, ### for subheadings, and - for list items." /><small>Formatting: <strong>## Heading</strong>, <strong>### Subheading</strong>, <strong>- List item</strong>. Blank lines separate paragraphs.</small></div>
            <div className="admin-field"><Label htmlFor="article-author">Author</Label><Input id="article-author" value={form.authorName} onChange={event => updateField("authorName", event.target.value)} /></div>
            <div className="admin-field"><Label htmlFor="article-status">Status</Label><select id="article-status" value={form.status} onChange={event => updateField("status", event.target.value as EditorStatus)}><option value="draft">Draft</option><option value="published">Published</option></select></div>
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
              </div>
            </div>
          </div>

          <div className="admin-subsection">
            <h3>Search preview</h3>
            <div className="admin-form-grid">
              <div className="admin-field admin-field-wide"><Label htmlFor="article-seo-title">SEO title</Label><Input id="article-seo-title" value={form.seoTitle} onChange={event => updateField("seoTitle", event.target.value)} /></div>
              <div className="admin-field admin-field-wide"><Label htmlFor="article-meta">Meta description</Label><Textarea id="article-meta" rows={3} value={form.metaDescription} onChange={event => updateField("metaDescription", event.target.value)} /></div>
            </div>
          </div>

          <div className="admin-editor-actions">
            {form.id ? <Button variant="destructive" onClick={() => { if (window.confirm("Delete this article permanently?")) removeArticle.mutate({ id: form.id! }); }} disabled={removeArticle.isPending}><Trash2 />Delete</Button> : <span />}
            <div><Button variant="outline" onClick={() => save("draft")} disabled={isSaving}>Save draft</Button><Button onClick={() => save("published")} disabled={isSaving}>{form.status === "published" ? "Update published article" : "Publish article"}</Button></div>
          </div>
        </section>

        <aside className="admin-library-panel">
          <div className="admin-library-heading"><div><h2>Article library</h2><p>{filtered.length} of {articleQuery.data?.length ?? 0} articles</p></div></div>
          <div className="admin-library-filters">
            <label className="admin-search"><Search /><Input aria-label="Search articles" placeholder="Search title or path" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as "all" | EditorStatus)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
          </div>
          {articleQuery.isLoading ? <p className="admin-empty">Loading articles…</p> : null}
          {articleQuery.error ? <p className="admin-empty">{articleQuery.error.message}</p> : null}
          {!articleQuery.isLoading && visibleArticles.length === 0 ? <p className="admin-empty">No articles match these filters.</p> : null}
          <div className="admin-article-list">
            {visibleArticles.map(article => (
              <button key={article.id} className={form.id === article.id ? "is-active" : ""} onClick={() => selectArticle(article)}>
                <img src={article.coverImageUrl} alt="" />
                <span><strong>{article.title}</strong><small>{article.path}</small><em data-status={article.status}>{article.status}</em></span>
              </button>
            ))}
          </div>
          <div className="admin-pagination"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page} of {pageCount}</span><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next</Button></div>
        </aside>
      </div>
    </div>
  );
}
