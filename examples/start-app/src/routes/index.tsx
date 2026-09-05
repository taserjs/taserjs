import { api } from "../lib/api.js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data } = useQuery({
    queryKey: ["greeting"],
    queryFn: () => api.greeting.$get().then((res) => res.json()),
  });

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h3>TanStack Start + Taser.js</h3>
      <ul>
        <li>This page is SSR'd by TanStack Start.</li>
        {data && <li>Data from Taser.js: {data.greeting}</li>}
      </ul>
    </div>
  );
}
