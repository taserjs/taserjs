/**
 * Registry to hold reusable schemas for components.schemas in OpenAPI documents.
 */
export class SchemaRegistry {
  private schemas = new Map<string, Record<string, unknown>>();

  register(name: string, schema: Record<string, unknown>): string {
    const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    this.schemas.set(cleanName, schema);
    return `#/components/schemas/${cleanName}`;
  }

  getRef(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return `#/components/schemas/${cleanName}`;
  }

  has(name: string): boolean {
    const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return this.schemas.has(cleanName);
  }

  get(name: string): Record<string, unknown> | undefined {
    const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return this.schemas.get(cleanName);
  }

  toComponents(): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [name, schema] of this.schemas.entries()) {
      out[name] = schema;
    }
    return out;
  }
}
