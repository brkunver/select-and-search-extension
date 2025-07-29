import "./search-btn.css"

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const searchBtn: HTMLDivElement = document.createElement("div")
    searchBtn.textContent = "Search on Google"
    searchBtn.classList.add("search-btn")

    document.body.appendChild(searchBtn)

    // show button when user finishes text selection
    document.addEventListener("mouseup", () => {
      const selection = window.getSelection()
      if (!selection) {
        searchBtn.style.display = "none"
        return
      }

      const text = selection.toString().trim()
      if (text.length === 0) {
        searchBtn.style.display = "none"
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // position the button just above the selected text
      searchBtn.style.top = `${rect.top + window.scrollY - 30}px`
      searchBtn.style.left = `${rect.left + window.scrollX}px`
      searchBtn.style.display = "block"

      // on click, perform Google search in a new tab
      searchBtn.onclick = () => {
        const query = encodeURIComponent(text)
        window.open(`https://www.google.com/search?q=${query}`, "_blank")
        searchBtn.style.display = "none"
      }
    })

    // hide button when clicking elsewhere
    document.addEventListener("mousedown", event => {
      if (!searchBtn.contains(event.target as Node)) {
        searchBtn.style.display = "none"
      }
    })
  },
})
