export { run } from "./cli.js";
export { runCreateCommand, type RunCreateCommandOptions } from "./commands/create.js";
export { scaffoldProject } from "./core/scaffold-engine.js";
export { FRAMEWORK_IDS } from "./frameworks/registry.js";
export { HOST_IDS } from "./hosts/registry.js";
export {
  type DeployPreset,
  type FrameworkId,
  type HostId,
  type ScaffoldOptions,
  type ScaffoldResult,
} from "./core/types.js";
