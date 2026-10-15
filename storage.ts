import { storage } from "#imports"

export type ButtonLocation = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tooltip"

const engineStorage = storage.defineItem<string>("local:engine", {
  fallback: "Google",
})

const buttonLocation = storage.defineItem<ButtonLocation>("local:buttonLocation", {
  fallback: "tooltip",
})

const urlStorage = storage.defineItem<string>("local:url", {
  fallback: "https://www.google.com/search?q=",
})

/**
 * Hostnames where the extension is switched off. A stored entry also covers its
 * subdomains (see `domain.ts`), so `local:disabledDomains` holds e.g.
 * `["notepad.js.org"]` after disabling the extension on https://notepad.js.org/.
 */
const disabledDomains = storage.defineItem<string[]>("local:disabledDomains", {
  fallback: [],
})

export { engineStorage, buttonLocation, urlStorage, disabledDomains }
