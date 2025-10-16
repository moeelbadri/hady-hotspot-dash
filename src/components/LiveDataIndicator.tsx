'use client';

import { useQuery } from '@tanstack/react-query';

interface LiveDataIndicatorProps {
  queryKey: string[];
  className?: string;
}

export function LiveDataIndicator({ queryKey, className = '' }: LiveDataIndicatorProps) {
  const { isFetching, dataUpdatedAt } = useQuery({
    queryKey,
    enabled: false, // Don't actually fetch, just get status
  });

  const lastUpdated = new Date(dataUpdatedAt || Date.now());
  const timeAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
      <span className="text-xs text-gray-500">
        {isFetching ? 'Updating...' : `Updated ${timeAgo}s ago`}
      </span>
    </div>
  );
}
