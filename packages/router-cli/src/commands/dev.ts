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
  server.listen();
  await build(nitro);

}
