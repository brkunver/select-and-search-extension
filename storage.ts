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

export { engineStorage, buttonLocation, urlStorage }
