"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip } from "recharts";
import { ResponsiveContainer } from "recharts";


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function App() {
  const [chartData, setChartData] = React.useState<
    { date: string; daily: number; cumulative: number }[]
  >([]);

  // Fetch data from the API
  React.useEffect(() => {
    fetch("https://emafuma.mywire.org:8090/allStars?repo=helm/helm")
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.stars.map(([date, daily, cumulative]: [string, number, number]) => ({
          date,
          daily,
          cumulative,
        }));
        setChartData(formattedData);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>GitHub Stars Over Time</CardTitle>
          <CardDescription>
            Daily and cumulative stars for the Helm repository.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="daily"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                name="Daily Stars"
                isAnimationActive={false}
              />
              {/* <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={false}
              name="Cumulative Stars"
              isAnimationActive={false}
            /> */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default App;