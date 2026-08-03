const alerts = [
  {
    id: 1,
    severity: "CRITICAL",
    title: "Helmet Missing Detected",
    location: "Red Zone - Production Area",
    camera: "Camera 01",
    time: "10:42:18",
    worker: "Worker ID #104",
    status: "OPEN",
  },
  {
    id: 2,
    severity: "WARNING",
    title: "Worker Entered Restricted Zone",
    location: "Yellow Zone",
    camera: "Camera 01",
    time: "10:38:52",
    worker: "Worker ID #089",
    status: "OPEN",
  },
  {
    id: 3,
    severity: "RESOLVED",
    title: "Helmet Compliance Restored",
    location: "Green Zone",
    camera: "Camera 01",
    time: "10:31:24",
    worker: "Worker ID #072",
    status: "CLOSED",
  },
];


const severityStyle = {

  CRITICAL:
    "bg-red-500/10 border-red-500/40 text-red-400",

  WARNING:
    "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",

  RESOLVED:
    "bg-green-500/10 border-green-500/40 text-green-400",

};



export default function Alerts(){

return(

<div className="p-8 space-y-8">


{/* Header */}

<div>

<h1 className="text-3xl font-bold">
Safety Alerts
</h1>

<p className="text-slate-400 mt-2">
AI generated PPE violations and safety incidents
</p>

</div>




{/* Summary Cards */}

<div className="
grid
grid-cols-1
md:grid-cols-3
gap-6
">


<div className="
bg-red-500/10
border
border-red-500/30
rounded-2xl
p-6
">

<p className="text-red-400 text-sm">
Critical Alerts
</p>

<h2 className="text-4xl font-bold mt-3">
02
</h2>

</div>



<div className="
bg-yellow-500/10
border
border-yellow-500/30
rounded-2xl
p-6
">

<p className="text-yellow-400 text-sm">
Warnings
</p>

<h2 className="text-4xl font-bold mt-3">
01
</h2>

</div>




<div className="
bg-green-500/10
border
border-green-500/30
rounded-2xl
p-6
">

<p className="text-green-400 text-sm">
Resolved Today
</p>

<h2 className="text-4xl font-bold mt-3">
24
</h2>

</div>



</div>





{/* Alert List */}

<div className="
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
">

<h2 className="font-bold text-xl">
Live Incident Feed
</h2>

</div>



<div className="divide-y divide-slate-800">


{
alerts.map((alert)=>(


<div
key={alert.id}
className="
p-6
flex
justify-between
items-center
hover:bg-slate-800/40
transition
"
>


<div className="flex gap-5">


{/* Icon */}

<div className="
w-14
h-14
rounded-xl
bg-slate-800
flex
items-center
justify-center
text-2xl
">

⚠️

</div>




<div>


<h3 className="font-bold text-lg">
{alert.title}
</h3>


<div className="
grid
grid-cols-2
gap-x-10
mt-3
text-sm
text-slate-400
">


<span>
📍 {alert.location}
</span>


<span>
📷 {alert.camera}
</span>


<span>
👤 {alert.worker}
</span>


<span>
🕒 {alert.time}
</span>


</div>



</div>


</div>





<div className="flex flex-col items-end gap-3">


<span
className={`
px-4
py-2
rounded-full
border
text-xs
font-bold
${severityStyle[alert.severity]}
`}
>

{alert.severity}

</span>



<button
className="
px-4
py-2
rounded-lg
bg-blue-600
hover:bg-blue-500
text-sm
font-semibold
"
>

Acknowledge

</button>


</div>



</div>


))

}


</div>


</div>



</div>


)

}
