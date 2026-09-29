"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronRight,
  Heart,
  TrendingDown,
  TrendingUp,
  Radio,
  MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Bridge {
  id: string;
  name: string;
  lat: number;
  lng: number;
  baseline_hz: number;
  current_hz: number | null;
  health: number;
  priority: string;
  trip_count: number;
  last_trip_at: string | null;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

const priorityConfig: Record<string, { label: string; color: string; badgeClass: string }> = {
  critical: {
    label: "CRITICAL",
    color: "text-red-500",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25",
  },
  watch: {
    label: "WATCH",
    color: "text-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25",
  },
  normal: {
    label: "HEALTHY",
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25",
  },
};

function StatusSection({
  reduce,
  bridges,
}: {
  reduce: boolean | null;
  bridges: Bridge[];
}) {
  const totalBridges = bridges.length;
  const criticalCount = bridges.filter((b) => b.priority === "critical").length;
  const totalTrips = bridges.reduce((sum, b) => sum + (b.trip_count || 0), 0);
  const avgHealth =
    totalBridges > 0
      ? bridges.reduce((sum, b) => sum + (b.health || 100), 0) / totalBridges
      : 0;

  const cards = [
    {
      label: "Bridges monitored",
      icon: Building2,
      value: String(totalBridges),
      note: "Active in network",
      tone: "",
    },
    {
      label: "Critical alerts",
      icon: AlertTriangle,
      value: String(criticalCount),
      note: criticalCount > 0 ? "Urgent inspection needed" : "All clear",
      tone: criticalCount > 0 ? "text-red-500" : "text-emerald-500",
    },
    {
      label: "Total inspections",
      icon: Radio,
      value: String(totalTrips),
      note: "Crowd-sourced recordings",
      tone: "",
    },
    {
      label: "Avg. health score",
      icon: Heart,
      value: avgHealth.toFixed(1) + "%",
      note: avgHealth >= 80 ? "Network healthy" : "Attention needed",
      tone:
        avgHealth >= 80
          ? "text-emerald-500"
          : avgHealth >= 50
            ? "text-amber-500"
            : "text-red-500",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.4, delay: index * 0.1 }
            }
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {card.label}
                </CardTitle>
                <Icon
                  className={`size-4 ${card.tone || "text-muted-foreground"}`}
                  aria-hidden
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-xl font-bold tabular-nums sm:text-2xl ${card.tone}`}
                >
                  {card.value}
                </div>
                <p
                  className={`mt-1 text-xs tabular-nums ${card.tone || "text-muted-foreground"}`}
                >
                  {card.note}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function BridgeDetails({
  bridge,
  isOpen,
  onClose,
}: {
  bridge: Bridge | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!bridge) return null;
  const cfg = priorityConfig[bridge.priority] || priorityConfig.normal;
  const freqShift =
    bridge.current_hz != null
      ? (
          ((bridge.current_hz - bridge.baseline_hz) / bridge.baseline_hz) *
          100
        ).toFixed(2)
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Building2 className="size-5" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-xl">{bridge.name}</DialogTitle>
              <DialogDescription className="truncate flex items-center gap-1">
                <MapPin className="size-3" />
                {bridge.lat.toFixed(4)}, {bridge.lng.toFixed(4)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums">
            {bridge.health.toFixed(1)}%
          </span>
          <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6">
          <div>
            <dt className="text-xs text-muted-foreground">
              Baseline frequency
            </dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">
              {bridge.baseline_hz.toFixed(2)} Hz
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Current frequency
            </dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">
              {bridge.current_hz != null
                ? bridge.current_hz.toFixed(2) + " Hz"
                : "No data"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frequency shift</dt>
            <dd
              className={`mt-0.5 text-base font-semibold tabular-nums flex items-center gap-1 ${
                freqShift
                  ? Number(freqShift) < -3
                    ? "text-red-400"
                    : Number(freqShift) < 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {freqShift != null ? (
                <>
                  {Number(freqShift) >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {Number(freqShift) >= 0 ? "+" : ""}
                  {freqShift}%
                </>
              ) : (
                "N/A"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total recordings</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">
              {bridge.trip_count || 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last inspection</dt>
            <dd className="mt-0.5 text-base font-semibold">
              {formatTimeAgo(bridge.last_trip_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Priority</dt>
            <dd className="mt-0.5">
              <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function DataTable({
  onRowClick,
  reduce,
  bridges,
}: {
  onRowClick: (bridge: Bridge) => void;
  reduce: boolean | null;
  bridges: Bridge[];
}) {
  const th =
    "py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap";

  const sorted = [...bridges].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, watch: 1, normal: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Activity className="size-5" aria-hidden />
          Bridge priority ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div
          role="region"
          aria-label="Bridge priority ranking table"
          tabIndex={0}
          className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">
              Bridges ranked by structural health priority. Each row shows
              health metrics and can be expanded for details.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={`${th} text-left`}>Priority</th>
                <th scope="col" className={`${th} text-left`}>Bridge</th>
                <th scope="col" className={`${th} text-right`}>Health</th>
                <th scope="col" className={`${th} text-right`}>Baseline (Hz)</th>
                <th scope="col" className={`${th} hidden text-right md:table-cell`}>Current (Hz)</th>
                <th scope="col" className={`${th} hidden text-right md:table-cell`}>Shift</th>
                <th scope="col" className={`${th} hidden text-right lg:table-cell`}>Recordings</th>
                <th scope="col" className={`${th} hidden text-right lg:table-cell`}>Last seen</th>
                <th scope="col" className={`${th} text-right`}>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No bridges recorded yet. Drive across a bridge with the BridgePulse app to see data here.
                  </td>
                </tr>
              )}
              {sorted.map((bridge, index) => {
                const cfg = priorityConfig[bridge.priority] || priorityConfig.normal;
                const freqShift =
                  bridge.current_hz != null
                    ? ((bridge.current_hz - bridge.baseline_hz) / bridge.baseline_hz) * 100
                    : null;

                return (
                  <motion.tr
                    key={bridge.id}
                    initial={reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={
                      reduce ? { duration: 0 } : { duration: 0.3, delay: index * 0.05 }
                    }
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/50 motion-reduce:transition-none"
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <Badge className={`text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
                    </td>
                    <th scope="row" className="px-3 py-3 text-left sm:px-4">
                      <span className="text-sm font-semibold sm:text-base">{bridge.name}</span>
                    </th>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <span
                        className={`text-sm font-semibold tabular-nums sm:text-base ${
                          bridge.health >= 80
                            ? "text-emerald-400"
                            : bridge.health >= 50
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {bridge.health.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums sm:px-4 sm:text-base">
                      {bridge.baseline_hz.toFixed(2)}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-sm tabular-nums sm:px-4 sm:text-base md:table-cell">
                      {bridge.current_hz != null ? bridge.current_hz.toFixed(2) : "â€”"}
                    </td>
                    <td className="hidden px-3 py-3 text-right sm:px-4 md:table-cell">
                      {freqShift != null ? (
                        <div
                          className={`flex items-center justify-end gap-1 text-sm font-semibold tabular-nums ${
                            freqShift < -3
                              ? "text-red-400"
                              : freqShift < 0
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {freqShift >= 0 ? (
                            <TrendingUp className="size-3 shrink-0" aria-hidden />
                          ) : (
                            <TrendingDown className="size-3 shrink-0" aria-hidden />
                          )}
                          <span className="whitespace-nowrap">
                            {freqShift >= 0 ? "+" : ""}{freqShift.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">â€”</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-sm tabular-nums sm:px-4 lg:table-cell">
                      {bridge.trip_count || 0}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-xs sm:px-4 lg:table-cell text-muted-foreground">
                      {formatTimeAgo(bridge.last_trip_at)}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onRowClick(bridge)}
                        aria-label={`View details for ${bridge.name}`}
                      >
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function BridgeDashboard() {
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    async function fetchBridges() {
      setLoading(true);
      const { data, error } = await supabase
        .from("bridges")
        .select("*")
        .order("health", { ascending: true });

      if (error) {
        console.error("Failed to fetch bridges:", error);
        setBridges([]);
      } else {
        setBridges(data || []);
      }
      setLoading(false);
    }

    fetchBridges();

    const channel = supabase
      .channel("bridges-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bridges" },
        () => {
          fetchBridges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRowClick = (bridge: Bridge) => {
    setSelectedBridge(bridge);
    setIsDetailsOpen(true);
  };

  return (
    <div className="w-full px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={
            shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20">
              <Radio className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                BridgePulse
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Structural health monitoring dashboard â€” live crowd-sourced vibration data
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading bridge data...</p>
            </div>
          </div>
        ) : (
          <>
            <StatusSection reduce={shouldReduceMotion} bridges={bridges} />
            <DataTable
              onRowClick={handleRowClick}
              reduce={shouldReduceMotion}
              bridges={bridges}
            />
            <BridgeDetails
              bridge={selectedBridge}
              isOpen={isDetailsOpen}
              onClose={() => setIsDetailsOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default BridgeDashboard;
