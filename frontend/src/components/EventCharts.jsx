import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function EventCharts() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/events`);
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    fetchEvents();

    const interval = setInterval(fetchEvents, 1000);

    return () => clearInterval(interval);
  }, []);

  const zoneCounts = {};
  const typeCounts = {};

  events.forEach((event) => {
    const zone = event.zone || "Unknown";
    const type = event.event_type || "Unknown";

    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const zoneData = {
    labels: Object.keys(zoneCounts),
    datasets: [
      {
        label: "Violations",
        data: Object.values(zoneCounts),
      },
    ],
  };

  const typeData = {
    labels: Object.keys(typeCounts),
    datasets: [
      {
        label: "Events",
        data: Object.values(typeCounts),
      },
    ],
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-8">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-bold mb-4">
          Violations by Zone
        </h2>

        <Bar data={zoneData} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-bold mb-4">
          Event Distribution
        </h2>

        <Pie data={typeData} />
      </div>
    </div>
  );
}
