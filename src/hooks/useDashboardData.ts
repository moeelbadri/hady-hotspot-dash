// This file re-exports hooks from usehooks.ts for backward compatibility
// New code should import directly from '@/lib/usehooks'

export {
  useTrader as useTraderStats,
  useTraderUsers,
  useTraderSessions,
  useTraderClients,
  useTraderTransactions,
  useMikroTiks as useMikroTikDevices,
  useMikroTikUsers as useAllUsers,
  useMikroTikSessions as useAllSessions,
  useOwnerReports,
  useTraders as useAllTraders
} from '@/lib/usehooks';
