import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

// Get all package directories
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)

let synced = 0

for (const packageDir of packageDirs) {
  const packageJsonPath = join(packagesDir, packageDir, 'package.json')
  const jsrJsonPath = join(packagesDir, packageDir, 'jsr.json')
  
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const jsrPkg = JSON.parse(readFileSync(jsrJsonPath, 'utf8'))
    
    if (jsrPkg.version !== pkg.version) {
      jsrPkg.version = pkg.version
      writeFileSync(jsrJsonPath, JSON.stringify(jsrPkg, null, 2) + '\n')
      synced++
      console.log(`Synced ${packageDir}: ${pkg.version}`)
    }
  } catch (error) {
    console.error(`Failed to sync ${packageDir}:`, error.message)
  }
}

console.log(`Synced ${synced} jsr.json files`)