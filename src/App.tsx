"use client";

import * as React from "react";
import { useRef } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip } from "recharts";
import { ResponsiveContainer } from "recharts";
import { parse, format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";


const HOST = import.meta.env.VITE_HOST;

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

// Function to calculate percentiles
function calculatePercentiles(data: number[], ...percentiles: number[]) {
  const sorted = [...data].sort((a, b) => a - b);
  return percentiles.map((percentile) => {
    const index = Math.ceil(percentile * sorted.length) - 1;
    return sorted[index];
  });
}

const stripTrailingSlash = (str: string) =>
  str.charAt(str.length - 1) === "/" ? str.substr(0, str.length - 1) : str;

const parseGitHubRepoURL = (url: string) => {
  url = url.replace(/ /g, "");
  url = url.toLowerCase();
  url = stripTrailingSlash(url);
  // Define the regular expression pattern to match GitHub repository URLs
  const repoURLPattern =
    /^(?:https?:\/\/github\.com\/)?(?:\/)?([^/]+)\/([^/]+)(?:\/.*)?$/;

  // Use RegExp.exec to match the pattern against the URL
  const match = repoURLPattern.exec(url);

  if (match && match.length === 3) {
    const owner = match[1];
    const repoName = match[2];
    return `${owner}/${repoName}`;
  } else {
    return null; // Invalid URL
  }
};

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
  const [activeRange, setActiveRange] = React.useState<"30" | "all">("all");
  const [repoName, setRepoName] = React.useState("helm/helm"); // Default repository name
  const [inputRepoName, setInputRepoName] = React.useState(repoName); // Controlled input state
  const currentSSE = useRef<EventSource | null>(null);

  // Apply dark mode on initial load
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const closeSSE = () => {
    if (currentSSE.current) {
      console.log("STOP SSE");
      currentSSE.current.close();
    }
  };

  const startSSEUpdates = (repo: string, callsNeeded: number, onGoing: boolean) => {
    console.log(repo, callsNeeded, onGoing);
    const sse = new EventSource(`${HOST}/sse?repo=${repo}`);
    closeSSE();
    currentSSE.current = sse;

    sse.onerror = (err) => {
      console.log("on error", err);
    };

    // The onmessage handler is called if no event name is specified for a message.
    sse.onmessage = (msg) => {
      console.log("on message", msg);
    };

    sse.onopen = (...args) => {
      console.log("on open", args);
    };

    sse.addEventListener("current-value", (event) => {
      const parsedData = JSON.parse(event.data);
      const currentValue = parsedData.data;
      // setProgressValue(currentValue);

      console.log("currentValue", currentValue, callsNeeded);

      if (currentValue === callsNeeded) {
        console.log("CLOSE SSE");
        closeSSE();
        setTimeout(() => {
          // fetchAllStars(repo, true);
        }, 1600);
        // setLoading(false);
      }
    });
  };

  const fetchTotalStars = async (repo: string) => {
    try {
      const response = await fetch(`${HOST}/totalStars?repo=${repo}`);

      if (!response.ok) {
        /*         setLoading(false);
                toast.error("Internal Server Error. Please try again later.", {
                  position: toast.POSITION.BOTTOM_CENTER,
                }); */
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      //setLoading(false);
    }
  };

  const fetchStatus = async (repo: string) => {
    try {
      const response = await fetch(`${HOST}/status?repo=${repo}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`An error occurred: ${error}`);
    }
  };

  // Fetch data from the API
  const fetchStarsHistory = React.useCallback(async () => {
    try {
      const totalStars = await fetchTotalStars(repoName);

      const status = await fetchStatus(repoName); // Fetch status
      console.log(status);

      if (!status.onGoing) {
        //fetchAllStars(repoParsed);
        const response = await fetch(`${HOST}/allStars?repo=${repoName}`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Fetched data:", data);

        let starHistory = data.stars.map(
          ([date, daily, cumulative]: [string, number, number]) => ({
            date: format(parse(date, "dd-MM-yyyy", new Date()), "yyyy-MM-dd"), // Fixed date parsing
            daily,
            cumulative,
          })
        );

        // Remove the last day if it is the current day
        const today = new Date().toISOString().split("T")[0];
        if (starHistory.length > 0 && starHistory[starHistory.length - 1].date.startsWith(today)) {
          console.log("Removing current day's data:", starHistory[starHistory.length - 1]);
          starHistory.pop(); // Remove the last element
        }

        // Calculate percentiles to detect spikes
        const dailyValues = starHistory
          .map((entry: { daily: number }) => entry.daily)
          .filter((value: number) => value > 0);
        const res = calculatePercentiles(dailyValues, 0.5, 0.98);

        // Remove spike on the first day if it exceeds the 98th percentile
        if (starHistory.length > 2 && starHistory[0].daily >= res[1]) {
          console.log("Removing spike on first day:", starHistory[0]);
          starHistory.shift(); // Remove the first element
        }

        setRawData(starHistory);
        const smoothedData = calculateRunningAverage(starHistory, 14);
        setChartData(smoothedData);
        setFilteredData(smoothedData);
      }

      const callsNeeded = Math.floor(totalStars.stars / 100);
      console.log(repoName, callsNeeded, status.onGoing);
      startSSEUpdates(repoName, callsNeeded, status.onGoing);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [repoName]);

  React.useEffect(() => {
    fetchStarsHistory();
  }, [fetchStarsHistory]);

  // Filter data based on the selected range and apply adaptive smoothing
  const filterData = (days: number, range: "30" | "all") => {
    const now = new Date();
    const dataToFilter = rawData; // Use rawData for all ranges to ensure real values are available
    const filtered = dataToFilter.filter((item) => {
      const itemDate = new Date(item.date);
      return now.getTime() - itemDate.getTime() <= days * 24 * 60 * 60 * 1000;
    });

    // Skip smoothing for "Last 30 Days"
    const smoothedFilteredData =
      range === "30"
        ? filtered // Use real values for "Last 30 Days"
        : calculateRunningAverage(filtered, 14);

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
              <div className="relative w-96">
                <input
                  type="text"
                  value={inputRepoName}
                  onChange={(e) => setInputRepoName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsedRepoName = parseGitHubRepoURL(inputRepoName); // Parse the input
                      if (parsedRepoName) {
                        setRepoName(parsedRepoName);
                        fetchStarsHistory();
                      } else {
                        console.error("Invalid GitHub repository URL");
                      }
                    }
                  }}
                  placeholder="owner/repo or GitHub URL"
                  className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white w-full"
                />
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-300 text-gray-600 rounded-full p-1 hover:bg-gray-400"
                  onClick={() => {
                    setInputRepoName(""); // Clear the input text
                    closeSSE(); // Cancel all ongoing SSE connections
                    console.log("All SSE connections canceled");
                  }}
                >
                  ✖
                </button>
              </div>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                onClick={() => {
                  const parsedRepoName = parseGitHubRepoURL(inputRepoName); // Parse the input
                  if (parsedRepoName) {
                    setRepoName(parsedRepoName);
                    fetchStarsHistory();
                  } else {
                    console.error("Invalid GitHub repository URL");
                  }
                }}
              >
                Fetch Stars
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-5 sm:py-6">
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
        <CardContent className="p-0"> {/* Remove padding */}
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{
                  top: 4,
                  right: 14,
                  left: 0, // Ensure left margin is 0
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
                  type={activeRange === "30" ? "linear" : "monotone"}
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