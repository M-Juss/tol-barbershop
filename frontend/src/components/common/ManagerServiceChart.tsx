import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

type ServiceStats = {
  service_name: string;
  completed_count: number;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ManagerServiceChart({ data }: { data: ServiceStats[] }) {
  const serviceChartConfig = data.reduce((acc, item, index) => {
    acc[item.service_name] = {
      label: item.service_name,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartContainer config={serviceChartConfig} className="h-[250px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
          dataKey="completed_count"
          nameKey="service_name"
          strokeWidth={3}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => `${name}: ${value}`}
              indicator="dot"
            />
          }
        />
        <ChartLegend content={<ChartLegendContent nameKey="service_name" />} />
      </PieChart>
    </ChartContainer>
  );
}
