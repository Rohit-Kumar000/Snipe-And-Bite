import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import { formatPrice } from "../../utils/formatPrice";

// Daily revenue (area) with the order count (line). data: [{ date: "2026-10-31", orders, revenue }]
export default function SalesChart({ data }) {
  const rows = data.map((d) => ({ ...d, label: format(new Date(`${d.date}T00:00:00`), "dd MMM") }));

  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label="Daily revenue and orders chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7a00" stopOpacity={0.45} /><stop offset="100%" stopColor="#ff7a00" stopOpacity={0.02} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--line-strong)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="revenue" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={56} />
          <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            cursor={{ stroke: "#ff7a00", strokeOpacity: 0.3 }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 14, color: "var(--ink)", boxShadow: "var(--shadow-card)" }}
            labelStyle={{ color: "var(--muted-strong)", fontWeight: 700 }}
            formatter={(value, name) => (name === "revenue" ? [formatPrice(value), "Revenue"] : [value, "Orders"])}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" height={28} formatter={(v) => <span style={{ color: "var(--muted-strong)", fontSize: 12 }}>{v === "revenue" ? "Revenue" : "Orders"}</span>} />
          <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="revenue" stroke="#ff7a00" strokeWidth={2.5} fill="url(#revenueFill)" animationDuration={900} dot={false} activeDot={{ r: 5 }} />
          <Line yAxisId="orders" type="monotone" dataKey="orders" name="orders" stroke="#22a06b" strokeWidth={2} dot={{ r: 3 }} animationDuration={1100} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
