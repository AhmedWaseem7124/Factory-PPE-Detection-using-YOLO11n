export default function Settings(){

return(

<div className="p-8 space-y-8">


{/* Header */}

<div>

<h1 className="text-3xl font-bold">
System Configuration
</h1>

<p className="text-slate-400 mt-2">
Manage AI model, cameras and safety monitoring parameters
</p>

</div>





{/* System Overview */}

<div className="
grid
grid-cols-1
md:grid-cols-3
gap-6
">


<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<p className="text-slate-400 text-sm">
System Status
</p>


<h2 className="
text-3xl
font-bold
text-green-400
mt-3
">
ONLINE
</h2>


</div>





<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<p className="text-slate-400 text-sm">
AI Engine
</p>


<h2 className="
text-3xl
font-bold
mt-3
">
YOLO11n
</h2>


</div>





<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<p className="text-slate-400 text-sm">
Camera Network
</p>


<h2 className="
text-3xl
font-bold
text-green-400
mt-3
">
1 / 1
</h2>


</div>


</div>







{/* Configuration Cards */}


<div className="
grid
grid-cols-1
xl:grid-cols-2
gap-6
">





{/* Camera */}

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="text-xl font-bold mb-6">
Camera Configuration
</h2>



<div className="space-y-5">


<div>

<label className="text-sm text-slate-400">
Camera Name
</label>


<div className="
mt-2
bg-slate-800
rounded-xl
px-4
py-3
">
Factory Floor Camera 01
</div>


</div>




<div>

<label className="text-sm text-slate-400">
Stream Protocol
</label>


<div className="
mt-2
bg-slate-800
rounded-xl
px-4
py-3
">
RTSP Stream
</div>


</div>





<div>

<label className="text-sm text-slate-400">
Resolution
</label>


<div className="
mt-2
bg-slate-800
rounded-xl
px-4
py-3
">
704 × 576
</div>


</div>


</div>


</div>








{/* AI Configuration */}


<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="text-xl font-bold mb-6">
AI Detection Configuration
</h2>



<div className="space-y-5">



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
Confidence Threshold
</span>


<span className="text-blue-400">
50%
</span>


</div>





<div className="flex justify-between">

<span className="text-slate-400">
Tracking
</span>


<span className="text-green-400">
Enabled
</span>


</div>





<div className="flex justify-between">

<span className="text-slate-400">
PPE Monitoring
</span>


<span className="text-green-400">
Active
</span>


</div>



</div>



</div>





{/* PPE Rules */}


<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="text-xl font-bold mb-6">
Safety Rules
</h2>



<div className="space-y-4">


{
[
"Helmet Required",
"Restricted Zone Detection",
"Violation Snapshot Capture",
"Real-Time Alerts"
].map((item)=>(


<div
key={item}
className="
flex
justify-between
items-center
bg-slate-800
rounded-xl
px-5
py-4
"
>


<span>
{item}
</span>


<div className="
w-12
h-6
rounded-full
bg-green-500
relative
">

<div className="
absolute
right-1
top-1
w-4
h-4
bg-white
rounded-full
"/>


</div>


</div>


))


}



</div>


</div>








{/* Zone Config */}


<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<h2 className="text-xl font-bold mb-6">
Monitoring Zones
</h2>


<div className="space-y-4">


{
[
["RED","High Risk"],
["YELLOW","Medium Risk"],
["GREEN","Safe Area"],
["BLUE","Monitoring Area"]
].map(zone=>(


<div
key={zone[0]}
className="
flex
justify-between
bg-slate-800
rounded-xl
px-5
py-4
"
>


<span className="font-semibold">
{zone[0]} ZONE
</span>


<span className="text-slate-400">
{zone[1]}
</span>


</div>


))


}


</div>


</div>




</div>


</div>


)

}
