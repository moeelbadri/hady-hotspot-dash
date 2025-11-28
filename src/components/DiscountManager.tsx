'use client';

import React, { useState } from 'react';
import { useTraderDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from '@/lib/usehooks';
import { Spinner, SpinnerInline } from '@/components/ui/spinner';

interface Discount {
  id: string;
  trader_phone: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  category: 'hour' | 'day' | 'week' | 'month';
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DiscountManagerProps {
  traderPhone: string;
  isDarkMode: boolean;
}

export default function DiscountManager({ traderPhone, isDarkMode }: DiscountManagerProps) {
  const { data: discounts = [], isLoading: loading } = useTraderDiscounts(traderPhone);
  const createDiscountMutation = useCreateDiscount();
  const updateDiscountMutation = useUpdateDiscount();
  const deleteDiscountMutation = useDeleteDiscount();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    category: 'hour' as 'hour' | 'day' | 'week' | 'month',
    start_time: '',
    end_time: '',
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingDiscount) {
        await updateDiscountMutation.mutateAsync({
          traderPhone,
          discountId: editingDiscount.id,
          discountData: formData
        });
      } else {
        await createDiscountMutation.mutateAsync({
          traderPhone,
          discountData: formData
        });
      }
      
      setShowCreateForm(false);
      setEditingDiscount(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      alert(`Error: ${error.message || 'Failed to save discount'}`);
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    
    try {
      await deleteDiscountMutation.mutateAsync({
        traderPhone,
        discountId
      });
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      alert(`Error: ${error.message || 'Failed to delete discount'}`);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      category: discount.category,
      start_time: discount.start_time.split('T')[0] + 'T' + discount.start_time.split('T')[1].substring(0, 5),
      end_time: discount.end_time.split('T')[0] + 'T' + discount.end_time.split('T')[1].substring(0, 5),
      is_active: discount.is_active
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      category: 'hour',
      start_time: '',
      end_time: '',
      is_active: true
    });
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getStatusColor = (discount: Discount) => {
    const now = new Date();
    const start = new Date(discount.start_time);
    const end = new Date(discount.end_time);
    
    if (!discount.is_active) return 'text-gray-500';
    if (now < start) return 'text-yellow-500';
    if (now > end) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusText = (discount: Discount) => {
    const now = new Date();
    const start = new Date(discount.start_time);
    const end = new Date(discount.end_time);
    
    if (!discount.is_active) return 'Inactive';
    if (now < start) return 'Scheduled';
    if (now > end) return 'Expired';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Discount Offers
        </h3>
        <button
          onClick={() => {
            resetForm();
            setEditingDiscount(null);
            setShowCreateForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Discount
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className={`text-md font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., Weekend Special"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Discount Type *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Discount Value *
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  required
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5'}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-white' 
                    : 'border-gray-300 text-gray-900'
                }`}
                placeholder="Optional description for this discount..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Active
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={createDiscountMutation.isPending || updateDiscountMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {createDiscountMutation.isPending || updateDiscountMutation.isPending ? (
                  <span className="flex items-center">
                    <SpinnerInline size="sm" className="mr-2" />
                    {editingDiscount ? 'Updating...' : 'Creating...'}
                  </span>
                ) : (
                  editingDiscount ? 'Update Discount' : 'Create Discount'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingDiscount(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Discounts List */}
      <div className="space-y-2">
        {discounts.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No discounts found. Create your first discount offer!
          </div>
        ) : (
          discounts.map((discount) => (
            <div
              key={discount.id}
              className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {discount.name}
                    </h4>
                    <span className={`text-sm ${getStatusColor(discount)}`}>
                      {getStatusText(discount)}
                    </span>
                  </div>
                  
                  {discount.description && (
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {discount.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {discount.discount_type === 'percentage' 
                        ? `${discount.discount_value}% off` 
                        : `$${discount.discount_value} off`
                      }
                    </span>
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {discount.category} pricing
                    </span>
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDateTime(discount.start_time)} - {formatDateTime(discount.end_time)}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(discount)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    disabled={deleteDiscountMutation.isPending}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteDiscountMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
