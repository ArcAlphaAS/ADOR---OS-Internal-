// What a module shows for the instant its code is being fetched: the shape of
// a page (title + a few cards) in the app's own shimmer. It fades in after a
// short delay, so a module that loads instantly never flashes a skeleton.
export default function ModuleSkeleton() {
  return (
    <div className="ador-skeleton-in mx-auto w-full max-w-[1680px] px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10" aria-hidden="true">
      <div className="ador-skeleton h-8 w-48 rounded-full" />
      <div className="ador-skeleton mt-3 h-3 w-72 max-w-full rounded-full" />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ador-glass rounded-[20px] p-6">
            <div className="ador-skeleton h-3 w-24 rounded-full" />
            <div className="ador-skeleton mt-5 h-6 w-32 rounded-full" />
            <div className="ador-skeleton mt-6 h-3 w-full rounded-full" />
            <div className="ador-skeleton mt-2.5 h-3 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
      <div className="ador-glass mt-4 rounded-[20px] p-6">
        {[88, 74, 82, 60].map((w, i) => (
          <div key={i} className="ador-skeleton mt-3 h-3 rounded-full first:mt-0" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
