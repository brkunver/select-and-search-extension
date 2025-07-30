import { engineStorage, urlStorage } from "@/storage"

export default defineBackground({
  main() {
    console.log("Background script running")
    browser.runtime.onInstalled.addListener(details => {
      if (details.reason === "install") {
        engineStorage
          .setValue("Google")
          .then(() => {
            console.log("Engine set to Google")
          })
          .catch(error => {
            console.error("Failed to set engine to Google", error)
          })

        urlStorage
          .setValue("https://www.google.com/search?q=")
          .then(() => {
            console.log("URL set to Google")
          })
          .catch(error => {
            console.error("Failed to set URL to Google", error)
          })
      }
    })
  },
})
