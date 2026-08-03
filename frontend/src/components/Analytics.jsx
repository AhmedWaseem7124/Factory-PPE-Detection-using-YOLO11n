import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS=[
  "#22c55e",
  "#f59e0b",
  "#ef4444"
];

function KPI({
  title,
  value,
  subtitle,
  color
}){

return(

<div
className={`
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
hover:-translate-y-1
transition
duration-300
`}
>

<p className="text-sm text-slate-400">
{title}
</p>

<h2 className={`
text-5xl
font-black
mt-3
${color}
`}>
{value}
</h2>

<p className="
text-xs
text-slate-500
mt-3
">
{subtitle}
</p>

</div>

)
}

export default function Analytics(){

const [analytics, setAnalytics] = useState({
  workers: 0,
  violations: 0,
  compliance_rate: 0,
  safety_score: 0,
  trend_data: [],
  zone_data: [],
  event_data: [],
});

useEffect(() => {

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(
                "http://10.2.0.177:5000/analytics"
            );

            const data = await response.json();

            setAnalytics(data);
        }
        catch(err){
            console.error(err);
        }
    };

    fetchAnalytics();

    const interval = setInterval(fetchAnalytics,3000);

    return ()=>clearInterval(interval);

},[]);

const complianceData = analytics.trend_data || [];

const zoneData = analytics.zone_data || [];

const violationData = analytics.event_data || [];

return(

<div className="p-8 space-y-8">

<div>

<h1 className="
text-3xl
font-bold
">
Safety Intelligence Center
</h1>

<p className="
text-slate-400
mt-2
">
Real-time workplace safety analytics and compliance insights
</p>

</div>

{/* KPI */}

<div className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
gap-6
">

<KPI
title="Safety Score"
value={`${analytics.safety_score}%`}
subtitle="Overall compliance index"
color="text-green-400"
/>

<KPI
title="Workers Monitored"
value={analytics.workers}
subtitle="Today's workforce"
color="text-blue-400"
/>

<KPI
title="Active Violations"
value={analytics.violations}
subtitle="Requires attention"
color="text-red-400"
/>

<KPI
title="Compliance Rate"
value={`${analytics.compliance_rate}%`}
subtitle="Workers wearing helmets"
color="text-yellow-400"
/>

</div>

<div className="
grid
xl:grid-cols-3
gap-6
">

{/* Compliance */}

<div className="
xl:col-span-2
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">

<h2 className="
font-bold
text-lg
mb-5
">
Weekly Safety Compliance
</h2>

<ResponsiveContainer
width="100%"
height={320}
>

<LineChart data={complianceData}>

<CartesianGrid stroke="#1e293b"/>

<XAxis dataKey="day"/>

<YAxis/>

<Tooltip/>

<Line
type="monotone"
dataKey="value"
stroke="#22c55e"
strokeWidth={4}
/>

</LineChart>

</ResponsiveContainer>

</div>

{/* Safety Index */}

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
flex
flex-col
items-center
justify-center
">

<h2 className="
font-bold
text-lg
">
Safety Index
</h2>

<div className="
mt-8
w-48
h-48
rounded-full
border-8
border-green-500
flex
items-center
justify-center
">

<div className="text-center">

<p className="
text-5xl
font-black
text-green-400
">
{analytics.safety_score.toFixed(1)}
</p>

<p className="
text-xs
text-slate-400
">
/100
</p>

</div>

</div>

<p className="
mt-6
text-green-400
font-semibold
">
{analytics.safety_score >= 90
  ? "Excellent Safety Status"
  : analytics.safety_score >= 70
  ? "Good Safety Status"
  : analytics.safety_score >= 50
  ? "Average Safety Status"
  : "Critical Safety Status"}
</p>

</div>

</div>

<div className="
grid
xl:grid-cols-2
gap-6
">

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">

<h2 className="font-bold mb-5">
Zone Risk Analysis
</h2>

<ResponsiveContainer
width="100%"
height={300}
>

<BarChart data={zoneData}>

<CartesianGrid stroke="#1e293b"/>

<XAxis dataKey="zone"/>

<YAxis/>

<Tooltip/>

<Bar
dataKey="violations"
fill="#ef4444"
/>

</BarChart>

</ResponsiveContainer>

</div>

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">

<h2 className="font-bold mb-5">
PPE Violation Distribution
</h2>

<ResponsiveContainer
width="100%"
height={300}
>

<PieChart>

<Pie
data={violationData}
dataKey="value"
outerRadius={100}
label
>

{
violationData.map(
(entry,index)=>(

<Cell
key={index}
fill={COLORS[index]}
/>

))
}

</Pie>

<Tooltip/>

</PieChart>

</ResponsiveContainer>

</div>

</div>

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">

<h2 className="font-bold text-lg mb-6">
AI System Health
</h2>

<div className="
grid
md:grid-cols-4
gap-6
">

{
[
["Monitoring Status","Active","text-green-400"],
["Total Events",analytics.violations,"text-red-400"],
["Workers Tracked",analytics.workers,"text-blue-400"],
["Safety Score",`${analytics.safety_score}%`,"text-yellow-400"]
].map(
(item,index)=>(

<div
key={index}
className="
bg-slate-800/50
rounded-xl
p-5
"
>

<p className="text-xs text-slate-400">
{item[0]}
</p>

<p className={`
text-xl
font-bold
mt-2
${item[2]}
`}>
{item[1]}
</p>

</div>

))
}

</div>

</div>

</div>
)
}
