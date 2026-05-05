import { Card, SubmitButton, Textarea, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { createBonusQuestionAction, setCorrectBonusOptionAction } from "@/lib/admin-actions";

export default async function BonusPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;
  const questions = await getPrisma().bonusQuestion.findMany({
    where: { eventId: event.id },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <h1 className="text-2xl font-bold">Add bonus prop</h1>
        <form action={createBonusQuestionAction} className="mt-4 space-y-3">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="block text-sm font-semibold">
            Prompt
            <TextInput name="prompt" required />
          </label>
          <label className="block text-sm font-semibold">
            Points
            <TextInput name="points" type="number" min={1} required />
          </label>
          <label className="block text-sm font-semibold">
            Options, one per line
            <Textarea name="options" required />
          </label>
          <SubmitButton>Create question</SubmitButton>
        </form>
      </Card>

      <Card>
        <h1 className="text-2xl font-bold">Bonus props</h1>
        <div className="mt-4 space-y-5">
          {questions.map((question) => (
            <section key={question.id} className="border-b border-[var(--line)] pb-4">
              <h2 className="font-semibold">
                {question.prompt} <span className="text-sm text-[var(--muted)]">({question.points} pts)</span>
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {question.options.map((option) => (
                  <form key={option.id} action={setCorrectBonusOptionAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="questionId" value={question.id} />
                    <input type="hidden" name="optionId" value={option.id} />
                    <button
                      className={`rounded-md border px-3 py-2 text-sm ${
                        option.isCorrect
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--line)] bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}
