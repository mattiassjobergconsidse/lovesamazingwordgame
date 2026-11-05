/**
 * Builds the Content-Security-Policy for the production build (NH-19).
 *
 * GitHub Pages cannot send headers, so the policy is delivered in a `<meta>`
 * tag. The one inline script in `index.html` (theme and language before first
 * paint, FR-THEME-1) is allowed by its hash; everything else must come from the
 * app's own origin. `frame-ancestors` is not available in a meta tag.
 *
 * @param scriptHashes Base64 SHA-256 digests of the inline scripts to allow.
 * @returns The policy text for the `content` attribute.
 */
export function buildContentSecurityPolicy(
  scriptHashes: readonly string[],
): string {
  const inlineScripts = scriptHashes.map((hash) => `'sha256-${hash}'`);
  const directives: readonly (readonly string[])[] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", ...inlineScripts],
    // Stylesheets come from files; only style attributes (React `style={...}`) are inline.
    ["style-src", "'self'"],
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["connect-src", "'self'"],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}
