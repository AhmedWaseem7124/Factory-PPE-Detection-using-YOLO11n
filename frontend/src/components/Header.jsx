import { useEffect, useState } from "react";

export default function Header({ activePage }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentTime = time.toLocaleTimeString("en-US");

return (
  <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">

    <div className="h-24 px-8 flex items-center justify-between">

      {/* Left */}

      <div>

        <h1 className="text-3xl font-bold tracking-wide">
          {activePage}
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Factory PPE Monitoring System
        </p>

      </div>

      {/* Right */}

      <div className="flex items-center gap-6">

        {/* Date */}

        <div className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-3 min-w-[220px]">

          <div className="text-xs text-slate-400">
            DATE
          </div>

          <div className="font-semibold mt-1">
            {currentDate}
          </div>

        </div>

        {/* Time */}

        <div className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-3 min-w-[150px]">

          <div className="text-xs text-slate-400">
            TIME
          </div>

          <div className="text-xl font-bold mt-1">
            {currentTime}
          </div>

        </div>

      </div>

    </div>

  </header>
);

}
