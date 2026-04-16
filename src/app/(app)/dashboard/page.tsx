import { PageFrame } from "@/components/layout/PageFrame";
import { DashboardOverview } from "@/components/views/DashboardOverview";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Dashboard"
        description="Workspace overview — charts and key metrics for your billing workspace."
      />
      <div className="mt-10 space-y-10">
        <DashboardOverview />
      </div>
    </PageFrame>
  );
}
