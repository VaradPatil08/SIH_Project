/**
 * Deterministic color palette for multi-train tracking.
 * Provides visually distinct, accessible colors with dark and light theme values.
 */
export const TRAIN_PALETTE = [
  { id: 'blue', hex: '#2563EB', darkHex: '#3B82F6', label: 'Royal Blue', bgClass: 'bg-blue-600', textClass: 'text-blue-600 dark:text-blue-400' },
  { id: 'emerald', hex: '#059669', darkHex: '#10B981', label: 'Emerald', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'amber', hex: '#D97706', darkHex: '#F59E0B', label: 'Amber', bgClass: 'bg-amber-600', textClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'purple', hex: '#7C3AED', darkHex: '#8B5CF6', label: 'Purple', bgClass: 'bg-purple-600', textClass: 'text-purple-600 dark:text-purple-400' },
  { id: 'rose', hex: '#E11D48', darkHex: '#F43F5E', label: 'Rose', bgClass: 'bg-rose-600', textClass: 'text-rose-600 dark:text-rose-400' },
  { id: 'cyan', hex: '#0891B2', darkHex: '#06B6D4', label: 'Cyan', bgClass: 'bg-cyan-600', textClass: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'orange', hex: '#EA580C', darkHex: '#FB923C', label: 'Orange', bgClass: 'bg-orange-600', textClass: 'text-orange-600 dark:text-orange-400' },
  { id: 'indigo', hex: '#4F46E5', darkHex: '#6366F1', label: 'Indigo', bgClass: 'bg-indigo-600', textClass: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'teal', hex: '#0D9488', darkHex: '#14B8A6', label: 'Teal', bgClass: 'bg-teal-600', textClass: 'text-teal-600 dark:text-teal-400' },
  { id: 'fuchsia', hex: '#C026D3', darkHex: '#D946EF', label: 'Fuchsia', bgClass: 'bg-fuchsia-600', textClass: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { id: 'lime', hex: '#65A30D', darkHex: '#84CC16', label: 'Lime', bgClass: 'bg-lime-600', textClass: 'text-lime-600 dark:text-lime-400' },
  { id: 'sky', hex: '#0284C7', darkHex: '#38BDF8', label: 'Sky', bgClass: 'bg-sky-600', textClass: 'text-sky-600 dark:text-sky-400' }
];

export function getTrainColor(index, isDark = false) {
  const item = TRAIN_PALETTE[index % TRAIN_PALETTE.length];
  return {
    ...item,
    currentHex: isDark ? item.darkHex : item.hex
  };
}
