import { parseSync } from 'oxc-parser'

import { HTTP_VERBS } from '../constants.js'
import type { HttpVerb, RouteFileMethod } from '../types/http.js'
import { isHttpVerb } from './classify.js'
import { ScanError } from '../support/errors.js'

type OxcNode = {
  type: string
  [key: string]: unknown
}

type ParseRouteSourceResult = {
  errors: ScanError[]
  anyMethods?: HttpVerb[]
}

export function createRouteFactoryName(method: RouteFileMethod): string {
  if (method === 'ANY') {
    return 't.any'
  }
  if (method === 'ALL') {
    return 't.all'
  }
  return `t.${method.toLowerCase()}`
}

function expectedFactoryMember(method: RouteFileMethod): string {
  if (method === 'ANY') {
    return 'any'
  }
  if (method === 'ALL') {
    return 'all'
  }
  return method.toLowerCase()
}

function isIdentifier(node: OxcNode | undefined, name?: string): boolean {
  return node?.type === 'Identifier' && (name === undefined || node.name === name)
}

function isMemberExpression(node: OxcNode | undefined): node is OxcNode & {
  object: OxcNode
  property: OxcNode
} {
  return node?.type === 'MemberExpression'
}

function isTFactoryCall(node: OxcNode, member: string): boolean {
  if (!isMemberExpression(node)) {
    return false
  }
  if (!isIdentifier(node.object, 't')) {
    return false
  }
  return isIdentifier(node.property, member)
}

function walkNodes(root: OxcNode, visit: (node: OxcNode) => void): void {
  const stack: OxcNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    visit(node)
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            stack.push(item as OxcNode)
          }
        }
      }
      else if (value && typeof value === 'object' && 'type' in value) {
        stack.push(value as OxcNode)
      }
    }
  }
}

function findExportedConst(program: OxcNode, exportName: string): OxcNode | null {
  const body = program.body as OxcNode[] | undefined
  if (!body) {
    return null
  }

  for (const statement of body) {
    if (statement.type !== 'ExportNamedDeclaration') {
      continue
    }
    const declaration = statement.declaration as OxcNode | undefined
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }
    const declarations = declaration.declarations as OxcNode[] | undefined
    for (const declarator of declarations ?? []) {
      const declaratorId = declarator.id as OxcNode | undefined
      if (isIdentifier(declaratorId, exportName)) {
        return declarator
      }
    }
  }

  return null
}

function containsFactoryCall(root: OxcNode, member: string): boolean {
  let found = false
  walkNodes(root, (node) => {
    if (node.type === 'CallExpression' && isTFactoryCall(node.callee as OxcNode, member)) {
      found = true
    }
  })
  return found
}

function parseAnyMethodsFromSource(root: OxcNode, rawRel: string): ParseRouteSourceResult {
  const errors: ScanError[] = []
  let methods: HttpVerb[] | undefined

  walkNodes(root, (node) => {
    if (node.type !== 'CallExpression' || !isTFactoryCall(node.callee as OxcNode, 'any')) {
      return
    }

    const args = node.arguments as OxcNode[] | undefined
    const methodsArg = args?.[1]
    if (!methodsArg || methodsArg.type !== 'ArrayExpression') {
      errors.push(new ScanError(
        'ANY route must call `t.any(path, [methods], ...)` with a static methods array',
        rawRel,
      ))
      return
    }

    const elements = methodsArg.elements as OxcNode[] | undefined
    if (!elements || elements.length === 0) {
      errors.push(new ScanError('ANY route methods array must be a non-empty array', rawRel))
      return
    }

    const parsed: HttpVerb[] = []
    const seen = new Set<string>()

    for (const element of elements) {
      if (!element || element.type !== 'Literal' || typeof element.value !== 'string') {
        errors.push(new ScanError('ANY route methods must be string literals', rawRel))
        continue
      }
      const verb = element.value.toUpperCase()
      if (!isHttpVerb(verb)) {
        errors.push(new ScanError(
          `Unknown HTTP method "${element.value}" in t.any methods. Use one of: ${HTTP_VERBS.join(', ')}`,
          rawRel,
        ))
        continue
      }
      if (seen.has(verb)) {
        errors.push(new ScanError(`Duplicate method "${verb}" in t.any methods`, rawRel))
        continue
      }
      seen.add(verb)
      parsed.push(verb)
    }

    if (errors.length === 0) {
      methods = parsed
    }
  })

  if (!methods && errors.length === 0) {
    errors.push(new ScanError(
      'ANY route must call `t.any(path, [methods], ...)` with a static methods array',
      rawRel,
    ))
  }

  return { errors, ...(methods ? { anyMethods: methods } : {}) }
}

function parseProgram(source: string, rawRel: string): { program: OxcNode } | { errors: ScanError[] } {
  const result = parseSync(rawRel, source)
  if (result.errors.length > 0) {
    const message = result.errors.map(error => error.message).join('; ')
    return { errors: [new ScanError(`Failed to parse route file: ${message}`, rawRel)] }
  }
  return { program: result.program as unknown as OxcNode }
}

export function analyzeRouteFileSource(
  source: string,
  rawRel: string,
  method: RouteFileMethod,
): ParseRouteSourceResult {
  const parsed = parseProgram(source, rawRel)
  if ('errors' in parsed) {
    return { errors: parsed.errors }
  }

  const errors: ScanError[] = []
  const routeExport = findExportedConst(parsed.program, 'Route')
  if (!routeExport) {
    errors.push(new ScanError('Route file must export `Route`', rawRel))
  }

  const factoryMember = expectedFactoryMember(method)
  const hasFactory = containsFactoryCall(parsed.program, factoryMember)

  if (!hasFactory) {
    const factoryName = createRouteFactoryName(method)
    errors.push(new ScanError(
      `Route file must use \`${factoryName}(...)\` for ${method} routes`,
      rawRel,
    ))
  }

  if (method === 'ANY') {
    const anyResult = parseAnyMethodsFromSource(parsed.program, rawRel)
    return {
      errors: [...errors, ...anyResult.errors],
      ...(anyResult.anyMethods ? { anyMethods: anyResult.anyMethods } : {}),
    }
  }

  return { errors }
}

export function analyzeLayoutFileSource(source: string, rawRel: string): ParseRouteSourceResult {
  const parsed = parseProgram(source, rawRel)
  if ('errors' in parsed) {
    return { errors: parsed.errors }
  }

  const errors: ScanError[] = []
  const middlewareExport = findExportedConst(parsed.program, 'Middleware')
  if (!middlewareExport) {
    errors.push(new ScanError('Layout file must export `Middleware`', rawRel))
  }

  const hasMiddleware = containsFactoryCall(parsed.program, 'middleware')

  if (!hasMiddleware) {
    errors.push(new ScanError('Layout file must use `t.middleware(...)`', rawRel))
  }

  return { errors }
}
