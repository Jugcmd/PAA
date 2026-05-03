export const isEmpty = (data: any) => data === null || data === undefined;

export const isObject = (data: any) => data && typeof data === "object";

export const isBlank = (data: any) =>
  isEmpty(data) ||
  (Array.isArray(data) && data.length === 0) ||
  (isObject(data) && Object.keys(data).length === 0) ||
  (typeof data === "string" && data.trim().length === 0);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

export const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
