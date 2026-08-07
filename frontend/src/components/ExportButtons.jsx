import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileText } from "lucide-react";

export default function ExportButtons({ events = [], analytics = {} }) {

  const formatDurationText = (seconds, isCompleted = false) => {
    let sec = parseInt(seconds, 10) || 0;
    if (isCompleted && sec <= 0) sec = 1;
    if (sec <= 0) return "0s";
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  };

  const exportCSV = () => {
    if (!events || events.length === 0) return;

    const total = events.length;
    const activeCount = events.filter((e) => e.resolved === 0 || e.status === "Active").length;
    const completedCount = total - activeCount;

    const report = [
      ["Factory PPE Monitoring System"],
      ["Official Safety Event Incident Log"],
      [],
      ["Generated Date", new Date().toLocaleString()],
      [],
      ["EXECUTIVE SUMMARY"],
      ["Total Incidents", total],
      ["Active Violations", activeCount],
      ["Resolved Incidents", completedCount],
      [],
      ["INCIDENT DETAILS TABLE"],
      ["ID", "Date", "Start Time", "End Time", "Track ID", "Zone", "Violation Type", "Duration", "Status"],
      ...events.map((event) => {
        const isCompleted = event.resolved === 1 || event.resolved === true || event.status === "Completed";
        const fullTime = event.start_time || event.timestamp || "";
        const parts = fullTime.split(" ");
        const datePart = parts[0] || "";
        const startTimePart = parts[1] || fullTime;
        const endTimePart = isCompleted
          ? (event.end_time && event.end_time !== "Ongoing" ? (event.end_time.split(" ")[1] || event.end_time) : startTimePart)
          : "Ongoing";

        return [
          event.id,
          datePart,
          startTimePart,
          endTimePart,
          `#${event.track_id ?? "N/A"}`,
          event.zone || "Unknown",
          event.event_type || "Helmet Missing",
          formatDurationText(event.duration, isCompleted),
          isCompleted ? "Resolved" : "Active",
        ];
      }),
    ];

    const csv = report.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `PPE_Safety_Events_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const todayStr = new Date().toISOString().split("T")[0];
    const generatedTime = new Date().toLocaleString();

    // Palette
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [225, 29, 72]; // Rose 600
    const headerBg = [30, 41, 59]; // Slate 800

    // Header Branding Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 297, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("FACTORY PPE MONITORING SYSTEM", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Official HSE Incident & Safety Compliance Audit Report", 14, 23);

    doc.setFontSize(8);
    doc.text(`Generated: ${generatedTime}`, 230, 23);

    // Divider Line
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(1);
    doc.line(0, 32, 297, 32);

    // Summary Box
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(14, 38, 269, 28, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Executive Incident Summary", 20, 46);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const totalIncidents = events.length;
    const avgDur = analytics.avg_duration ? `${analytics.avg_duration}s` : "0s";
    const riskZone = analytics.highest_risk_zone || "N/A";
    const compRate = analytics.compliance_rate ? `${analytics.compliance_rate}%` : "100%";

    doc.text(`Total Incidents: ${totalIncidents}`, 20, 54);
    doc.text(`Average Duration: ${avgDur}`, 90, 54);
    doc.text(`Highest Risk Zone: ${riskZone}`, 160, 54);
    doc.text(`Site Compliance: ${compRate}`, 230, 54);

    // Table Data
    const tableBody = events.map((event) => {
      const isCompleted = event.resolved === 1 || event.resolved === true || event.status === "Completed";
      const fullTime = event.start_time || event.timestamp || "";
      const parts = fullTime.split(" ");
      const datePart = parts[0] || "";
      const startTimePart = parts[1] || fullTime;
      const endTimePart = isCompleted
        ? (event.end_time && event.end_time !== "Ongoing" ? (event.end_time.split(" ")[1] || event.end_time) : startTimePart)
        : "Ongoing";

      return [
        datePart,
        startTimePart,
        endTimePart,
        event.zone || "Unknown",
        event.event_type || "Helmet Missing",
        `#${event.track_id ?? "N/A"}`,
        formatDurationText(event.duration, isCompleted),
        isCompleted ? "Completed" : "Active",
      ];
    });

    autoTable(doc, {
      startY: 72,
      head: [["Date", "Start Time", "End Time", "Zone", "Violation Type", "Track ID", "Duration", "Status"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: headerBg,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 38 },
        4: { cellWidth: 48 },
        5: { cellWidth: 28 },
        6: { cellWidth: 32 },
        7: { cellWidth: 30 },
      },
      didDrawPage: (data) => {
        // Footer Page Numbering
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, 268, 200);
        doc.text("Confidential — Factory Health & Safety Intelligence Report", 14, 200);
      },
    });

    doc.save(`PPE_Report_${todayStr}.pdf`);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={exportCSV}
        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-xs text-slate-200 flex items-center gap-2 transition-all shadow-md active:scale-95"
      >
        <Download size={15} className="text-blue-400" />
        Export CSV
      </button>

      <button
        onClick={exportPDF}
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 font-semibold text-xs text-white flex items-center gap-2 transition-all shadow-lg shadow-red-900/30 active:scale-95"
      >
        <FileText size={15} className="text-white" />
        Export PDF Report
      </button>
    </div>
  );
}
