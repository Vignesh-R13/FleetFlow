import { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Returns the count of unread alerts for use in the sidebar/navbar badge.
 * Polls every 60 seconds.
 */
export function useAlertCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    function fetch() {
      api
        .get('/alerts', { params: { status: 'Unread', limit: 1 } })
        .then((res) => {
          if (mounted) setCount(res.data.pagination?.total ?? 0);
        })
        .catch(() => {});
    }

    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
