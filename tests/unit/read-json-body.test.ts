import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_JSON_BODY_BYTES, readJsonBody } from "@/lib/http/read-json-body";

function requestWithBody(body: BodyInit, headers?: HeadersInit): Request {
  return new Request("https://skyline.test/api/enquiries", {
    method: "POST",
    headers,
    body,
  });
}

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const result = await readJsonBody(requestWithBody(JSON.stringify({ name: "Aarav" })));
    expect(result).toEqual({ ok: true, value: { name: "Aarav" } });
  });

  it("rejects malformed JSON", async () => {
    const result = await readJsonBody(requestWithBody("{not-json"));
    expect(result).toEqual({ ok: false, status: 400, error: "Request body must be valid JSON" });
  });

  it("rejects a declared oversized body before reading it", async () => {
    const result = await readJsonBody(requestWithBody("{}", {
      "content-length": String(DEFAULT_MAX_JSON_BODY_BYTES + 1),
    }));
    expect(result).toEqual({ ok: false, status: 413, error: "Request body is too large" });
  });

  it("counts streamed bytes even when Content-Length is absent", async () => {
    const payload = "x".repeat(DEFAULT_MAX_JSON_BODY_BYTES + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(payload.slice(0, 8000)));
        controller.enqueue(encoder.encode(payload.slice(8000)));
        controller.close();
      },
    });
    const request = new Request("https://skyline.test/api/enquiries", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    expect(request.headers.has("content-length")).toBe(false);
    const result = await readJsonBody(request);
    expect(result).toEqual({ ok: false, status: 413, error: "Request body is too large" });
  });

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const request = requestWithBody(new Uint8Array([0xc3, 0x28]));
    const result = await readJsonBody(request);
    expect(result).toEqual({ ok: false, status: 400, error: "Request body must be valid JSON" });
  });
});
