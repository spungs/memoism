export const parseApiDate = (input: string): Date => {
  if (!input) return new Date(NaN);
  let s = input.trim();
  // Ensure T separator
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
  // Truncate fractional seconds to 3 digits (milliseconds)
  s = s.replace(/\.(\d{3})\d+/, '.$1');
  // Append Z if no timezone info is present
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s = s + 'Z';
  return new Date(s);
};

export const isSameLocalDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};
