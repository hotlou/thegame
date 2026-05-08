"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { saveImportDraftAction } from "@/lib/admin-actions";
import { SubmitButton, TextInput, Textarea } from "@/components/ui";

type ImportSaveState =
  | {
      ok: false;
    }
  | {
      ok: true;
      divisionName: string;
      teamCount: number;
      gameCount: number;
      sourceUrl: string | null;
    };

const initialState: ImportSaveState = { ok: false };

export function ImportTool({ eventId }: { eventId: string }) {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [saveState, formAction, savePending] = useActionState(saveDraft, initialState);

  function preview() {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/admin/import/usau", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Import preview failed.");
        return;
      }
      setDraft(JSON.stringify(payload.draft, null, 2));
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {saveState.ok && (
        <div
          style={{
            border: "1px solid var(--accent)",
            borderRadius: 4,
            background: "var(--panel-strong)",
            padding: 14,
          }}
        >
          <p className="tg-label" style={{ color: "var(--accent-ink)" }}>
            Saved {saveState.divisionName}: {saveState.teamCount} teams and {saveState.gameCount} games.
          </p>
          {saveState.sourceUrl && (
            <p className="tg-body-sm tg-muted" style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>
              From {saveState.sourceUrl}
            </p>
          )}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, fontWeight: 600 }}>
            <Link className="tg-inline-link" href="/admin/teams">
              Go to teams
            </Link>
            <Link className="tg-inline-link" href="/admin/games">
              Go to games/results
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setUrl("");
                setError("");
              }}
              className="tg-inline-link"
              style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
            >
              Import another division
            </button>
          </div>
        </div>
      )}
      <label className="tg-label">
        USAU schedule URL
        <TextInput
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://play.usaultimate.org/..."
          style={{ marginTop: 6 }}
        />
      </label>
      <div>
        <button
          type="button"
          onClick={preview}
          disabled={pending || !url}
          className="tg-btn tg-btn--alt"
        >
          {pending ? "Parsing..." : "Preview import"}
        </button>
      </div>
      {error && (
        <p className="tg-body-sm" style={{ color: "var(--danger)", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {draft && (
        <form action={formAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="eventId" value={eventId} />
          <Textarea
            name="draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{ minHeight: 384, fontFamily: "var(--font-mono)" }}
          />
          <div>
            <SubmitButton>{savePending ? "Saving..." : "Save reviewed import"}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

async function saveDraft(_: ImportSaveState, formData: FormData): Promise<ImportSaveState> {
  const result = await saveImportDraftAction(formData);
  return result;
}
