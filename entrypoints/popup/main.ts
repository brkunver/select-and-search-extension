import { engineStorage, urlStorage } from "../../storage"
import "./index.css"
const searchEngines = [
  {
    name: "Google",
    url: "https://www.google.com/search?q=",
  },
  {
    name: "Bing",
    url: "https://www.bing.com/search?q=",
  },
  {
    name: "DuckDuckGo",
    url: "https://www.duckduckgo.com/?q=",
  },
]

let optionSelector = document.createElement("select") as HTMLSelectElement

for (let engine of searchEngines) {
  let option = document.createElement("option")
  option.value = engine.url
  option.textContent = engine.name
  optionSelector.appendChild(option)
}

// set default value
engineStorage.getValue().then(value => {
  document.getElementById("engine")!.textContent = value
})
engineStorage.watch(value => {
  document.getElementById("engine")!.textContent = value
})

urlStorage.watch(value => {
  optionSelector.value = value
})

optionSelector.onchange = (e: Event) => {
  const selectedUrl = (e.target as HTMLSelectElement).value
  const selectedEngine = searchEngines.find(engine => engine.url === selectedUrl)?.name

  engineStorage.setValue(selectedEngine!)
  urlStorage.setValue(selectedUrl)
}

document.body.appendChild(optionSelector)
