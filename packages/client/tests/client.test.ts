import { describe, expect, it, vi } from "vitest";
import { createClient } from "../src/client.js";
import { formBody } from "../src/form-body.js";

type FetchCall = [input: RequestInfo | URL, init?: RequestInit];

describe("createClient unit tests", () => {
  it("memoizes proxy nodes for repeated property access", () => {
    const client = createClient({ baseUrl: "http://localhost:3000/api" });
    const anyClient = client as unknown as {
      users: { $get: () => Promise<Response>; _id: { $get: () => Promise<Response> } };
    };

    expect(anyClient.users).toBe(anyClient.users);
    expect(anyClient.users._id).toBe(anyClient.users._id);
  });

  it("sends JSON payloads and sets Content-Type header", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const client = createClient({
      baseUrl: "http://localhost:3000/api",
      fetch: fetchMock,
    });

    const anyClient = client as unknown as {
      users: { $post: (args: { body: { name: string; age: number } }) => Promise<Response> };
    };

    await anyClient.users.$post({ body: { name: "Alice", age: 30 } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall;
    expect(url).toBe("http://localhost:3000/api/users");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "Alice", age: 30 }));
    expect((init?.headers as Record<string, string>)?.["Content-Type"]).toBe("application/json");
  });

  it("substitutes path parameters and query strings", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ id: "123" }));
    const client = createClient({
      baseUrl: "http://localhost:3000/api",
      fetch: fetchMock,
    });

    const anyClient = client as unknown as {
      users: {
        _id: {
          $get: (args: {
            param: { id: string };
            query?: { detail?: boolean };
          }) => Promise<Response>;
        };
      };
    };

    await anyClient.users._id.$get({ param: { id: "user_42" }, query: { detail: true } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall;
    expect(url).toBe("http://localhost:3000/api/users/user_42?detail=true");
    expect(init?.method).toBe("GET");
  });

  it("supports root endpoint $get calls directly on client", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ status: "alive" }));
    const client = createClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchMock,
    });

    const anyClient = client as unknown as {
      $get: () => Promise<Response>;
    };

    await anyClient.$get();

    const [url] = fetchMock.mock.calls[0] as unknown as FetchCall;
    expect(url).toBe("http://localhost:3000/");
  });

  it("handles FormData and formBody helper without forcing application/json", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ received: true }));
    const client = createClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchMock,
    });

    const fd = formBody({ title: "My Title", count: 5 });

    const anyClient = client as unknown as {
      upload: { $post: (args: { body: FormData }) => Promise<Response> };
    };

    await anyClient.upload.$post({ body: fd });

    const [, init] = fetchMock.mock.calls[0] as unknown as FetchCall;
    expect(init?.body).toBe(fd);
    expect((init?.headers as Record<string, string>)?.["Content-Type"]).toBeUndefined();
  });

  it("resolves dynamic async auth headers on every request", async () => {
    let token = "token-1";
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const client = createClient({
      baseUrl: "http://localhost:3000",
      headers: async () => ({ Authorization: `Bearer ${token}` }),
      fetch: fetchMock,
    });

    const anyClient = client as unknown as {
      profile: { $get: () => Promise<Response> };
    };

    await anyClient.profile.$get();
    let [, init] = fetchMock.mock.calls[0] as unknown as FetchCall;
    expect((init?.headers as Record<string, string>)?.["Authorization"]).toBe("Bearer token-1");

    token = "token-2";
    await anyClient.profile.$get();
    [, init] = fetchMock.mock.calls[1] as unknown as FetchCall;
    expect((init?.headers as Record<string, string>)?.["Authorization"]).toBe("Bearer token-2");
  });

  it("executes onRequest and onResponse interceptors", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (req) => {
      const url = typeof req === "string" ? req : req instanceof Request ? req.url : String(req);
      return new Response(JSON.stringify({ interceptedUrl: url }), {
        headers: { "x-custom-res": "123" },
      });
    });

    const onRequest = vi.fn((req: Request) => {
      req.headers.set("x-intercepted", "true");
    });

    const onResponse = vi.fn((res: Response) => {
      expect(res.headers.get("x-custom-res")).toBe("123");
    });

    const client = createClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchMock,
      onRequest,
      onResponse,
    });

    const anyClient = client as unknown as {
      status: { $get: () => Promise<Response> };
    };

    await anyClient.status.$get();

    expect(onRequest).toHaveBeenCalledOnce();
    expect(onResponse).toHaveBeenCalledOnce();
  });

  it("throws error when accessing an invalid property chain that is not a method", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    const anyClient = client as unknown as {
      users: { notAValidMethod: () => void };
    };

    expect(() => anyClient.users.notAValidMethod()).toThrow("Invalid client method path");
  });
});
