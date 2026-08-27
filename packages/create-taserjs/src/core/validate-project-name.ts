import path from "node:path";

const RESERVED_WINDOWS_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NVR",
  "NULL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

export function validateProjectName(name: string, cwd = process.cwd()): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Project name is required";
  }

  if (trimmed.includes("..")) {
    return 'Project name cannot contain ".."';
  }

  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return "Project name cannot start or end with a dot";
  }

  const baseName = trimmed.split(".")[0]?.toUpperCase();
  if (baseName && RESERVED_WINDOWS_NAMES.has(baseName)) {
    return `Project name "${trimmed}" is reserved on Windows`;
  }

  const targetDir = path.resolve(cwd, trimmed);
  const relative = path.relative(cwd, targetDir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return "Project name resolves outside the current directory";
  }

  return undefined;
}
