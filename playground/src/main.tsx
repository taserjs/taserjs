import { createRoot } from "react-dom/client";

import { App } from "./App";

// This app mixes stateful singletons (Monaco models, the esbuild worker, the
// VFS) with cross-module caches. Vite's hot-swapping can leave a *hybrid*
// runtime behind (new components + old App markup / old CSS), which produces
// nonsense layouts that no reload-free fix can repair. Declining HMR forces a
// full page reload on every edit instead, so a tab can never drift again.
if (import.meta.hot) import.meta.hot.decline();

createRoot(document.getElementById("root")!).render(<App />);
