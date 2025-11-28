import { useCallback, useEffect, useState } from "react";
import { api } from "../utils/api";

const DEFAULT_SUMMARY = {
  ownerName: "Owner",
  month: "",
  year: "",
  totalCollection: 0,
  totalExpenses: 0,
  profitLoss: 0,
  totalBeds: 0,
  occupiedBeds: 0,
  vacantBeds: 0,
  totalTenants: 0,
  newTenants: 0,
  nextMonthRentImpact: { amount: 0, moveOut: 0, moveIn: 0 },
  followingMonthRentImpact: { amount: 0, moveOut: 0, moveIn: 0 },
};

export const useOwnerDashboardSummary = () => {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getOwnerDashboardSummary();
      setSummary({
        ...DEFAULT_SUMMARY,
        ...response,
        nextMonthRentImpact: {
          ...DEFAULT_SUMMARY.nextMonthRentImpact,
          ...response?.nextMonthRentImpact,
        },
        followingMonthRentImpact: {
          ...DEFAULT_SUMMARY.followingMonthRentImpact,
          ...response?.followingMonthRentImpact,
        },
      });
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : err?.message || "Failed to load dashboard summary";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
};
