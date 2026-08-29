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
    const source = new EventSource(`/api/threads/${threadId}/stream`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AgentEvent;
        queryClient.setQueryData<AgentEvent[]>(key, (old = []) => [...old, data]);
      } catch {
        queryClient.setQueryData<AgentEvent[]>(key, (old = []) => [
          ...old,
          { type: 'RAW', raw: event.data },
        ]);
      }
    };

    return () => source.close();
  }, [threadId, queryClient]);

  return useQuery<AgentEvent[]>({
    queryKey: threadKey(threadId),
    queryFn: () => [],
    enabled: !!threadId,
    initialData: [],
  });
}
