import { internalServerError } from "@taserjs/router-utils/reply";

export function handlePipelineError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof Error) {
    console.error(error);
  } else {
    console.error("Unhandled pipeline error", error);
  }

  return internalServerError();
}

export { ensureResponse } from "@taserjs/router-utils/reply";
