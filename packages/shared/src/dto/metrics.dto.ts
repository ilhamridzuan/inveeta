export interface SessionMetricBreakdown {
  sessionId: string;
  sessionTitle: string;
  allocatedPax: number;
  confirmedPax: number;
  declinedPax: number;
  pendingPax: number;
}

export interface EventDashboardMetricsDTO {
  totalGuestsInvited: number;
  totalPaxAllocated: number;
  rsvpSummary: {
    attendingCount: number;
    declinedCount: number;
    pendingCount: number;
    totalActualPax: number;
  };
  sessionBreakdown: SessionMetricBreakdown[];
  totalWishesReceived: number;
}
