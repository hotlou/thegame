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
    ? (payload.preview.counts.NEW_GAME ?? 0) +
      (payload.preview.counts.UPDATE_RESULT ?? 0) +
      (payload.preview.counts.MANUAL_CONFLICT ?? 0)
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
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(180px, 0.5fr) minmax(0, 1fr) auto",
        }}
      >
        <label className="tg-label">
          Division
          <select
            value={selectedDivisionId}
            onChange={(event) => {
              setSelectedDivisionId(event.target.value);
              setPayload(null);
            }}
            className="tg-input tg-select"
            style={{ marginTop: 6 }}
          >
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tg-label">
          USAU results URL
          <TextInput
            value={selectedUrl}
            onChange={(event) => {
              setUrls((current) => ({ ...current, [selectedDivisionId]: event.target.value }));
              setPayload(null);
            }}
            placeholder="https://play.usaultimate.org/..."
            style={{ marginTop: 6 }}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            type="button"
            onClick={preview}
            disabled={pending || !selectedDivisionId || !selectedUrl}
            className="tg-btn tg-btn--alt"
          >
            {pending ? "Checking..." : `Import from ${selectedDivision?.name ?? "URL"}`}
          </button>
        </div>
      </div>

      {selectedUrl && (
        <p className="tg-body-sm tg-muted">
          From <span style={{ fontFamily: "var(--font-mono)" }}>{selectedUrl}</span>
        </p>
      )}
      {pending && (
        <p className="tg-body-sm" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
          Fetching USAU results and building a preview...
        </p>
      )}
      {error && (
        <p className="tg-body-sm" style={{ color: "var(--danger)", fontWeight: 600 }}>
          {error}
        </p>
      )}

      {applyState.ok && (
        <div
          style={{
            border: "1px solid var(--accent)",
            borderRadius: 4,
            background: "var(--panel-strong)",
            padding: 14,
          }}
        >
          <p className="tg-label" style={{ color: "var(--accent-ink)" }}>
            Results import saved: {applyState.created} new, {applyState.updated} updated.
          </p>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 4 }}>
            Skipped {applyState.skippedManual} manual override{applyState.skippedManual === 1 ? "" : "s"},{" "}
            {applyState.skippedUnmatched} unmatched game{applyState.skippedUnmatched === 1 ? "" : "s"}, and saw{" "}
            {applyState.scheduledOnly} schedule-only row{applyState.scheduledOnly === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {payload && (
        <form
          action={formAction}
          style={{
            display: "grid",
            gap: 16,
            border: "1px solid var(--line)",
            borderRadius: 4,
            background: "var(--panel-strong)",
            padding: 16,
          }}
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="divisionId" value={selectedDivisionId} />
          <input type="hidden" name="draft" value={JSON.stringify(payload.draft)} />

          <p className="tg-label" style={{ color: "var(--accent-ink)" }}>
            Preview ready: {payload.preview.items.length} USAU row{payload.preview.items.length === 1 ? "" : "s"} found.
            Review the changes below, then confirm.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(payload.preview.counts).map(([label, count]) => (
              <span key={label} className="tg-pill">
                {label.replaceAll("_", " ").toLowerCase()}: {count}
              </span>
            ))}
          </div>

          {finalImportCount === 0 && (
            <p
              className="tg-body-sm tg-muted"
              style={{
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--panel)",
                padding: "8px 12px",
              }}
            >
              No new final scores found. This usually means the URL is schedule-only, the results are already saved, or
              USAU has not posted final scores yet.
            </p>
          )}

          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              border: "1px solid var(--line)",
              borderRadius: 4,
            }}
          >
            <table className="tg-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Round/section</th>
                  <th>Imported</th>
                  <th>Existing</th>
                </tr>
              </thead>
              <tbody>
                {payload.preview.items.map((item, index) => (
                  <tr key={`${item.sourceGameKey}-${index}`}>
                    <td className="tg-strong">{item.action.replaceAll("_", " ")}</td>
                    <td>{item.label}</td>
                    <td>{formatResult(item.imported)}</td>
                    <td className="tg-muted">
                      {item.existing ? formatResult(item.existing) : "No existing game"}
                      {item.existing?.manualOverride ? " - manual override" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="overwriteManual" value="true" />
            Overwrite manual results when the import conflicts
          </label>
          <div>
            <button type="submit" disabled={applyPending} className="tg-btn">
              {applyPending ? "Saving results..." : "Confirm import"}
            </button>
          </div>
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
