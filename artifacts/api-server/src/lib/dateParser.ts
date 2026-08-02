// =============================================================================
// Date Parser Utility
// 
// Safe date parsing with validation and error handling
// Prevents invalid dates from defaulting to current time
// =============================================================================

/**
 * Parse SePay transaction date safely
 * SePay sends date in format: "2024-01-15 10:30:00" or ISO format
 */
export function parseSePayDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Try parsing as ISO format first
  let date: Date;
  
  try {
    // Handle SePay format: "2024-01-15 10:30:00"
    if (dateString.includes(' ') && !dateString.includes('T')) {
      const isoString = dateString.replace(' ', 'T');
      date = new Date(isoString);
    } else {
      // Try direct parsing
      date = new Date(dateString);
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }

    // Validate reasonable date range (not too far in past/future)
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneDayFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (date < oneYearAgo || date > oneDayFuture) {
      // Date is suspiciously far from current time
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Parse date with fallback to a specific default date
 * Used when you want to handle invalid dates explicitly
 */
export function parseSePayDateWithFallback(
  dateString: string, 
  fallbackDate: Date | null = null
): Date {
  const parsed = parseSePayDate(dateString);
  
  if (parsed !== null) {
    return parsed;
  }

  if (fallbackDate !== null) {
    return fallbackDate;
  }

  // If no fallback provided, throw error
  throw new Error(`Invalid date format: ${dateString}`);
}

/**
 * Format date to ISO string for database storage
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Validate if a date string is in expected format
 */
export function isValidSePayDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check for common SePay formats
  const patterns = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // "2024-01-15 10:30:00"
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format
    /^\d{4}-\d{2}-\d{2}$/, // Date only
  ];

  return patterns.some(pattern => pattern.test(dateString));
}