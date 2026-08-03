import CameraFeed from "./CameraFeed";
import ZoneStatus from "./ZoneStatus";


export default function LiveMonitoring(){

return(

<div className="p-8 space-y-8">


{/* Header */}

<div className="flex justify-between items-center">

<div>

<h1 className="text-3xl font-bold">
Live AI Monitoring
</h1>

<p className="text-slate-400 mt-2">
Real-time PPE detection and factory safety monitoring
</p>

</div>


<div className="
flex
items-center
gap-3
bg-green-500/10
border
border-green-500/30
px-5
py-3
rounded-xl
">


<div className="
w-3
h-3
bg-green-500
rounded-full
animate-pulse
"/>


<span className="text-green-400 font-semibold">
MONITORING ACTIVE
</span>


</div>


</div>





{/* Main Monitoring */}

<div className="
grid
grid-cols-1
xl:grid-cols-4
gap-6
">


{/* Camera */}

<div className="
xl:col-span-3
bg-slate-900
border
border-slate-800
rounded-2xl
overflow-hidden
">


<div className="
px-6
py-5
border-b
border-slate-800
flex
justify-between
">


<div>

<h2 className="font-bold text-lg">
Camera 01
</h2>

<p className="text-sm text-slate-400">
Factory Production Area
</p>


</div>



<span className="
text-green-400
text-sm
font-semibold
">
CONNECTED
</span>


</div>


<CameraFeed/>


</div>





{/* Detection Panel */}

<div className="
space-y-6
">


<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="font-bold mb-5">
Detection Status
</h2>



<div className="space-y-5">


<div className="flex justify-between">

<span className="text-slate-400">
Workers
</span>

<span className="font-bold text-blue-400">
12
</span>

</div>



<div className="flex justify-between">

<span className="text-slate-400">
Helmet Detected
</span>

<span className="font-bold text-green-400">
10
</span>

</div>




<div className="flex justify-between">

<span className="text-slate-400">
Violations
</span>

<span className="font-bold text-red-400">
2
</span>

</div>



</div>


</div>





<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="font-bold mb-5">
AI Model
</h2>


<div className="space-y-4 text-sm">


<div className="flex justify-between">

<span className="text-slate-400">
Model
</span>

<span>
YOLO11n
</span>

</div>



<div className="flex justify-between">

<span className="text-slate-400">
Confidence
</span>

<span>
50%
</span>

</div>



<div className="flex justify-between">

<span className="text-slate-400">
Inference
</span>

<span className="text-green-400">
31 ms
</span>

</div>



</div>


</div>



</div>


</div>





{/* Zones */}

<div>

<h2 className="
text-xl
font-bold
mb-5
">
Zone Monitoring
</h2>


<ZoneStatus/>


</div>




</div>


)


}
