export function redactSecrets(value: string): string {
  return value
    .replace(/sk-orca-[A-Za-z0-9_-]+/gi, "[REDACTED]")
    .replace(/sk-(?:proj-)?[A-Za-z0-9_-]{12,}/gi, "[REDACTED]")
    .replace(/gh[oprsu]_[A-Za-z0-9]{12,}/gi, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:api_?key|token|key)=)[^&\s]+/gi, "$1[REDACTED]");
}

export function boundedErrorMessage(
  value: string,
  maximumLength = 300,
): string {
  const normalized = redactSecrets(value).replace(/\s+/g, " ").trim();
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength - 1)}…`;
}
