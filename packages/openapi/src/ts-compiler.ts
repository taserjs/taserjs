import ts from "typescript";

import type { OpenApiHeader, OpenApiRouteDoc } from "./types.js";

export type InferredResponse = {
  description?: string;
  headers?: Record<string, OpenApiHeader>;
  content?: Record<string, { schema: Record<string, unknown> }>;
};
export type InferredResponseMap = Record<number, InferredResponse>;
export type RouteDocsMap = Map<string, OpenApiRouteDoc>;
export type ExtractedRouteTypes = {
  responses: Map<string, InferredResponseMap>;
  docs: RouteDocsMap;
};

const BINARY_BODY_TYPES = new Set([
  "Buffer",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int8Array",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Blob",
  "File",
]);

/**
 * Inspects AST nodes inside a handler to detect reply helper calls
 * (e.g. reply.stream, reply.pipe, reply.file, reply.blob, reply.buffer, reply.html, reply.text, reply.json, reply.redirect).
 */
function detectReplyHelperKind(node?: ts.Node): string | undefined {
  if (!node) return undefined;

  let helperName: string | undefined;

  function visit(n: ts.Node) {
    if (helperName) return;
    if (ts.isCallExpression(n)) {
      if (ts.isPropertyAccessExpression(n.expression)) {
        const objText = n.expression.expression.getText(sourceFileOf(n));
        const propText = n.expression.name.text;
        if (objText === "reply" || objText === "stream") {
          helperName = propText;
          return;
        }
      } else if (ts.isIdentifier(n.expression)) {
        const fnName = n.expression.text;
        if (
          [
            "pipe",
            "stream",
            "file",
            "blob",
            "buffer",
            "html",
            "text",
            "noContent",
            "json",
            "redirect",
          ].includes(fnName)
        ) {
          helperName = fnName;
          return;
        }
      }
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return helperName;
}

/**
 * Maps a reply body type to an OpenAPI response object.
 */
function responseForBody(
  typeChecker: ts.TypeChecker,
  bodyType: ts.Type,
  node?: ts.Node,
  statusCode = 200,
): InferredResponse {
  const flags = bodyType.getFlags();
  const helper = detectReplyHelperKind(node);

  // 1. Redirect BodyKind (301, 302, 307, 308)
  if (
    helper === "redirect" ||
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 307 ||
    statusCode === 308
  ) {
    return {
      headers: {
        Location: {
          description: "Target URL to redirect to",
          schema: { type: "string" },
        },
      },
    };
  }

  // 2. Stream, pipe, file, blob, buffer BodyKinds
  if (
    helper === "stream" ||
    helper === "pipe" ||
    helper === "file" ||
    helper === "blob" ||
    helper === "buffer"
  ) {
    return {
      content: {
        "application/octet-stream": { schema: { type: "string", format: "binary" } },
      },
    };
  }

  // 3. HTML BodyKind
  if (helper === "html") {
    return {
      content: {
        "text/html": { schema: { type: "string" } },
      },
    };
  }

  // 4. Plain text BodyKind
  if (helper === "text") {
    return {
      content: {
        "text/plain": { schema: { type: "string" } },
      },
    };
  }

  // 5. Empty / NoContent BodyKind
  if (helper === "noContent" || statusCode === 204 || statusCode === 304) {
    return {};
  }

  const name = bodyType.getSymbol()?.getName() ?? bodyType.aliasSymbol?.getName() ?? undefined;

  // 6. Binary / stream types from TypeChecker
  if (name === "ReadableStream" || (name && BINARY_BODY_TYPES.has(name))) {
    return {
      content: {
        "application/octet-stream": { schema: { type: "string", format: "binary" } },
      },
    };
  }

  // 7. FormData BodyKind
  if (name === "FormData") {
    return { content: { "multipart/form-data": { schema: { type: "object" } } } };
  }

  // 8. URLSearchParams BodyKind
  if (name === "URLSearchParams") {
    return {
      content: { "application/x-www-form-urlencoded": { schema: { type: "object" } } },
    };
  }

  // 9. Null / void / undefined body
  if (
    flags &
    (ts.TypeFlags.Null | ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Never)
  ) {
    // In Taser, reply.stream / reply.pipe uses ReplyOf<200, null>.
    // If statusCode is 200/206 with null body, default to octet-stream stream.
    if (statusCode === 200 || statusCode === 206) {
      return {
        content: {
          "application/octet-stream": { schema: { type: "string", format: "binary" } },
        },
      };
    }
    return {};
  }

  if (flags & ts.TypeFlags.StringLike) {
    return { content: { "text/plain": { schema: { type: "string" } } } };
  }

  // 10. JSON BodyKind (default)
  return {
    content: {
      "application/json": { schema: tsTypeToJsonSchema(typeChecker, bodyType, node) },
    },
  };
}

/**
 * Converts a TypeScript TypeChecker Type into an OpenAPI JSON Schema object.
 */
export function tsTypeToJsonSchema(
  typeChecker: ts.TypeChecker,
  type: ts.Type,
  node?: ts.Node,
): Record<string, unknown> {
  const flags = type.getFlags();

  // 1. Check boolean (Note: TS boolean is internally a union of true | false)
  if (
    flags & ts.TypeFlags.Boolean ||
    flags & ts.TypeFlags.BooleanLiteral ||
    (type.isUnion() &&
      type.types.length === 2 &&
      type.types.every((t) => (t.getFlags() & ts.TypeFlags.BooleanLiteral) !== 0))
  ) {
    return { type: "boolean" };
  }

  // 2. Check primitives
  if (flags & ts.TypeFlags.String || flags & ts.TypeFlags.StringLiteral) {
    return { type: "string" };
  }
  if (flags & ts.TypeFlags.Number || flags & ts.TypeFlags.NumberLiteral) {
    return { type: "number" };
  }
  if (flags & ts.TypeFlags.BigInt || flags & ts.TypeFlags.BigIntLiteral) {
    return { type: "integer", format: "int64" };
  }
  if (flags & ts.TypeFlags.Null || flags & ts.TypeFlags.Undefined) {
    return { type: "null" };
  }

  const name = type.getSymbol()?.getName() ?? type.aliasSymbol?.getName() ?? undefined;
  if (name && BINARY_BODY_TYPES.has(name)) {
    return { type: "string", format: "binary" };
  }

  // 3. Check General Union (excluding boolean handled above)
  if (type.isUnion()) {
    // Filter out undefined/void if optional
    const hasNull = type.types.some((t) => (t.getFlags() & ts.TypeFlags.Null) !== 0);
    const nonNullTypes = type.types.filter(
      (t) =>
        (t.getFlags() & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) === 0,
    );

    if (nonNullTypes.length === 1 && nonNullTypes[0]) {
      const inner = tsTypeToJsonSchema(typeChecker, nonNullTypes[0], node);
      if (hasNull && typeof inner.type === "string") {
        return { ...inner, type: [inner.type, "null"] };
      }
      return inner;
    }

    const schemas = type.types.map((t) => tsTypeToJsonSchema(typeChecker, t, node));
    return { anyOf: schemas };
  }

  // 4. Check Array / ReadonlyArray
  if (typeChecker.isArrayType(type)) {
    const typeRef = type as ts.TypeReference;
    const elementType = typeRef.typeArguments?.[0];
    return {
      type: "array",
      items: elementType ? tsTypeToJsonSchema(typeChecker, elementType, node) : { type: "object" },
    };
  }

  // 5. Check Object / Interface / Type Literal
  const apparentType = typeChecker.getApparentType(type);
  const properties = apparentType.getProperties();

  if (properties.length > 0 || (flags & ts.TypeFlags.Object) !== 0) {
    const propsSchema: Record<string, unknown> = {};
    const required: string[] = [];

    for (const prop of properties) {
      const propDecl = prop.valueDeclaration ?? prop.declarations?.[0] ?? node;
      const propType = propDecl
        ? typeChecker.getTypeOfSymbolAtLocation(prop, propDecl)
        : typeChecker.getTypeOfSymbol(prop);

      propsSchema[prop.getName()] = tsTypeToJsonSchema(typeChecker, propType, node);

      if (!(prop.flags & ts.SymbolFlags.Optional)) {
        required.push(prop.getName());
      }
    }

    return {
      type: "object",
      properties: propsSchema,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: "object" };
}

/**
 * Extracts { statusCode, bodyType } from a ReplyOf<S, B> member
 */
function extractReplyMember(
  typeChecker: ts.TypeChecker,
  type: ts.Type,
): { statusCode: number; bodyType: ts.Type } | undefined {
  if (type.aliasSymbol?.getName() === "ReplyOf") {
    const aliasArgs = type.aliasTypeArguments;
    const statusType = aliasArgs?.[0];
    const bodyType = aliasArgs?.[1];
    if (statusType?.isNumberLiteral()) {
      return { statusCode: statusType.value, bodyType: bodyType ?? typeChecker.getAnyType() };
    }
  }

  if (type.isIntersection()) {
    const statusProp = type.getProperty("status");
    const dataProp = type.getProperty("data");
    if (statusProp && dataProp) {
      const statusNode: ts.Node =
        statusProp.valueDeclaration ??
        statusProp.declarations?.[0] ??
        type.getSymbol()?.declarations?.[0] ??
        ({} as ts.Node);
      const statusType = typeChecker.getTypeOfSymbolAtLocation(statusProp, statusNode);
      if (statusType.isNumberLiteral()) {
        const dataNode: ts.Node =
          dataProp.valueDeclaration ?? dataProp.declarations?.[0] ?? statusNode;
        return {
          statusCode: statusType.value,
          bodyType: typeChecker.getTypeOfSymbolAtLocation(dataProp, dataNode),
        };
      }
    }
  }

  return undefined;
}

/**
 * Infers OpenAPI responses from a Route's `$Infer.Output` type.
 */
export function inferResponsesFromOutputType(
  typeChecker: ts.TypeChecker,
  outputType: ts.Type,
  node?: ts.Node,
): InferredResponseMap | undefined {
  const members = outputType.isUnion() ? outputType.types : [outputType];
  const responses: InferredResponseMap = {};

  for (const member of members) {
    const reply = extractReplyMember(typeChecker, member);
    if (!reply) continue;
    const { statusCode } = reply;
    const response = responseForBody(typeChecker, reply.bodyType, node, statusCode);
    const existing = responses[statusCode];
    if (existing?.content && response.content) {
      responses[statusCode] = {
        ...existing,
        ...response,
        content: { ...existing.content, ...response.content },
        headers: { ...existing.headers, ...response.headers },
      };
    } else {
      responses[statusCode] = response;
    }
  }

  return Object.keys(responses).length > 0 ? responses : undefined;
}

function inferSingleTypeResponse(
  typeChecker: ts.TypeChecker,
  type: ts.Type,
  node?: ts.Node,
): InferredResponseMap {
  let statusCode = 200;
  let bodyType = type;

  const symbol = type.getSymbol() ?? type.aliasSymbol;
  if (symbol) {
    const name = symbol.getName();
    if (name === "TypedResponse" || name === "Response") {
      const typeArgs = (type as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length >= 1 && typeArgs[0]) {
        bodyType = typeArgs[0];
      } else {
        const response = responseForBody(typeChecker, bodyType, node, statusCode);
        return { [statusCode]: response };
      }
      if (typeArgs && typeArgs.length >= 2 && typeArgs[1]) {
        const statusType = typeArgs[1];
        if (statusType.isNumberLiteral()) {
          statusCode = statusType.value;
        }
      }
    }
  }

  const response = responseForBody(typeChecker, bodyType, node, statusCode);
  return { [statusCode]: response };
}

/**
 * Uses TypeScript Compiler API to inspect a handler's return type.
 */
export function inferResponsesFromTsType(
  typeChecker: ts.TypeChecker,
  handlerType: ts.Type,
  node?: ts.Node,
): InferredResponseMap {
  let currentType = handlerType;
  while (currentType.getCallSignatures().length > 0) {
    const signatures = currentType.getCallSignatures();
    const signature = signatures[0];
    if (!signature) break;
    const returnType = typeChecker.getReturnTypeOfSignature(signature);
    currentType = typeChecker.getAwaitedType(returnType) ?? returnType;
  }

  if (currentType.isUnion()) {
    const responses: InferredResponseMap = {};
    for (const subType of currentType.types) {
      const singleResp = inferSingleTypeResponse(typeChecker, subType, node);
      Object.assign(responses, singleResp);
    }
    return responses;
  }

  return inferSingleTypeResponse(typeChecker, currentType, node);
}

function inferRouteResponses(
  typeChecker: ts.TypeChecker,
  routeType: ts.Type,
  handlerProp: ts.Symbol,
  handlerDecl: ts.Node,
  routeDecl: ts.Node,
): InferredResponseMap {
  const inferProp = routeType.getProperty("$Infer");
  if (inferProp) {
    const inferNode = inferProp.valueDeclaration ?? inferProp.declarations?.[0] ?? handlerDecl;
    const inferType = typeChecker.getTypeOfSymbolAtLocation(inferProp, inferNode);
    const outputProp = inferType.getProperty("Output");
    if (outputProp) {
      const outputNode = outputProp.valueDeclaration ?? outputProp.declarations?.[0] ?? inferNode;
      const outputType = typeChecker.getTypeOfSymbolAtLocation(outputProp, outputNode);
      const fromOutput = inferResponsesFromOutputType(typeChecker, outputType, routeDecl);
      if (fromOutput) {
        return fromOutput;
      }
    }
  }

  const handlerType = typeChecker.getTypeOfSymbolAtLocation(handlerProp, handlerDecl);
  return inferResponsesFromTsType(typeChecker, handlerType, routeDecl);
}

function extractMethodLiterals(methodType: ts.Type): string[] {
  const types = methodType.isUnion() ? methodType.types : [methodType];
  const literals = types.filter((t) => t.isStringLiteral()).map((t) => t.value.toUpperCase());
  const concrete = literals.filter((m) => m !== "ANY" && m !== "ALL");
  return concrete.length > 0 ? concrete : literals;
}

/**
 * Scans a ts.Program to build mappings from routes to inferred responses and docs.
 */
export function extractRouteTypesFromProgram(program: ts.Program): ExtractedRouteTypes {
  const typeChecker = program.getTypeChecker();
  const routeTypesMap = new Map<string, InferredResponseMap>();
  const docsMap: RouteDocsMap = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    const moduleSymbol = typeChecker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exports = typeChecker.getExportsOfModule(moduleSymbol);
    const routeExport = exports.find((exp) => exp.getName() === "Route");
    if (!routeExport) continue;

    const routeDecl = routeExport.valueDeclaration ?? routeExport.declarations?.[0];
    if (!routeDecl) continue;

    const routeType = typeChecker.getTypeOfSymbolAtLocation(routeExport, routeDecl);

    const pathProp = routeType.getProperty("path");
    const methodProp = routeType.getProperty("method");
    const handlerProp = routeType.getProperty("handler");

    if (!handlerProp) continue;

    let routePath: string | undefined;
    let routeMethods: string[] = [];

    if (pathProp) {
      const pathType = typeChecker.getTypeOfSymbolAtLocation(pathProp, routeDecl);
      if (pathType.isStringLiteral()) {
        routePath = pathType.value;
      }
    }

    if (methodProp) {
      const methodType = typeChecker.getTypeOfSymbolAtLocation(methodProp, routeDecl);
      routeMethods = extractMethodLiterals(methodType);
    }

    const handlerDecl = handlerProp.valueDeclaration ?? handlerProp.declarations?.[0] ?? routeDecl;
    const responses = inferRouteResponses(
      typeChecker,
      routeType,
      handlerProp,
      handlerDecl,
      routeDecl,
    );

    if (routePath && routeMethods.length > 0) {
      const openApiExport = exports.find((exp) => exp.getName() === "OpenAPI");
      let doc: OpenApiRouteDoc | undefined;
      if (openApiExport) {
        const openApiDecl = openApiExport.valueDeclaration ?? openApiExport.declarations?.[0];
        if (openApiDecl) {
          doc =
            readDocFromInitializer(openApiDecl) ??
            readDocFromType(
              typeChecker,
              typeChecker.getTypeOfSymbolAtLocation(openApiExport, openApiDecl),
            );
        }
      }
      doc ??= readDocFromJsDoc(routeDecl, sourceFile);
      const hasDoc = doc !== undefined && Object.keys(doc).length > 0;

      for (const routeMethod of routeMethods) {
        const routeKey = `${routePath}:${routeMethod}`;
        routeTypesMap.set(routeKey, responses);
        if (hasDoc) {
          docsMap.set(routeKey, doc!);
        }
      }
    }
  }

  return { responses: routeTypesMap, docs: docsMap };
}

function unwrapInitializer(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  if (ts.isCallExpression(current) && current.arguments.length === 1) {
    return unwrapInitializer(current.arguments[0]!);
  }
  return current;
}

function readDocFromInitializer(decl: ts.Node): OpenApiRouteDoc | undefined {
  if (!ts.isVariableDeclaration(decl) || !decl.initializer) return undefined;

  const obj = unwrapInitializer(decl.initializer);
  if (!ts.isObjectLiteralExpression(obj)) return undefined;

  const doc: OpenApiRouteDoc = {};
  let found = false;

  const readString = (expr: ts.Expression): string | undefined => {
    const unwrapped = unwrapInitializer(expr);
    return ts.isStringLiteral(unwrapped) ? unwrapped.text : undefined;
  };

  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name.getText(sourceFileOf(prop));

    switch (name) {
      case "summary":
      case "description":
      case "operationId": {
        const value = readString(prop.initializer);
        if (value !== undefined) {
          doc[name] = value;
          found = true;
        }
        break;
      }
      case "tags": {
        const tagsExpr = unwrapInitializer(prop.initializer);
        if (ts.isArrayLiteralExpression(tagsExpr)) {
          const tags = tagsExpr.elements
            .map(readString)
            .filter((tag): tag is string => tag !== undefined);
          if (tags.length > 0) {
            doc.tags = tags;
            found = true;
          }
        }
        break;
      }
      case "deprecated": {
        if (unwrapInitializer(prop.initializer).kind === ts.SyntaxKind.TrueKeyword) {
          doc.deprecated = true;
          found = true;
        }
        break;
      }
      case "hidden": {
        if (unwrapInitializer(prop.initializer).kind === ts.SyntaxKind.TrueKeyword) {
          doc.hidden = true;
          found = true;
        }
        break;
      }
      case "externalDocs": {
        const docsExpr = unwrapInitializer(prop.initializer);
        if (ts.isObjectLiteralExpression(docsExpr)) {
          let url: string | undefined;
          let description: string | undefined;
          for (const docsProp of docsExpr.properties) {
            if (!ts.isPropertyAssignment(docsProp)) continue;
            const docsName = docsProp.name.getText(sourceFileOf(docsProp));
            if (docsName === "url") {
              url = readString(docsProp.initializer);
            } else if (docsName === "description") {
              description = readString(docsProp.initializer);
            }
          }
          if (url !== undefined) {
            doc.externalDocs = description !== undefined ? { url, description } : { url };
            found = true;
          }
        }
        break;
      }
    }
  }

  return found ? doc : undefined;
}

function sourceFileOf(node: ts.Node): ts.SourceFile {
  let current: ts.Node = node;
  while (!ts.isSourceFile(current)) {
    current = current.parent;
  }
  return current;
}

function readDocFromType(
  typeChecker: ts.TypeChecker,
  openApiType: ts.Type,
): OpenApiRouteDoc | undefined {
  const doc: OpenApiRouteDoc = {};
  let found = false;

  const readStringProp = (name: "summary" | "description" | "operationId"): void => {
    const prop = openApiType.getProperty(name);
    if (!prop) return;
    const propType = typeChecker.getTypeOfSymbol(prop);
    if (propType.isStringLiteral()) {
      doc[name] = propType.value;
      found = true;
    }
  };

  readStringProp("summary");
  readStringProp("description");
  readStringProp("operationId");

  const tagsProp = openApiType.getProperty("tags");
  if (tagsProp) {
    const tagsType = typeChecker.getTypeOfSymbol(tagsProp);
    const tagTypes =
      (tagsType as ts.TypeReference).typeArguments ??
      (typeChecker.isArrayType(tagsType)
        ? [(tagsType as ts.TypeReference).typeArguments?.[0]].filter(Boolean)
        : []);
    const tags = tagTypes
      .flatMap((t) => (t ? (t.isUnion() ? t.types : [t]) : []))
      .filter((t) => t.isStringLiteral())
      .map((t) => t.value);
    if (tags.length > 0) {
      doc.tags = tags;
      found = true;
    }
  }

  const deprecatedProp = openApiType.getProperty("deprecated");
  if (deprecatedProp) {
    const deprecatedType = typeChecker.getTypeOfSymbol(deprecatedProp);
    if (
      deprecatedType.flags & ts.TypeFlags.BooleanLiteral &&
      typeChecker.typeToString(deprecatedType) === "true"
    ) {
      doc.deprecated = true;
      found = true;
    }
  }

  const externalDocsProp = openApiType.getProperty("externalDocs");
  if (externalDocsProp) {
    const externalDocsType = typeChecker.getTypeOfSymbol(externalDocsProp);
    const urlProp = externalDocsType.getProperty("url");
    if (urlProp) {
      const urlType = typeChecker.getTypeOfSymbol(urlProp);
      if (urlType.isStringLiteral()) {
        const externalDocs: OpenApiRouteDoc["externalDocs"] = { url: urlType.value };
        const descriptionProp = externalDocsType.getProperty("description");
        if (descriptionProp) {
          const descriptionType = typeChecker.getTypeOfSymbol(descriptionProp);
          if (descriptionType.isStringLiteral()) {
            externalDocs.description = descriptionType.value;
          }
        }
        doc.externalDocs = externalDocs;
        found = true;
      }
    }
  }

  return found ? doc : undefined;
}

function readDocFromJsDoc(decl: ts.Node, sourceFile: ts.SourceFile): OpenApiRouteDoc | undefined {
  let node: ts.Node | undefined = decl;
  while (node && !ts.isSourceFile(node)) {
    const doc = extractJsdocAbove(node, sourceFile);
    if (doc) {
      return doc;
    }
    node = node.parent;
  }
  return undefined;
}

function extractJsdocAbove(node: ts.Node, sourceFile: ts.SourceFile): OpenApiRouteDoc | undefined {
  const fullText = sourceFile.getFullText();
  const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (!commentRanges || commentRanges.length === 0) return undefined;

  const jsdocRange = [...commentRanges]
    .reverse()
    .find((range) => fullText.startsWith("/**", range.pos));
  if (!jsdocRange) return undefined;

  const between = fullText.slice(jsdocRange.end, node.getStart());
  if (between.trim() !== "") return undefined;

  const lines = fullText
    .slice(jsdocRange.pos + 3, jsdocRange.end - 2)
    .split("\n")
    .map((line) => line.replace(/^\s*\*/, "").trim());

  const doc: OpenApiRouteDoc = {};
  const descriptionLines: string[] = [];

  for (const line of lines) {
    const match = /^@(\w+)\s*(.*)$/.exec(line);
    if (!match) {
      descriptionLines.push(line);
      continue;
    }
    const tagName = match[1];
    const value = match[2] ?? "";
    switch (tagName) {
      case "summary":
        doc.summary = value.trim();
        break;
      case "description":
        doc.description = value.trim();
        break;
      case "tag":
      case "tags": {
        const tags = value
          .trim()
          .split(/[,\s]+/)
          .filter(Boolean);
        doc.tags = [...(doc.tags ?? []), ...tags];
        break;
      }
      case "operationId":
        doc.operationId = value.trim();
        break;
      case "deprecated":
        doc.deprecated = true;
        break;
      case "hidden":
      case "internal":
        doc.hidden = true;
        break;
      case "externalDocs":
        doc.externalDocs = { url: value.trim() };
        break;
    }
  }

  const descriptionText = descriptionLines.join("\n").trim();
  if (descriptionText) {
    if (doc.summary) {
      doc.description = doc.description ?? descriptionText;
    } else {
      const [firstLine = "", ...rest] = descriptionText.split("\n");
      doc.summary = firstLine.trim();
      const restText = rest.join("\n").trim();
      if (restText) {
        doc.description = restText;
      }
    }
  }

  return Object.keys(doc).length > 0 ? doc : undefined;
}
