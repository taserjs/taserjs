import { createClient } from "@taserjs/router-client";
import type { RouteManifest } from "#taserjs/virtual/manifest";

const client = createClient<RouteManifest>({
  baseUrl: "http://localhost:3000",
});

const res = await client.$well_known.$get();
console.log(await res.json());
