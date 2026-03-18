export default function DynamicCategoryLoading() {
  return (
    <main className="min-h-screen bg-[#EAEDED]">
      <div className="h-14 w-full bg-[#131921]" />

      <div className="h-14 w-full border-b border-zinc-200 bg-white" />

      <div className="mx-auto max-w-[1200px] px-3 pt-4 pb-10">
        <div className="mb-4 h-4 w-56 animate-pulse rounded bg-zinc-200" />

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[250px] gap-3 border-b border-gray-100 bg-white p-3"
            >
              <div className="flex w-[160px] shrink-0 items-center justify-center bg-[#f3f3f3] p-3">
                <div className="h-[190px] w-[120px] animate-pulse rounded bg-zinc-200" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col py-1 pr-2">
                <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-zinc-200" />
                <div className="mb-2 h-4 w-4/6 animate-pulse rounded bg-zinc-200" />

                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-8 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-14 animate-pulse rounded bg-zinc-200" />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 rounded border border-zinc-200 bg-white p-2">
                  <div className="h-10 animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 animate-pulse rounded bg-zinc-100" />
                </div>

                <div className="mt-auto">
                  <div className="mb-2 h-8 w-32 animate-pulse rounded bg-zinc-200" />
                  <div className="h-10 w-full animate-pulse rounded-full bg-[#f7d96a]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
