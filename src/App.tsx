"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip } from "recharts";
import { ResponsiveContainer } from "recharts";
import { parse } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

// Function to calculate a running average
function calculateRunningAverage(data: { date: string; daily: number; cumulative: number }[], windowSize: number) {
  return data.map((_, index, array) => {
    const start = Math.max(0, index - windowSize + 1);
    const subset = array.slice(start, index + 1);
    const averageDaily = subset.reduce((sum, item) => sum + item.daily, 0) / subset.length;
    return {
      ...array[index],
      daily: averageDaily, // Replace daily with the smoothed value
    };
  });
}

function App() {
  const [chartData, setChartData] = React.useState<
    { date: string; daily: number; cumulative: number }[]
  >([]);
  const [filteredData, setFilteredData] = React.useState<
    { date: string; daily: number; cumulative: number }[]
  >([]);
  const [rawData, setRawData] = React.useState<
    { date: string; daily: number; cumulative: number }[]
  >([]);
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [activeChart, setActiveChart] = React.useState<"daily" | "cumulative">("daily");
  const [activeRange, setActiveRange] = React.useState<"7" | "30" | "all">("all");
  const [repoName, setRepoName] = React.useState("helm/helm"); // Default repository name
  const [inputRepoName, setInputRepoName] = React.useState(repoName); // Controlled input state

  // Apply dark mode on initial load
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Fetch data from the API
  const fetchStarsHistory = React.useCallback(() => {
    fetch(`https://emafuma.mywire.org:8090/allStars?repo=${repoName}`)
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.stars.map(([date, daily, cumulative]: [string, number, number]) => ({
          date: parse(date, "dd-MM-yyyy", new Date()).toISOString(),
          daily,
          cumulative,
        }));
        setRawData(formattedData);
        const smoothedData = calculateRunningAverage(formattedData, 14);
        setChartData(smoothedData);
        setFilteredData(smoothedData);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, [repoName]);

  React.useEffect(() => {
    fetchStarsHistory();
  }, [fetchStarsHistory]);

  // Filter data based on the selected range and apply adaptive smoothing
  const filterData = (days: number, range: "7" | "30" | "all") => {
    const now = new Date();
    const dataToFilter = days === 7 && activeChart === "daily" ? rawData : chartData;
    const filtered = dataToFilter.filter((item) => {
      const itemDate = new Date(item.date);
      return now.getTime() - itemDate.getTime() <= days * 24 * 60 * 60 * 1000;
    });

    const smoothedFilteredData =
      days === 7 && activeChart === "daily"
        ? filtered
        : days <= 7
          ? filtered
          : calculateRunningAverage(filtered, days <= 30 ? 3 : 14);

    setFilteredData(smoothedFilteredData);
    setActiveRange(range);
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const date = new Date(label!).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return (
        <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-2 rounded shadow">
          <p className="font-bold">{date}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.stroke }}
            >
              {entry.name}: {Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="flex justify-end p-4">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md mr-2"
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <Card>
        <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputRepoName}
                onChange={(e) => setInputRepoName(e.target.value)}
                placeholder="owner/repo"
                className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                onClick={() => {
                  setRepoName(inputRepoName);
                  fetchStarsHistory();
                }}
              >
                Fetch Stars
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-5 sm:py-6">
            <button
              className={`px-4 py-2 rounded-md ${activeRange === "7" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => filterData(7, "7")}
            >
              Last 7 Days
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeRange === "30" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => filterData(30, "30")}
            >
              Last 30 Days
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeRange === "all" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => {
                setFilteredData(chartData);
                setActiveRange("all");
              }}
            >
              All Time
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeChart === "daily" ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setActiveChart("daily")}
            >
              Daily
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeChart === "cumulative" ? "bg-purple-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setActiveChart("cumulative")}
            >
              Cumulative
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{
                  top: 4,
                  right: 4,
                  left: 4,
                  bottom: 4,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="gray" />
                <XAxis
                  dataKey="date"
                  interval="preserveStartEnd"
                  tickFormatter={(value, index) => {
                    const date = new Date(value);
                    const prevDate = index > 0 ? new Date(filteredData[index - 1]?.date) : null;

                    if (!prevDate || date.getFullYear() !== prevDate.getFullYear()) {
                      return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
                    }

                    return date.toLocaleDateString("en-US", { month: "short" });
                  }}
                  ticks={filteredData
                    .filter((item, index) => {
                      const date = new Date(item.date);
                      const prevDate = index > 0 ? new Date(filteredData[index - 1]?.date) : null;

                      return index === 0 || !prevDate || date.getFullYear() !== prevDate.getFullYear();
                    })
                    .map((item) => item.date)}
                  stroke="currentColor"
                />
                <YAxis
                  stroke="currentColor"
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${(value / 1000).toFixed(0)}k`;
                    }
                    return value;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type={activeRange === "7" || activeRange === "30" ? "linear" : "monotone"}
                  dataKey={activeChart}
                  stroke={activeChart === "daily" ? "#8884d8" : "#82ca9d"}
                  strokeWidth={2}
                  dot={false}
                  name={activeChart === "daily" ? "Daily Stars" : "Cumulative Stars"}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;