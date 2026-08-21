import ts from "typescript";

export type InferredResponseMap = Record<number, Record<string, unknown>>;

/**
 * Uses TypeScript Compiler API (`TypeChecker`) to inspect a Taser route handler's
 * return type and infer OpenAPI JSON schema responses.
 */
export function inferResponsesFromTsType(
  typeChecker: ts.TypeChecker,
  handlerType: ts.Type,
  node?: ts.Node,
): InferredResponseMap {
  const responses: InferredResponseMap = {};

  const signatures = handlerType.getCallSignatures();
  if (signatures.length === 0) {
    return inferSingleTypeResponse(typeChecker, handlerType, node);
  }

  const signature = signatures[0];
  if (!signature) {
    return inferSingleTypeResponse(typeChecker, handlerType, node);
  }

  const returnType = typeChecker.getReturnTypeOfSignature(signature);
  const unwrappedType = typeChecker.getAwaitedType(returnType) ?? returnType;

  if (unwrappedType.isUnion()) {
    for (const subType of unwrappedType.types) {
      const singleResp = inferSingleTypeResponse(typeChecker, subType, node);
      Object.assign(responses, singleResp);
    }
    return responses;
  }

  return inferSingleTypeResponse(typeChecker, unwrappedType, node);
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
      }
      if (typeArgs && typeArgs.length >= 2 && typeArgs[1]) {
        const statusType = typeArgs[1];
        if (statusType.isNumberLiteral()) {
          statusCode = statusType.value;
        }
      }
    }
  }

  const jsonSchema = tsTypeToJsonSchema(typeChecker, bodyType, node);

  return {
    [statusCode]: jsonSchema,
  };
}

export function tsTypeToJsonSchema(
  typeChecker: ts.TypeChecker,
  type: ts.Type,
  node?: ts.Node,
): Record<string, unknown> {
  const flags = type.getFlags();

  if (type.isUnion()) {
    const schemas = type.types.map((t) => tsTypeToJsonSchema(typeChecker, t, node));
    return { anyOf: schemas };
  }

  if (flags & ts.TypeFlags.String || flags & ts.TypeFlags.StringLiteral) {
    return { type: "string" };
  }
  if (flags & ts.TypeFlags.Number || flags & ts.TypeFlags.NumberLiteral) {
    return { type: "number" };
  }
  if (flags & ts.TypeFlags.Boolean || flags & ts.TypeFlags.BooleanLiteral) {
    return { type: "boolean" };
  }
  if (flags & ts.TypeFlags.Null || flags & ts.TypeFlags.Undefined) {
    return { type: "null" };
  }

  if (typeChecker.isArrayType(type)) {
    const typeRef = type as ts.TypeReference;
    const elementType = typeRef.typeArguments?.[0];
    return {
      type: "array",
      items: elementType ? tsTypeToJsonSchema(typeChecker, elementType, node) : { type: "object" },
    };
  }

  if (flags & ts.TypeFlags.Object) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    const props = type.getProperties();
    for (const prop of props) {
      const propDecl = prop.valueDeclaration ?? prop.declarations?.[0] ?? node;
      const propType = propDecl
        ? typeChecker.getTypeOfSymbolAtLocation(prop, propDecl)
        : typeChecker.getTypeOfSymbol(prop);

      properties[prop.getName()] = tsTypeToJsonSchema(typeChecker, propType, node);

      if (!(prop.flags & ts.SymbolFlags.Optional)) {
        required.push(prop.getName());
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: "object" };
}

/**
 * Scans a ts.Program to build a mapping from normalized route paths & methods to exported Route return response maps.
 */
export function extractRouteTypesFromProgram(program: ts.Program): Map<string, InferredResponseMap> {
  const typeChecker = program.getTypeChecker();
  const routeTypesMap = new Map<string, InferredResponseMap>();

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
    let routeMethod: string | undefined;

    if (pathProp) {
      const pathType = typeChecker.getTypeOfSymbolAtLocation(pathProp, routeDecl);
      if (pathType.isStringLiteral()) {
        routePath = pathType.value;
      }
    }

    if (methodProp) {
      const methodType = typeChecker.getTypeOfSymbolAtLocation(methodProp, routeDecl);
      if (methodType.isStringLiteral()) {
        routeMethod = methodType.value.toUpperCase();
      }
    }

    const handlerDecl = handlerProp.valueDeclaration ?? handlerProp.declarations?.[0] ?? routeDecl;
    const handlerType = typeChecker.getTypeOfSymbolAtLocation(handlerProp, handlerDecl);

    const responses = inferResponsesFromTsType(typeChecker, handlerType, handlerDecl);

    if (routePath && routeMethod) {
      routeTypesMap.set(`${routePath}:${routeMethod}`, responses);
    }
  }

  return routeTypesMap;
}
