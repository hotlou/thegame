import { Card, SubmitButton, Textarea, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { createBonusQuestionAction, setCorrectBonusOptionAction } from "@/lib/admin-actions";

export default async function BonusPage() {
  const event = await getCurrentEvent();
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );
  const questions = await getPrisma().bonusQuestion.findMany({
    where: { eventId: event.id },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <div className="tg-eyebrow">
        <h2>Bonus Props</h2>
        <span className="meta">{questions.length} questions</span>
      </div>

      <div
        className="tg-grid"
        style={{ gridTemplateColumns: "minmax(280px, 0.7fr) minmax(0, 1.3fr)", gap: 20 }}
      >
        <Card>
          <h1 className="tg-h2">Add bonus prop</h1>
          <form action={createBonusQuestionAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="tg-label">
              Prompt
              <TextInput name="prompt" required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Points
              <TextInput name="points" type="number" min={1} required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Options, one per line
              <Textarea name="options" required style={{ marginTop: 6 }} />
            </label>
            <div>
              <SubmitButton>Create question</SubmitButton>
            </div>
          </form>
        </Card>

        <Card>
          <h1 className="tg-h2">Bonus props</h1>
          <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
            {questions.map((question) => (
              <section
                key={question.id}
                style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16 }}
              >
                <h2 className="tg-h4" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {question.prompt}{" "}
                  <span className="tg-muted" style={{ fontSize: 12, fontWeight: 400 }}>
                    ({question.points} pts)
                  </span>
                </h2>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {question.options.map((option) => (
                    <form key={option.id} action={setCorrectBonusOptionAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="optionId" value={option.id} />
                      <button
                        className="focus-ring"
                        style={{
                          borderRadius: 3,
                          padding: "6px 10px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: option.isCorrect ? "var(--accent)" : "var(--panel-strong)",
                          color: option.isCorrect ? "#fff" : "var(--foreground)",
                          border: `1px solid ${option.isCorrect ? "var(--accent)" : "var(--line)"}`,
                        }}
                      >
                        {option.label}
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            ))}
            {questions.length === 0 && <p className="tg-body-sm tg-muted">No bonus props yet.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
