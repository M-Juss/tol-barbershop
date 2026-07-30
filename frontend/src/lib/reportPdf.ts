import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

import { sanitizeString } from "@/lib/sanitizer";
import { formatTime12 } from "@/lib/time-slots";
import type {
  AnalyticsKPI,
  AppointmentVolumePoint,
  BarberStat,
  DayOfWeekStat,
  PeakHourStat,
  ReportGranularity,
  ReportPeriod,
  RatingStat,
  ServiceStat,
  TimeSeriesPoint,
  CompleteReportResponse,
} from "@/services/manager/analytics.api";

type ReportDocument = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const NAVY: [number, number, number] = [15, 39, 68];
const RED: [number, number, number] = [196, 30, 42];
const SLATE: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
const BORDER: [number, number, number] = [226, 232, 240];
const WHITE: [number, number, number] = [255, 255, 255];
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TABLE_TOP_MARGIN = 23;
const TABLE_BOTTOM_MARGIN = 18;

const periodLabels: Record<ReportPeriod, string> = {
  daily: "Last 7 Days",
  weekly: "Last 12 Weeks",
  monthly: "Last 12 Months",
  yearly: "Last 5 Years",
  "7_days": "Last 7 Days",
  "30_days": "Last Month",
  "3_months": "Last 3 Months",
  "6_months": "Last 6 Months",
  "12_months": "Last 12 Months",
  custom: "Custom Range",
};

function toFiniteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: unknown): string {
  return `PHP ${toFiniteNumber(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCount(value: unknown): string {
  return toFiniteNumber(value).toLocaleString("en-PH");
}

function formatPercent(value: unknown): string {
  return `${toFiniteNumber(value).toFixed(1)}%`;
}

function calculatePercent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBucketLabel(label: string, granularity: ReportGranularity): string {
  if (granularity === "daily") {
    return new Date(`${label}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (granularity === "weekly") {
    return `Week of ${formatDate(label)}`;
  }

  if (granularity === "monthly") {
    const [year, month] = label.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" },
    );
  }

  return label.slice(0, 4);
}

function findHighest<T>(items: T[], value: (item: T) => number): T | null {
  return items.reduce<T | null>(
    (highest, item) =>
      highest === null || value(item) > value(highest) ? item : highest,
    null,
  );
}

function getFinalY(doc: ReportDocument, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function baseTableOptions(): UserOptions {
  return {
    theme: "plain",
    margin: {
      top: TABLE_TOP_MARGIN,
      right: MARGIN,
      bottom: TABLE_BOTTOM_MARGIN,
      left: MARGIN,
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: SLATE,
      cellPadding: { top: 2.4, right: 2, bottom: 2.4, left: 2 },
      lineColor: BORDER,
      lineWidth: { bottom: 0.15 },
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      halign: "left",
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: LIGHT,
    },
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: NAVY,
      fontStyle: "bold",
      halign: "left",
      lineWidth: 0,
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
  };
}

function drawPageHeader(doc: jsPDF, period: ReportPeriod): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 15, "F");
  doc.setFillColor(...RED);
  doc.rect(0, 0, 3, 15, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("TOL BARBERSHOP", MARGIN, 9.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("MANAGEMENT PERFORMANCE REPORT", PAGE_WIDTH / 2, 9.5, {
    align: "center",
  });
  doc.text(periodLabels[period].toUpperCase(), PAGE_WIDTH - MARGIN, 9.5, {
    align: "right",
  });
}

function drawPageFooters(
  doc: jsPDF,
  period: ReportPeriod,
  range: AnalyticsKPI["date_range"],
): void {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    if (page > 1) {
      drawPageHeader(doc, period);
    }

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_HEIGHT - 13, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("MANAGEMENT USE ONLY", MARGIN, PAGE_HEIGHT - 8);
    doc.text(
      `${formatDate(range.from)} - ${formatDate(range.to)}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: "center" },
    );
    doc.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, {
      align: "right",
    });
  }
}

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/Tol-Logo-White-Bg.png");
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawCoverHeader(
  doc: jsPDF,
  period: ReportPeriod,
  range: AnalyticsKPI["date_range"],
  logo: string | null,
): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 45, "F");
  doc.setFillColor(...RED);
  doc.rect(0, 0, 5, 45, "F");

  let textX = MARGIN;
  if (logo) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(MARGIN, 8, 28, 28, 2, 2, "F");
    doc.addImage(logo, "PNG", MARGIN + 2, 10, 24, 24, undefined, "FAST");
    textX = MARGIN + 35;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text("TOL BARBERSHOP", textX, 14);
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text("MANAGEMENT PERFORMANCE REPORT", textX, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${periodLabels[period]}  |  ${formatDate(range.from)} - ${formatDate(range.to)}`,
    textX,
    32,
  );
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...RED);
  doc.rect(MARGIN, y - 4.2, 2, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), MARGIN + 5, y);
  return y + 5;
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
): void {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, 19, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(value.length > 18 ? 10 : 12);
  doc.setTextColor(...NAVY);
  doc.text(value, x + 4, y + 14.5);
}

function drawNoData(doc: jsPDF, y: number): number {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 15, 1.5, 1.5, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("No data available for this reporting period.", PAGE_WIDTH / 2, y + 9, {
    align: "center",
  });
  return y + 15;
}

function addPage(doc: jsPDF): number {
  doc.addPage();
  return 28;
}

export async function downloadAnalyticsReportPdf(
  report: CompleteReportResponse,
): Promise<void> {
  const { meta, data } = report;
  const period = meta.period;
  const granularity = meta.granularity;
  const {
    overview: overviewRaw,
    revenue: revenueRaw,
    appointments: appointmentRaw,
    services: serviceRaw,
    barbers: barberRaw,
    customers: customersRaw,
  } = data;

  const kpi: AnalyticsKPI = {
    total_revenue: toFiniteNumber(
      overviewRaw.total_revenue ?? revenueRaw.total_revenue,
    ),
    completed_appointments: toFiniteNumber(
      overviewRaw.completed_appointments ?? appointmentRaw.completed,
    ),
    average_rating: toFiniteNumber(
      overviewRaw.average_rating ?? customersRaw.average_rating,
    ),
    total_customers: toFiniteNumber(
      overviewRaw.total_customers ?? customersRaw.total_customers_served,
    ),
    completion_rate: toFiniteNumber(
      overviewRaw.completion_rate ?? appointmentRaw.completion_rate,
    ),
    walkin_count: toFiniteNumber(appointmentRaw.walkin_count),
    cancelled_count: toFiniteNumber(
      overviewRaw.cancelled_count ?? appointmentRaw.cancelled,
    ),
    date_range: meta.date_range,
  };

  const revenueSeries: TimeSeriesPoint[] =
    revenueRaw.by_date?.map((point) => ({
      label: point.date,
      value: toFiniteNumber(point.value),
    })) ?? [];
  const appointmentSeries: AppointmentVolumePoint[] =
    appointmentRaw.by_date?.map((point) => ({
      label: point.date,
      completed: toFiniteNumber(point.completed),
      cancelled: toFiniteNumber(point.cancelled),
      no_show: toFiniteNumber(point.no_show),
    })) ?? [];
  const serviceStats: ServiceStat[] =
    serviceRaw.services?.map((service) => ({
      service_name: service.service_name,
      completed_count: toFiniteNumber(service.completed_count),
      revenue: toFiniteNumber(service.revenue),
    })) ?? [];
  const barberStats: BarberStat[] =
    barberRaw.barbers?.map((barber) => ({
      barber_name: barber.barber_name,
      completed_count: toFiniteNumber(barber.completed_count),
      revenue: toFiniteNumber(barber.revenue),
      total_appointments: toFiniteNumber(barber.total_appointments),
    })) ?? [];
  const rawRatingStats: RatingStat[] =
    customersRaw.rating_distribution?.map((rating) => ({
      rating: toFiniteNumber(rating.rating),
      count: toFiniteNumber(rating.count),
    })) ?? [];
  const ratingCounts = rawRatingStats.reduce<Map<number, number>>(
    (counts, item) => {
      if (item.rating >= 1 && item.rating <= 5) {
        counts.set(item.rating, (counts.get(item.rating) ?? 0) + item.count);
      }

      return counts;
    },
    new Map(),
  );
  const ratingStats: RatingStat[] = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratingCounts.get(rating) ?? 0,
  }));
  const peakHourStats: PeakHourStat[] =
    appointmentRaw.peak_hours?.map((peakHour) => ({
      hour: peakHour.hour,
      count: toFiniteNumber(peakHour.count),
    })) ?? [];
  const dayOfWeekStats: DayOfWeekStat[] =
    appointmentRaw.by_day_of_week?.map((day) => ({
      day: day.day,
      day_index: toFiniteNumber(day.day_index),
      completed: toFiniteNumber(day.completed),
      cancelled: toFiniteNumber(day.cancelled),
      no_show: toFiniteNumber(day.no_show),
      total: toFiniteNumber(day.total),
    })) ?? [];
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as ReportDocument;
  const logo = await loadLogo();
  const ratingCount = ratingStats.reduce((sum, item) => sum + item.count, 0);
  const totalCompleted = appointmentSeries.reduce(
    (sum, item) => sum + item.completed,
    0,
  );
  const totalCancelled = appointmentSeries.reduce(
    (sum, item) => sum + item.cancelled,
    0,
  );
  const totalNoShow = appointmentSeries.reduce(
    (sum, item) => sum + item.no_show,
    0,
  );
  const resolvedAppointments = totalCompleted + totalCancelled + totalNoShow;
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  doc.setProperties({
    title: `TOL Analytics - ${periodLabels[period]}`,
    subject: `${formatDate(kpi.date_range.from)} to ${formatDate(kpi.date_range.to)}`,
    author: "TOL Barbershop",
    creator: "TOL Barbershop Management System",
  });

  drawCoverHeader(doc, period, kpi.date_range, logo);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${generatedAt}`, PAGE_WIDTH - MARGIN, 51, {
    align: "right",
  });

  let y = drawSectionTitle(doc, "Executive Summary", 61);
  const ratingSentence =
    ratingCount > 0
      ? `Customers provided an average rating of ${kpi.average_rating.toFixed(1)}/5 from ${formatCount(ratingCount)} submitted ratings.`
      : "No customer ratings were submitted for appointments in this period.";
  const summary = `From ${formatDate(kpi.date_range.from)} through ${formatDate(kpi.date_range.to)}, TOL Barbershop generated ${formatCurrency(kpi.total_revenue)} from ${formatCount(kpi.completed_appointments)} completed appointments, serving ${formatCount(kpi.total_customers)} registered customers. The completion rate was ${formatPercent(kpi.completion_rate)}. ${ratingSentence}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  const summaryLines = doc.splitTextToSize(summary, CONTENT_WIDTH);
  doc.text(summaryLines, MARGIN, y + 1.5, { lineHeightFactor: 1.45 });
  y += summaryLines.length * 5 + 7;

  y = drawSectionTitle(doc, "Key Metrics", y);
  const cardGap = 4;
  const cardWidth = (CONTENT_WIDTH - cardGap * 2) / 3;
  const metrics = [
    ["Total Revenue", formatCurrency(kpi.total_revenue)],
    ["Completed", formatCount(kpi.completed_appointments)],
    ["Customers Served", formatCount(kpi.total_customers)],
    ["Completion Rate", formatPercent(kpi.completion_rate)],
    ["Average Rating", `${kpi.average_rating.toFixed(1)} / 5`],
    ["Walk-ins", formatCount(kpi.walkin_count)],
  ];

  metrics.forEach(([label, value], index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    drawMetricCard(
      doc,
      MARGIN + column * (cardWidth + cardGap),
      y + row * 23,
      cardWidth,
      label,
      value,
    );
  });
  y += 50;

  y = drawSectionTitle(doc, "Management Highlights", y);
  const topRevenuePeriod = findHighest(revenueSeries, (item) => item.value);
  const topService = findHighest(serviceStats, (item) => item.revenue);
  const topBarber = findHighest(barberStats, (item) => item.revenue);
  const busiestDay = findHighest(dayOfWeekStats, (item) => item.total);
  const busiestHour = findHighest(peakHourStats, (item) => item.count);
  const highlights: string[] = [];

  if (topRevenuePeriod && topRevenuePeriod.value > 0) {
    highlights.push(
      `Highest-revenue period: ${formatBucketLabel(topRevenuePeriod.label, granularity)}, generating ${formatCurrency(topRevenuePeriod.value)}.`,
    );
  }
  if (topService && topService.completed_count > 0) {
    highlights.push(
      `Leading service: ${sanitizeString(topService.service_name)}, with ${formatCount(topService.completed_count)} completed appointments and ${formatCurrency(topService.revenue)} in revenue.`,
    );
  }
  if (topBarber && topBarber.completed_count > 0) {
    highlights.push(
      `Leading barber by revenue: ${sanitizeString(topBarber.barber_name)}, completing ${formatCount(topBarber.completed_count)} appointments and generating ${formatCurrency(topBarber.revenue)}.`,
    );
  }
  if (
    busiestDay &&
    busiestDay.total > 0 &&
    busiestHour &&
    busiestHour.count > 0
  ) {
    highlights.push(
      `Highest demand occurred on ${busiestDay.day}s, with ${formatCount(busiestDay.total)} appointments; the busiest recorded hour was ${formatTime12(busiestHour.hour)} with ${formatCount(busiestHour.count)} appointments.`,
    );
  }
  if (resolvedAppointments > 0) {
    highlights.push(
      `${formatCount(totalCancelled)} cancellations and ${formatCount(totalNoShow)} no-shows represented ${formatPercent(calculatePercent(totalCancelled + totalNoShow, resolvedAppointments))} of resolved appointments.`,
    );
  }

  if (highlights.length === 0) {
    y = drawNoData(doc, y);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    highlights.forEach((highlight) => {
      const lines = doc.splitTextToSize(highlight, CONTENT_WIDTH - 8);
      doc.setFillColor(...RED);
      doc.circle(MARGIN + 1.5, y - 1, 0.8, "F");
      doc.text(lines, MARGIN + 6, y, { lineHeightFactor: 1.35 });
      y += lines.length * 4.2 + 3;
    });
  }

  y = addPage(doc);
  y = drawSectionTitle(doc, "Business Trends", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Revenue and resolved appointment outcomes for every recorded reporting bucket.",
    MARGIN,
    y,
  );
  y += 5;

  const trendMap = new Map<
    string,
    { revenue: number; completed: number; cancelled: number; noShow: number }
  >();
  revenueSeries.forEach((item) => {
    const label = String(item.label);
    const current = trendMap.get(label) ?? {
      revenue: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };
    trendMap.set(label, { ...current, revenue: item.value });
  });
  appointmentSeries.forEach((item) => {
    const label = String(item.label);
    const current = trendMap.get(label) ?? {
      revenue: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };
    trendMap.set(label, {
      ...current,
      completed: item.completed,
      cancelled: item.cancelled,
      noShow: item.no_show,
    });
  });

  const trendRows = [...trendMap.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([label, values]) => {
      const resolved = values.completed + values.cancelled + values.noShow;
      return [
        formatBucketLabel(label, granularity),
        formatCurrency(values.revenue),
        formatCount(values.completed),
        formatCount(values.cancelled),
        formatCount(values.noShow),
        formatPercent(calculatePercent(values.completed, resolved)),
      ];
    });

  if (trendRows.length === 0) {
    drawNoData(doc, y);
  } else {
    autoTable(doc, {
      ...baseTableOptions(),
      startY: y,
      head: [
        ["Period", "Revenue", "Completed", "Cancelled", "No-show", "Completion"],
      ],
      body: trendRows,
      foot: [
        [
          "OVERALL",
          formatCurrency(kpi.total_revenue),
          formatCount(totalCompleted),
          formatCount(totalCancelled),
          formatCount(totalNoShow),
          formatPercent(calculatePercent(totalCompleted, resolvedAppointments)),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 42 },
        5: { cellWidth: 28 },
      },
    });
  }

  y = addPage(doc);
  y = drawSectionTitle(doc, "Service Performance", y);
  const serviceRevenue = serviceStats.reduce((sum, item) => sum + item.revenue, 0);
  const serviceCompleted = serviceStats.reduce(
    (sum, item) => sum + item.completed_count,
    0,
  );
  const sortedServices = [...serviceStats].sort((a, b) => b.revenue - a.revenue);

  if (sortedServices.length === 0) {
    y = drawNoData(doc, y);
  } else {
    autoTable(doc, {
      ...baseTableOptions(),
      startY: y,
      head: [
        ["Rank", "Service", "Completed", "Revenue", "Revenue Share", "Average Sale"],
      ],
      body: sortedServices.map((item, index) => [
        index + 1,
        sanitizeString(item.service_name),
        formatCount(item.completed_count),
        formatCurrency(item.revenue),
        formatPercent(calculatePercent(item.revenue, serviceRevenue)),
        formatCurrency(
          item.completed_count > 0 ? item.revenue / item.completed_count : 0,
        ),
      ]),
      foot: [
        [
          "",
          "OVERALL",
          formatCount(serviceCompleted),
          formatCurrency(serviceRevenue),
          formatPercent(serviceRevenue > 0 ? 100 : 0),
          formatCurrency(
            serviceCompleted > 0 ? serviceRevenue / serviceCompleted : 0,
          ),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 13 },
        1: { cellWidth: 48 },
        3: { cellWidth: 36 },
        5: { cellWidth: 34 },
      },
    });
    y = getFinalY(doc, y) + 11;
  }

  if (y > PAGE_HEIGHT - 65) {
    y = addPage(doc);
  }
  y = drawSectionTitle(doc, "Barber Performance", y);
  const sortedBarbers = [...barberStats].sort((a, b) => b.revenue - a.revenue);
  const barberAppointments = barberStats.reduce(
    (sum, item) => sum + item.total_appointments,
    0,
  );
  const barberCompleted = barberStats.reduce(
    (sum, item) => sum + item.completed_count,
    0,
  );
  const barberRevenue = barberStats.reduce((sum, item) => sum + item.revenue, 0);

  if (sortedBarbers.length === 0) {
    drawNoData(doc, y);
  } else {
    autoTable(doc, {
      ...baseTableOptions(),
      startY: y,
      head: [["Rank", "Barber", "Total", "Completed", "Completion", "Revenue"]],
      body: sortedBarbers.map((item, index) => [
        index + 1,
        sanitizeString(item.barber_name),
        formatCount(item.total_appointments),
        formatCount(item.completed_count),
        formatPercent(
          calculatePercent(item.completed_count, item.total_appointments),
        ),
        formatCurrency(item.revenue),
      ]),
      foot: [
        [
          "",
          "OVERALL",
          formatCount(barberAppointments),
          formatCount(barberCompleted),
          formatPercent(calculatePercent(barberCompleted, barberAppointments)),
          formatCurrency(barberRevenue),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 13 },
        1: { cellWidth: 53 },
        5: { cellWidth: 40 },
      },
    });
  }

  y = addPage(doc);
  y = drawSectionTitle(doc, "Demand By Day", y);
  const dayTotal = dayOfWeekStats.reduce((sum, item) => sum + item.total, 0);
  const dayCompleted = dayOfWeekStats.reduce(
    (sum, item) => sum + item.completed,
    0,
  );
  const dayCancelled = dayOfWeekStats.reduce(
    (sum, item) => sum + item.cancelled,
    0,
  );
  const dayNoShow = dayOfWeekStats.reduce(
    (sum, item) => sum + item.no_show,
    0,
  );

  if (dayOfWeekStats.length === 0) {
    y = drawNoData(doc, y);
  } else {
    autoTable(doc, {
      ...baseTableOptions(),
      startY: y,
      head: [["Day", "Total", "Completed", "Cancelled", "No-show"]],
      body: dayOfWeekStats.map((item) => [
        item.day,
        formatCount(item.total),
        formatCount(item.completed),
        formatCount(item.cancelled),
        formatCount(item.no_show),
      ]),
      foot: [
        [
          "OVERALL",
          formatCount(dayTotal),
          formatCount(dayCompleted),
          formatCount(dayCancelled),
          formatCount(dayNoShow),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 54 },
      },
    });
    y = getFinalY(doc, y) + 11;
  }

  if (y > PAGE_HEIGHT - 70) {
    y = addPage(doc);
  }
  y = drawSectionTitle(doc, "Peak Hours", y);

  if (peakHourStats.length === 0) {
    y = drawNoData(doc, y);
  } else {
    const peakTotal = peakHourStats.reduce((sum, item) => sum + item.count, 0);
    autoTable(doc, {
      ...baseTableOptions(),
      startY: y,
      head: [["Time", "Appointments", "Share"]],
      body: peakHourStats.map((item) => [
        formatTime12(item.hour),
        formatCount(item.count),
        formatPercent(calculatePercent(item.count, peakTotal)),
      ]),
      foot: [
        [
          "OVERALL",
          formatCount(peakTotal),
          formatPercent(peakTotal > 0 ? 100 : 0),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 74 },
      },
    });
    y = getFinalY(doc, y) + 11;
  }

  const ratingSectionHeight = 65;
  if (
    ratingCount > 0 &&
    y + ratingSectionHeight > PAGE_HEIGHT - TABLE_BOTTOM_MARGIN
  ) {
    y = addPage(doc);
  }
  y = drawSectionTitle(doc, "Customer Ratings", y);

  if (ratingCount === 0) {
    y = drawNoData(doc, y);
  } else {
    autoTable(doc, {
      ...baseTableOptions(),
      pageBreak: "avoid",
      startY: y,
      head: [["Rating", "Responses", "Share"]],
      body: ratingStats.map((item) => [
        `${item.rating} ${item.rating === 1 ? "star" : "stars"}`,
        formatCount(item.count),
        formatPercent(calculatePercent(item.count, ratingCount)),
      ]),
      foot: [["OVERALL", formatCount(ratingCount), "100.0%"]],
      columnStyles: {
        0: { cellWidth: 74 },
      },
    });
  }

  drawPageFooters(doc, period, kpi.date_range);

  const timeframe = periodLabels[period].toUpperCase().replace(/\s+/g, "-");
  const filename = `TOL-ANALYTICS-${timeframe}-${kpi.date_range.from}-TO-${kpi.date_range.to}.pdf`;
  doc.save(filename);
}
