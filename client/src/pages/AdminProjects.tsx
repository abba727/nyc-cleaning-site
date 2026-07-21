import { type ChangeEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, FileText, Loader2, MapPin, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

type ProjectLocationDraft = {
  address: string;
  city: string;
  state: string;
  zip: string;
  label?: string;
};

type SourceType = "csv" | "xlsx" | "xls";

type ImportPreview = {
  filename: string;
  sourceType: SourceType;
  sourceRowCount: number;
  validRows: ProjectLocationDraft[];
  invalidRowNumbers: number[];
};

const emptyLocation: ProjectLocationDraft = {
  address: "",
  city: "",
  state: "NY",
  zip: "",
  label: "",
};

const columnAliases = {
  address: ["address", "street", "streetaddress", "addressline1", "address1"],
  city: ["city", "town", "municipality"],
  state: ["state", "province", "region"],
  zip: ["zip", "zipcode", "postalcode", "postcode"],
  label: ["label", "name", "property", "propertyname", "project", "projectname"],
};

const LOCATIONS_PER_PAGE = 25;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function sourceTypeForFile(file: File): SourceType | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv" || extension === "xlsx" || extension === "xls") return extension;
  return null;
}

function extractLocation(row: Record<string, unknown>): ProjectLocationDraft {
  const columns = Object.entries(row).reduce<Record<string, unknown>>((normalized, [key, value]) => {
    normalized[normalizeHeader(key)] = value;
    return normalized;
  }, {});
  const read = (aliases: readonly string[]) => {
    for (const alias of aliases) {
      const value = cellText(columns[alias]);
      if (value) return value;
    }
    return "";
  };

  return {
    address: read(columnAliases.address),
    city: read(columnAliases.city),
    state: read(columnAliases.state),
    zip: read(columnAliases.zip).replace(/\.0$/, ""),
    label: read(columnAliases.label),
  };
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fullAddress(location: { address: string; city: string; state: string; zip: string }) {
  return `${location.address}, ${location.city}, ${location.state} ${location.zip}`;
}

function isCompleteProjectLocation(row: ProjectLocationDraft) {
  return row.address.length >= 2 && row.city.length >= 2 && row.state.length >= 2 && row.zip.length >= 3;
}

export default function AdminProjects() {
  const utils = trpc.useUtils();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [manualLocation, setManualLocation] = useState<ProjectLocationDraft>(emptyLocation);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLocation, setEditingLocation] = useState<ProjectLocationDraft>(emptyLocation);
  const [locationPage, setLocationPage] = useState(1);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<number>>(() => new Set());

  const locations = trpc.projects.adminList.useQuery();
  const imports = trpc.projects.listImports.useQuery();

  const invalidateProjects = async () => {
    await Promise.all([
      utils.projects.adminList.invalidate(),
      utils.projects.listImports.invalidate(),
      utils.projects.listLocations.invalidate(),
    ]);
  };

  const importMutation = trpc.projects.importRows.useMutation({
    onSuccess: async result => {
      setPreview(null);
      await invalidateProjects();
      toast.success(`${result.importedCount} service location${result.importedCount === 1 ? "" : "s"} imported.`);
    },
    onError: error => toast.error(error.message || "The spreadsheet could not be imported."),
  });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: async () => {
      setManualLocation(emptyLocation);
      await invalidateProjects();
      toast.success("Service location added.");
    },
    onError: error => toast.error(error.message || "The service location could not be added."),
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: async () => {
      setEditingId(null);
      setEditingLocation(emptyLocation);
      await invalidateProjects();
      toast.success("Service location updated.");
    },
    onError: error => toast.error(error.message || "The service location could not be updated."),
  });

  const removeMutation = trpc.projects.remove.useMutation({
    onSuccess: async () => {
      await invalidateProjects();
      toast.success("Service location removed.");
    },
    onError: error => toast.error(error.message || "The service location could not be removed."),
  });

  const removeManyMutation = trpc.projects.removeMany.useMutation({
    onSuccess: async result => {
      setSelectedLocationIds(new Set());
      await invalidateProjects();
      toast.success(`${result.removedCount} service location${result.removedCount === 1 ? "" : "s"} removed.`);
    },
    onError: error => toast.error(error.message || "The selected service locations could not be removed."),
  });

  const activeCount = useMemo(
    () => (locations.data ?? []).filter(location => location.isActive).length,
    [locations.data],
  );
  const locationCount = locations.data?.length ?? 0;
  const locationPageCount = Math.max(1, Math.ceil(locationCount / LOCATIONS_PER_PAGE));
  const currentLocationPage = Math.min(locationPage, locationPageCount);
  const paginatedLocations = useMemo(() => {
    const start = (currentLocationPage - 1) * LOCATIONS_PER_PAGE;
    return (locations.data ?? []).slice(start, start + LOCATIONS_PER_PAGE);
  }, [currentLocationPage, locations.data]);
  const allCurrentPageSelected = paginatedLocations.length > 0 && paginatedLocations.every(location => selectedLocationIds.has(location.id));
  const locationRangeStart = locationCount === 0 ? 0 : (currentLocationPage - 1) * LOCATIONS_PER_PAGE + 1;
  const locationRangeEnd = Math.min(currentLocationPage * LOCATIONS_PER_PAGE, locationCount);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const sourceType = sourceTypeForFile(file);
    if (!sourceType) {
      toast.error("Choose a CSV, XLS, or XLSX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Keep source files at 5 MB or smaller.");
      return;
    }

    setIsParsing(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("The spreadsheet does not contain a worksheet.");
      const sheet = workbook.Sheets[firstSheetName];
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (sourceRows.length === 0) throw new Error("The spreadsheet does not contain any address rows.");
      if (sourceRows.length > 5000) throw new Error("Import up to 5,000 address rows per file.");

      const headers = Object.keys(sourceRows[0]).map(normalizeHeader);
      const missingColumns = ["address", "city", "state", "zip"].filter(required =>
        !columnAliases[required as keyof typeof columnAliases].some(alias => headers.includes(alias)),
      );
      if (missingColumns.length > 0) {
        throw new Error(`Missing required column${missingColumns.length === 1 ? "" : "s"}: ${missingColumns.join(", ")}.`);
      }

      const validRows: ProjectLocationDraft[] = [];
      const invalidRowNumbers: number[] = [];
      sourceRows.forEach((sourceRow, index) => {
        const row = extractLocation(sourceRow);
        if (!isCompleteProjectLocation(row)) {
          invalidRowNumbers.push(index + 2);
          return;
        }
        validRows.push(row);
      });
      if (validRows.length === 0) throw new Error("No rows contained a complete address, city, state, and ZIP code.");

      setPreview({
        filename: file.name,
        sourceType,
        sourceRowCount: sourceRows.length,
        validRows,
        invalidRowNumbers,
      });
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : "The spreadsheet could not be read.");
    } finally {
      setIsParsing(false);
    }
  }

  function submitImport() {
    if (!preview) return;
    importMutation.mutate({
      filename: preview.filename,
      sourceType: preview.sourceType,
      sourceRowCount: preview.sourceRowCount,
      rows: preview.validRows,
    });
  }

  function submitManualLocation() {
    if (!manualLocation.address || !manualLocation.city || !manualLocation.state || !manualLocation.zip) return;
    createMutation.mutate({
      ...manualLocation,
      label: manualLocation.label || undefined,
    });
  }

  function startEditing(location: NonNullable<typeof locations.data>[number]) {
    setEditingId(location.id);
    setEditingLocation({
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      label: location.label || "",
    });
  }

  function toggleActive(location: NonNullable<typeof locations.data>[number]) {
    updateMutation.mutate({
      id: location.id,
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      label: location.label || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
      isActive: !location.isActive,
    });
  }

  function toggleSelectedLocation(id: number) {
    setSelectedLocationIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPageSelection() {
    setSelectedLocationIds(current => {
      const next = new Set(current);
      if (allCurrentPageSelected) paginatedLocations.forEach(location => next.delete(location.id));
      else paginatedLocations.forEach(location => next.add(location.id));
      return next;
    });
  }

  function removeSelectedLocations() {
    const ids = Array.from(selectedLocationIds);
    if (ids.length === 0) return;
    const noun = ids.length === 1 ? "service location" : "service locations";
    if (window.confirm(`Remove ${ids.length} selected ${noun}? This cannot be undone.`)) {
      removeManyMutation.mutate({ ids });
    }
  }

  return (
    <section className="admin-workspace space-y-8">
      <header className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Service Area</p>
          <h1>Projects &amp; locations</h1>
          <p>Maintain the service-address list used to place markers on the public Service Area map. Import a spreadsheet or add a location directly.</p>
        </div>
        <Button variant="outline" onClick={() => void Promise.all([locations.refetch(), imports.refetch()])} disabled={locations.isFetching || imports.isFetching}>
          <RefreshCw className={locations.isFetching || imports.isFetching ? "spin" : ""} /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active map markers</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{locations.isLoading ? "—" : activeCount}</p>
          <p className="mt-1 text-sm text-slate-600">Addresses currently visible to visitors.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">All locations</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{locations.isLoading ? "—" : locations.data?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-600">Including inactive records kept for reference.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Import batches</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{imports.isLoading ? "—" : imports.data?.length ?? 0}</p>
          <p className="mt-1 text-sm text-slate-600">A simple audit trail for each uploaded file.</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900"><Upload className="size-5 text-slate-700" /><h2 className="text-xl font-semibold">Import service addresses</h2></div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload a CSV or Excel file with <strong>address</strong>, <strong>city</strong>, <strong>state</strong>, and <strong>zip</strong> columns. Optional <strong>label</strong>, <strong>name</strong>, or <strong>property</strong> columns are preserved for internal reference.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-within:ring-2 focus-within:ring-slate-500 focus-within:ring-offset-2">
              {isParsing ? <Loader2 className="size-4 spin" /> : <FileText className="size-4" />}
              {isParsing ? "Reading file…" : "Choose file"}
              <input className="sr-only" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => void handleFileSelection(event)} disabled={isParsing || importMutation.isPending} />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Before you import</p>
            <p className="mt-1 leading-6">The first worksheet is used. Review the preview before saving. Files are parsed in your browser; only normalized address rows are sent to the CMS.</p>
          </div>

          {preview ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-950"><CheckCircle2 className="size-5" /><h3 className="font-semibold">{preview.filename}</h3></div>
                <p className="mt-1 text-sm text-emerald-900/80">{preview.validRows.length} ready to import from {preview.sourceRowCount} source row{preview.sourceRowCount === 1 ? "" : "s"}.</p>
              </div>
              <Button variant="outline" className="border-emerald-300 bg-white text-emerald-950 hover:bg-emerald-100" onClick={() => setPreview(null)} disabled={importMutation.isPending}><X className="size-4" /> Clear</Button>
            </div>
            {preview.invalidRowNumbers.length > 0 ? <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100/80 px-3 py-2 text-sm leading-5 text-amber-950"><AlertCircle className="mt-0.5 size-4 shrink-0" />{preview.invalidRowNumbers.length} incomplete row{preview.invalidRowNumbers.length === 1 ? " was" : "s were"} excluded. Rows: {preview.invalidRowNumbers.slice(0, 12).join(", ")}{preview.invalidRowNumbers.length > 12 ? "…" : ""}</p> : null}
            <div className="mt-4 overflow-x-auto rounded-lg border border-emerald-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-emerald-50 text-xs uppercase tracking-wide text-emerald-950"><tr><th className="px-3 py-2 font-semibold">Address</th><th className="px-3 py-2 font-semibold">City</th><th className="px-3 py-2 font-semibold">State</th><th className="px-3 py-2 font-semibold">ZIP</th></tr></thead>
                <tbody className="divide-y divide-emerald-100">{preview.validRows.slice(0, 5).map((row, index) => <tr key={`${row.address}-${row.zip}-${index}`} className="text-slate-700"><td className="px-3 py-2">{row.address}</td><td className="px-3 py-2">{row.city}</td><td className="px-3 py-2">{row.state}</td><td className="px-3 py-2">{row.zip}</td></tr>)}</tbody>
              </table>
            </div>
            {preview.validRows.length > 5 ? <p className="mt-2 text-xs text-emerald-900/80">Showing the first five ready-to-import locations.</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={() => setPreview(null)} disabled={importMutation.isPending}>Cancel</Button><Button onClick={submitImport} disabled={importMutation.isPending}>{importMutation.isPending ? <Loader2 className="spin" /> : <Upload />} {importMutation.isPending ? "Importing…" : `Import ${preview.validRows.length} location${preview.validRows.length === 1 ? "" : "s"}`}</Button></div>
          </div> : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900"><Plus className="size-5 text-slate-700" /><h2 className="text-xl font-semibold">Add one location</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use this for a one-off service address without preparing a spreadsheet.</p>
          <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); submitManualLocation(); }}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Street address</span><Input value={manualLocation.address} onChange={event => setManualLocation(current => ({ ...current, address: event.target.value }))} required maxLength={512} placeholder="123 Example Avenue" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>City</span><Input value={manualLocation.city} onChange={event => setManualLocation(current => ({ ...current, city: event.target.value }))} required maxLength={160} placeholder="New York" /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>State</span><Input value={manualLocation.state} onChange={event => setManualLocation(current => ({ ...current, state: event.target.value }))} required maxLength={64} placeholder="NY" /></label></div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>ZIP code</span><Input value={manualLocation.zip} onChange={event => setManualLocation(current => ({ ...current, zip: event.target.value }))} required maxLength={24} placeholder="10001" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Internal label <em className="font-normal text-slate-500">(optional)</em></span><Input value={manualLocation.label} onChange={event => setManualLocation(current => ({ ...current, label: event.target.value }))} maxLength={255} placeholder="Chelsea residential portfolio" /></label>
            <Button className="mt-2 w-full" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Loader2 className="spin" /> : <MapPin />} {createMutation.isPending ? "Adding…" : "Add location"}</Button>
          </form>
        </article>
      </div>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <h2 className="text-sm font-semibold text-slate-900">Properties</h2>
          <span className="text-xs font-medium text-slate-500">{locationCount}</span>
        </div>
        {locations.isLoading ? <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-slate-600"><Loader2 className="spin" /> Loading locations…</div> : null}
        {locations.error ? <div className="px-4 py-8 text-sm text-red-700">Locations could not be loaded. Refresh the page and try again.</div> : null}
        {!locations.isLoading && !locations.error && locationCount === 0 ? <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-slate-600"><MapPin className="size-7 text-slate-400" /><p className="font-medium text-slate-800">No service locations yet.</p><p className="max-w-md text-sm">Import a CSV or Excel sheet above, or add an address manually. Active records will appear on the Service Area map.</p></div> : null}
        {!locations.isLoading && !locations.error && locationCount > 0 ? <>
          <div className="flex flex-col gap-1.5 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">{locationRangeStart}–{locationRangeEnd} of {locationCount}</p>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={toggleCurrentPageSelection} disabled={removeManyMutation.isPending}>{allCurrentPageSelected ? "Clear page" : "Select page"}</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setSelectedLocationIds(new Set((locations.data ?? []).map(location => location.id)))} disabled={removeManyMutation.isPending || selectedLocationIds.size === locationCount}>All {locationCount}</Button>
              {selectedLocationIds.size > 0 ? <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setSelectedLocationIds(new Set())} disabled={removeManyMutation.isPending}>Clear</Button> : null}
              <Button type="button" variant="outline" size="sm" className="h-7 border-red-200 px-2 text-[11px] text-red-700 hover:bg-red-50 hover:text-red-800" onClick={removeSelectedLocations} disabled={selectedLocationIds.size === 0 || removeManyMutation.isPending}>{removeManyMutation.isPending ? <Loader2 className="size-3 spin" /> : <Trash2 className="size-3" />} Remove{selectedLocationIds.size > 0 ? ` ${selectedLocationIds.size}` : ""}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="w-8 px-2.5 py-1.5"><span className="sr-only">Select</span></th><th scope="col" className="px-2 py-1.5 font-semibold">Property</th><th scope="col" className="whitespace-nowrap px-2 py-1.5 font-semibold">Map</th><th scope="col" className="px-2.5 py-1.5 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{paginatedLocations.map(location => editingId === location.id ? <tr key={location.id} className="bg-slate-50/70"><td colSpan={4} className="p-3"><form className="grid gap-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_100px_auto]" onSubmit={event => { event.preventDefault(); updateMutation.mutate({ id: location.id, ...editingLocation, label: editingLocation.label || undefined, latitude: location.latitude, longitude: location.longitude, isActive: location.isActive }); }}><Input className="h-9" value={editingLocation.address} onChange={event => setEditingLocation(current => ({ ...current, address: event.target.value }))} aria-label="Street address" required maxLength={512} /><Input className="h-9" value={editingLocation.city} onChange={event => setEditingLocation(current => ({ ...current, city: event.target.value }))} aria-label="City" required maxLength={160} /><Input className="h-9" value={editingLocation.state} onChange={event => setEditingLocation(current => ({ ...current, state: event.target.value }))} aria-label="State" required maxLength={64} /><Input className="h-9" value={editingLocation.zip} onChange={event => setEditingLocation(current => ({ ...current, zip: event.target.value }))} aria-label="ZIP code" required maxLength={24} /><div className="flex gap-2"><Button className="h-9 px-3 text-xs" type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="spin" /> : <CheckCircle2 className="size-3.5" />} Save</Button><Button className="h-9 px-3 text-xs" type="button" variant="outline" onClick={() => setEditingId(null)} disabled={updateMutation.isPending}>Cancel</Button></div><label className="grid gap-1 text-xs font-medium text-slate-700 xl:col-span-4"><span>Internal label <em className="font-normal text-slate-500">(optional)</em></span><Input className="h-9" value={editingLocation.label} onChange={event => setEditingLocation(current => ({ ...current, label: event.target.value }))} maxLength={255} /></label></form></td></tr> : <tr key={location.id} className="hover:bg-slate-50/80"><td className="px-2.5 py-1.5 align-middle"><input type="checkbox" className="size-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500" checked={selectedLocationIds.has(location.id)} onChange={() => toggleSelectedLocation(location.id)} disabled={removeManyMutation.isPending} aria-label={`Select ${fullAddress(location)}`} /></td><td className="min-w-[320px] px-2 py-1.5 align-middle"><p className="truncate font-medium leading-4 text-slate-900" title={fullAddress(location)}>{location.label ? `${location.label} · ${fullAddress(location)}` : fullAddress(location)}</p></td><td className="whitespace-nowrap px-2 py-1.5 align-middle"><span className={location.isActive ? "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800" : "rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"}>{location.isActive ? "Visible" : "Hidden"}</span></td><td className="whitespace-nowrap px-2.5 py-1.5 align-middle text-right"><div className="inline-flex gap-1"><Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" aria-label={location.isActive ? "Hide from map" : "Show on map"} title={location.isActive ? "Hide from map" : "Show on map"} onClick={() => toggleActive(location)} disabled={updateMutation.isPending || removeManyMutation.isPending}>{location.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button><Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" aria-label="Edit property" title="Edit property" onClick={() => startEditing(location)} disabled={updateMutation.isPending || removeMutation.isPending || removeManyMutation.isPending}><Pencil className="size-3.5" /></Button><Button type="button" variant="outline" size="sm" className="h-7 w-7 border-red-200 p-0 text-red-700 hover:bg-red-50 hover:text-red-800" aria-label="Remove property" title="Remove property" onClick={() => { if (window.confirm(`Remove ${fullAddress(location)}? This cannot be undone.`)) removeMutation.mutate({ id: location.id }); }} disabled={removeMutation.isPending || removeManyMutation.isPending || updateMutation.isPending}><Trash2 className="size-3.5" /></Button></div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">Page {currentLocationPage} of {locationPageCount}</p>
            <div className="flex gap-1.5"><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setLocationPage(page => Math.max(1, page - 1))} disabled={currentLocationPage === 1}>Previous</Button><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setLocationPage(page => Math.min(locationPageCount, page + 1))} disabled={currentLocationPage === locationPageCount}>Next</Button></div>
          </div>
        </> : null}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Import history</h2><p className="mt-1 text-sm text-slate-600">A record of each spreadsheet processed by the Projects workspace.</p></div>
        {imports.isLoading ? <div className="flex items-center justify-center gap-2 px-6 py-12 text-slate-600"><Loader2 className="spin" /> Loading import history…</div> : null}
        {!imports.isLoading && (imports.data?.length ?? 0) === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-600">No spreadsheets have been imported yet.</p> : null}
        {!imports.isLoading && (imports.data?.length ?? 0) > 0 ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-semibold">File</th><th className="px-6 py-3 font-semibold">Imported</th><th className="px-6 py-3 font-semibold">Skipped</th><th className="px-6 py-3 font-semibold">Status</th><th className="px-6 py-3 font-semibold">Processed</th></tr></thead><tbody className="divide-y divide-slate-100">{imports.data?.map(batch => <tr key={batch.id}><td className="px-6 py-4 font-medium text-slate-900">{batch.filename}<span className="ml-2 text-xs font-normal uppercase text-slate-400">{batch.sourceType}</span>{batch.errorSummary ? <p className="mt-1 max-w-lg text-xs font-normal text-slate-500">{batch.errorSummary}</p> : null}</td><td className="px-6 py-4 text-slate-700">{batch.importedCount} of {batch.rowCount}</td><td className="px-6 py-4 text-slate-700">{batch.skippedCount}</td><td className="px-6 py-4"><span className={batch.status === "completed" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" : batch.status === "partial" ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800"}>{batch.status}</span></td><td className="px-6 py-4 text-slate-600">{formatDate(batch.createdAt)}</td></tr>)}</tbody></table></div> : null}
      </article>
    </section>
  );
}
