/**
 * Converts manifest wildcard routes (e.g. `/*`, `/files/*`)
 * to rou3 wildcard capturing format (`/**:_splat`, `/files/**:_splat`).
 */
export function toRou3RegisterPath(manifestPath: string): string {
  if (manifestPath === "/*") {
    return "/**:_splat";
  }
  if (manifestPath.endsWith("/*")) {
    return `${manifestPath.slice(0, -2)}/**:_splat`;
  }
  return manifestPath;
}

export const toHonoRegisterPath = toRou3RegisterPath;
