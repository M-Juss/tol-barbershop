import dynamic from "next/dynamic";

const ReportsAnalytics = dynamic(
  () =>
    import("@/layout/manager/ReportsAnalytics").then(
      (mod) => mod.ReportsAnalytics
    )
);

export default function ReportsPage() {
  return <ReportsAnalytics />;
}
