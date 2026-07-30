"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  PhilippinePeso,
  CheckCircle2,
  Star,
  Users,
  TrendingUp,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  getCompleteReport,
  getSectionReport,
  formatReportDateLabel,
  type ReportSection,
  type ReportPeriod,
  type ReportGranularity,
  type SectionReportResponse,
  type ReportOverview,
  type ReportRevenue,
  type ReportAppointments,
  type ReportServices,
  type ReportBarbers,
  type ReportCustomers,
  DATE_PRESETS,
  SECTIONS,
} from "@/services/manager/analytics.api";
import { ReportDateRangePicker } from "@/components/common/ReportDateRangePicker";
import { downloadAnalyticsReportPdf } from "@/lib/reportPdf";
import { cn } from "@/lib/utils";
import { sanitizeString } from "@/lib/sanitizer";
import { formatTime12 } from "@/lib/time-slots";

const VALID_SECTIONS: ReportSection[] = ["overview", "revenue", "appointments", "services", "barbers", "customers"];
const VALID_PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly", "7_days", "30_days", "3_months", "6_months", "12_months", "custom"];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatChartDate(
  value: unknown,
  granularity: ReportGranularity,
  includeWeeklyPrefix = true,
): string {
  const raw = String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

  if (!match) return raw;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (granularity === "weekly") {
    const label = chartDateFormatter.format(date);
    return includeWeeklyPrefix ? `Week of ${label}` : label;
  }

  if (granularity === "monthly") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  if (granularity === "yearly") return year;

  return chartDateFormatter.format(
    date,
  );
}

function getShopDateValue(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function parseSearchParams(searchParams: URLSearchParams) {
  const section = searchParams.get("section");
  const period = searchParams.get("period");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  return {
    section: VALID_SECTIONS.includes(section as ReportSection) ? (section as ReportSection) : ("overview" as ReportSection),
    period: VALID_PERIODS.includes(period as ReportPeriod) ? (period as ReportPeriod) : ("7_days" as ReportPeriod),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
}

function ReportsAnalyticsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const parsed = parseSearchParams(searchParams);
  const [section, setSection] = useState<ReportSection>(parsed.section);
  const [period, setPeriod] = useState<ReportPeriod>(parsed.period);
  const [startDate, setStartDate] = useState(parsed.startDate);
  const [endDate, setEndDate] = useState(parsed.endDate);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<SectionReportResponse | null>(null);
  const [reportDataKey, setReportDataKey] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, SectionReportResponse>>(new Map());

  const fetchId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = `${section}_${period}_${startDate ?? ""}_${endDate ?? ""}`;

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    const id = ++fetchId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await getSectionReport(section, period, {
        startDate,
        endDate,
        signal,
      });

      if (id !== fetchId.current) return;

      setReportData(result);
      setReportDataKey(cacheKey);
      setCache((prev) => {
        const next = new Map(prev);
        next.set(cacheKey, result);
        return next;
      });
    } catch (err) {
      if (id !== fetchId.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      console.error("Failed to load analytics:", err);
      setError("Could not load report data. Please try again.");
      toast.error("Could not load report data. Please try again.");
    } finally {
      if (id !== fetchId.current) return;
      setLoading(false);
    }
  }, [section, period, startDate, endDate, cacheKey]);

  useEffect(() => {
    const cached = cache.get(cacheKey);
    if (cached) {
      setReportData(cached);
      setReportDataKey(cacheKey);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchData(controller.signal);

    return () => controller.abort();
  }, [fetchData, cacheKey, cache]);

  const updateUrl = useCallback(
    (next: {
      section: ReportSection;
      period: ReportPeriod;
      startDate?: string;
      endDate?: string;
    }) => {
      const params = new URLSearchParams();

      if (next.section !== "overview") params.set("section", next.section);
      if (next.period !== "7_days") params.set("period", next.period);
      if (next.startDate) params.set("start_date", next.startDate);
      if (next.endDate) params.set("end_date", next.endDate);

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname],
  );

  const handleSectionChange = useCallback(
    (newSection: ReportSection) => {
      setSection(newSection);
      updateUrl({ section: newSection, period, startDate, endDate });
    },
    [updateUrl, period, startDate, endDate],
  );

  const handlePeriodChange = useCallback(
    (newPeriod: ReportPeriod) => {
      setPeriod(newPeriod);
      setStartDate(undefined);
      setEndDate(undefined);
      updateUrl({ section, period: newPeriod });
    },
    [updateUrl, section],
  );

  const handleCustomRangeApply = useCallback(
    (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
      setPeriod("custom");
      updateUrl({ section, period: "custom", startDate: start, endDate: end });
    },
    [updateUrl, section],
  );

  const handleExport = useCallback(async () => {
    if (!reportData || loading || reportDataKey !== cacheKey) {
      toast.error("Wait for the report to finish loading");
      return;
    }

    try {
      setExporting(true);
      const completeReport = await getCompleteReport(period, {
        startDate,
        endDate,
      });
      await downloadAnalyticsReportPdf(completeReport);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Could not export the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [
    cacheKey,
    endDate,
    loading,
    period,
    reportData,
    reportDataKey,
    startDate,
  ]);

  const handleRetry = useCallback(() => {
    setCache((prev) => {
      const next = new Map(prev);
      next.delete(cacheKey);
      return next;
    });
    fetchData();
  }, [fetchData, cacheKey]);

  const dateLabel = (() => {
    if (reportDataKey === cacheKey && reportData?.meta?.date_range) {
      return formatReportDateLabel(reportData.meta.date_range.from, reportData.meta.date_range.to);
    }
    if (startDate && endDate) {
      return formatReportDateLabel(startDate, endDate);
    }
    return null;
  })();

  const isDataReady = reportData && reportDataKey === cacheKey;

  return (
    <div className="w-full h-full bg-slate-100 font-sans">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            {dateLabel && (
              <p className="text-gray-500 mt-1">{dateLabel}</p>
            )}
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto shrink-0">
            <Select value={period} onValueChange={(v) => {
              if (v === "custom") {
                setPickerOpen(true);
              } else {
                handlePeriodChange(v as ReportPeriod);
              }
            }}>
              <SelectTrigger className="w-full sm:w-44 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={exporting || loading} className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-0.5 shadow-sm">
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSectionChange(s.key)}
                className={cn(
                  "flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-md px-0.5 py-1 text-[9px] font-semibold leading-tight transition-colors sm:min-h-9 sm:px-2 sm:text-xs",
                  section === s.key ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3" role="alert">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="shrink-0">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {loading && !isDataReady ? (
          <ReportsLoadingSkeleton />
        ) : isDataReady ? (
          <div aria-busy={loading} className={cn(loading && "opacity-60 pointer-events-none")}>
            {section === "overview" && <OverviewPanel data={reportData.data as ReportOverview} />}
            {section === "revenue" && <RevenuePanel data={reportData.data as ReportRevenue} granularity={reportData.meta.granularity} />}
            {section === "appointments" && <AppointmentsPanel data={reportData.data as ReportAppointments} granularity={reportData.meta.granularity} />}
            {section === "services" && <ServicesPanel data={reportData.data as ReportServices} />}
            {section === "barbers" && <BarbersPanel data={reportData.data as ReportBarbers} />}
            {section === "customers" && <CustomersPanel data={reportData.data as ReportCustomers} />}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <ReportDateRangePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleCustomRangeApply}
        initialFrom={startDate}
        initialTo={endDate}
        maxDate={getShopDateValue()}
      />
    </div>
  );
}

function ReportsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[320px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Users className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm">No report data is available for this date range. Try selecting a wider period.</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: { label: string; value: string; detail: string } }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{insight.label}</p>
      <p className="font-bold text-gray-900 text-sm mt-0.5">{insight.value}</p>
      <p className="text-xs text-gray-500">{insight.detail}</p>
    </div>
  );
}

function OverviewPanel({ data }: { data: ReportOverview }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Revenue"
          value={`₱${data.total_revenue.toLocaleString()}`}
          icon={PhilippinePeso}
          iconContainerClassName="bg-orange-100"
          iconClassName="text-orange-500"
          size="md"
        />
        <StatCard
          label="Completed"
          value={data.completed_appointments.toString()}
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
          size="md"
        />
        <StatCard
          label="Avg Rating"
          value={data.average_rating.toString()}
          icon={Star}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
          size="md"
        />
        <StatCard
          label="Customers"
          value={data.total_customers.toString()}
          icon={Users}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
          size="md"
        />
        <StatCard
          label="Completion Rate"
          value={`${data.completion_rate}%`}
          icon={TrendingUp}
          iconContainerClassName="bg-teal-100"
          iconClassName="text-teal-500"
          size="md"
        />
        <StatCard
          label="Cancelled"
          value={data.cancelled_count.toString()}
          icon={AlertCircle}
          iconContainerClassName="bg-red-100"
          iconClassName="text-red-500"
          size="md"
        />
      </div>

      {data.insights && data.insights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Key Insights</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.insights.map((insight) => (
              <InsightCard key={insight.label} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenuePanel({ data, granularity }: { data: ReportRevenue; granularity: ReportGranularity }) {
  const revenueConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "#f59e0b" },
  };

  const serviceConfig = data.by_service.reduce((acc, item, i) => {
    acc[item.service_name] = { label: sanitizeString(item.service_name), color: CHART_COLORS[i % CHART_COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  const barberConfig = data.by_barber.reduce((acc, item, i) => {
    acc[item.barber_name] = { label: sanitizeString(item.barber_name), color: CHART_COLORS[i % CHART_COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={`₱${data.total_revenue.toLocaleString()}`} icon={PhilippinePeso} iconContainerClassName="bg-orange-100" iconClassName="text-orange-500" size="md" />
        <StatCard label="Avg per Appointment" value={`₱${data.average_per_appointment.toLocaleString()}`} icon={TrendingUp} iconContainerClassName="bg-teal-100" iconClassName="text-teal-500" size="md" />
        <StatCard label="Online Revenue" value={`₱${data.online_revenue.toLocaleString()}`} icon={Users} iconContainerClassName="bg-blue-100" iconClassName="text-blue-500" size="md" />
        <StatCard label="Walk-in Revenue" value={`₱${data.walkin_revenue.toLocaleString()}`} icon={UserPlus} iconContainerClassName="bg-purple-100" iconClassName="text-purple-500" size="md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Revenue Trend">
          <ChartContainer config={revenueConfig} className="h-[250px] w-full">
            <AreaChart data={data.by_date} margin={{ bottom: 8 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatChartDate(value, granularity, false)}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                angle={-30}
                textAnchor="end"
                height={70}
              />
              <YAxis tickFormatter={(v) => `₱${v}`} axisLine={false} tickLine={false} width={55} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatChartDate(value, granularity)} formatter={(v) => `₱${Number(v).toLocaleString()}`} indicator="dot" />} />
              <Area dataKey="value" fill="url(#revenueFill)" stroke="var(--color-revenue)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Revenue by Service">
          {data.by_service.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={serviceConfig} className="h-[250px] w-full">
              <BarChart data={data.by_service} layout="vertical" barSize={20}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                <YAxis dataKey="service_name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`₱${Number(v).toLocaleString()}`, " Revenue"]} indicator="dot" />} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue by Barber" className="md:col-span-2">
          {data.by_barber.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={barberConfig} className="h-[250px] w-full">
              <BarChart data={data.by_barber} layout="vertical" barSize={20}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                <YAxis dataKey="barber_name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`₱${Number(v).toLocaleString()}`, " Revenue"]} indicator="dot" />} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function AppointmentsPanel({ data, granularity }: { data: ReportAppointments; granularity: ReportGranularity }) {
  const appointmentConfig: ChartConfig = {
    completed: { label: "Completed", color: "#10b981" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
    no_show: { label: "No-show", color: "#9ca3af" },
  };

  const dayOfWeekConfig: ChartConfig = {
    completed: { label: "Completed", color: "#10b981" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
    no_show: { label: "No-show", color: "#9ca3af" },
  };

  const peakHourConfig: ChartConfig = {
    count: { label: "Appointments", color: "#3b82f6" },
  };

  const totalCompleted = data.completed;
  const totalCancelled = data.cancelled;
  const totalNoShow = data.no_show;
  const statusBreakdown = [
    { name: "Completed", value: totalCompleted, color: "#10b981" },
    { name: "Cancelled", value: totalCancelled, color: "#ef4444" },
    { name: "No-show", value: totalNoShow, color: "#9ca3af" },
  ];

  const statusConfig: ChartConfig = {
    Completed: { label: "Completed", color: "#10b981" },
    Cancelled: { label: "Cancelled", color: "#ef4444" },
    "No-show": { label: "No-show", color: "#9ca3af" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={data.total.toString()} icon={CheckCircle2} iconContainerClassName="bg-blue-100" iconClassName="text-blue-500" size="md" />
        <StatCard label="Completion Rate" value={`${data.completion_rate}%`} icon={TrendingUp} iconContainerClassName="bg-green-100" iconClassName="text-green-500" size="md" />
        <StatCard label="Cancellation Rate" value={`${data.cancellation_rate}%`} icon={AlertCircle} iconContainerClassName="bg-red-100" iconClassName="text-red-500" size="md" />
        <StatCard label="Avg per Day" value={data.average_per_day.toString()} icon={Users} iconContainerClassName="bg-purple-100" iconClassName="text-purple-500" size="md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Appointment Volume">
          <ChartContainer config={appointmentConfig} className="h-[250px] w-full">
            <BarChart data={data.by_date} margin={{ bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatChartDate(value, granularity, false)}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                angle={-30}
                textAnchor="end"
                height={70}
              />
              <YAxis axisLine={false} tickLine={false} width={40} tickFormatter={(v) => Math.floor(v).toString()} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatChartDate(value, granularity)} indicator="dot" className="min-w-48" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="no_show" stackId="a" fill="var(--color-no_show)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Status Breakdown">
          <ChartContainer config={statusConfig} className="h-[250px] w-full">
            <PieChart>
              <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={3}>
                {statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`${value} `, name]} indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Peak Hours" className="md:col-span-2">
          {data.peak_hours.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={peakHourConfig} className="h-[250px] w-full">
              <BarChart data={data.peak_hours} barSize={20}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => formatTime12(h)}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} width={40} tickFormatter={(v) => Math.floor(v).toString()} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => formatTime12(String(l))}
                      formatter={(value) => [`${value} appointments`]}
                      indicator="dot"
                    />
                  }
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Day of Week" className="md:col-span-2">
          <ChartContainer config={dayOfWeekConfig} className="h-[250px] w-full">
            <BarChart data={data.by_day_of_week}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="day" tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={40} tickFormatter={(v) => Math.floor(v).toString()} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="no_show" stackId="a" fill="var(--color-no_show)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ServicesPanel({ data }: { data: ReportServices }) {
  const serviceCountConfig: ChartConfig = data.services.reduce((acc, item, i) => {
    acc[item.service_name] = { label: sanitizeString(item.service_name), color: CHART_COLORS[i % CHART_COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard
          label="Most Booked"
          value={<span className="line-clamp-2 break-words text-xs leading-tight sm:text-base">{data.most_booked ? sanitizeString(data.most_booked.service_name) : "—"}</span>}
          icon={CheckCircle2}
          iconContainerClassName="hidden bg-green-100 sm:block"
          iconClassName="text-green-500"
          className="min-w-0 p-2 sm:p-3"
          size="sm"
        />
        <StatCard
          label="Least Booked"
          value={<span className="line-clamp-2 break-words text-xs leading-tight sm:text-base">{data.least_booked ? sanitizeString(data.least_booked.service_name) : "—"}</span>}
          icon={AlertCircle}
          iconContainerClassName="hidden bg-orange-100 sm:block"
          iconClassName="text-orange-500"
          className="min-w-0 p-2 sm:p-3"
          size="sm"
        />
      </div>

      {data.services.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Service Distribution by Count">
            <ChartContainer config={serviceCountConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie data={data.services} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3} dataKey="completed_count" nameKey="service_name" strokeWidth={3}>
                  {data.services.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => `${name}: ${value}`} indicator="dot" />} />
                <ChartLegend content={<ChartLegendContent nameKey="service_name" />} />
              </PieChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard title="Revenue by Service">
            <ChartContainer config={serviceCountConfig} className="h-[250px] w-full">
              <BarChart data={data.services} layout="vertical" barSize={20}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                <YAxis dataKey="service_name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`₱${Number(v).toLocaleString()}`, " Revenue"]} indicator="dot" />} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function BarbersPanel({ data }: { data: ReportBarbers }) {
  const barberConfig: ChartConfig = data.barbers.reduce((acc, item, i) => {
    acc[item.barber_name] = { label: sanitizeString(item.barber_name), color: CHART_COLORS[i % CHART_COLORS.length] };
    return acc;
  }, {} as ChartConfig);

  const barberRevenueConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "#f59e0b" },
  };

  return (
    <div className="space-y-6">
      {data.barbers.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Completed Appointments by Barber">
              <ChartContainer config={barberConfig} className="h-[250px] w-full">
                <BarChart data={data.barbers} layout="vertical" barSize={20}>
                  <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                  <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => Math.floor(v).toString()} />
                  <YAxis dataKey="barber_name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${v}`, " Completed"]} indicator="dot" />} />
                  <Bar dataKey="completed_count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Completed" />
                </BarChart>
              </ChartContainer>
            </ChartCard>

            <ChartCard title="Revenue by Barber">
              <ChartContainer config={barberRevenueConfig} className="h-[250px] w-full">
                <BarChart data={data.barbers} layout="vertical" barSize={20}>
                  <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                  <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <YAxis dataKey="barber_name" type="category" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`₱${Number(v).toLocaleString()}`, " Revenue"]} indicator="dot" />} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ChartContainer>
            </ChartCard>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Barber</th>
                  <th className="px-4 py-3 font-medium text-right">Appointments</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Rating</th>
                  <th className="px-4 py-3 font-medium text-right">Completion</th>
                </tr>
              </thead>
              <tbody>
                {data.barbers.map((b) => (
                  <tr key={b.barber_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{sanitizeString(b.barber_name)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.completed_count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₱{b.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {b.average_rating !== null ? `${b.average_rating} ★` : "—"}
                      {b.rating_count > 0 && <span className="text-gray-400 ml-1">({b.rating_count})</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CustomersPanel({ data }: { data: ReportCustomers }) {
  const ratingConfig: ChartConfig = {
    count: { label: "Ratings", color: "#8b5cf6" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Customers Served" value={data.total_customers_served.toString()} icon={Users} iconContainerClassName="bg-blue-100" iconClassName="text-blue-500" size="md" />
        <StatCard label="New Customers" value={data.new_customers.toString()} icon={UserPlus} iconContainerClassName="bg-green-100" iconClassName="text-green-500" size="md" />
        <StatCard label="Returning" value={data.returning_customers.toString()} icon={RefreshCw} iconContainerClassName="bg-teal-100" iconClassName="text-teal-500" size="md" />
        <StatCard label="Avg Rating" value={data.average_rating.toString()} icon={Star} iconContainerClassName="bg-yellow-100" iconClassName="text-yellow-500" size="md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Rating Distribution">
          <ChartContainer config={ratingConfig} className="h-[250px] w-full">
            <BarChart data={data.rating_distribution} barSize={40}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="rating" tickFormatter={(r) => `${r} ★`} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`${value} ratings `, name]} indicator="dot" />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-bold text-gray-900">Returning Customer Rate</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            The percentage of registered customers with an appointment this period who also had an appointment before it.
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="text-3xl font-bold text-blue-600">{data.repeat_rate}%</div>
            <p className="text-right text-sm text-gray-500">
              {data.returning_customers} of {data.total_customers_served} customers
            </p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-label="Returning customer rate"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={data.repeat_rate}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, data.repeat_rate))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-200 p-5", className)}>
      <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[250px] flex items-center justify-center text-gray-400">
      No data available for this period
    </div>
  );
}

export function ReportsAnalytics() {
  return (
    <Suspense fallback={<ReportsLoadingSkeleton />}>
      <ReportsAnalyticsInner />
    </Suspense>
  );
}
