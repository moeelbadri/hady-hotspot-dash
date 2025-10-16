"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  credits: {
    label: "Cumulative Credits",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface CreditsChartProps {
  data: {
    day: string
    credits: number
    date: string
  }[]
  isDarkMode?: boolean
}

export function CreditsChart({ data, isDarkMode = false }: CreditsChartProps) {
  return (
    <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
      <CardHeader>
        <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Current Cumulative Credits
        </CardTitle>
        <CardDescription className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Cumulative credit balance for the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
            />
            <XAxis 
              dataKey="day"
              tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    border: isDarkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDarkMode ? '#f3f4f6' : '#374151'
                  }}
                  formatter={(value: any) => [
                    `${value > 0 ? '+' : ''}${value}`,
                    'Credits'
                  ]}
                  labelFormatter={(label) => `Day: ${label}`}
                />
              }
            />
            <Line 
              type="monotone" 
              dataKey="credits" 
              stroke={isDarkMode ? '#10b981' : '#10b981'} 
              strokeWidth={3}
              dot={{ fill: isDarkMode ? '#10b981' : '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: isDarkMode ? '#10b981' : '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
