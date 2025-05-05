"use client";

import * as React from "react";
import { useRef } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Brush } from "recharts";
import { ResponsiveContainer } from "recharts";
import { parse, format } from "date-fns";

import {
  calculateRunningAverage,
  calculatePercentiles,
  parseGitHubRepoURL,
} from "@/utils";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";


const HOST = import.meta.env.VITE_HOST;

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const percentage = (value / max) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
      <div
        className="bg-blue-500 h-4 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
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
  const [progressValue, setProgressValue] = React.useState(0); // Current progress
  const [maxProgress, setMaxProgress] = React.useState(100); // Maximum progress
  const [isFetching, setIsFetching] = React.useState(false); // Fetching state
  const [eta, setEta] = React.useState<string | null>(null); // Estimated time of arrival
  const lastUpdateTime = React.useRef<number | null>(null); // Timestamp of the last update
  const lastProgressValue = React.useRef<number>(0); // Last progress value
  const currentSSE = useRef<EventSource | null>(null);
  const speedHistory = useRef<number[]>([]); // Buffer to store recent speed values
  const SPEED_HISTORY_LIMIT = 5; // Limit the buffer size to the last 5 updates

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

    setIsFetching(true); // Set fetching state to true
    setMaxProgress(callsNeeded); // Set the maximum progress
    lastUpdateTime.current = Date.now(); // Initialize the last update time
    lastProgressValue.current = 0; // Reset the last progress value
    speedHistory.current = []; // Clear the speed history buffer

    sse.onerror = (err) => {
      console.log("on error", err);
    };

    sse.onmessage = (msg) => {
      console.log("on message", msg);
    };

    sse.onopen = (...args) => {
      console.log("on open", args);
    };

    sse.addEventListener("current-value", (event) => {
      const parsedData = JSON.parse(event.data);
      const currentValue = parsedData.data;
      setProgressValue(currentValue); // Update progress value

      const now = Date.now();
      if (lastUpdateTime.current) {
        const timeElapsed = (now - lastUpdateTime.current) / 1000; // Time elapsed in seconds
        const progressDelta = currentValue - lastProgressValue.current; // Progress made since last update
        const speed = progressDelta / timeElapsed; // Speed in requests per second

        // Add the speed to the history buffer if it's valid
        if (speed > 0 && speed < 1000) { // Ignore unrealistic speeds
          speedHistory.current.push(speed);
          if (speedHistory.current.length > SPEED_HISTORY_LIMIT) {
            speedHistory.current.shift(); // Remove the oldest speed if the buffer exceeds the limit
          }

          // Calculate the weighted average speed
          const totalWeight = speedHistory.current.reduce((sum, _, index) => sum + (index + 1), 0);
          const weightedSpeed =
            speedHistory.current.reduce((sum, s, index) => sum + s * (index + 1), 0) / totalWeight;

          // Calculate ETA using the weighted average speed
          if (weightedSpeed > 0) {
            const remainingRequests = callsNeeded - currentValue;

            // Avoid recalculating ETA for very small remaining requests
            if (remainingRequests > 1) {
              const estimatedTime = remainingRequests / weightedSpeed; // Time in seconds

              // Only update ETA if the change is significant
              const minutes = Math.floor(estimatedTime / 60);
              const seconds = Math.floor(estimatedTime % 60);
              const newEta = `${minutes}m ${seconds}s`;

              if (eta !== newEta) {
                setEta(newEta); // Update ETA only if it has changed significantly
              }
            }
          }
        }
      }

      lastUpdateTime.current = now; // Update the last update time
      lastProgressValue.current = currentValue; // Update the last progress value

      console.log("currentValue", currentValue, callsNeeded);

      if (currentValue === callsNeeded) {
        console.log("CLOSE SSE");
        closeSSE();
        setTimeout(() => {
          fetchAllStars(repo);
        }, 1600);
        setIsFetching(false); // Set fetching state to false
        setEta(null); // Clear ETA
      }
    });
  };

  const fetchTotalStars = async (repo: string) => {
    try {
      const response = await fetch(`${HOST}/totalStars?repo=${repo}`);

      console.log("fetchTotalStars", response);

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

  const fetchAllStars = async (repo: string) => {
    const response = await fetch(`${HOST}/allStars?repo=${repo}`);
    if (!response.ok) {
      //throw new Error(`HTTP error! Status: ${response.status}`);
      return;
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
  const fetchStarsHistory = React.useCallback(
    async (repo?: string) => {
      const targetRepo = repo || repoName; // Use the passed repo or fallback to state
      try {
        const totalStars = await fetchTotalStars(targetRepo);

        const status = await fetchStatus(targetRepo); // Fetch status
        console.log(status);

        if (!status.onGoing) {
          fetchAllStars(targetRepo); // Fetch all stars if not ongoing
        }

        if (!status.cached) {
          const callsNeeded = Math.floor(totalStars.stars / 100);
          console.log(targetRepo, callsNeeded, status.onGoing);
          startSSEUpdates(targetRepo, callsNeeded, status.onGoing);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },
    [repoName]
  );

  React.useEffect(() => {
    fetchStarsHistory(repoName); // Fetch the default repository on page load
  }, []); // Empty dependency array ensures this runs only once


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
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white overflow-x-hidden">
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
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-1 sm:py-2"> {/* Reduced padding */}
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
                        setRepoName(parsedRepoName); // Update repoName, which triggers useEffect
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
                    setRepoName(parsedRepoName); // Update repoName for consistency
                    fetchStarsHistory(parsedRepoName); // Pass the parsedRepoName directly
                  } else {
                    console.error("Invalid GitHub repository URL");
                  }
                }}
              >
                Fetch
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-4 py-1 sm:py-2"> {/* Reduced padding */}
            <button
              className={`px-4 py-2 rounded-md ${activeRange === "30" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => filterData(30, "30")}
            >
              30 Days
            </button>
            <button
              className={`px-4 py-2 rounded-md ${activeRange === "all" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => {
                setFilteredData(chartData);
                setActiveRange("all");
              }}
            >
              All
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
        <CardContent className="p-0">
          {isFetching && (
            <div className="px-6 py-4">
              <ProgressBar value={progressValue} max={maxProgress} />
              <p className="text-sm text-gray-500 mt-2">
                {progressValue} / {maxProgress} requests fetched
                {eta ? <span className="ml-2">ETA: {eta}</span> : <span className="ml-2">Calculating...</span>}
              </p>
            </div>
          )}
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{
                  top: 0, // No extra margin at the top
                  right: 14,
                  left: 0,
                  bottom: 20,
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
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#8884d8"
                  travellerWidth={10}
                  startIndex={0}
                  endIndex={filteredData.length - 1}
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