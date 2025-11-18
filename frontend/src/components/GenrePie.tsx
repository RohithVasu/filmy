import React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip } from "recharts";

interface Datum { name: string; value: number; }

export default function GenrePie({ data }: { data: Datum[] }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No genre data yet.</div>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
