import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createQueryClient } from "./lib/query";

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultErrorComponent: () => <div>Internal Server Error</div>,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    scrollRestoration: true,
  });

  return router;
}
