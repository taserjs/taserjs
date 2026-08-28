import { t } from "@/server/taser";
import { json } from "@taserjs/router/reply";

export const Route = t.get('/').handler((_ctx) => {
  return json({ message: 'Hello, Taser!' })
})