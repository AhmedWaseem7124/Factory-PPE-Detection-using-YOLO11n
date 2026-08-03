export default function CameraFeed() {
  const now = new Date();

return (
  <div className="relative bg-black aspect-video overflow-hidden">

    {/* Live Stream */}
    <img
      src="http://10.2.0.177:5000/video_feed"
      alt="Factory CCTV"
      className="w-full h-full object-contain"
    />

    {/* Dark Gradient */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none"></div>

    {/* LIVE Badge */}
    <div className="absolute top-5 left-5">
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur px-4 py-2 rounded-xl">

        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>

        <span className="font-semibold tracking-wide">
          LIVE
        </span>

      </div>
    </div>

    {/* Camera Name */}
    <div className="absolute bottom-5 left-5">
      <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-3">

        <p className="text-xs text-slate-400">
          Camera
        </p>

        <p className="font-semibold">
          Shed-B Repair Stand
        </p>

      </div>
    </div>

  </div>
);

}
