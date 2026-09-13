import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AgentEvent } from '../types';

function threadKey(threadId: string | null) {
  return ['thread', threadId ?? 'none'];
}

export function useThreadStream(threadId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId) return;
    const key = threadKey(threadId);
    console.debug(`[sse] connecting: /api/threads/${threadId}/stream`);
    const source = new EventSource(`/api/threads/${threadId}/stream`);

    source.onopen = () => {
      console.debug(`[sse] connection open for thread ${threadId}`);
    };
    source.onerror = (event) => {
      console.error(`[sse] connection error for thread ${threadId}:`, event);
    };
    source.onmessage = (event) => {
      console.debug(`[sse] event received:`, event.data);
      try {
        const data = JSON.parse(event.data) as AgentEvent;
        console.debug(`[sse] parsed agent event:`, data.type, data);
        queryClient.setQueryData<AgentEvent[]>(key, (old = []) => [...old, data]);
      } catch (parseError) {
        console.warn('[sse] failed to parse event as JSON:', parseError, event.data);
        queryClient.setQueryData<AgentEvent[]>(key, (old = []) => [
          ...old,
          { type: 'RAW', raw: event.data },
        ]);
      }
    };

    return () => {
      console.debug(`[sse] closing connection for thread ${threadId}`);
      source.close();
    };
  }, [threadId, queryClient]);

  return useQuery<AgentEvent[]>({
    queryKey: threadKey(threadId),
    queryFn: () => [],
    enabled: !!threadId,
    initialData: [],
  });
}