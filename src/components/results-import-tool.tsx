"use client";

import { useActionState, useState, useTransition } from "react";
import { applyResultsImportAction } from "@/lib/admin-actions";
import { TextInput } from "@/components/ui";
import type { ResultsImportPreviewItem } from "@/lib/result-import";

type Division = {
  id: string;
  name: string;
  usauUrl: string | null;
};

type PreviewPayload = {
  draft: unknown;
  preview: {
    counts: Record<string, number>;
    items: ResultsImportPreviewItem[];
  };
};

type ApplyState =
  | {
      ok: false;
    }
  | {
      ok: true;
      created: number;
      updated: number;
      skippedManual: number;
      skippedUnmatched: number;
      scheduledOnly: number;
    };

const initialApplyState: ApplyState = { ok: false };

export function ResultsImportTool({ eventId, divisions }: { eventId: string; divisions: Division[] }) {
  const [urls, setUrls] = useState<Record<string, string>>(
    Object.fromEntries(divisions.map((division) => [division.id, division.usauUrl ?? ""])),
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisions[0]?.id ?? "");
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [applyState, formAction, applyPending] = useActionState(applyImport, initialApplyState);
  const selectedDivision = divisions.find((division) => division.id === selectedDivisionId);
  const selectedUrl = selectedDivisionId ? urls[selectedDivisionId] ?? "" : "";
  const finalImportCount = payload
    ? (payload.preview.counts.NEW_GAME ?? 0) + (payload.preview.counts.UPDATE_RESULT ?? 0) + (payload.preview.counts.MANUAL_CONFLICT ?? 0)
    : 0;

  function preview() {
    if (!selectedDivisionId || !selectedUrl) return;
    setError("");
    setPayload(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/import/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, divisionId: selectedDivisionId, url: selectedUrl }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not preview results import.");
        return;
      }
      setPayload(body);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[0.5fr_1fr_auto]">
        <label className="block text-sm font-semibold">
          Division
          <select
            value={selectedDivisionId}
            onChange={(event) => {
              setSelectedDivisionId(event.target.value);
              setPayload(null);
            }}
            className="focus-ring mt-1 min-h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          USAU results URL
          <TextInput
            value={selectedUrl}
            onChange={(event) => {
              setUrls((current) => ({ ...current, [selectedDivisionId]: event.target.value }));
              setPayload(null);
            }}
            placeholder="https://play.usaultimate.org/..."
            className="mt-1"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={preview}
            disabled={pending || !selectedDivisionId || !selectedUrl}
            className="focus-ring min-h-10 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Checking..." : `Import from ${selectedDivision?.name ?? "URL"}`}
          </button>
        </div>
      </div>

      {selectedUrl && (
        <p className="text-xs text-[var(--muted)]">
          From <span className="font-mono">{selectedUrl}</span>
        </p>
      )}
      {pending && <p className="text-sm font-semibold text-[var(--accent)]">Fetching USAU results and building a preview...</p>}
      {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

      {applyState.ok && (
        <div className="rounded-lg border border-[var(--accent)] bg-white p-4 text-sm">
          <p className="font-semibold text-[var(--accent)]">
            Results import saved: {applyState.created} new, {applyState.updated} updated.
          </p>
          <p className="mt-1 text-[var(--muted)]">
            Skipped {applyState.skippedManual} manual override{applyState.skippedManual === 1 ? "" : "s"},{" "}
            {applyState.skippedUnmatched} unmatched game{applyState.skippedUnmatched === 1 ? "" : "s"}, and saw{" "}
            {applyState.scheduledOnly} schedule-only row{applyState.scheduledOnly === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {payload && (
        <form action={formAction} className="space-y-4 rounded-lg border border-[var(--line)] bg-white p-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="divisionId" value={selectedDivisionId} />
          <input type="hidden" name="draft" value={JSON.stringify(payload.draft)} />

          <p className="text-sm font-semibold text-[var(--accent)]">
            Preview ready: {payload.preview.items.length} USAU row{payload.preview.items.length === 1 ? "" : "s"} found. Review the
            changes below, then confirm.
          </p>

          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(payload.preview.counts).map(([label, count]) => (
              <span key={label} className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1">
                {label.replaceAll("_", " ").toLowerCase()}: {count}
              </span>
            ))}
          </div>

          {finalImportCount === 0 && (
            <p className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
              No new final scores found. This usually means the URL is schedule-only, the results are already saved, or USAU has not
              posted final scores yet.
            </p>
          )}

          <div className="max-h-80 overflow-auto rounded-md border border-[var(--line)]">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--panel)] text-left">
                  <th className="p-2">Action</th>
                  <th className="p-2">Round/section</th>
                  <th className="p-2">Imported</th>
                  <th className="p-2">Existing</th>
                </tr>
              </thead>
              <tbody>
                {payload.preview.items.map((item, index) => (
                  <tr key={`${item.sourceGameKey}-${index}`} className="border-b border-[var(--line)] align-top">
                    <td className="p-2 font-semibold">{item.action.replaceAll("_", " ")}</td>
                    <td className="p-2">{item.label}</td>
                    <td className="p-2">{formatResult(item.imported)}</td>
                    <td className="p-2 text-[var(--muted)]">
                      {item.existing ? formatResult(item.existing) : "No existing game"}
                      {item.existing?.manualOverride ? " - manual override" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="overwriteManual" value="true" />
            Overwrite manual results when the import conflicts
          </label>
          <button
            type="submit"
            disabled={applyPending}
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {applyPending ? "Saving results..." : "Confirm import"}
          </button>
        </form>
      )}
    </div>
  );
}

async function applyImport(_: ApplyState, formData: FormData): Promise<ApplyState> {
  const result = await applyResultsImportAction(formData);
  return { ok: true, ...result };
}

function formatResult(result: {
  team1Name?: string;
  team2Name?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  status: string;
}) {
  const teams = `${result.team1Name ?? "TBD"} vs ${result.team2Name ?? "TBD"}`;
  const score =
    result.team1Score == null || result.team2Score == null
      ? result.status === "FINAL"
        ? "final, score missing"
        : "scheduled/no score yet"
      : `${result.team1Score}-${result.team2Score} ${result.status.toLowerCase()}`;
  return `${teams}, ${score}`;
}
