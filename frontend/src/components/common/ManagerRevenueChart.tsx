import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

type DailyRevenue = {
  date: string;
  revenue: number;
};

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

function formatDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ManagerRevenueChart({ data }: { data: DailyRevenue[] }) {
  return (
    <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayLabel}
          tickMargin={10}
          axisLine={false}
          tickLine={false}
          minTickGap={18}
        />
        <YAxis
          tickFormatter={(value) => `₱${value}`}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatDayLabel(String(label))}
              formatter={(value) => `₱${Number(value).toLocaleString()}`}
              indicator="line"
            />
          }
        />
        <Bar
          dataKey="revenue"
          fill="url(#revenueFill)"
          stroke="var(--color-revenue)"
          radius={[8, 8, 0, 0]}
          maxBarSize={24}
          activeBar={{ fill: "var(--color-revenue)", opacity: 1 }}
        />
      </BarChart>
    </ChartContainer>
  );
}
