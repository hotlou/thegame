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
    <div className="space-y-4">
      {saveState.ok && (
        <div className="rounded-lg border border-[var(--accent)] bg-white p-4">
          <p className="font-semibold text-[var(--accent)]">
            Saved {saveState.divisionName}: {saveState.teamCount} teams and {saveState.gameCount} games.
          </p>
          {saveState.sourceUrl && <p className="mt-1 text-xs text-[var(--muted)]">From {saveState.sourceUrl}</p>}
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
            <Link className="text-[var(--accent)] underline" href="/admin/teams">
              Go to teams
            </Link>
            <Link className="text-[var(--accent)] underline" href="/admin/games">
              Go to games/results
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setUrl("");
                setError("");
              }}
              className="font-semibold text-[var(--accent)] underline"
            >
              Import another division
            </button>
          </div>
        </div>
      )}
      <label className="block text-sm font-semibold">
        USAU schedule URL
        <TextInput value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://play.usaultimate.org/..." />
      </label>
      <button
        type="button"
        onClick={preview}
        disabled={pending || !url}
        className="focus-ring rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Parsing..." : "Preview import"}
      </button>
      {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
      {draft && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          <Textarea name="draft" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-96 font-mono" />
          <SubmitButton>{savePending ? "Saving..." : "Save reviewed import"}</SubmitButton>
        </form>
      )}
    </div>
  );
}

async function saveDraft(_: ImportSaveState, formData: FormData): Promise<ImportSaveState> {
  const result = await saveImportDraftAction(formData);
  return result;
}
