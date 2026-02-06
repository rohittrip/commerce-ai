import { Money } from '@/types';

export const formatMoney = (money?: Money): string => {
  if (!money) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: money.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(money.amount);
};

export const formatDateTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: 'numeric',
    day: '2-digit',
    month: 'short',
  }).format(date);
};
