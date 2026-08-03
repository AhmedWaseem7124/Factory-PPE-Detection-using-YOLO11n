import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ImageModal from "./ImageModal";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";


const styles = {
  critical: {
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
    glow: "hover:border-red-500/50",
    icon: "⚠️",
  },
  warning: {
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    glow: "hover:border-yellow-500/50",
    icon: "🟡",
  },
  resolved: {
    badge: "bg-green-500/20 text-green-400 border-green-500/40",
    glow: "hover:border-green-500/50",
    icon: "✅",
  },
};

export default function RecentEvents() {
  const [events, setEvents] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const [selectedZone, setSelectedZone] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          "http://10.2.0.177:5000/events"
        );

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEvents();

    const interval = setInterval(fetchEvents, 1000);

    return () => clearInterval(interval);
  }, []);

  // ----------------------------
  // Filter Events
  // ----------------------------
  const filteredEvents = events.filter((event) => {
    const zoneMatch =
      !selectedZone || event.zone === selectedZone;

    const typeMatch =
      !selectedType ||
      event.event_type === selectedType;

    const dateMatch =
      !selectedDate ||
      (event.timestamp &&
        event.timestamp.startsWith(selectedDate));

    return zoneMatch && typeMatch && dateMatch;
  });

const exportCSV = () => {

    const total =
        events.length;

    const violations =
        events.filter(
            e => !e.resolved
        ).length;

    const resolved =
        events.filter(
            e => e.resolved
        ).length;

    const report = [

        [
            "Factory PPE Monitoring System"
        ],

        [
            "Safety Event Report"
        ],

        [],

        [
            "Generated",
            new Date().toLocaleString()
        ],

        [],

        [
            "Summary"
        ],

        [
            "Total Events",
            total
        ],

        [
            "Active Violations",
            violations
        ],

        [
            "Resolved Events",
            resolved
        ],

        [],

        [
            "Event Details"
        ],

        [
            "ID",
            "Timestamp",
            "Worker ID",
            "Zone",
            "Event Type",
            "Confidence",
            "Status"
        ],

        ...events.map(event=>[

            event.id,
            event.timestamp,
            `#${event.track_id}`,
            event.zone || "Unknown",
            event.event_type,
            `${event.confidence*100}%`,
            event.resolved
            ? "Resolved"
            : "Open"
        ])
    ];

    const csv =
        report
        .map(row=>row.join(","))
        .join("\n");

    const blob =
        new Blob(
            [csv],
            {
                type:"text/csv"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href=url;

    link.download=
      "PPE_Safety_Event_Report.csv";

    link.click();
};

const exportPDF = () => {

const doc = new jsPDF();

doc.setFontSize(18);

doc.text(
"Factory PPE Monitoring System",
14,
20
);

doc.setFontSize(14);

doc.text(
"PPE Safety Event Report",
14,
30
);

doc.setFontSize(10);

doc.text(
`Generated: ${new Date().toLocaleString()}`,
14,
40);

const tableData =
events.map(event=>[

event.timestamp,
`#${event.track_id}`,
event.zone || "Unknown",
event.event_type,
`${event.confidence*100}%`,
event.resolved
?"Resolved"
:"Open"
]);

autoTable(doc,{

startY:50,

head:[[
"Time",
"Worker",
"Zone",
"Event",
"Confidence",
"Status"
]],

body:tableData

});

doc.save(
"PPE_Safety_Event_Report.pdf"
);
};

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            AI Safety Event Intelligence
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Real-time PPE violations and compliance events
          </p>
        </div>

<div className="flex items-center gap-4">

  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>

    <span className="text-green-400 font-semibold text-sm">
      LIVE MONITORING
    </span>
  </div>

<div className="flex gap-3">

<button
onClick={exportCSV}
className="
px-4 py-2
rounded-lg
bg-blue-600
hover:bg-blue-700
font-semibold
text-sm
"
>
Export CSV
</button>


<button
onClick={exportPDF}
className="
px-4 py-2
rounded-lg
bg-red-600
hover:bg-red-700
font-semibold
text-sm
"
>
Export PDF
</button>

</div>

</div>
      </div>

      {/* Filters */}
      <div className="p-5 border-b border-slate-800 flex gap-4 flex-wrap">

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="bg-slate-800 rounded-lg px-3 py-2"
        >
          <option value="">All Zones</option>

          {[...new Set(events.map((e) => e.zone))]
            .filter(Boolean)
            .map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-800 rounded-lg px-3 py-2"
        >
          <option value="">All Events</option>

          {[...new Set(events.map((e) => e.event_type))]
            .filter(Boolean)
            .map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 rounded-lg px-3 py-2"
        />

      </div>

      {/* Events */}
      <div className="p-6 space-y-4">

        {filteredEvents.length === 0 ? (

          <div className="text-center text-slate-400 py-10">
            No events found
          </div>

        ) : (

          filteredEvents.map((event, index) => {

            let severity = "critical";

            if (
              event.event_type &&
              event.event_type.toLowerCase().includes("resolved")
            ) {
              severity = "resolved";
            } else if (
              event.event_type &&
              event.event_type.toLowerCase().includes("warning")
            ) {
              severity = "warning";
            }

            const style = styles[severity];

            const imageUrl = event.snapshot_path
              ? `http://10.2.0.177:5000/static/snapshots/${event.snapshot_path}`
              : null;

            return (

              <div
                key={event.id ?? index}
                className={`group border border-slate-800 rounded-xl p-5 flex justify-between items-center transition-all duration-300 hover:bg-slate-800/40 ${style.glow}`}
              >

                <div className="flex items-center gap-5">

                  {imageUrl ? (

                    <img
                      src={imageUrl}
                      alt="Violation"
                      onClick={() => setSelectedImage(imageUrl)}
                      className="w-24 h-20 rounded-lg object-cover border border-slate-700 cursor-pointer hover:scale-105 transition"
                    />

                  ) : (

                    <div className="w-24 h-20 rounded-lg bg-slate-800 flex items-center justify-center text-3xl">
                      {style.icon}
                    </div>

                  )}

                  <div>

                    <h3 className="font-bold text-lg">
                      {event.event_type}
                    </h3>

                    <div className="flex gap-4 mt-2 text-sm text-slate-400">

                      <span>
                        👷 Track #{event.track_id}
                      </span>

                      <span>
                        📍 {event.zone || "Unknown"}
                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex items-center gap-5">

                  <div className="text-right">

                    <p className="text-xs text-slate-500">
                      Detection Time
                    </p>

                    <p className="font-semibold mt-1">
                      {event.timestamp}
                    </p>

                  </div>

                  <span
                    className={`px-4 py-2 rounded-full border text-xs font-bold ${style.badge}`}
                  >
                    {severity.toUpperCase()}
                  </span>

                </div>

              </div>

            );

          })

        )}

      </div>

      <ImageModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

    </div>
  );
}
