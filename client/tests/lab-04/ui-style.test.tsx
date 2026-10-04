import "@testing-library/jest-dom/vitest";

// Source files are read as text through Vite raw imports.
import actionsTakenSource from "../../src/ActionsTaken.tsx?raw";
import dashboardListSource from "../../src/components/DashboardTicketList.tsx?raw";
import metricCardSource from "../../src/components/MetricCard.tsx?raw";
import statusBadgeSource from "../../src/components/TicketStatusBadge.tsx?raw";
import requesterDashboardSource from "../../src/RequesterDashboard.tsx?raw";
import staffDashboardSource from "../../src/StaffDashboard.tsx?raw";
import workflowSource from "../../src/TicketWorkflowControl.tsx?raw";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TicketStatusBadge, {
  formatStatusLabel,
} from "../../src/components/TicketStatusBadge.js";

// STY-01 and STY-02 (docs/lab-04/tests.md).

const LAB4_SOURCES: Record<string, string> = {
  "ActionsTaken.tsx": actionsTakenSource,
  "TicketWorkflowControl.tsx": workflowSource,
  "RequesterDashboard.tsx": requesterDashboardSource,
  "StaffDashboard.tsx": staffDashboardSource,
  "components/MetricCard.tsx": metricCardSource,
  "components/TicketStatusBadge.tsx": statusBadgeSource,
  "components/DashboardTicketList.tsx": dashboardListSource,
};

const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];



describe("Lab 4 Zen Green style rules", () => {
  it("STY-01: Lab 4 components use shared classes, not inline colours or styles", () => {
    for (const [file, text] of Object.entries(LAB4_SOURCES)) {

      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, file).not.toMatch(/style=\{\{/);
      expect(text, file).toMatch(/className=/);
    }
  });


  it("STY-02: every Ticket status badge includes readable text", () => {
    for (const status of STATUSES) {
      const { unmount } = render(<TicketStatusBadge status={status} />);
      const label = formatStatusLabel(status);

      expect(screen.getByText(label)).toHaveClass("tk-badge");
      expect(label).not.toMatch(/_/);
      unmount();
    }
  });

  it("STY-02: follow-up and lifecycle badges are text, not colour only", () => {
    const text = actionsTakenSource;

    expect(text).toContain("Follow-up needed");
    expect(text).toContain('PLANNED: "Planned"');
    expect(text).toContain('COMPLETED: "Completed"');
    expect(text).toContain('CANCELLED: "Cancelled"');
  });
});
