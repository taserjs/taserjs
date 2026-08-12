export interface Logger {
  info(message: string): void
  error(message: string): void
}

export function createLogger(disabled: boolean): Logger {
  if (disabled) {
    return {
      info() {},
      error(message: string) {
        console.error(message)
      },
    }
  }

  return {
    info(message: string) {
      console.log(message)
    },
    error(message: string) {
      console.error(message)
    },
  }
}
