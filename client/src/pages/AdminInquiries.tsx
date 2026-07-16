import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Inbox, Loader2, Mail, Phone, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminInquiries() {
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "closed">("all");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const list = trpc.inquiry.list.useQuery();
  const detail = trpc.inquiry.detail.useQuery({ id: selectedId ?? 0 }, { enabled: Boolean(selectedId) });

  const filtered = useMemo(() => (list.data ?? []).filter(inquiry => {
    const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [inquiry.name, inquiry.email, inquiry.phone, inquiry.serviceType, inquiry.message]
      .some(value => value.toLowerCase().includes(needle));
    return matchesStatus && matchesSearch;
  }), [list.data, search, statusFilter]);

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!detail.data) return;
    setSubject(`Re: Your NYC Cleaning ${detail.data.inquiry.inquiryType === "quote" ? "quote request" : "inquiry"}`);
    setMessage("");
  }, [detail.data?.inquiry.id]);

  const statusMutation = trpc.inquiry.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.inquiry.list.invalidate(), utils.inquiry.detail.invalidate()]);
      toast.success("Inquiry status updated.");
    },
    onError: () => toast.error("The status could not be updated. Please try again."),
  });

  const replyMutation = trpc.inquiry.reply.useMutation({
    onSuccess: async () => {
      setMessage("");
      await Promise.all([utils.inquiry.list.invalidate(), utils.inquiry.detail.invalidate()]);
      toast.success("Reply sent and saved to the inquiry history.");
    },
    onError: error => toast.error(error.message || "The reply could not be sent. Please try again."),
  });

  const selected = detail.data?.inquiry;
  const responses = detail.data?.responses ?? [];
  return (
    <section className="admin-workspace crm-workspace">
      <header className="admin-page-heading">
        <div><p className="admin-eyebrow">Contact CRM</p><h1>Website inquiries</h1><p>Review every contact and quote request, track progress, and reply by email without leaving the CMS.</p></div>
        <Button variant="outline" onClick={() => void list.refetch()} disabled={list.isFetching}><RefreshCw className={list.isFetching ? "spin" : ""} /> Refresh</Button>
      </header>

      <div className="crm-toolbar" aria-label="Inquiry filters">
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, phone, or message" aria-label="Search inquiries" />
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter by status">
          <option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
        </select>
      </div>

      <div className="crm-grid">
        <aside className="crm-list" aria-label="Inquiry list">
          {list.isLoading ? <div className="crm-state"><Loader2 className="spin" /> Loading inquiries…</div> : null}
          {list.error ? <div className="crm-state crm-state-error">Inquiries could not be loaded. Please refresh the page.</div> : null}
          {!list.isLoading && !list.error && filtered.length === 0 ? <div className="crm-state"><Inbox /> No matching inquiries.</div> : null}
          {filtered.map(inquiry => (
            <button key={inquiry.id} type="button" className={selectedId === inquiry.id ? "crm-list-item is-active" : "crm-list-item"} onClick={() => setSelectedId(inquiry.id)}>
              <span className="crm-list-top"><strong>{inquiry.name}</strong><time>{new Date(inquiry.createdAt).toLocaleDateString()}</time></span>
              <span>{inquiry.serviceType}</span>
              <span className="crm-list-email">{inquiry.email}</span>
              <em data-status={inquiry.status}>{inquiry.status}</em>
            </button>
          ))}
        </aside>

        <article className="crm-detail">
          {!selectedId ? <div className="crm-state"><Inbox /> Select an inquiry to view its details.</div> : null}
          {detail.isLoading ? <div className="crm-state"><Loader2 className="spin" /> Loading details…</div> : null}
          {detail.error ? <div className="crm-state crm-state-error">This inquiry could not be loaded.</div> : null}
          {selected ? <>
            <div className="crm-contact-heading">
              <div><p className="admin-eyebrow">Inquiry #{selected.id}</p><h2>{selected.name}</h2><p>{selected.serviceType} · {formatDate(selected.createdAt)}</p></div>
              <label className="crm-status"><span>Status</span><select value={selected.status} disabled={statusMutation.isPending} onChange={event => statusMutation.mutate({ id: selected.id, status: event.target.value as "new" | "contacted" | "closed" })}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
            </div>
            <div className="crm-contact-links"><a href={`mailto:${selected.email}`}><Mail />{selected.email}</a><a href={`tel:+1${selected.phone}`}><Phone />{formatPhone(selected.phone)}</a></div>
            <dl className="crm-metadata"><div><dt>Form type</dt><dd>{selected.inquiryType === "quote" ? "Quote request" : "Contact inquiry"}</dd></div><div><dt>Source page</dt><dd>{selected.sourcePath}</dd></div><div><dt>Notification</dt><dd>{selected.notificationStatus}</dd></div></dl>
            <section className="crm-message"><h3>Customer message</h3><p>{selected.message}</p></section>

            <section className="crm-history"><h3>Response history</h3>{responses.length === 0 ? <p className="crm-muted">No replies have been sent from the CMS.</p> : responses.map(response => <div className="crm-history-item" key={response.id}><div><strong>{response.subject}</strong><span>{formatDate(response.createdAt)} · {response.senderName}</span></div><em data-status={response.deliveryStatus}>{response.deliveryStatus === "sent" ? <CheckCircle2 /> : null}{response.deliveryStatus}</em><p>{response.message}</p></div>)}</section>

            <form className="crm-reply" onSubmit={event => { event.preventDefault(); if (subject.trim().length >= 3 && message.trim().length >= 10) replyMutation.mutate({ id: selected.id, subject: subject.trim(), message: message.trim() }); }}>
              <div><h3>Reply by email</h3><p>The reply will be sent to {selected.email} and saved here.</p></div>
              <label><span>Subject</span><Input value={subject} onChange={event => setSubject(event.target.value)} required minLength={3} maxLength={320} /></label>
              <label><span>Message</span><Textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={10} maxLength={10000} rows={7} placeholder={`Write a response to ${selected.name}…`} /></label>
              <Button type="submit" disabled={replyMutation.isPending || subject.trim().length < 3 || message.trim().length < 10}>{replyMutation.isPending ? <Loader2 className="spin" /> : <Send />} {replyMutation.isPending ? "Sending…" : "Send reply"}</Button>
            </form>
          </> : null}
        </article>
      </div>
    </section>
  );
}
