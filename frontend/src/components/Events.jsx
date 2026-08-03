import RecentEvents from "./RecentEvents";

export default function Events() {
  return (
    <div className="p-8 space-y-8">

      {/* Header */}

      <div>

        <h1 className="text-3xl font-bold">
          Safety Events
        </h1>

        <p className="text-slate-400 mt-2">
          View, search, filter and export PPE monitoring events.
        </p>

      </div>

      {/* Live Events */}

      <RecentEvents />

    </div>
  );
}
