import { storage } from "#imports"


const engineStorage = storage.defineItem<string>("local:engine", {
  fallback: "Google",
})

const urlStorage = storage.defineItem<string>("local:url", {
  fallback: "https://www.google.com/search?q=",
})

export { engineStorage, urlStorage }
