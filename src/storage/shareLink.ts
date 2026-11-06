import { SHARE_MAX_CHARS, SHARE_MAX_INFLATED_BYTES } from "../core/shareFormat";

/** Marks the payload as deflate-compressed; `r` marks plain UTF-8 (browsers without CompressionStream). */
const COMPRESSED = "z";
const RAW = "r";
/** The only characters base64url produces; anything else is rejected before decoding. */
const BASE64URL_TEXT = /^[A-Za-z0-9_-]+$/;
/** Compression output has no useful limit: the input is the user's own set. */
const NO_SIZE_LIMIT = Number.POSITIVE_INFINITY;

function hasCompression(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** @throws If the text is not valid base64url (`atob` rejects it). */
function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Runs bytes through a compression or decompression stream.
 *
 * @param maxBytes Output limit; the stream is cancelled and an error thrown when it is exceeded.
 */
async function transformBytes(
  bytes: Uint8Array<ArrayBuffer>,
  transform: CompressionStream | DecompressionStream,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = transform.writable.getWriter();
  // Write and close failures also surface through `reader.read()` below, which is awaited,
  // so these promises only need to be kept from becoming unhandled rejections.
  writer.write(bytes).catch(() => undefined);
  writer.close().catch(() => undefined);

  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Share payload is too large");
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Turns payload JSON into URL-safe text: deflate-compressed where the browser
 * supports it, then base64url.
 */
export async function encodeSharePayload(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (!hasCompression()) {
    return RAW + toBase64Url(bytes);
  }
  const packed = await transformBytes(
    bytes,
    new CompressionStream("deflate-raw"),
    NO_SIZE_LIMIT,
  );
  return COMPRESSED + toBase64Url(packed);
}

/**
 * Reverses {@link encodeSharePayload}.
 *
 * @throws If the text is not a valid, reasonably sized payload.
 */
export async function decodeSharePayload(text: string): Promise<string> {
  if (
    text.length < 2 ||
    text.length > SHARE_MAX_CHARS ||
    !BASE64URL_TEXT.test(text)
  ) {
    throw new Error("Invalid share payload");
  }
  const kind = text[0];
  const bytes = fromBase64Url(text.slice(1));
  if (kind === RAW) {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  if (kind !== COMPRESSED || !hasCompression()) {
    throw new Error("Unsupported share payload");
  }
  const unpacked = await transformBytes(
    bytes,
    new DecompressionStream("deflate-raw"),
    SHARE_MAX_INFLATED_BYTES,
  );
  return new TextDecoder("utf-8", { fatal: true }).decode(unpacked);
}

/** Builds the full link for an encoded payload, keeping the current page address. */
export function buildShareLink(encoded: string): string {
  const base = window.location.href.split("#")[0] ?? "";
  return `${base}#/share/${encoded}`;
}