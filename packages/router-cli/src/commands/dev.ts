import { createNitro, createDevServer, build } from "nitro/builder";
import { taserNitro } from "@taserjs/vite-plugin/nitro";

export async function runDev(argv: Record<string, any>): Promise<void> {
  const rootDir = (argv.dir as string) || process.cwd();
  const routesDir = (argv.routesDir || argv.routes) as string | undefined;

  const nitro = await createNitro({
    rootDir,
    dev: true,
    ...(routesDir ? { routesDir } : {}),
    modules: [taserNitro()],
  });

  const server = createDevServer(nitro);
  const listener = server.listen();
  await build(nitro);

  const url = (listener as any)?.url || "http://localhost:3000/";
  console.log(`\n  ⚡ \x1b[32m\x1b[1mTaser dev server ready\x1b[0m at \x1b[36m${url}\x1b[0m\n`);
}
