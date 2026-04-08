import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Global } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { global } from '@src/lib/styles/global';
import TokenBootstrap from '@src/components/TokenBootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    }
  }
});

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>HUBUP Q&A</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Global styles={global} />
      <QueryClientProvider client={queryClient}>
        <TokenBootstrap />
        <Component {...pageProps} />
      </QueryClientProvider>
    </SessionProvider>
  );
}

