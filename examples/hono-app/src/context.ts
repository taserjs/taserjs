import { createContext } from "@taserjs/router";

export const context = createContext({
  request: (req: Request) => ({
    requestId: "123",
  }),
});
