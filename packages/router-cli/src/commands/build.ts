import { createNitro, build } from "nitro/builder";
import { taserNitro } from "@taserjs/vite-plugin/nitro";

export async function runBuild(argv: Record<string, any>): Promise<void> {
  const rootDir = (argv.dir as string) || process.cwd();
  const routesDir = (argv.routesDir || argv.routes) as string | undefined;

  const nitro = await createNitro({
    rootDir,
    ...(routesDir ? { routesDir } : {}),
    modules: [taserNitro()],
  });

  await build(nitro);
}
