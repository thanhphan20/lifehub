"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiUrl } from "@/config/api-config";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

type WorkoutLog = {
  id: string;
  type: string;
  sets: number;
  reps: number;
  weight: number;
  createdAt: string;
};

type WorkoutResponse = {
  data: WorkoutLog[];
  total: number;
  limit: number;
  offset: number;
};

type StravaActivity = {
  id: number;
  name: string;
  start_date: string;
  distance: number; // meters
  moving_time: number;
};

type ChartMetricKey = "totalWeight" | "distanceKm";

type ChartPoint = {
  date: string;
  totalWeight?: number;
  distanceKm?: number;
};

type ChartMeta = {
  label: string;
  color: string;
};

export default function FitnessDashboardPage() {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>("totalWeight");
  const [chartMeta, setChartMeta] = useState<ChartMeta>({
    label: "Total Weight",
    color: "hsl(var(--chart-1))",
  });
  const [dataSource, setDataSource] = useState<"workouts" | "strava">("workouts");
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkoutLogs = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl("/workouts?limit=20"));
      if (!res.ok) {
        throw new Error(`Failed to fetch workouts (${res.status})`);
      }

      const json = (await res.json()) as WorkoutResponse;
      const normalized = (json.data ?? []).reverse().map((w) => ({
        date: new Date(w.createdAt).toLocaleDateString(),
        totalWeight: w.sets * w.reps * w.weight,
      }));

      setDataSource("workouts");
      setChartMetric("totalWeight");
      setChartMeta({
        label: "Total Weight",
        color: "hsl(var(--chart-1))",
      });
      setChartData(normalized);
      return true;
    } catch (err) {
      console.error("Workout logs fetch failed", err);
      return false;
    }
  }, []);

  const fetchStravaActivities = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl("/strava/activities?perPage=20"), { cache: "no-store" });

      if (res.status === 404) {
        setIsStravaConnected(false);
        return false;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch Strava activities (${res.status})`);
      }

      const activities = (await res.json()) as StravaActivity[];

      setIsStravaConnected(true);
      setDataSource("strava");
      setChartMetric("distanceKm");
      setChartMeta({
        label: "Distance (km)",
        color: "hsl(var(--chart-2))",
      });

      const normalized = activities.reverse().map((activity) => ({
        date: new Date(activity.start_date).toLocaleDateString(),
        distanceKm: Number((activity.distance / 1000).toFixed(2)),
      }));

      setChartData(normalized);
      return true;
    } catch (err) {
      console.error("Strava activities fetch failed", err);
      setIsStravaConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const stravaLoaded = await fetchStravaActivities();
      if (!stravaLoaded) {
        const workoutsLoaded = await fetchWorkoutLogs();
        if (!workoutsLoaded) {
          setError("Unable to load workout data. Please try again.");
        }
      }

      setLoading(false);
    };

    void loadData();
  }, [fetchStravaActivities, fetchWorkoutLogs]);

  const connectStrava = async () => {
    try {
      const res = await fetch(apiUrl("/strava/authorize"));
      if (!res.ok) {
        throw new Error(`Failed to get Strava authorize URL (${res.status})`);
      }
      const json = (await res.json()) as { url?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error("Missing authorize URL from API");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to start Strava connect flow. Please try again.");
    }
  };

  const chartConfig = useMemo(
    () =>
      ({
        [chartMetric]: {
          label: chartMeta.label,
          color: chartMeta.color,
        },
      }) as ChartConfig,
    [chartMetric, chartMeta],
  );

  const sourceLabel = dataSource === "strava" ? "Strava activities" : "Workout logs";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fitness Overview</h1>
          <p className="text-muted-foreground">Connect Strava and track your recent workouts and activities.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={connectStrava}>Connect Strava</Button>
          <span className="text-muted-foreground text-xs">
            {isStravaConnected ? "Strava connected" : "Strava not connected"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-muted-foreground text-sm">Loading data…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="text-muted-foreground mb-4 flex items-center justify-between text-sm">
          <span>Showing: {sourceLabel}</span>
          {dataSource === "strava" && chartData.length === 0 && <span>No Strava activities found yet.</span>}
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No data available yet. Log a workout or connect Strava to start tracking.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={chartMetric}
                stroke={`var(--color-${chartMetric})`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
