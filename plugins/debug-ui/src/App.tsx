import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThreadDebugger } from './components/ThreadDebugger';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThreadDebugger />
    </QueryClientProvider>
  );
}
