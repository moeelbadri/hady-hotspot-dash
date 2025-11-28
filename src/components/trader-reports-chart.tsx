"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useState, useEffect } from "react"
import { useTraderReports } from '@/lib/usehooks';
import { Spinner } from '@/components/ui/spinner';

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
    label: "Credits",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface TraderReportsChartProps {
  traderPhone: string
  isDarkMode?: boolean
}

interface ChartDataPoint {
  day: string
  credits: number
  date: string
}

interface MonthOption {
  value: string
  label: string
}

interface SummaryStats {
  totalSpend: number
  totalCodes: number
  totalIncome: number
}

export function TraderReportsChart({ traderPhone, isDarkMode = false }: TraderReportsChartProps): React.ReactElement {
  const { data: traderReports, isLoading: loading } = useTraderReports(traderPhone);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({ totalSpend: 0, totalCodes: 0, totalIncome: 0 })

  // Fetch available months and initial data
  useEffect(() => {
    if (!traderReports?.activity?.recentTransactions) {
      return;
    }
    
    const fetchData = async () => {
      try {
        const transactions = traderReports.activity.recentTransactions;
        
        // Ensure transactions is an array
        if (!Array.isArray(transactions)) {
          console.error('Invalid transaction data format');
          return;
        }
        
        // Extract unique months from transactions
        const monthSet = new Set<string>();
        transactions.forEach((transaction: any) => {
          const date = new Date(transaction.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(monthKey);
        });
        
        // Convert to month options and sort by date (newest first)
        const months = Array.from(monthSet)
          .map(monthKey => {
            const [year, month] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return {
              value: monthKey,
              label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            };
          })
          .sort((a, b) => b.value.localeCompare(a.value));
        
        // Add "All Time" option at the beginning
        const monthsWithAllTime = [
          { value: 'all-time', label: 'All Time' },
          ...months
        ];
        
        setAvailableMonths(monthsWithAllTime);
        
        // Set default to "All Time"
        setSelectedMonth('all-time');
        await loadChartData('all-time', transactions);
      } catch (error) {
        console.error('Error processing trader data:', error);
      }
    };

    if (traderPhone && traderReports) {
      fetchData()
    }
  }, [traderPhone, traderReports])

  const loadChartData = async (monthKey: string, transactions?: any[]) => {
    try {
      let transactionData = transactions || traderReports?.activity?.recentTransactions
      
      // If no transactions available, return
      if (!transactionData) {
        return
      }

      // Ensure transactionData is not undefined
      if (!transactionData) {
        console.error('No transaction data available')
        return
      }

      // Filter transactions based on selection
      let filteredTransactions = transactionData
      
      if (monthKey !== 'all-time') {
        const [year, month] = monthKey.split('-')
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0) // Last day of the month
        
        filteredTransactions = transactionData.filter((transaction: any) => {
          const transactionDate = new Date(transaction.created_at)
          return transactionDate >= startDate && transactionDate <= endDate
        })
      }

      // Sort transactions by date to calculate cumulative balance
      const sortedTransactions = filteredTransactions
        .filter((transaction: { created_at: any; type: any; }) => transaction.created_at && transaction.type)
        .sort((a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      // Calculate summary stats
      const totalSpend = filteredTransactions
        .filter((t: { type: string; }) => t.type === 'voucher_purchase')
        .reduce((sum: number, t: { amount: any; }) => sum + Math.abs(t.amount || 0), 0)
      
      const totalCodes = filteredTransactions
        .filter((t: { type: string; }) => t.type === 'voucher_purchase')
        .length
      
      const totalIncome = filteredTransactions
        .filter((t: { type: string; }) => t.type === 'credit_add')
        .reduce((sum: number, t: { amount: any; }) => sum + Math.abs(t.amount || 0), 0)

      setSummaryStats({ totalSpend, totalCodes, totalIncome })

      // Create chart data
      const chartDataPoints: ChartDataPoint[] = []
      let cumulativeBalance = 0
      
      if (monthKey === 'all-time') {
        // For all-time, create data points for each transaction
        const dailyBalances: { [key: string]: number } = {}
        
        sortedTransactions.forEach((transaction: { created_at: string | number | Date; type: string; amount: any; }) => {
          const date = new Date(transaction.created_at)
          const dayKey = date.toISOString().split('T')[0]

          if (!dailyBalances[dayKey]) {
            dailyBalances[dayKey] = cumulativeBalance
          }
          
          if (transaction.type === 'credit_add') {
            cumulativeBalance += Math.abs(transaction.amount || 0)
          } else if (transaction.type === 'voucher_purchase') {
            cumulativeBalance -= Math.abs(transaction.amount || 0)
          }
          
          dailyBalances[dayKey] = cumulativeBalance
        })
        
        // Convert to chart data points
        Object.entries(dailyBalances).forEach(([date, balance]) => {
          const dayDate = new Date(date)
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' })
          const dayNumber = dayDate.getDate()
          
          chartDataPoints.push({
            day: `${dayNumber} ${dayName}`,
            credits: balance,
            date: date
          })
        })
      } else {
        // For specific month, create data for all days
        const [year, month] = monthKey.split('-')
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0)
        const daysInMonth = endDate.getDate()
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(parseInt(year), parseInt(month) - 1, day)
          const dayKey = date.toISOString().split('T')[0]
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
          
          // Find all transactions for this day
          const dayTransactions = sortedTransactions.filter((transaction: { created_at: string | number | Date; }) => {
            const transactionDate = new Date(transaction.created_at)
            return transactionDate.toISOString().split('T')[0] === dayKey
          })
          
          // Add/subtract transactions for this day to cumulative balance
          dayTransactions.forEach((transaction: { type: string; amount: any; }) => {
            if (transaction.type === 'credit_add') {
              cumulativeBalance += Math.abs(transaction.amount || 0)
            } else if (transaction.type === 'voucher_purchase') {
              cumulativeBalance -= Math.abs(transaction.amount || 0)
            }
          })
          
          chartDataPoints.push({
            day: `${day} ${dayName}`,
            credits: cumulativeBalance,
            date: dayKey
          })
        }
      }

      setChartData(chartDataPoints)
    } catch (error) {
      console.error('Error loading chart data:', error)
      // Set empty data on error
      setChartData([])
    }
  }

  const handleMonthChange = async (monthKey: string) => {
    setSelectedMonth(monthKey)
    await loadChartData(monthKey)
  }

  if (loading) {
    return (
      <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader>
          <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Credit Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Spinner size="md" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (availableMonths.length === 0) {
    return (
      <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader>
          <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Credit Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No transaction data available
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`transition-colors ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Spend</p>
                <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${summaryStats.totalSpend}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Codes</p>
                <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{summaryStats.totalCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`transition-colors ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Income</p>
                <p className={`text-2xl font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${summaryStats.totalIncome}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Credit Balance Over Time
              </CardTitle>
              <CardDescription className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Cumulative credit balance for the selected period
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Period:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className={`px-3 py-2 border rounded-md text-sm transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={chartData}>
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
                    `$${value} `,
                    'Balance'
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
    </div>
  )
}
