export const DEFAULT_MAX_JSON_BODY_BYTES = 16_384;

export type JsonBodyReadResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Read JSON with a hard byte limit. Content-Length is an early-rejection hint,
 * not a security boundary: clients may omit it or send a misleading value, so
 * the streamed body is counted before it is buffered and parsed.
 */
export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<JsonBodyReadResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, status: 413, error: "Request body is too large" };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Request body must be valid JSON" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Request body is too large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Request body could not be read" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, status: 400, error: "Request body must be valid JSON" };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Request body must be valid JSON" };
  }
}
