'use client';

import React, { useState, useEffect } from 'react';

interface Discount {
  id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  category: 'hour' | 'day' | 'week' | 'month';
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TraderDiscountsProps {
  traderPhone: string;
  isDarkMode: boolean;
}

export default function TraderDiscounts({ traderPhone, isDarkMode }: TraderDiscountsProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiscounts();
  }, [traderPhone]);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/traders/${traderPhone}/discounts`);
      const data = await response.json();
      
      if (data.success) {
        // Filter for active discounts only
        const now = new Date();
        const activeDiscounts = data.data.filter((discount: Discount) => {
          if (!discount.is_active) return false;
          const start = new Date(discount.start_time);
          const end = new Date(discount.end_time);
          return now >= start && now <= end;
        });
        setDiscounts(activeDiscounts);
      }
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hour': return '⏰';
      case 'day': return '📅';
      case 'week': return '📆';
      case 'month': return '🗓️';
      default: return '🎯';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'hour': return 'text-blue-600';
      case 'day': return 'text-green-600';
      case 'week': return 'text-yellow-600';
      case 'month': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}% OFF`;
    } else {
      return `$${discount.discount_value} OFF`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (discounts.length === 0) {
    return null; // Don't show anything if no active discounts
  }

  return (
    <div className="mb-6">
      <h4 className={`text-md font-medium mb-3 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        🎉 Active Discounts
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {discounts.map((discount) => (
          <div
            key={discount.id}
            className={`p-3 rounded-lg border-2 border-dashed transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-yellow-500' 
                : 'bg-yellow-50 border-yellow-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getCategoryIcon(discount.category)}</span>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {discount.name}
                  </div>
                  <div className={`text-sm ${getCategoryColor(discount.category)}`}>
                    {discount.category.toUpperCase()} packages
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {formatDiscountValue(discount)}
                </div>
                {discount.description && (
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {discount.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
