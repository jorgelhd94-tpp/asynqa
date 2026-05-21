import React from "react";
import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";

import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // This is a local desktop tool polling Redis; surface failures fast
      // instead of retrying 3x with backoff, and keep cache a bit longer.
      retry: 1,
      gcTime: 10 * 60 * 1000,
    },
  },
});
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

document.documentElement.classList.add("dark");

// In Wails, modifier+click and middle-click on links open unwanted new windows.
// Intercept these and prevent default browser behavior.
document.addEventListener("auxclick", (e) => {
  if ((e.target as HTMLElement).closest("a")) e.preventDefault();
}, true);

document.addEventListener("click", (e) => {
  if ((e.ctrlKey || e.shiftKey || e.metaKey) && (e.target as HTMLElement).closest("a")) {
    e.preventDefault();
  }
}, true);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
