import RecentEvents from "./RecentEvents";

export default function Events() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Complete Safety Audit Log & Events
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Full historical database audit log containing all recorded PPE safety violation incidents
        </p>
      </div>

      {/* Full Database Server-Side Paginated Table */}
      <RecentEvents isDashboard={false} />
    </div>
  );
}
