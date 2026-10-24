import { useState, useEffect } from 'react';

export function usePrintQueueWS(wsUrl) {
  const [state, setState] = useState({
    queue: [],
    current_job: null,
    status: 'IDLE',
    time_left: 0,
    is_paused: true,
    isConnected: false,
  });

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setState({
        queue: data.queue,
        current_job: data.current_job,
        status: data.status,
        time_left: data.time_left,
        is_paused: data.is_paused,
        isConnected: true,
      });
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    return () => ws.close();
  }, [wsUrl]);

  return state;
}
