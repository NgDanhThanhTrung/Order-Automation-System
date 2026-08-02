/**
 * Hook to fetch and manage CSRF token
 */
import { useState, useEffect } from 'react';

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const apiUrl = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/csrf-token`);
        const data = await response.json();
        
        if (data.success && data.data?.csrfToken) {
          setCsrfToken(data.data.csrfToken);
        } else {
          setError('Failed to fetch CSRF token');
        }
      } catch (err) {
        setError('Error fetching CSRF token');
        console.error('CSRF token fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCsrfToken();
  }, []);

  return { csrfToken, loading, error };
}