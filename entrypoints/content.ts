import "./search-btn.css"
import { engineStorage, urlStorage, buttonLocation, ButtonLocation } from "@/storage"

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const searchBtn: HTMLDivElement = document.createElement("div")
    searchBtn.textContent = "Search on Google"
    searchBtn.classList.add("search-btn")

    // Site CSS'inin konumu ezmesini engelle: kritik stilleri inline + !important bas
    function lockPosition() {
      const s = searchBtn.style
      s.setProperty("position", "fixed", "important")
      s.setProperty("margin", "0", "important")
      s.setProperty("transform", "none", "important")
      s.setProperty("z-index", "999999", "important")
    }
    lockPosition()

    function hideButton() {
      searchBtn.style.setProperty("display", "none", "important")
    }

    function showButton() {
      searchBtn.style.setProperty("display", "block", "important")
    }

    let location: ButtonLocation = "tooltip"

    buttonLocation.getValue().then(value => {
      location = value
    })

    buttonLocation.watch(value => {
      location = value
    })

    engineStorage.getValue().then(value => {
      const buttonContent = "Search on " + value
      searchBtn.textContent = buttonContent
    })

    engineStorage.watch(value => {
      const buttonContent = "Search on " + value
      searchBtn.textContent = buttonContent
    })

    let searchQuery: string = "https://www.google.com/search?q="
    urlStorage.getValue().then(value => {
      searchQuery = value
    })
    urlStorage.watch(value => {
      searchQuery = value
    })

    // body yerine documentElement: body'ye uygulanan transform/filter
    // position:fixed'i bozup butonu yanlış yere taşıyabiliyor
    document.documentElement.appendChild(searchBtn)

    // show button when user finishes text selection
    document.addEventListener("mouseup", () => {
      const selection = window.getSelection()
      if (!selection) {
        hideButton()
        return
      }

      const text = selection.toString().trim()
      if (text.length === 0) {
        hideButton()
        return
      }

      // on click, perform Google search in a new tab
      searchBtn.onclick = () => {
        const query = encodeURIComponent(text)
        window.open(`${searchQuery}${query}`, "_blank")
        hideButton()
      }

      // Reset position styles
      const s = searchBtn.style
      s.removeProperty("left")
      s.removeProperty("right")
      s.removeProperty("top")
      s.removeProperty("bottom")
      lockPosition()

      if (location !== "tooltip") {
        // sabit köşe konumları viewport'a göre
        if (location == "top-left") {
          s.setProperty("top", "20px", "important")
          s.setProperty("left", "20px", "important")
        } else if (location == "top-right") {
          s.setProperty("top", "20px", "important")
          s.setProperty("right", "20px", "important")
        } else if (location == "bottom-left") {
          s.setProperty("bottom", "20px", "important")
          s.setProperty("left", "20px", "important")
        } else if (location == "bottom-right") {
          s.setProperty("bottom", "20px", "important")
          s.setProperty("right", "20px", "important")
        }
        showButton()
        return
      }

      // tooltip: seçili metnin hemen üstüne
      if (selection.rangeCount === 0) {
        hideButton()
        return
      }
      const range = selection.getRangeAt(0)
      // Bazı sitelerde (görünmez node, özel editörler) rect boş/sıfır döner -> sol üste yapışmasın
      if (range.getClientRects().length === 0) {
        hideButton()
        return
      }
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        hideButton()
        return
      }

      // Ölçü alabilmek için önce görünür yap
      showButton()
      const btnWidth = searchBtn.offsetWidth || 150
      const btnHeight = searchBtn.offsetHeight || 30

      let top = rect.top - btnHeight - 8
      if (top < 8) {
        top = rect.bottom + 8
      }
      let left = rect.left
      left = Math.max(8, Math.min(left, window.innerWidth - btnWidth - 8))

      s.setProperty("top", `${top}px`, "important")
      s.setProperty("left", `${left}px`, "important")
    })

    // hide button when clicking elsewhere, scrolling or resizing
    document.addEventListener("mousedown", event => {
      if (!searchBtn.contains(event.target as Node)) {
        hideButton()
      }
    })
    window.addEventListener("scroll", hideButton, true)
    window.addEventListener("resize", hideButton)
  },
})
