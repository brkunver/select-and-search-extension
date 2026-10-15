/**
 * Pure helpers for the per-site enable/disable feature.
 *
 * The extension stores plain hostnames (no scheme, no path, no port) and a site
 * counts as disabled when the current host equals an entry or is a subdomain of
 * it. `notepad.js.org` therefore covers `blog.notepad.js.org` too, which is the
 * "whole domain, not just this URL" behaviour the popup promises.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * Lowercases a hostname, drops a trailing dot and the leading `www.` label so
 * `www.notepad.js.org` and `notepad.js.org` are treated as one site.
 */
function normalizeHost(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "")
  if (!host) {
    return ""
  }
  if (IPV4.test(host) || host.startsWith("[")) {
    return host
  }
  if (host === "www") {
    return ""
  }
  return host.startsWith("www.") ? host.slice(4) : host
}

/**
 * Extracts the disable-able domain from a tab URL. Returns an empty string for
 * anything the content script cannot be injected into (chrome://, about:, file://).
 */
function getDomainFromUrl(url: string | undefined) {
  if (!url) {
    return ""
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return ""
  }

  // MatchPattern-based content scripts cover these protocols, but a per-site
  // toggle is only meaningful on the http(s) web.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return ""
  }

  return normalizeHost(parsed.hostname)
}

/**
 * Returns the stored entry that disables `hostname` — the exact match when it
 * exists, otherwise the shortest ancestor rule. `null` means the site is enabled.
 */
function findDisabledRule(hostname: string, disabledDomains: readonly string[]) {
  const host = normalizeHost(hostname)
  if (!host) {
    return null
  }

  const rules = disabledDomains.map(normalizeHost).filter(rule => rule.length > 0)
  const exact = rules.find(rule => rule === host)
  if (exact) {
    return exact
  }

  const ancestors = rules.filter(rule => host.endsWith(`.${rule}`)).sort((a, b) => a.length - b.length)
  return ancestors[0] ?? null
}

function isDomainDisabled(hostname: string, disabledDomains: readonly string[]) {
  return findDisabledRule(hostname, disabledDomains) !== null
}

/** Adds a domain, collapsing entries that are already covered by the list. */
function addDisabledDomain(disabledDomains: readonly string[], domain: string) {
  const normalized = normalizeHost(domain)
  if (!normalized || isDomainDisabled(normalized, disabledDomains)) {
    return [...disabledDomains]
  }
  return [...disabledDomains, normalized].sort()
}

/** Removes one stored rule by its (normalized) domain. */
function removeDisabledDomain(disabledDomains: readonly string[], domain: string) {
  const normalized = normalizeHost(domain)
  return disabledDomains.filter(rule => normalizeHost(rule) !== normalized)
}

export { normalizeHost, getDomainFromUrl, findDisabledRule, isDomainDisabled, addDisabledDomain, removeDisabledDomain }
