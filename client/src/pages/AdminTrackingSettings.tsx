import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { BarChart3, Loader2, Save, ShieldCheck, Tag } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function normalizeTrackingId(value: string) {
  return value.trim().toUpperCase() || null;
}

export default function AdminTrackingSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.siteSettings.get.useQuery(undefined, {
    enabled: user?.role === "admin",
    retry: false,
  });
  const [measurementId, setMeasurementId] = useState("");
  const [containerId, setContainerId] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/admin");
  }, [setLocation, user]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setMeasurementId(settingsQuery.data.googleAnalyticsMeasurementId || "");
    setContainerId(settingsQuery.data.googleTagManagerContainerId || "");
  }, [settingsQuery.data]);

  const saveSettings = trpc.siteSettings.update.useMutation({
    onSuccess: async ({ settings }) => {
      setMeasurementId(settings.googleAnalyticsMeasurementId || "");
      setContainerId(settings.googleTagManagerContainerId || "");
      await utils.siteSettings.get.invalidate();
      toast.success("Tracking settings saved.");
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    saveSettings.mutate({
      googleAnalyticsMeasurementId: normalizeTrackingId(measurementId),
      googleTagManagerContainerId: normalizeTrackingId(containerId),
    });
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-1 sm:p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#14846f]">Administration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tracking settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Connect the public website to Google Analytics 4 and Google Tag Manager without editing code.</p>
        </div>
        <Badge className="w-fit bg-[#e2f5ef] text-[#106c5c] hover:bg-[#e2f5ef]"><ShieldCheck className="mr-1 h-3 w-3" />Admin only</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#14846f]" />Google Analytics 4</CardTitle>
          <CardDescription>Paste the Measurement ID from your GA4 web data stream. It begins with <strong>G-</strong>.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="ga4-measurement-id">GA4 Measurement ID</Label>
              <Input
                id="ga4-measurement-id"
                className="h-11 bg-white font-mono uppercase"
                value={measurementId}
                onChange={event => setMeasurementId(event.target.value.toUpperCase())}
                placeholder="G-XXXXXXXXXX"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <p className="text-xs leading-5 text-muted-foreground">Leave this blank to remove the direct GA4 tag. Your Measurement ID is a public website identifier, not a private API secret.</p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2" htmlFor="gtm-container-id"><Tag className="h-4 w-4 text-[#14846f]" />Google Tag Manager container ID</Label>
              <Input
                id="gtm-container-id"
                className="h-11 bg-white font-mono uppercase"
                value={containerId}
                onChange={event => setContainerId(event.target.value.toUpperCase())}
                placeholder="GTM-XXXXXXX"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <p className="text-xs leading-5 text-muted-foreground">Paste your web container ID. When a container is set, its standard Google Tag Manager snippet is installed on every public page.</p>
            </div>

            <div className="rounded-xl border border-[#bfe5da] bg-[#f3fbf8] px-4 py-3 text-sm leading-6 text-[#175b4f]">
              <strong>How both settings work:</strong> If you add a Tag Manager container, use Google Tag Manager to publish your GA4 tag. The direct GA4 tag is then withheld to prevent duplicate page-view tracking. If no container is supplied, a saved GA4 Measurement ID is installed directly.
            </div>

            {settingsQuery.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading current settings…</p> : null}
            {settingsQuery.error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{settingsQuery.error.message}</p> : null}
            {saveSettings.error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveSettings.error.message}</p> : null}

            <Button className="h-11 bg-[#14846f] text-white hover:bg-[#106c5c]" disabled={settingsQuery.isLoading || saveSettings.isPending} type="submit">
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveSettings.isPending ? "Saving settings…" : "Save tracking settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
