import { browser } from "#imports"
import { buttonLocation, disabledDomains, engineStorage, urlStorage, ButtonLocation } from "@/storage"
import { addDisabledDomain, findDisabledRule, getDomainFromUrl, removeDisabledDomain } from "@/domain"
import "./index.css"

type SearchEngine = {
  name: string
  url: string
}

const searchEngines: SearchEngine[] = [
  { name: "Google", url: "https://www.google.com/search?q=" },
  { name: "Bing", url: "https://www.bing.com/search?q=" },
  { name: "DuckDuckGo", url: "https://www.duckduckgo.com/?q=" },
]

const buttonLocations: ButtonLocation[] = ["tooltip", "top-left", "top-right", "bottom-left", "bottom-right"]

const removeIconMarkup =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>'

/** Domain of the tab the popup was opened from; empty when the page cannot be injected into. */
let currentDomain = ""

function requireElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Popup markup is missing the ${selector} element`)
  }
  return element
}

const engineSelect = requireElement<HTMLSelectElement>("#engine-select")
const positionGrid = requireElement<HTMLDivElement>("#position-grid")
const positionOptions = Array.from(positionGrid.querySelectorAll<HTMLButtonElement>(".position-option"))
const siteDomain = requireElement<HTMLParagraphElement>("#site-domain")
const siteHint = requireElement<HTMLParagraphElement>("#site-hint")
const siteToggle = requireElement<HTMLButtonElement>("#site-toggle")
const siteToggleText = requireElement<HTMLSpanElement>("#site-toggle-text")
const disabledBlock = requireElement<HTMLDivElement>("#disabled-block")
const disabledCount = requireElement<HTMLSpanElement>("#disabled-count")
const disabledList = requireElement<HTMLUListElement>("#disabled-list")
const disabledClear = requireElement<HTMLButtonElement>("#disabled-clear")

function isButtonLocation(value: string | undefined): value is ButtonLocation {
  return buttonLocations.some(location => location === value)
}

/* ---------- search engine ---------- */

function populateEngineOptions() {
  for (const engine of searchEngines) {
    const option = document.createElement("option")
    option.value = engine.url
    option.textContent = engine.name
    engineSelect.append(option)
  }
}

async function initEngineSelect() {
  populateEngineOptions()
  engineSelect.value = await urlStorage.getValue()

  engineSelect.addEventListener("change", () => {
    const selectedUrl = engineSelect.value
    const selectedEngine = searchEngines.find(engine => engine.url === selectedUrl)
    void urlStorage.setValue(selectedUrl)
    if (selectedEngine) {
      void engineStorage.setValue(selectedEngine.name)
    }
  })

  urlStorage.watch(value => {
    engineSelect.value = value
  })
}

/* ---------- button position ---------- */

function applyPosition(location: ButtonLocation) {
  for (const option of positionOptions) {
    const isActive = option.dataset.location === location
    option.setAttribute("aria-pressed", String(isActive))
  }
}

async function initPositionPicker() {
  const unpainted = buttonLocations.filter(
    location => !positionOptions.some(option => option.dataset.location === location),
  )
  if (unpainted.length > 0) {
    console.error(`The position picker has no button for: ${unpainted.join(", ")}`)
  }

  applyPosition(await buttonLocation.getValue())

  for (const option of positionOptions) {
    option.addEventListener("click", () => {
      const selected = option.dataset.location
      if (!isButtonLocation(selected)) {
        console.error(`Unknown button location: ${selected}`)
        return
      }
      void buttonLocation.setValue(selected)
    })
  }

  buttonLocation.watch(value => {
    applyPosition(value)
  })
}

/* ---------- per-site toggle ---------- */

function renderSiteState(disabledDomainsList: readonly string[]) {
  if (!currentDomain) {
    return
  }

  // `rule` is the stored domain that disables this site: the exact domain or a
  // broader parent rule such as `notepad.js.org` while on `blog.notepad.js.org`.
  const rule = findDisabledRule(currentDomain, disabledDomainsList)
  const isEnabled = rule === null

  siteToggle.setAttribute("aria-checked", String(isEnabled))
  siteToggleText.textContent = isEnabled ? "Enabled" : "Disabled"
  siteToggle.setAttribute("aria-label", `${isEnabled ? "Disable" : "Enable"} Select and Search on ${currentDomain}`)
  siteHint.classList.toggle("warn", !isEnabled)

  if (isEnabled) {
    siteHint.textContent = `Works on ${currentDomain} and all of its subdomains.`
    return
  }

  if (rule === currentDomain) {
    siteHint.textContent = `Switched off on ${rule}. Flip the switch to search here again.`
    return
  }

  siteHint.textContent = `Switched off by the broader rule ${rule}. Flipping the switch removes that rule.`
}

function renderDisabledList(disabledDomainsList: readonly string[]) {
  const domains = [...disabledDomainsList].sort()
  disabledList.replaceChildren()

  for (const domain of domains) {
    const item = document.createElement("li")

    const label = document.createElement("span")
    label.className = "domain"
    label.textContent = domain
    label.title = domain

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "ghost-button"
    remove.title = `Re-enable on ${domain}`
    remove.setAttribute("aria-label", `Re-enable Select and Search on ${domain}`)
    remove.innerHTML = removeIconMarkup
    remove.addEventListener("click", () => {
      void reEnableSite(domain)
    })

    item.append(label, remove)
    disabledList.append(item)
  }

  disabledCount.textContent = String(domains.length)
  disabledBlock.hidden = domains.length === 0
}

function renderDisabledState(disabledDomainsList: readonly string[]) {
  renderDisabledList(disabledDomainsList)
  renderSiteState(disabledDomainsList)
}

async function toggleCurrentSite() {
  if (!currentDomain) {
    return
  }

  siteToggle.disabled = true

  try {
    const disabledDomainsList = await disabledDomains.getValue()
    const rule = findDisabledRule(currentDomain, disabledDomainsList)
    const next =
      rule === null
        ? addDisabledDomain(disabledDomainsList, currentDomain)
        : removeDisabledDomain(disabledDomainsList, rule)

    await disabledDomains.setValue(next)
    renderDisabledState(next)
  } finally {
    siteToggle.disabled = false
  }
}

async function reEnableSite(domain: string) {
  const disabledDomainsList = await disabledDomains.getValue()
  await disabledDomains.setValue(removeDisabledDomain(disabledDomainsList, domain))
}

async function reEnableAllSites() {
  await disabledDomains.setValue([])
}

async function initSiteCard() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  currentDomain = getDomainFromUrl(tab?.url)

  if (currentDomain) {
    siteDomain.textContent = currentDomain
    siteToggle.disabled = false
    siteToggle.addEventListener("click", () => {
      void toggleCurrentSite()
    })
  } else {
    siteDomain.classList.add("unavailable")
    siteDomain.textContent = "Not available here"
    siteHint.textContent = "Per-site switching only works on http and https pages."
    siteToggleText.textContent = "Enabled"
  }

  disabledClear.addEventListener("click", () => {
    void reEnableAllSites()
  })

  renderDisabledState(await disabledDomains.getValue())
  disabledDomains.watch(renderDisabledState)
}

async function init() {
  await initEngineSelect()
  await initPositionPicker()
  await initSiteCard()
}

void init().catch(error => {
  console.error("Failed to initialise the popup", error)
})
