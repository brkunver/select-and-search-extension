import { engineStorage, buttonLocation, urlStorage, ButtonLocation } from "../../storage"
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

const locations = ["top-left", "top-right", "bottom-left", "bottom-right", "tooltip"]

let optionSelector = document.createElement("select") as HTMLSelectElement
let buttonLocationSelector = document.createElement("select") as HTMLSelectElement

for (let engine of searchEngines) {
  let option = document.createElement("option")
  option.value = engine.url
  option.textContent = engine.name
  optionSelector.appendChild(option)
}

for (let location of locations) {
  let option = document.createElement("option")
  option.value = location
  option.textContent = location
  buttonLocationSelector.appendChild(option)
}

// set default value
buttonLocation.getValue().then(value => {
  document.getElementById("button-location")!.textContent = value
  buttonLocationSelector.value = value
})
buttonLocation.watch(value => {
  document.getElementById("button-location")!.textContent = value
  buttonLocationSelector.value = value
})

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

buttonLocationSelector.onchange = (e: Event) => {
  const selectedLocation = (e.target as HTMLSelectElement).value
  buttonLocation.setValue(selectedLocation as ButtonLocation)
}

document.body.appendChild(optionSelector)
document.body.appendChild(buttonLocationSelector)
