import { useMutation } from '@tanstack/react-query';

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({ threadId, answer }: { threadId: string; answer: string }) => {
      const response = await fetch(`/api/threads/${threadId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
    },
  });
};
