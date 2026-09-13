import { useMutation } from '@tanstack/react-query';

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({ threadId, answer }: { threadId: string; answer: string }) => {
      console.debug(`[api] POST /api/threads/${threadId}/respond`, { answer });
      const response = await fetch(`/api/threads/${threadId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!response.ok) {
        const body = await response.text();
        console.error(`[api] respond failed: ${response.status} ${response.statusText}`, body);
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
      console.debug(`[api] respond accepted for thread ${threadId}`);
    },
    onError: (error) => {
      console.error('[api] send message failed:', error);
    },
    onSuccess: () => {
      console.debug('[api] send message ok');
    },
  });
}