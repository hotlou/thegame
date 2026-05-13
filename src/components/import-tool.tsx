"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { saveImportDraftAction } from "@/lib/admin-actions";
import { slugify } from "@/lib/slug";
import { Select, SubmitButton, TextInput, Textarea } from "@/components/ui";

type DivisionGender = "MENS" | "WOMENS" | "MIXED" | "OTHER";

type ImportDivision = {
  id: string;
  name: string;
  slug: string;
  gender: DivisionGender;
  teamCount: number;
  gameCount: number;
  sourceUrls: string[];
};

type ImportEvent = {
  id: string;
  name: string;
  slug: string;
  entryCount: number;
  divisions: ImportDivision[];
};

type DraftPreview = {
  divisionName: string;
  gender: DivisionGender;
  sourceUrl?: string;
  teams: unknown[];
  games: unknown[];
};

type ImportSaveState =
  | {
      ok: false;
    }
  | {
      ok: true;
      eventName: string;
      eventSlug: string;
      divisionName: string;
      teamCount: number;
      gameCount: number;
      sourceUrl: string | null;
    };

const initialState: ImportSaveState = { ok: false };

export function ImportTool({ events, currentEventId }: { events: ImportEvent[]; currentEventId: string }) {
  const [url, setUrl] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draft, setDraft] = useState<DraftPreview | null>(null);
  const [targetMode, setTargetMode] = useState<"existing" | "new">("existing");
  const [selectedEventId, setSelectedEventId] = useState(currentEventId);
  const [divisionMode, setDivisionMode] = useState<"existing" | "new">("new");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [divisionSlug, setDivisionSlug] = useState("");
  const [divisionGender, setDivisionGender] = useState<DivisionGender>("MENS");
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [saveState, formAction, savePending] = useActionState(saveDraft, initialState);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const selectedDivision = selectedEvent?.divisions.find((division) => division.id === selectedDivisionId);
  const replacementWarning = selectedDivision
    ? selectedDivision.teamCount > 0 || selectedDivision.gameCount > 0 || selectedEvent.entryCount > 0
    : false;

  const sourceMatch = findSourceMatch(events, draft?.sourceUrl);

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

      const parsedDraft = payload.draft as DraftPreview;
      const matched = findSourceMatch(events, parsedDraft.sourceUrl);
      const fallbackEvent = events.find((event) => event.id === currentEventId) ?? events[0];
      const nextEvent = matched?.event ?? fallbackEvent;
      const nextDivision = matched?.division;

      setDraft(parsedDraft);
      setDraftText(JSON.stringify(parsedDraft, null, 2));
      setTargetMode(nextEvent ? "existing" : "new");
      if (nextEvent) setSelectedEventId(nextEvent.id);
      setDivisionMode(nextDivision ? "existing" : "new");
      setSelectedDivisionId(nextDivision?.id ?? "");
      setDivisionName(parsedDraft.divisionName);
      setDivisionSlug(slugify(parsedDraft.divisionName));
      setDivisionGender(parsedDraft.gender);
      setEventName(eventName || inferredEventName(parsedDraft.divisionName));
      setEventSlug(eventSlug || slugify(inferredEventName(parsedDraft.divisionName)));
    });
  }

  function resetImport() {
    setDraft(null);
    setDraftText("");
    setUrl("");
    setError("");
    setDivisionMode("new");
    setSelectedDivisionId("");
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
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
            Saved {saveState.divisionName} to {saveState.eventName}: {saveState.teamCount} teams and{" "}
            {saveState.gameCount} games.
          </p>
          {saveState.sourceUrl && (
            <p className="tg-body-sm tg-muted" style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>
              From {saveState.sourceUrl}
            </p>
          )}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, fontWeight: 600 }}>
            <Link className="tg-inline-link" href={`/admin/settings?event=${saveState.eventSlug}`}>
              Review event sources
            </Link>
            <Link className="tg-inline-link" href={`/events/${saveState.eventSlug}`}>
              View event
            </Link>
            <button
              type="button"
              onClick={resetImport}
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
        <button type="button" onClick={preview} disabled={pending || !url} className="tg-btn tg-btn--alt">
          {pending ? "Parsing..." : "Preview import"}
        </button>
      </div>

      {error && (
        <p className="tg-body-sm" style={{ color: "var(--danger)", fontWeight: 600 }}>
          {error}
        </p>
      )}

      {draft && (
        <form action={formAction} style={{ display: "grid", gap: 18 }}>
          <input type="hidden" name="draft" value={draftText} />
          <input type="hidden" name="targetMode" value={targetMode} />
          <input type="hidden" name="divisionMode" value={targetMode === "new" ? "new" : divisionMode} />

          <section style={{ display: "grid", gap: 10 }}>
            <h2 className="tg-h4">Parsed source</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span className="tg-pill">{draft.divisionName}</span>
              <span className="tg-pill">{draft.gender.toLowerCase()}</span>
              <span className="tg-pill">{draft.teams.length} teams</span>
              <span className="tg-pill">{draft.games.length} games</span>
            </div>
            {sourceMatch && (
              <p className="tg-body-sm" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
                This URL already belongs to {sourceMatch.event.name} / {sourceMatch.division.name}.
              </p>
            )}
          </section>

          <section style={{ display: "grid", gap: 12 }}>
            <h2 className="tg-h4">Target event</h2>
            <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                checked={targetMode === "existing"}
                onChange={() => setTargetMode("existing")}
              />
              Attach to existing event
            </label>
            {targetMode === "existing" && (
              <Select
                name="eventId"
                value={selectedEventId}
                onChange={(event) => {
                  setSelectedEventId(event.target.value);
                  setSelectedDivisionId("");
                  setDivisionMode("new");
                }}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            )}
            <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" checked={targetMode === "new"} onChange={() => setTargetMode("new")} />
              Create new event
            </label>
            {targetMode === "new" && (
              <div className="tg-grid tg-grid--2" style={{ gap: 12 }}>
                <label className="tg-label">
                  Event name
                  <TextInput
                    name="eventName"
                    value={eventName}
                    onChange={(event) => {
                      setEventName(event.target.value);
                      setEventSlug(slugify(event.target.value));
                    }}
                    required={targetMode === "new"}
                    style={{ marginTop: 6 }}
                  />
                </label>
                <label className="tg-label">
                  Event slug
                  <TextInput
                    name="eventSlug"
                    value={eventSlug}
                    onChange={(event) => setEventSlug(event.target.value)}
                    required={targetMode === "new"}
                    pattern="[a-z0-9-]+"
                    style={{ marginTop: 6 }}
                  />
                </label>
                <label className="tg-label">
                  Starts at
                  <TextInput name="eventStartsAt" type="datetime-local" style={{ marginTop: 6 }} />
                </label>
                <label className="tg-label">
                  Entry lock
                  <TextInput name="eventEntryLockAt" type="datetime-local" style={{ marginTop: 6 }} />
                </label>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: 12 }}>
            <h2 className="tg-h4">Target division</h2>
            {targetMode === "existing" && selectedEvent?.divisions.length > 0 && (
              <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  checked={divisionMode === "existing"}
                  onChange={() => setDivisionMode("existing")}
                />
                Update an existing division
              </label>
            )}
            {targetMode === "existing" && divisionMode === "existing" && selectedEvent && (
              <Select
                name="divisionId"
                value={selectedDivisionId}
                onChange={(event) => setSelectedDivisionId(event.target.value)}
              >
                <option value="">Choose division</option>
                {selectedEvent.divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </Select>
            )}
            <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                checked={targetMode === "new" || divisionMode === "new"}
                onChange={() => setDivisionMode("new")}
              />
              Create new division
            </label>
            {(targetMode === "new" || divisionMode === "new") && (
              <div className="tg-grid tg-grid--3" style={{ gap: 12 }}>
                <label className="tg-label">
                  Division name
                  <TextInput
                    name="divisionName"
                    value={divisionName}
                    onChange={(event) => {
                      setDivisionName(event.target.value);
                      setDivisionSlug(slugify(event.target.value));
                    }}
                    required
                    style={{ marginTop: 6 }}
                  />
                </label>
                <label className="tg-label">
                  Division slug
                  <TextInput
                    name="divisionSlug"
                    value={divisionSlug}
                    onChange={(event) => setDivisionSlug(event.target.value)}
                    pattern="[a-z0-9-]+"
                    style={{ marginTop: 6 }}
                  />
                </label>
                <label className="tg-label">
                  Category
                  <Select
                    name="divisionGender"
                    value={divisionGender}
                    onChange={(event) => setDivisionGender(event.target.value as DivisionGender)}
                    style={{ marginTop: 6 }}
                  >
                    <option value="MENS">Men</option>
                    <option value="WOMENS">Women</option>
                    <option value="MIXED">Mixed</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </label>
              </div>
            )}
            {replacementWarning && (
              <p
                className="tg-body-sm"
                style={{
                  border: "1px solid var(--danger)",
                  borderRadius: 4,
                  color: "var(--danger)",
                  padding: "8px 10px",
                  fontWeight: 600,
                }}
              >
                This target already has {selectedDivision?.teamCount ?? 0} teams, {selectedDivision?.gameCount ?? 0}{" "}
                games, and {selectedEvent?.entryCount ?? 0} entries. Confirm this is the right event and division before
                saving.
              </p>
            )}
          </section>

          <label className="tg-label">
            Reviewable import JSON
            <Textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              style={{ minHeight: 300, marginTop: 6, fontFamily: "var(--font-mono)" }}
            />
          </label>

          <div>
            <SubmitButton>{savePending ? "Saving..." : "Save import to selected target"}</SubmitButton>
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

function findSourceMatch(events: ImportEvent[], sourceUrl?: string) {
  if (!sourceUrl) return null;
  for (const event of events) {
    for (const division of event.divisions) {
      if (division.sourceUrls.includes(sourceUrl)) return { event, division };
    }
  }
  return null;
}

function inferredEventName(divisionName: string) {
  return divisionName
    .replace(/\b(men'?s?|women'?s?|mixed|open)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
