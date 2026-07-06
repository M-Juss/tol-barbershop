import { useEffect, useState, useCallback, useRef } from "react";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  PhilippinePeso,
  CheckCircle2,
  Star,
  Users,
  TrendingUp,
  UserPlus,
  Download,
} from "lucide-react";
import {
  getAnalyticsKPI,
  getAnalyticsRevenue,
  getAnalyticsAppointments,
  getAnalyticsServices,
  getAnalyticsBarbers,
  getAnalyticsRatings,
  getAnalyticsPeakHours,
  getAnalyticsDayOfWeek,
  type Period,
  type AnalyticsKPI,
  type TimeSeriesPoint,
  type AppointmentVolumePoint,
  type ServiceStat,
  type BarberStat,
  type RatingStat,
  type PeakHourStat,
  type DayOfWeekStat,
} from "@/services/manager/analytics.api";
import { getOverviewExportSummary } from "@/services/manager/overview.api";

const periods: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function formatLabel(label: string, period: Period): string {
  if (period === "daily") {
    const d = new Date(`${label}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (period === "weekly") {
    const [year, week] = label.split("-");
    return `W${week} ${year}`;
  }
  if (period === "monthly") {
    const [year, month] = label.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return label;
}

export function ReportsAnalytics() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [kpi, setKpi] = useState<AnalyticsKPI | null>(null);
  const [revenueData, setRevenueData] = useState<TimeSeriesPoint[]>([]);
  const [appointmentData, setAppointmentData] = useState<
    AppointmentVolumePoint[]
  >([]);
  const [serviceData, setServiceData] = useState<ServiceStat[]>([]);
  const [barberData, setBarberData] = useState<BarberStat[]>([]);
  const [ratingData, setRatingData] = useState<RatingStat[]>([]);
  const [peakHourData, setPeakHourData] = useState<PeakHourStat[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<DayOfWeekStat[]>([]);
  const fetchId = useRef(0);
  const fetchData = useCallback(async (p: Period) => {
    const id = ++fetchId.current;
    setLoading(true);
    try {
      const [
        kpiResult,
        revenueResult,
        appointmentResult,
        serviceResult,
        barberResult,
        ratingResult,
        peakHourResult,
        dayOfWeekResult,
      ] = await Promise.all([
        getAnalyticsKPI(p),
        getAnalyticsRevenue(p),
        getAnalyticsAppointments(p),
        getAnalyticsServices(p),
        getAnalyticsBarbers(p),
        getAnalyticsRatings(p),
        getAnalyticsPeakHours(p),
        getAnalyticsDayOfWeek(p),
      ]);
      if (id !== fetchId.current) return;
      setKpi(kpiResult);
      setRevenueData(revenueResult);
      setAppointmentData(appointmentResult);
      setServiceData(serviceResult);
      setBarberData(barberResult);
      setRatingData(ratingResult);
      setPeakHourData(peakHourResult);
      setDayOfWeekData(dayOfWeekResult);
    } catch (error) {
      if (id !== fetchId.current) return;
      console.error("Failed to load analytics data:", error);
      toast.error("Failed to load analytics");
    } finally {
      if (id !== fetchId.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const summary = await getOverviewExportSummary();
      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet([summary.stats]);
      const revenueSheet = XLSX.utils.json_to_sheet(summary.daily_revenue);
      const serviceSheet = XLSX.utils.json_to_sheet(summary.service_stats);
      const appointmentsSheet = XLSX.utils.json_to_sheet(summary.appointments);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, revenueSheet, "Daily Revenue");
      XLSX.utils.book_append_sheet(workbook, serviceSheet, "Service Stats");
      XLSX.utils.book_append_sheet(workbook, appointmentsSheet, "Appointments");
      XLSX.writeFile(
        workbook,
        `tol-summary-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success("Exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  };

  // Chart configs
  const revenueConfig = {
    revenue: { label: "Revenue", color: "#f59e0b" },
  } satisfies ChartConfig;

  const appointmentConfig = {
    completed: { label: "Completed", color: "#10b981" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
    no_show: { label: "No-show", color: "#9ca3af" },
  } satisfies ChartConfig;

  const totalCompleted = appointmentData.reduce((s, r) => s + r.completed, 0);
  const totalCancelled = appointmentData.reduce((s, r) => s + r.cancelled, 0);
  const totalNoShow = appointmentData.reduce((s, r) => s + r.no_show, 0);
  const statusBreakdown = [
    { name: "Completed", value: totalCompleted, color: "#10b981" },
    { name: "Cancelled", value: totalCancelled, color: "#ef4444" },
    { name: "No-show", value: totalNoShow, color: "#9ca3af" },
  ];
  const statusConfig = {
    Completed: { label: "Completed", color: "#10b981" },
    Cancelled: { label: "Cancelled", color: "#ef4444" },
    "No-show": { label: "No-show", color: "#9ca3af" },
  } satisfies ChartConfig;

  const serviceConfig = serviceData.reduce((acc, item, i) => {
    acc[item.service_name] = {
      label: item.service_name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const barberConfig = barberData.reduce((acc, item, i) => {
    acc[item.barber_name] = {
      label: item.barber_name,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const ratingConfig = {
    count: { label: "Ratings", color: "#8b5cf6" },
  } satisfies ChartConfig;

  const peakHourConfig = {
    count: { label: "Appointments", color: "#3b82f6" },
  } satisfies ChartConfig;

  const dayOfWeekConfig = {
    completed: { label: "Completed", color: "#10b981" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
    no_show: { label: "No-show", color: "#9ca3af" },
  } satisfies ChartConfig;

  const barberRevenueConfig = {
    revenue: { label: "Revenue", color: "#f59e0b" },
  } satisfies ChartConfig;

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Reports &amp; Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Business performance overview across different time periods
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  period === p.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Revenue"
          value={
            loading ? "..." : `₱${(kpi?.total_revenue ?? 0).toLocaleString()}`
          }
          icon={PhilippinePeso}
          iconContainerClassName="bg-orange-100"
          iconClassName="text-orange-500"
          size="md"
        />
        <StatCard
          label="Completed"
          value={
            loading ? "..." : (kpi?.completed_appointments ?? 0).toString()
          }
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
          size="md"
        />
        <StatCard
          label="Avg Rating"
          value={loading ? "..." : (kpi?.average_rating ?? 0).toString()}
          icon={Star}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
          size="md"
        />
        <StatCard
          label="Customers"
          value={loading ? "..." : (kpi?.total_customers ?? 0).toString()}
          icon={Users}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
          size="md"
        />
        <StatCard
          label="Completion Rate"
          value={loading ? "..." : `${kpi?.completion_rate ?? 0}%`}
          icon={TrendingUp}
          iconContainerClassName="bg-teal-100"
          iconClassName="text-teal-500"
          size="md"
        />
        <StatCard
          label="Walk-ins"
          value={loading ? "..." : (kpi?.walkin_count ?? 0).toString()}
          icon={UserPlus}
          iconContainerClassName="bg-purple-100"
          iconClassName="text-purple-500"
          size="md"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Revenue Trend
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ChartContainer config={revenueConfig} className="h-[250px] w-full">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickFormatter={(l) => formatLabel(l, period)}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  tickFormatter={(v) => `₱${v}`}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => formatLabel(String(l), period)}
                      formatter={(v) => `₱${Number(v).toLocaleString()}`}
                      indicator="line"
                    />
                  }
                />
                <Area
                  dataKey="value"
                  fill="url(#revenueFill)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* Appointment Volume */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Appointment Volume
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ChartContainer
              config={appointmentConfig}
              className="h-[250px] w-full"
            >
              <BarChart data={appointmentData}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickFormatter={(l) => formatLabel(l, period)}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => Math.floor(v).toString()}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => formatLabel(String(l), period)}
                      indicator="dot"
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="var(--color-completed)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="cancelled"
                  stackId="a"
                  fill="var(--color-cancelled)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="no_show"
                  stackId="a"
                  fill="var(--color-no_show)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Service Distribution
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : serviceData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No data
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-3 text-center">
                  By Count
                </p>
                <ChartContainer
                  config={serviceConfig}
                  className="h-[250px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={serviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="completed_count"
                      nameKey="service_name"
                      strokeWidth={3}
                    >
                      {serviceData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
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
                    <ChartLegend
                      content={<ChartLegendContent nameKey="service_name" />}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-3 text-center">
                  By Revenue
                </p>
                <ChartContainer
                  config={serviceConfig}
                  className="h-[250px] w-full"
                >
                  <BarChart data={serviceData} layout="vertical" barSize={24}>
                    <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₱${v}`}
                    />
                    <YAxis
                      dataKey="service_name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            `₱${Number(value).toLocaleString()}`,
                            " Revenue",
                          ]}
                          indicator="dot"
                        />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                      name="Revenue"
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Status Breakdown
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ChartContainer config={statusConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={3}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value} `, name]}
                      indicator="dot"
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Rating Distribution
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ChartContainer config={ratingConfig} className="h-[250px] w-full">
              <BarChart data={ratingData} barSize={40}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="rating"
                  tickFormatter={(r) => `${r} ★`}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value} ratings `, name]}
                      indicator="dot"
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">Peak Hours</h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : peakHourData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No data
            </div>
          ) : (
            <ChartContainer
              config={peakHourConfig}
              className="h-[250px] w-full"
            >
              <BarChart data={peakHourData} barSize={20}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => {
                    const [hourStr, minute] = h.split(":");
                    const hour = parseInt(hourStr, 10);
                    const ampm = hour >= 12 ? "PM" : "AM";
                    const hour12 = hour % 12 || 12;
                    return `${hour12}:${minute} ${ampm}`;
                  }}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => Math.floor(v).toString()}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value} appointments`]}
                      indicator="dot"
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Barber Performance (Count) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Barber Performance
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : barberData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No data
            </div>
          ) : (
            <ChartContainer config={barberConfig} className="h-[250px] w-full">
              <BarChart data={barberData} layout="vertical" barSize={24}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => Math.floor(v).toString()}
                />
                <YAxis
                  dataKey="barber_name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value}`, " Completed"]}
                      indicator="dot"
                    />
                  }
                />
                <Bar
                  dataKey="completed_count"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  name="completed_count"
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Barber Revenue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Barber Revenue
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : barberData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No data
            </div>
          ) : (
            <ChartContainer
              config={barberRevenueConfig}
              className="h-[250px] w-full"
            >
              <BarChart data={barberData} layout="vertical" barSize={24}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₱${v}`}
                />
                <YAxis
                  dataKey="barber_name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString()}`,
                        " Revenue",
                      ]}
                      indicator="dot"
                    />
                  }
                />
                <Bar
                  dataKey="revenue"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  name="revenue"
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        {/* Day of Week */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Day of Week
          </h2>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ChartContainer
              config={dayOfWeekConfig}
              className="h-[250px] w-full"
            >
              <BarChart data={dayOfWeekData}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="day"
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => Math.floor(v).toString()}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="var(--color-completed)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="cancelled"
                  stackId="a"
                  fill="var(--color-cancelled)"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="no_show"
                  stackId="a"
                  fill="var(--color-no_show)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
        <div className="mb-10" />
      </div>
    </div>
  );
}
