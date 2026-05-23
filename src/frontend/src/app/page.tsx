const collaborators = [
  { initials: "AN", color: "bg-emerald-500" },
  { initials: "LK", color: "bg-violet-500" },
  { initials: "DR", color: "bg-amber-500" },
];

const runSteps = [
  "Reading shared context",
  "Drafting prompt plan",
  "Preparing realtime room",
];

const comments = [
  {
    author: "Laura K.",
    role: "Commenter",
    body: "Add a stronger enterprise security angle before the run starts.",
  },
  {
    author: "Marcus T.",
    role: "Editor",
    body: "Good call. I am folding that into the prompt draft now.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f8] text-[#14171a]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <section className="grid flex-1 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="hidden border-r border-black/10 bg-[#fbfbfc] p-5 lg:block">
            <div className="mb-8 text-lg font-semibold">Labrador</div>
            <nav className="space-y-2 text-sm">
              <div className="rounded-md bg-black px-3 py-2 font-medium text-white">
                Q2 Launch Marketing Plan
              </div>
              <div className="px-3 py-2 text-black/60">Context</div>
              <div className="px-3 py-2 text-black/60">Files</div>
              <div className="px-3 py-2 text-black/60">Versions</div>
            </nav>
            <div className="mt-10 rounded-md border border-black/10 bg-white p-3 text-xs text-black/60">
              <div className="mb-1 font-medium text-black">23 anonymous viewers</div>
              Share links are live, permissioned, and revocable.
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold sm:text-lg">
                  Q2 Launch Marketing Plan
                </h1>
                <p className="text-xs text-black/55 sm:text-sm">
                  Shared AI session
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden items-center -space-x-2 sm:flex">
                  {collaborators.map((user) => (
                    <div
                      className={`${user.color} grid size-8 place-items-center rounded-full border-2 border-white text-xs font-semibold text-white`}
                      key={user.initials}
                    >
                      {user.initials}
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-black/10 px-3 py-2 text-xs font-medium">
                  Share
                </div>
              </div>
            </header>

            <section className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-5 flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md bg-black text-sm font-semibold text-white">
                    AI
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Labrador is ready</div>
                    <p className="mt-1 text-sm leading-6 text-black/65">
                      The frontend shell is initialized for realtime collaborative
                      prompting. Next up: connect auth, shared sessions, and the
                      Rust WebSocket room service.
                    </p>
                  </div>
                </div>

                <article className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-black/10 pb-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                      Prompt draft
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      Build the Q2 launch marketing plan
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-black/65">
                      Generate an outcome-led launch plan for technical teams,
                      with messaging pillars, audience segments, proof points,
                      and a sequence of campaign actions.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {runSteps.map((step, index) => (
                      <div
                        className="rounded-md border border-black/10 bg-[#fbfbfc] p-3"
                        key={step}
                      >
                        <div className="text-xs font-semibold text-black/45">
                          Step {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-medium">{step}</div>
                      </div>
                    ))}
                  </div>
                </article>

                <div className="mt-5 rounded-lg border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">AI run status</div>
                    <div className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Realtime planned
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full w-2/3 rounded-full bg-black" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="border-t border-black/10 bg-[#fbfbfc] p-4 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Thread</h2>
              <span className="text-xs text-black/50">7 in session</span>
            </div>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  className="rounded-lg border border-black/10 bg-white p-3"
                  key={`${comment.author}-${comment.body}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{comment.author}</div>
                    <div className="text-xs text-black/45">{comment.role}</div>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-black/65">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
