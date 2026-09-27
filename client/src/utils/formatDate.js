import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '';
};

export const formatDateTime = (date) => formatDate(date, 'MMM dd, yyyy • HH:mm');

export const fromNow = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

export const formatShortDate = (date) => formatDate(date, 'dd MMM yy');
