"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from "recharts";

interface ChartProps {
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
  type?: "bar" | "line" | "pie";
}

export default function DashboardCharts({ data, type = "bar" }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-center px-4">
        <p className="text-sm text-gray-500 mb-1">No data yet</p>
        <p className="text-xs text-gray-400 mb-3">Create your first order to see revenue analytics.</p>
        <Link
          href="/dashboard/orders/new"
          className="text-xs text-primary hover:underline font-medium"
        >
          Create an order →
        </Link>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        ) : type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} />
            </LineChart>
        ) : (
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                    ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
