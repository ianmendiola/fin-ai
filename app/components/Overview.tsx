"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MonthlySummary } from "@/app/lib/types";
import { usd, formatMonth, SPENDING_CATEGORIES } from "@/app/lib/format";
import { Activity, Table, ChevronRight } from "lucide-react";

type DisplayMode = "chart" | "table";

function shortMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  SPENDING_CATEGORIES.map((c) => [c.key, c.color])
);

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SPENDING_CATEGORIES.map((c) => [c.key, c.label])
);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-muted mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted">{entry.name}</span>
          <span className="font-medium ml-auto">{usd(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* Icons for the toggle */
function ChartIcon({ active }: { active: boolean }) {
  return (
    <Activity
      className="w-[18px] h-[18px]"
      stroke={active ? "currentColor" : "#6b7280"}
    />
  );
}

function TableIcon({ active }: { active: boolean }) {
  return (
    <Table
      className="w-[18px] h-[18px]"
      stroke={active ? "currentColor" : "#6b7280"}
    />
  );
}

interface OverviewProps {
  summaries: MonthlySummary[];
  onSelectMonth?: (month: string) => void;
  action?: React.ReactNode;
}

export default function Overview({ summaries, onSelectMonth, action }: OverviewProps) {
  const [mode, setMode] = useState<DisplayMode>("table");

  // Sort oldest → newest
  const sorted = [...summaries].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const chartData = sorted.map((s) => ({
    month: shortMonth(s.month),
    Income: s.totalIncome,
    Spent: s.totalSpent,
    Savings: s.savings,
    grocery: s.grocery,
    general: s.general,
    splurge: s.splurge,
    amex: s.amex,
    appleCard: s.appleCard,
    wifeCC: s.wifeCC,
    direct: s.direct,
  }));

  const avgIncome =
    sorted.reduce((sum, s) => sum + s.totalIncome, 0) / sorted.length;
  const avgSpent =
    sorted.reduce((sum, s) => sum + s.totalSpent, 0) / sorted.length;
  const avgSavings =
    sorted.reduce((sum, s) => sum + s.savings, 0) / sorted.length;

  const axisStyle = {
    fontSize: 11,
    fill: "#6b7280",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  };

  return (
    <div className="space-y-10">
      {/* Hero averages */}
      <div className="space-y-2">
        <p className="text-muted text-sm font-medium tracking-wide uppercase">
          Monthly average
        </p>
        <p
          className={`text-3xl sm:text-5xl font-bold tracking-tight ${
            avgSavings >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          {usd(avgSavings)}
        </p>
        <p className="text-muted text-sm">
          Avg savings across {sorted.length} month
          {sorted.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex gap-3 sm:gap-4">
        <div className="flex-1 rounded-2xl p-4 sm:p-5 bg-positive/[0.06] border border-positive/10">
          <p className="text-positive/70 text-xs font-medium uppercase tracking-wide mb-1">
            Avg Income
          </p>
          <p className="text-lg sm:text-2xl font-semibold">{usd(avgIncome)}</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 sm:p-5 bg-negative/[0.06] border border-negative/10">
          <p className="text-negative/70 text-xs font-medium uppercase tracking-wide mb-1">
            Avg Spent
          </p>
          <p className="text-lg sm:text-2xl font-semibold">{usd(avgSpent)}</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 bg-card rounded-full p-1 w-fit">
        <button
          onClick={() => setMode("table")}
          className={`p-2 rounded-full transition-colors ${
            mode === "table" ? "bg-foreground/10" : ""
          }`}
        >
          <TableIcon active={mode === "table"} />
        </button>
        <button
          onClick={() => setMode("chart")}
          className={`p-2 rounded-full transition-colors ${
            mode === "chart" ? "bg-foreground/10" : ""
          }`}
        >
          <ChartIcon active={mode === "chart"} />
        </button>
      </div>
      {action}
      </div>

      {mode === "chart" ? (
        <ChartView chartData={chartData} axisStyle={axisStyle} />
      ) : (
        <TableView
          summaries={sorted}
          onSelectMonth={onSelectMonth}
        />
      )}
    </div>
  );
}

/* ── Chart View ── */

function ChartView({
  chartData,
  axisStyle,
}: {
  chartData: Record<string, string | number>[];
  axisStyle: { fontSize: number; fill: string; fontFamily: string };
}) {
  return (
    <div className="space-y-10">
      {/* Income vs Spending */}
      <div>
        <h2 className="text-lg font-semibold mb-6">Income vs Spending</h2>
        <div className="bg-card rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#6b7280" }} />
              <Line
                type="monotone"
                dataKey="Income"
                stroke="#16c784"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#16c784", stroke: "none" }}
                activeDot={{ r: 6, fill: "#16c784", stroke: "none" }}
              />
              <Line
                type="monotone"
                dataKey="Spent"
                stroke="#ea3943"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#ea3943", stroke: "none" }}
                activeDot={{ r: 6, fill: "#ea3943", stroke: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Savings */}
      <div>
        <h2 className="text-lg font-semibold mb-6">Net Savings</h2>
        <div className="bg-card rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16c784" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16c784" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#6b7280" }} />
              <Area
                type="monotone"
                dataKey="Savings"
                stroke="#16c784"
                strokeWidth={2.5}
                fill="url(#savingsGrad)"
                dot={false}
                activeDot={{ fill: "#16c784", stroke: "none", r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-6">Spending Breakdown</h2>
        <div className="bg-card rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                  <linearGradient
                    key={key}
                    id={`grad-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#6b7280" }} />
              {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={CATEGORY_LABELS[key]}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${key})`}
                  dot={false}
                  activeDot={{ fill: color, stroke: "none", r: 5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
            {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted">{CATEGORY_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Table View (key stats grid per month) ── */

const STAT_ITEMS: {
  key: keyof MonthlySummary;
  label: string;
}[] = [
  { key: "totalIncome", label: "Income" },
  { key: "totalSpent", label: "Spent" },
  { key: "savings", label: "Savings" },
  ...SPENDING_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
  })),
];

function TableView({
  summaries,
  onSelectMonth,
}: {
  summaries: MonthlySummary[];
  onSelectMonth?: (month: string) => void;
}) {
  const rows = [...summaries].reverse();

  return (
    <div className="space-y-10">
      {rows.map((s) => (
        <div key={s.month}>
          {/* Month heading */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {formatMonth(s.month)}
            </h3>
            {onSelectMonth && (
              <button
                onClick={() => onSelectMonth(s.month)}
                className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border-t border-foreground/20" />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 pt-5">
            {STAT_ITEMS.map((item) => {
              const value = s[item.key] as number;
              const isIncome = item.key === "totalIncome";
              const isSpent = item.key === "totalSpent";
              const isSavings = item.key === "savings";
              return (
                <div key={item.key}>
                  <p className="text-sm font-semibold mb-1">
                    {item.label}
                  </p>
                  <p
                    className={`text-sm tabular-nums ${
                      isIncome
                        ? "text-positive"
                        : isSpent
                          ? "text-negative"
                          : isSavings
                            ? value >= 0
                              ? "text-positive"
                              : "text-negative"
                            : "text-foreground/70"
                    }`}
                  >
                    {usd(value, 2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
