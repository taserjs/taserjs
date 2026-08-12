import { spawn } from 'node:child_process'

import type { Agent, ResolvedCommand } from 'package-manager-detector'
import { resolveCommand } from 'package-manager-detector/commands'
import { getUserAgent } from 'package-manager-detector/detect'

export function resolveUserAgent(): Agent {
  return getUserAgent() || 'npm'
}

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

const fallback = {
  agent: 'npm',
  install: (packages: string[], dev: boolean) => {
    return ['install', ...packages, dev ? '-D' : '']
  },
}

function resolveInstallCommand(agent: Agent, packages: string[], dev: boolean): ResolvedCommand {
  const command = resolveCommand(agent, 'install', packages)
  if (command) return command

  return { command: fallback.agent, args: fallback.install(packages, dev) }
}

export async function installPackages(
  agent: Agent,
  cwd: string,
  { dependencies, devDependencies }: {
    dependencies: string[]
    devDependencies: string[]
  },
): Promise<void> {
  if (dependencies.length > 0) {
    const { command, args } = resolveInstallCommand(agent, dependencies, false)
    await runCommand(command, args, cwd)
  }
  if (devDependencies.length > 0) {
    const { command, args } = resolveInstallCommand(agent, devDependencies, true)
    await runCommand(command, args, cwd)
  }
}

export function runScript(agent: Agent, script: string): string {
  const resolved = resolveCommand(agent, 'run', [script])
  if (!resolved) {
    throw new Error(`Unable to resolve run command for ${agent}`)
  }
  return `${resolved.command} ${resolved.args.join(' ')}`
}
