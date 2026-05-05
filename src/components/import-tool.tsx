"use client";

import { useState, useTransition } from "react";
import { saveImportDraftAction } from "@/lib/admin-actions";
import { SubmitButton, TextInput, Textarea } from "@/components/ui";

export function ImportTool({ eventId }: { eventId: string }) {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
        <form action={saveImportDraftAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          <Textarea name="draft" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-96 font-mono" />
          <SubmitButton>Save reviewed import</SubmitButton>
        </form>
      )}
    </div>
  );
}
