const useChrome = typeof (browser) === 'undefined'

let browserActionAPI
if (!useChrome) {
  browserActionAPI = typeof (browser.action) === 'undefined' ? browser.browserAction : browser.action
}

const countList = {
  '#activeCookies': 0,
  '#permittedCookies': 0,
  '#flaggedCookies': 0,
  '#sessionData': { local: 0, session: 0, total: 0 }
}

let tabId = 0
let windowId = 0
let rootDomain = ''
let contextName = 'default'
let isBrowserPage = false

// Localization
const getMsg = useChrome ? getChromeMessage : getFirefoxMessage

function getChromeMessage (messageName, params) {
  if (params !== undefined) return chrome.i18n.getMessage(messageName, params)
  return chrome.i18n.getMessage(messageName)
}

function getFirefoxMessage (messageName, params) {
  if (params !== undefined) return browser.i18n.getMessage(messageName, params)
  return browser.i18n.getMessage(messageName)
}

// --------------------------------------------------------------------------------------------------------------------------------

async function initDomainURLandProceed (tabs) {
  const tab = tabs.pop()
  tabId = tab.id
  windowId = tab.windowId

  let data = null

  if (useChrome) {
    data = await chrome.storage.local.get()

    document.body.className = 'chrome'
    if (navigator.userAgent.includes('Opera') || navigator.userAgent.includes('OPR')) {
      document.body.classList.add('opera')
    }
  } else {
    data = await browser.storage.local.get()
  }

  if (data.flagCookies_darkTheme !== undefined && data.flagCookies_darkTheme === true) {
    document.body.classList.add('dark')
  }

  contextName = 'default'
  if (tab.cookieStoreId !== undefined) {
    contextName = tab.cookieStoreId
  }

  let cookieData = {}
  let sessionData = {}

  if (useChrome) {
    cookieData = await chrome.runtime.sendMessage({ getCookies: true, windowId, tabId })
    sessionData = await chrome.runtime.sendMessage({ getLocalData: true, windowId, tabId })
  } else {
    cookieData = await browser.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
    sessionData = await browser.runtime.sendMessage({ getLocalData: true, storeId: contextName, windowId, tabId })
  }

  if (cookieData === undefined && sessionData === undefined) {
    rootDomain = null
    updateUIData(data, null, null, null)
  } else {
    rootDomain = cookieData.rootDomain
    updateUIData(data, cookieData.cookies, cookieData.logData, sessionData)
  }
}

function sortObjectByKey (ObjectElements, keyName, doReverse) {
  function sortByKey (elementOne, elementTwo) {
    return elementOne[keyName].toLowerCase() < elementTwo[keyName].toLowerCase()
  }

  if (doReverse !== undefined && doReverse === true) return Object.values(ObjectElements).sort(sortByKey).reverse()
  return Object.values(ObjectElements).sort(sortByKey)
}

function resetStorageCounts (sourceName) {
  let targetStorage = ''
  if (sourceName === 'local') {
    countList['#sessionData'].local = 0
    countList['#sessionData'].total = countList['#sessionData'].session
    targetStorage = 'LocalStorage'
  } else if (sourceName === 'session') {
    countList['#sessionData'].session = 0
    countList['#sessionData'].total = countList['#sessionData'].local
    targetStorage = 'SessionStorage'
  }

  const sessionDataList = document.querySelector('#session-data-list li[data-name="' + targetStorage + '"]')
  sessionDataList.children[1].replaceChildren()

  const toggleButton = document.querySelector('#session-data-list li[data-name="' + targetStorage + '"] button.collapseToggle')
  if (toggleButton !== null && !toggleButton.classList.contains('active')) {
    toggleButton.dispatchEvent(new window.Event('click'))
  }

  updateCookieCount()
}

function createHTMLforSessionData (dataObject, htmlListElement, hasParent) {
  if (dataObject === null) {
    return
  }

  if (typeof (dataObject) === 'object') {
    for (const key of Object.keys(dataObject)) {
      if (dataObject[key] === null) {
        continue
      }

      if (hasParent) {
        htmlListElement.appendChild(document.createElement('br'))
      } else if (Object.keys(dataObject[key]).length !== 0) {
        const dividerElement = document.createElement('span')
        dividerElement.className = 'sessionDataDivider'
        htmlListElement.appendChild(dividerElement)
      }

      if (typeof (dataObject[key]) === 'object') {
        const subKeyElement = document.createElement('span')
        subKeyElement.className = 'sessionDataSubKey'
        subKeyElement.textContent = key
        htmlListElement.appendChild(subKeyElement)
        createHTMLforSessionData(dataObject[key], htmlListElement, true)
      } else {
        const subKeyElement = document.createElement('span')
        subKeyElement.className = 'sessionDataSubKey'
        subKeyElement.textContent = key
        htmlListElement.appendChild(subKeyElement)

        const sessionDataValueNode = document.createElement('span')
        sessionDataValueNode.textContent = dataObject[key]
        sessionDataValueNode.className = 'sessionDataValueNode'
        htmlListElement.appendChild(sessionDataValueNode)
      }
    }

    return
  }

  const sessionDataValueNode = document.createElement('span')
  sessionDataValueNode.textContent = dataObject
  sessionDataValueNode.className = 'sessionDataValueNode'
  htmlListElement.appendChild(sessionDataValueNode)
  htmlListElement.appendChild(document.createElement('br'))
}

function clearStorageDataFromUI (evt) {
  let targetDataName = ''
  let messageString = ''

  switch (evt.target.dataset.name) {
    case 'LocalStorage':
      if (countList['#sessionData'].local === 0) {
        return
      }

      targetDataName = 'local'
      messageString = getMsg('BrowserLocaleStorageClearedText')
      break
    case 'SessionStorage':
      if (countList['#sessionData'].session === 0) {
        return
      }

      targetDataName = 'session'
      messageString = getMsg('BrowserSessionStorageClearedText')
      break
    default:
      return
  }

  if (useChrome) {
    chrome.runtime.sendMessage({ clearStorage: targetDataName, tabId })
  } else {
    browser.runtime.sendMessage({ clearStorage: targetDataName, tabId })
  }

  if (useChrome) {
    chrome.notifications.create('notification_cleared_storage_data', { type: 'basic', message: messageString, title: getMsg('BrowserStorageClearedHeadline'), iconUrl: 'icons/fc128.png' })
  } else {
    browser.notifications.create('notification_cleared_storage_data', { type: 'basic', message: messageString, title: getMsg('BrowserStorageClearedHeadline'), iconUrl: 'icons/flagcookies_icon.svg' })
  }

  resetStorageCounts(targetDataName)
}

function createSessionStorageDataView (name, storageData, title, targetList) {
  const cookieSubDiv = document.createElement('li')
  cookieSubDiv.className = 'subcontainer'
  cookieSubDiv.dataset.name = name

  const cookieSub = document.createElement('h4')
  cookieSub.className = 'subloadbar'
  const cookieSubSpan = document.createElement('span')
  cookieSubSpan.className = 'subloaded'

  const menuItemsDiv = document.createElement('div')
  menuItemsDiv.className = 'domainNameMenu'

  const subCollapse = document.createElement('button')
  subCollapse.textContent = '+'
  subCollapse.className = 'collapseToggle active'
  menuItemsDiv.appendChild(subCollapse)
  cookieSub.appendChild(menuItemsDiv)

  cookieSub.appendChild(cookieSubSpan)
  cookieSub.appendChild(document.createTextNode(title))
  cookieSubDiv.appendChild(cookieSub)

  const dumpster = document.createElement('button')
  dumpster.addEventListener('click', clearStorageDataFromUI)
  dumpster.dataset.name = name
  dumpster.className = 'dumpster'
  if (name === 'LocalStorage') {
    dumpster.title = getMsg('ClearLocalStorageTitle')
  } else if (name === 'SessionStorage') {
    dumpster.title = getMsg('ClearSessionStorageTitle')
  }

  cookieSub.appendChild(dumpster)

  const cookieSubContent = document.createElement('ul')
  cookieSubContent.className = 'subloadContainer'
  cookieSubDiv.appendChild(cookieSubContent)

  targetList.appendChild(cookieSubDiv)

  for (const key of Object.keys(storageData)) {
    const li = document.createElement('li')
    li.className = 'cookieEntry'
    li.dataset.name = key

    // TODO: Add session key handling
    // .. like it is done with cookies
    // Introduce new setting in options to clear on tab close

    // Control element for cookies
    /*
    const checkMark = document.createElement('button')
    checkMark.dataset.name = key
    checkMark.className = 'checkmark'
    li.appendChild(checkMark)
    */

    const p = document.createElement('p')
    const pCookieKeyElm = document.createElement('span')
    const pCookieKey = document.createTextNode(key)
    pCookieKeyElm.className = 'cookieKey'
    pCookieKeyElm.appendChild(pCookieKey)

    const pCookieValueElm = document.createElement('span')
    pCookieValueElm.className = 'cookieValue'

    if (typeof (storageData[key]) === 'object') {
      const pCookieValue = document.createElement('div')
      pCookieValue.className = 'sessionDataContainer'
      createHTMLforSessionData(storageData[key], pCookieValue, false, 0)
      pCookieValueElm.appendChild(pCookieValue)
    } else {
      pCookieValueElm.textContent = storageData[key]
    }

    p.appendChild(pCookieKeyElm)
    p.appendChild(pCookieValueElm)
    li.appendChild(p)

    targetList.lastChild.childNodes[1].appendChild(li)
    targetList.lastChild.childNodes[1].classList.add('hidden')
    targetList.lastChild.childNodes[0].classList.add('active')

    if (name === 'LocalStorage') {
      ++countList['#sessionData'].local
    } else if (name === 'SessionStorage') {
      ++countList['#sessionData'].session
    }
  }

  countList['#sessionData'].total = countList['#sessionData'].local + countList['#sessionData'].session
}

async function clearCookiesByDomain (evt) {
  const cookieDomain = evt.target.dataset.cookieDomain

  let clearResult = false
  if (useChrome) {
    clearResult = await chrome.runtime.sendMessage({ clearByDomain: true, cookieDomain, tabId, windowId, contextName, rootDomain })
  } else {
    clearResult = await browser.runtime.sendMessage({ clearByDomain: true, cookieDomain, tabId, windowId, contextName, rootDomain })
  }

  if (clearResult) {
    let data = null
    let cookieData = {}
    let sessionData = {}

    if (useChrome) {
      data = await chrome.storage.local.get()
      cookieData = await chrome.runtime.sendMessage({ getCookies: true, windowId, tabId })
      sessionData = await chrome.runtime.sendMessage({ getLocalData: true, windowId, tabId })
    } else {
      data = await browser.storage.local.get()
      cookieData = await browser.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
      sessionData = await browser.runtime.sendMessage({ getLocalData: true, storeId: contextName, windowId, tabId })
    }

    updateUIData(data, cookieData.cookies, cookieData.logData, sessionData)

    if (useChrome) {
      if (data.flagCookies_notifications !== undefined && data.flagCookies_notifications === true) {
        chrome.notifications.create('cookies_cleared_by_domain', { type: 'basic', message: getMsg('NotificationCookiesRemovedByDomain', [cookieDomain]), title: getMsg('NotificationCookiesRemovedByDomainTitle'), iconUrl: 'icons/fc128.png' })
      }
    } else if (data.flagCookies_notifications !== undefined && data.flagCookies_notifications === true) {
      browser.notifications.create('cookies_cleared_by_domain', { type: 'basic', message: getMsg('NotificationCookiesRemovedByDomain', [cookieDomain]), title: getMsg('NotificationCookiesRemovedByDomainTitle'), iconUrl: 'icons/flagcookies_icon.svg' })
    }
  }
}

async function updateUIData (data, cookieData, logData, sessionData) {
  // set the header of the panel
  const activeTabUrl = document.querySelector('#header-title')
  activeTabUrl.replaceChildren()

  countList['#activeCookies'] = 0
  countList['#permittedCookies'] = 0
  countList['#flaggedCookies'] = 0

  document.querySelector('#header-title').replaceChildren()

  const introSpan = document.createElement('span')
  introSpan.className = 'intro'

  const intro = document.createTextNode(getMsg('CookiesForDomainText'))
  introSpan.appendChild(intro)
  const introUrl = document.createElement('span')
  introUrl.className = 'domainurl'

  isBrowserPage = false
  let tab = null

  if (rootDomain === null) {
    if (useChrome) {
      tab = await chrome.tabs.get(tabId)
    } else {
      tab = await browser.tabs.get(tabId)
    }

    if (tab !== undefined) {
      const tabURL = tab.url.toLowerCase()
      if (tabURL.startsWith('chrome:') || tabURL.startsWith('about:') || tabURL.startsWith('edge:')) {
        isBrowserPage = true
      }
    }

    if (isBrowserPage) {
      introUrl.appendChild(document.createTextNode(getMsg('BrowserDomainTitle')))
    } else {
      introUrl.appendChild(document.createTextNode(getMsg('UnknownDomain')))
    }
  } else {
    introUrl.appendChild(document.createTextNode(rootDomain))
  }

  activeTabUrl.appendChild(introSpan)
  activeTabUrl.appendChild(introUrl)

  const introSpanStore = document.createElement('span')
  introSpanStore.className = 'intro'

  const introStore = document.createTextNode(getMsg('ActiveContainerGroupText') + ' ' + contextName)
  introSpanStore.appendChild(introStore)
  activeTabUrl.appendChild(introSpanStore)

  const cookieList = document.querySelector('#cookie-list')
  const loggedInCookieList = document.querySelector('#loggedInCookies')

  cookieList.replaceChildren()
  loggedInCookieList.replaceChildren()

  let activeCookies = false

  if (rootDomain === null || rootDomain === undefined || cookieData === null || Object.keys(cookieData).length === 0) {
    const infoDisplay = document.querySelector('#infoDisplay')
    let contentText = getMsg('NoActiveDomainCookiesText')
    if (!useChrome && rootDomain !== null && rootDomain !== undefined) {
      const priviligedPages = ['accounts-static.cdn.mozilla.net', 'accounts.firefox.com', 'addons.cdn.mozilla.net', 'addons.mozilla.org', 'api.accounts.firefox.com', 'content.cdn.mozilla.net', 'content.cdn.mozilla.net', 'discovery.addons.mozilla.org', 'input.mozilla.org', 'install.mozilla.org', 'oauth.accounts.firefox.com', 'profile.accounts.firefox.com', 'support.mozilla.org', 'sync.services.mozilla.com', 'testpilot.firefox.com']
      for (const page of priviligedPages) {
        if (rootDomain.indexOf(page) !== -1) {
          contentText = getMsg('PriviligedDomainText')
          break
        }
      }
    }

    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else if (rootDomain !== null && rootDomain !== undefined) {
    const sortedCookieDomains = Object.keys(cookieData).sort()

    for (const cookieDomain of sortedCookieDomains) {
      let hasHeader = false
      let cookieIndex = 0
      // Check sorting of domains, pushing root and root related to the top
      // console.log(cookieDomain)
      let lockSwitchDomain = null
      let hasUnlockedCookie = false

      for (const cookie of cookieData[cookieDomain]) {
        if (cookie.isAdded) continue

        const splittedDomain = cookieDomain.split('.')
        const domainPart = splittedDomain.splice(splittedDomain.length - 2, 2).join('.')

        const cookieInDomain = rootDomain.indexOf(domainPart) !== -1

        if (!hasHeader) {
          hasUnlockedCookie = false
          lockSwitchDomain = document.createElement('button')

          const cookieSubDiv = document.createElement('li')
          cookieSubDiv.className = 'subcontainer'

          const cookieSub = document.createElement('h4')
          cookieSub.className = 'subloadbar'
          const cookieSubSpan = document.createElement('span')
          cookieSubSpan.className = 'subloaded'

          const menuItemsDiv = document.createElement('div')
          menuItemsDiv.className = 'domainNameMenu'

          const subCollapse = document.createElement('button')
          subCollapse.textContent = '+'
          subCollapse.className = 'collapseToggle active'
          menuItemsDiv.appendChild(subCollapse)
          cookieSub.appendChild(menuItemsDiv)

          if (!cookieInDomain) {
            const cookieSubSpanText = document.createTextNode(getMsg('CrossOriginInformationText'))
            cookieSubSpan.appendChild(cookieSubSpanText)
          }

          let subName = null
          if (cookieDomain !== null) subName = document.createTextNode(cookieDomain)
          else subName = document.createTextNode(cookie)
          cookieSub.appendChild(cookieSubSpan)
          cookieSub.appendChild(subName)
          cookieSubDiv.appendChild(cookieSub)
          const cookieSubContent = document.createElement('ul')
          cookieSubContent.className = 'subloadContainer'
          cookieSubDiv.appendChild(cookieSubContent)

          lockSwitchDomain.className = 'setKeyCookie'
          lockSwitchDomain.title = getMsg('SetCookieProfileDomainButtonHelpText')
          lockSwitchDomain.dataset.domain = cookieDomain
          lockSwitchDomain.addEventListener('click', cookieLockSwitchByDomain)
          cookieSub.appendChild(lockSwitchDomain)

          const dumpster = document.createElement('button')
          dumpster.addEventListener('click', clearCookiesByDomain)
          dumpster.className = 'dumpster'
          dumpster.dataset.cookieDomain = cookieDomain
          dumpster.dataset.tabId = tabId
          dumpster.title = getMsg('ClearDomainCookiesByDomain')
          cookieSub.appendChild(dumpster)

          cookieList.appendChild(cookieSubDiv)
          hasHeader = true
        }

        if (hasHeader && cookie.isAdded !== undefined) continue

        const sortedCookies = sortObjectByKey(cookieData[cookieDomain], 'name', true)
        const hasEmptyProfile = data.flagCookies_logged === undefined || data.flagCookies_logged[contextName] === undefined || data.flagCookies_logged[contextName][rootDomain] === undefined || data.flagCookies_logged[contextName][rootDomain][cookieDomain] === undefined || Object.keys(data.flagCookies_logged[contextName][rootDomain][cookieDomain]).length === 0
        const hasLogged = data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined

        for (const cookie of sortedCookies) {
          let cookieIsLogged = false
          let cookieWasCleared = false
          if (!hasEmptyProfile) {
            cookieIsLogged = hasLogged && data.flagCookies_logged[contextName][rootDomain][cookieDomain] !== undefined && data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name] === true
          }

          if (cookie.fgCleared !== undefined && cookie.fgCleared === true) {
            cookieWasCleared = true
          }

          activeCookies = true
          ++countList['#activeCookies']

          const li = document.createElement('li')
          li.className = 'cookieEntry'

          const checkMark = document.createElement('button')
          checkMark.className = 'checkmark'
          checkMark.title = getMsg('CookieFlagButtonAllowedHelpText')

          checkMark.addEventListener('click', cookieFlagSwitch)
          checkMark.dataset.name = cookie.name
          checkMark.dataset.value = cookie.value
          checkMark.dataset.domain = cookie.domain

          const lockSwitch = document.createElement('button')
          lockSwitch.className = 'setKeyCookie'
          lockSwitch.title = getMsg('SetCookieProfileButtonHelpText')
          lockSwitch.dataset.name = cookie.name
          lockSwitch.dataset.domain = cookie.domain
          lockSwitch.addEventListener('click', cookieLockSwitch)

          let isHandledCookie = false
          if (data[contextName] !== undefined && data[contextName][rootDomain] !== undefined) {
            if (data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined) {
              if (data[contextName][rootDomain][cookie.domain][cookie.name] === true) {
                checkMark.className = 'checkmark flagged'
                checkMark.title = getMsg('CookieIsFlaggedHelpText')
                addCookieToList('cookie-list-flagged', cookie.name, cookie.value, cookie.domain, false, cookieWasCleared)
                ++countList['#flaggedCookies']
                isHandledCookie = true
              } else if (data[contextName][rootDomain][cookie.domain][cookie.name] === false) {
                checkMark.className = 'checkmark permit'
                checkMark.title = getMsg('CookieIsPermittedHelpText')
                addCookieToList('cookie-list-permitted', cookie.name, cookie.value, cookie.domain, false, cookieWasCleared)
                ++countList['#permittedCookies']
                isHandledCookie = true
              }
            }
          }

          if (hasLogged && data.flagCookies_logged[contextName][rootDomain][cookie.domain] !== undefined && data.flagCookies_logged[contextName][rootDomain][cookie.domain][cookie.name] !== undefined && data.flagCookies_logged[contextName][rootDomain][cookie.domain][cookie.name] === true) {
            lockSwitch.classList.add('locked')

            lockSwitch.title = getMsg('CookieIsLockedProfileCookieHelpText')
            loggedInCookieList.removeAttribute('class')
          } else {
            hasUnlockedCookie = true
          }

          const p = document.createElement('p')

          const pCookieKeyElm = document.createElement('span')
          const pCookieKey = document.createTextNode(cookie.name)
          pCookieKeyElm.className = 'cookieKey'
          pCookieKeyElm.appendChild(pCookieKey)

          const pCookieValueElm = document.createElement('span')
          const pCookieValue = document.createTextNode(cookie.value)

          pCookieValueElm.className = 'cookieValue'
          pCookieValueElm.appendChild(pCookieValue)

          p.appendChild(pCookieKeyElm)

          if (cookie.secure) {
            const pCookieKeySecMessageElm = document.createElement('span')
            const pCookieKeySecMessage = document.createTextNode(getMsg('SecureCookieMsg'))
            pCookieKeySecMessageElm.className = 'secure-cookie'
            pCookieKeySecMessageElm.appendChild(pCookieKeySecMessage)

            pCookieKeyElm.appendChild(pCookieKeySecMessageElm)

            if (cookie.fgRoot === undefined && (cookie.fgProfile !== undefined || cookie.fgProtected !== undefined || cookie.fgLogged !== undefined || (cookie.fgRemoved !== undefined && cookie.fgRemovedDomain !== undefined) || cookie.fgPermitted !== undefined || cookie.fgDomain !== undefined)) {
              const pCookieDomainMessageElm = document.createElement('span')
              let pCookieDomainMessage = ''
              if (cookie.fgPermitted !== undefined && cookie.fgProfile === undefined && cookie.fgProtected === undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainAllowed', [cookie.fgDomain])
              } else if (cookie.fgLogged !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainUnprotected', [cookie.fgDomain])
              } else if (cookie.fgProtected !== undefined || (!hasEmptyProfile && cookieIsLogged)) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainProtected', [cookie.fgDomain])
              } else if (cookie.fgProfile !== undefined && hasEmptyProfile) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainGlobalProtected', [cookie.fgDomain])
              }

              if (!isHandledCookie && cookie.fgRemoved !== undefined && cookie.fgRemovedDomain !== undefined) {
                if (pCookieDomainMessage === '') pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainRemoved', [cookie.fgRemovedDomain])
              } else if (cookie.fgDomain !== undefined && pCookieDomainMessage === '') {
                pCookieDomainMessage = ' ' + getMsg('CookieHelpTextBaseDomainRulePresent', [cookie.fgDomain])
              }

              if (pCookieDomainMessage !== '') {
                pCookieDomainMessageElm.className = 'secure-cookie'
                pCookieDomainMessageElm.appendChild(document.createTextNode(pCookieDomainMessage))
                pCookieKeyElm.appendChild(pCookieDomainMessageElm)
              }
            }

            p.appendChild(pCookieValueElm)
            if (!cookie.fgRemoved && !cookie.fgAllowed) {
              // TODO: Check if we really need this fallback
              // li.title = getMsg('CookieHelpTextSecureMightNotHandled')
              li.classList.add('unremoved-secure-cookie')
            }
          } else {
            if (cookie.fgRoot === undefined && (cookie.fgProfile !== undefined || cookie.fgProtected !== undefined || cookie.fgLogged !== undefined || (cookie.fgRemoved !== undefined && cookie.fgRemovedDomain !== undefined) || cookie.fgPermitted !== undefined || cookie.fgDomain !== undefined)) {
              const pCookieDomainMessageElm = document.createElement('span')

              let pCookieDomainMessage = ''
              if (cookie.fgPermitted !== undefined && cookie.fgProfile === undefined && cookie.fgProtected === undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainAllowed', [cookie.fgDomain])
              } else if (cookie.fgLogged !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainUnprotected', [cookie.fgDomain])
              } else if (cookie.fgProtected !== undefined || (!hasEmptyProfile && cookieIsLogged)) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainProtected', [cookie.fgDomain])
              } else if (cookie.fgProfile !== undefined && hasEmptyProfile) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainGlobalProtected', [cookie.fgDomain])
              }

              if (!isHandledCookie && cookie.fgRemoved !== undefined && cookie.fgRemovedDomain !== undefined) {
                if (pCookieDomainMessage === '') pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainRemoved', [cookie.fgRemovedDomain])
              } else if (cookie.fgDomain !== undefined && pCookieDomainMessage === '') {
                pCookieDomainMessage = ' ' + getMsg('CookieHelpTextBaseDomainRulePresent', [cookie.fgDomain])
              }

              if (pCookieDomainMessage !== '') {
                pCookieDomainMessageElm.className = 'secure-cookie'
                pCookieDomainMessageElm.appendChild(document.createTextNode(pCookieDomainMessage))
                pCookieKeyElm.appendChild(pCookieDomainMessageElm)
              }
            }

            p.appendChild(pCookieValueElm)
            if (!cookie.fgRemoved && !cookie.fgAllowed) {
              // TODO: Check if we really need this fallback
              // li.title = getMsg('CookieHelpTextSecureMightNotHandled')
              li.classList.add('unremoved-secure-cookie')
            }
          }

          const timestampNow = Math.floor(Date.now() * 0.001)
          if (cookie.expirationDate !== undefined && cookie.expirationDate < timestampNow) {
            const pCookieKeyExpiredMessageElm = document.createElement('span')
            const pCookieKeyExpiredMessage = document.createTextNode(getMsg('ExpiredCookieMsg'))
            pCookieKeyExpiredMessageElm.className = 'expired-cookie'
            pCookieKeyExpiredMessageElm.appendChild(pCookieKeyExpiredMessage)

            pCookieKeyElm.appendChild(pCookieKeyExpiredMessageElm)
          }

          if (cookie.fgNotPresent !== undefined && cookie.fgNotPresent === true) {
            const pCookieKeySecMessageElm = document.createElement('span')
            const pCookieKeySecMessage = document.createTextNode(getMsg('CookieNotPresentMsg'))
            pCookieKeySecMessageElm.className = 'nonpresent-cookie'
            pCookieKeySecMessageElm.appendChild(pCookieKeySecMessage)
            pCookieKeyElm.appendChild(pCookieKeySecMessageElm)
          }

          if (cookieWasCleared) {
            const pCookieClearMessageElm = document.createElement('span')
            const pCookieClearMessage = document.createTextNode(getMsg('CookieWasClearedMsg'))
            pCookieClearMessageElm.className = 'cleareduser-cookie'

            li.classList.add('inactive-cookie')
            li.title = getMsg('CookieWasClearedByUserText')

            pCookieClearMessageElm.appendChild(pCookieClearMessage)
            pCookieKeyElm.appendChild(pCookieClearMessageElm)
          }

          li.appendChild(checkMark)
          li.appendChild(p)
          li.appendChild(lockSwitch)

          cookieList.lastChild.childNodes[1].appendChild(li)
          cookieList.lastChild.childNodes[1].classList.add('hidden')
          cookieList.lastChild.childNodes[0].classList.add('active')

          cookie.isAdded = true
          cookieData[cookieDomain][cookieIndex] = cookie
          ++cookieIndex
        }
      }

      if (!hasUnlockedCookie) {
        lockSwitchDomain.classList.add('locked')
      }
    }
  }

  const infoDisplay = document.querySelector('#infoDisplay')
  if (isBrowserPage) {
    infoDisplay.children[0].textContent = getMsg('NoCookiesForInternalBrowserPage')
  } else if (!activeCookies) {
    if (!useChrome && rootDomain !== null) {
      const priviligedPages = ['accounts-static.cdn.mozilla.net', 'accounts.firefox.com', 'addons.cdn.mozilla.net', 'addons.mozilla.org', 'api.accounts.firefox.com', 'content.cdn.mozilla.net', 'content.cdn.mozilla.net', 'discovery.addons.mozilla.org', 'input.mozilla.org', 'install.mozilla.org', 'oauth.accounts.firefox.com', 'profile.accounts.firefox.com', 'support.mozilla.org', 'sync.services.mozilla.com', 'testpilot.firefox.com']
      for (const page of priviligedPages) {
        if (rootDomain.indexOf(page) !== -1) {
          infoDisplay.children[0].textContent = getMsg('PriviligedDomainText')
          break
        }
      }
    } else {
      infoDisplay.children[0].textContent = getMsg('NoActiveDomainCookiesText')
    }
  }

  infoDisplay.removeAttribute('class')
  cookieList.removeAttribute('class')

  if (isBrowserPage) {
    document.querySelector('#profileNoData').removeAttribute('class')
    return
  }

  if (data[contextName] !== undefined && data[contextName][rootDomain] !== undefined) {
    const domainData = data[contextName][rootDomain]
    for (const cookieDomain of Object.keys(domainData)) {
      if (cookieDomain === rootDomain) continue
      for (const cookieKey of Object.keys(domainData[cookieDomain])) {
        if (domainData[cookieDomain][cookieKey] === true) {
          if (!isDomainCookieInList('#cookie-list-flagged', cookieKey, cookieDomain)) {
            addCookieToList('cookie-list-flagged', cookieKey, '', cookieDomain, true, false)
            ++countList['#flaggedCookies']
          }
        } else if (domainData[cookieDomain][cookieKey] === false) {
          if (!isDomainCookieInList('#cookie-list-permitted', cookieKey, cookieDomain)) {
            addCookieToList('cookie-list-permitted', cookieKey, '', cookieDomain, true, false)
            ++countList['#permittedCookies']
          }
        }
      }
    }
  }

  if (data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined) {
    const domainData = data.flagCookies_logged[contextName][rootDomain]
    for (const cookieDomain of Object.keys(domainData)) {
      for (const cookieKey of Object.keys(domainData[cookieDomain])) {
        addCookieToProfileList(loggedInCookieList, cookieKey, cookieDomain, 'flagCookies_logged')
      }
    }
  }

  if (loggedInCookieList.children.length !== 0) loggedInCookieList.removeAttribute('class')
  else document.querySelector('#profileNoData').removeAttribute('class')

  countList['#sessionData'].local = 0
  countList['#sessionData'].session = 0
  countList['#sessionData'].total = 0

  if (sessionData !== null) {
    const sessionDataList = document.querySelector('#session-data-list')
    sessionDataList.replaceChildren()

    if (Object.keys(sessionData.local).length !== 0) {
      createSessionStorageDataView('LocalStorage', sessionData.local, getMsg('LocalStorageTitle'), sessionDataList)
    }

    if (Object.keys(sessionData.session).length !== 0) {
      createSessionStorageDataView('SessionStorage', sessionData.session, getMsg('SessionStorageTitle'), sessionDataList)
    }
  }

  if (data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true) {
    document.querySelector('#global-flag').classList.add('active')
    switchAutoFlagGlobal(true, '#cookie-list')
  }

  document.querySelector('#activeCookies').className = 'active'
  if (logData !== null && data.flagCookies_logEnabled !== undefined && data.flagCookies_logEnabled === true) {
    const log = document.querySelector('#log')
    for (const entry of logData) log.textContent += entry + '\n'
  }

  if (data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined) {
    document.querySelector('#auto-flag').classList.add('active')
    switchAutoFlag(true, '#cookie-list')
  }

  if (data.flagCookies_accountMode !== undefined && data.flagCookies_accountMode[contextName] !== undefined && data.flagCookies_accountMode[contextName][rootDomain] !== undefined) {
    document.querySelector('#account-mode').classList.add('active')
  }

  if (data.flagCookies_darkTheme !== undefined && data.flagCookies_darkTheme === true) {
    document.querySelector('#confirmDarkTheme').classList.add('active')
  }

  if (data.flagCookies_logEnabled !== undefined && data.flagCookies_logEnabled === true) {
    document.querySelector('#confirmLoggingEnable').classList.add('active')
  }

  if (data.flagCookies_notifications !== undefined && data.flagCookies_notifications === true) {
    document.querySelector('#confirmNotifications').classList.add('active')
  }

  if (data.flagCookies_expiredExport !== undefined && data.flagCookies_expiredExport === true) {
    document.querySelector('#confirmExportExpired').classList.add('active')
  }

  for (const key of Object.keys(countList)) {
    const bubble = document.createElement('span')
    bubble.className = 'cookieCount'
    bubble.dataset.key = key

    let amount = 0

    switch (key) {
      case '#sessionData':
        amount = countList[key].total
        break
      default:
        amount = countList[key]
        break
    }

    bubble.appendChild(document.createTextNode(amount))
    document.querySelector(key).appendChild(bubble)

    document.querySelector('#searchBar').dispatchEvent(new Event('keyup'))
  }

  // TODO: Check if we can make easier acces if unfolded by default?
  for (const collapse of document.querySelectorAll('.collapseToggle')) {
    collapse.addEventListener('click', toggleCollapse)
  }

  const firstToogle = document.querySelector('.collapseToggle')
  if (firstToogle !== null) firstToogle.click()

  // if (!useChrome) getTempContainerStatus(contextName)
}

function toggleCollapse (evt) {
  if (evt.target.classList.contains('active')) {
    evt.target.parentNode.parentNode.parentNode.lastChild.classList.remove('hidden')
    evt.target.classList.remove('active')
    evt.target.textContent = '-'
    return
  }

  evt.target.classList.add('active')
  evt.target.parentNode.parentNode.parentNode.lastChild.classList.add('hidden')
  evt.target.textContent = '+'
}

function buildHelpIndex () {
  const index = document.querySelector('.helpNavigation')

  const helpIndex = document.querySelector('.helpIndex')
  if (helpIndex !== null) index.removeChild(helpIndex)

  const contentHeads = document.querySelectorAll('#help-view a')

  const list = document.createElement('ul')
  list.className = 'helpIndex'

  for (const link of contentHeads) {
    link.className = 'anchor'

    const child = document.createElement('li')
    const href = document.createElement('a')
    href.href = '#' + link.name
    const textContent = document.createTextNode(link.textContent)
    href.appendChild(textContent)
    child.appendChild(href)
    list.appendChild(child)
  }

  index.appendChild(list)
}

/*
// NOTE: Legacy for temporary containers compatibility
function getTempContainerStatus (contextName) {
  browser.runtime.sendMessage('{c607c8df-14a7-4f28-894f-29e8722976af}', { method: 'isTempContainer', cookieStoreId: contextName }).then(function (isTmp) {
    if (isTmp === true) {
      getMsg('CookieHelpTextSecureMightNotHandled', [document.querySelectorAll('.intro')[1].textContent])
    }
  }).catch()
}
*/

function addCookieToProfileList (targetList, cookieName, cookieDomain, src) {
  const li = document.createElement('li')
  li.classList.add('cookieEntry')

  const cookieKey = document.createElement('span')
  cookieKey.classList.add('key')
  cookieKey.appendChild(document.createTextNode(cookieName))

  const cookieKeyDomain = document.createElement('span')
  cookieKeyDomain.classList.add('domain')
  cookieKeyDomain.appendChild(document.createTextNode(cookieDomain))

  const dumpster = document.createElement('button')
  dumpster.addEventListener('click', dumpProfileCookie)
  dumpster.dataset.name = cookieName
  dumpster.dataset.domain = cookieDomain
  dumpster.dataset.src = src
  dumpster.className = 'dumpster'

  li.appendChild(cookieKey)
  li.appendChild(cookieKeyDomain)
  li.appendChild(dumpster)
  targetList.appendChild(li)
}

function removeCookieOfProfileList (targetList, cookieName, cookieDomain) {
  for (const child of targetList.children) {
    if (child.nodeName !== 'LI' || child.hasAttribute('title')) continue
    if (child.children[2].dataset.name === cookieName && child.children[2].dataset.domain === cookieDomain) {
      targetList.removeChild(child)
      return
    }
  }
}

function isDomainCookieInList (targetList, cookieKey, cookieDomain) {
  for (const child of document.querySelectorAll(targetList + ' .cookieEntry')) {
    if (child.firstChild.dataset.name === cookieKey && child.firstChild.dataset.domain === cookieDomain) {
      return true
    }
  }

  return false
}

function addCookieToList (targetList, name, value, domain, inactiveCookie, cookieWasCleared) {
  const targetCookieList = document.getElementById(targetList)
  const li = document.createElement('li')
  li.classList.add('cookieEntry')
  li.dataset.name = name
  li.dataset.domain = domain

  if (inactiveCookie || cookieWasCleared) li.classList.add('inactive-cookie')

  const checkMark = document.createElement('button')

  checkMark.dataset.name = name
  checkMark.dataset.domain = domain
  checkMark.dataset.value = value

  if (targetList === 'cookie-list-flagged') {
    checkMark.className = 'checkmark flagged'
    checkMark.title = getMsg('CookieIsFlaggedHelpText')
    checkMark.addEventListener('click', flaggedCookieSwitch)
  } else {
    checkMark.className = 'checkmark permit'
    checkMark.title = getMsg('CookieIsPermittedHelpText')
    checkMark.addEventListener('click', permittedCookieSwitch)
  }

  const p = document.createElement('p')

  const pCookieKeyElm = document.createElement('span')
  const pCookieKey = document.createTextNode(name)
  pCookieKeyElm.className = 'cookieKey'
  pCookieKeyElm.appendChild(pCookieKey)
  p.appendChild(pCookieKeyElm)

  const pCookieKeySecMessageElm = document.createElement('span')
  const pCookieKeySecMessage = document.createTextNode('(' + (domain.charAt(0) === '.' ? domain.substr(1) : domain) + ')')
  pCookieKeySecMessageElm.className = 'cookie-domain'
  pCookieKeySecMessageElm.appendChild(pCookieKeySecMessage)
  pCookieKeyElm.appendChild(pCookieKeySecMessageElm)

  const pCookieValueElm = document.createElement('span')
  let pCookieValue = null

  if (cookieWasCleared) {
    pCookieValue = document.createTextNode(value === '' ? getMsg('CookieWasClearedText') : value)
  } else {
    pCookieValue = document.createTextNode(value === '' ? getMsg('CookieIsInactiveText') : value)
  }

  pCookieValueElm.className = 'cookieValue'
  pCookieValueElm.appendChild(pCookieValue)
  p.appendChild(pCookieValueElm)

  li.appendChild(checkMark)
  li.appendChild(p)
  targetCookieList.appendChild(li)
}

// --------------------------------------------------------------------------------------------------------------------------------
// Button switch function and store delete cookie name in browser storage

// Chrome + Firefox
async function flaggedCookieSwitch (evt) {
  if (useChrome) {
    flaggedCookieSwitchNeutral(await chrome.storage.local.get(), evt)
    return
  }

  flaggedCookieSwitchNeutral(await browser.storage.local.get(), evt)
}

// Kinda neutral
async function flaggedCookieSwitchNeutral (data, evt) {
  const cookieName = evt.target.dataset.name
  const cookieDomain = evt.target.dataset.domain

  // Uncheck from flagged in active cookies, if present
  const domainCookieList = document.querySelectorAll('#cookie-list .cookieEntry')
  const hasAutoFlag = data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined
  const hasGlobal = data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true

  for (const child of domainCookieList) {
    if (child.firstChild.dataset.name === cookieName && child.firstChild.dataset.domain === cookieDomain) {
      if (hasAutoFlag) {
        child.firstChild.className = 'checkmark auto-flagged'
        child.firstChild.title = getMsg('CookieIsAutoFlaggedHelpText')
      } else if (hasGlobal) {
        child.firstChild.className = 'checkmark auto-flagged'
        child.firstChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
      } else {
        child.firstChild.className = 'checkmark'
        child.firstChild.title = getMsg('CookieFlagButtonAllowedHelpText')
      }

      break
    }
  }

  delete data[contextName][rootDomain][cookieDomain][cookieName]
  if (Object.keys(data[contextName][rootDomain][cookieDomain]).length === 0) {
    delete data[contextName][rootDomain][cookieDomain]

    if (Object.keys(data[contextName][rootDomain]).length === 0) {
      delete data[contextName][rootDomain]

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) await chrome.storage.local.remove(contextName)
        else await browser.storage.local.remove(contextName)
        delete data[contextName]
      }
    }
  }

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  const parent = evt.target.parentNode.parentNode
  parent.removeChild(evt.target.parentNode)

  if (parent.children.length === 0) {
    const infoDisplay = document.querySelector('#infoDisplay')
    const contentText = getMsg('NoFlaggedCookiesForDomain')
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }

  --countList['#flaggedCookies']
  updateCookieCount()
}

// Permitted view flag switch
// Chrome + Firefox
async function permittedCookieSwitch (evt) {
  if (useChrome) {
    permittedCookieSwitchNeutral(await chrome.storage.local.get(), evt)
    return
  }

  permittedCookieSwitchNeutral(await browser.storage.local.get(), evt)
}

// Kinda neutral
async function permittedCookieSwitchNeutral (data, evt) {
  const cookieName = evt.target.dataset.name
  const cookieDomain = evt.target.dataset.domain

  // Uncheck from permitted in active cookies, if present
  const domainCookieList = document.querySelectorAll('#cookie-list .cookieEntry')
  const hasAutoFlag = data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined
  const hasGlobal = data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true

  for (const child of domainCookieList) {
    if (child.firstChild.dataset.name === cookieName && child.firstChild.dataset.domain === cookieDomain) {
      if (hasAutoFlag) {
        child.firstChild.className = 'checkmark auto-flagged'
        child.firstChild.title = getMsg('CookieIsAutoFlaggedHelpText')
      } else if (hasGlobal) {
        child.firstChild.className = 'checkmark auto-flagged'
        child.firstChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
      } else {
        child.firstChild.className = 'checkmark'
        child.firstChild.title = getMsg('CookieFlagButtonAllowedHelpText')
      }

      break
    }
  }

  delete data[contextName][rootDomain][cookieDomain][cookieName]
  if (Object.keys(data[contextName][rootDomain][cookieDomain]).length === 0) {
    delete data[contextName][rootDomain][cookieDomain]

    if (Object.keys(data[contextName][rootDomain]).length === 0) {
      delete data[contextName][rootDomain]

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) await chrome.storage.local.remove(contextName)
        else await browser.storage.local.remove(contextName)
        delete data[contextName]
      }
    }
  }

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  const parent = evt.target.parentNode.parentNode
  parent.removeChild(evt.target.parentNode)

  if (parent.children.length === 0) {
    const infoDisplay = document.querySelector('#infoDisplay')
    const contentText = getMsg('NoPermittedCookiesForDomain')
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }

  --countList['#permittedCookies']
  updateCookieCount()
}

// Switch the cookie flag

// Chrome + Firefox
async function cookieFlagSwitch (evt) {
  if (useChrome) {
    cookieFlagSwitchNeutral(await chrome.storage.local.get(), evt)
    return
  }

  cookieFlagSwitchNeutral(await browser.storage.local.get(), evt)
}

// Kinda neutral
async function cookieFlagSwitchNeutral (data, evt) {
  const cookieName = evt.target.dataset.name
  const cookieDomain = evt.target.dataset.domain
  const cookieValue = evt.target.dataset.value

  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][rootDomain] === undefined) data[contextName][rootDomain] = {}
  if (data[contextName][rootDomain][cookieDomain] === undefined) data[contextName][rootDomain][cookieDomain] = {}

  const hasAutoFlag = data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined
  const hasCookie = data[contextName][rootDomain][cookieDomain][cookieName] !== undefined
  const cookieWasCleared = hasCookie && data[contextName][rootDomain][cookieDomain][cookieName].fgCleared !== undefined && data[contextName][rootDomain][cookieDomain][cookieName].fgCleared === true

  if (!hasCookie || (hasAutoFlag && (hasCookie && data[contextName][rootDomain][cookieDomain][cookieName] !== true && data[contextName][rootDomain][cookieDomain][cookieName] !== false))) {
    data[contextName][rootDomain][cookieDomain][cookieName] = true
    evt.target.className = 'checkmark flagged'
    evt.target.title = getMsg('CookieIsFlaggedHelpText')
    addCookieToList('cookie-list-flagged', cookieName, cookieValue, cookieDomain, false, cookieWasCleared)
    ++countList['#flaggedCookies']
  } else if (data[contextName][rootDomain][cookieDomain][cookieName] === true) {
    data[contextName][rootDomain][cookieDomain][cookieName] = false
    evt.target.className = 'checkmark permit'
    evt.target.title = getMsg('CookieIsPermittedHelpText')
    addCookieToList('cookie-list-permitted', cookieName, cookieValue, cookieDomain, false, cookieWasCleared)
    ++countList['#permittedCookies']

    // Remove from flagged list if present
    const flaggedCookieList = document.querySelectorAll('#cookie-list-flagged .cookieEntry')
    for (const child of flaggedCookieList) {
      if (child.firstChild.dataset.name === cookieName && child.firstChild.dataset.domain === cookieDomain) {
        child.parentNode.removeChild(child)
        --countList['#flaggedCookies']
        break
      }
    }
  } else if (hasAutoFlag) {
    delete data[contextName][rootDomain][cookieDomain][cookieName]

    if (Object.keys(data[contextName][rootDomain][cookieDomain]).length === 0) {
      delete data[contextName][rootDomain][cookieDomain]

      if (Object.keys(data[contextName][rootDomain]).length === 0) {
        delete data[contextName][rootDomain]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) await chrome.storage.local.remove(contextName)
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark auto-flagged'
    evt.target.title = getMsg('CookieIsAutoFlaggedHelpText')
  } else if (data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true) {
    delete data[contextName][rootDomain][cookieDomain][cookieName]

    if (Object.keys(data[contextName][rootDomain][cookieDomain]).length === 0) {
      delete data[contextName][rootDomain][cookieDomain]

      if (Object.keys(data[contextName][rootDomain]).length === 0) {
        delete data[contextName][rootDomain]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) await chrome.storage.local.remove(contextName)
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark auto-flagged'
    evt.target.title = getMsg('CookieIsGlobalFlaggedHelpText')
  } else {
    delete data[contextName][rootDomain][cookieDomain][cookieName]

    if (Object.keys(data[contextName][rootDomain][cookieDomain]).length === 0) {
      delete data[contextName][rootDomain][cookieDomain]

      if (Object.keys(data[contextName][rootDomain]).length === 0) {
        delete data[contextName][rootDomain]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) await chrome.storage.local.remove(contextName)
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark'
    evt.target.title = getMsg('CookieFlagButtonAllowedHelpText')
  }

  if (data[contextName] === undefined || data[contextName][rootDomain] === undefined || data[contextName][rootDomain][cookieDomain] === undefined || data[contextName][rootDomain][cookieDomain][cookieName] === undefined) {
    // Remove from permitted list if present
    const permittedCookieList = document.querySelectorAll('#cookie-list-permitted .cookieEntry')
    for (const child of permittedCookieList) {
      if (child.firstChild.dataset.name === cookieName && child.firstChild.dataset.domain === cookieDomain) {
        child.parentNode.removeChild(child)
        --countList['#permittedCookies']
        break
      }
    }
  }

  updateCookieCount()

  if (useChrome) chrome.storage.local.set(data)
  else await browser.storage.local.set(data)
}

function updateCookieCount () {
  for (const key of Object.keys(countList)) {
    if (key === '#sessionData') {
      document.querySelector(key + ' .cookieCount').textContent = countList[key].total
    } else {
      document.querySelector(key + ' .cookieCount').textContent = countList[key]
    }
  }
}

// Switch lockSwitch
async function cookieLockSwitch (evt) {
  if (useChrome) {
    cookieLockSwitchNeutral(await chrome.storage.local.get(), evt)
    return
  }

  cookieLockSwitchNeutral(await browser.storage.local.get(), evt)
}

async function cookieLockSwitchByDomain (evt) {
  let data = {}
  let cookieData = {}

  if (useChrome) {
    data = await chrome.storage.local.get()
    cookieData = await chrome.runtime.sendMessage({ getCookies: true, windowId, tabId })
  } else {
    data = await browser.storage.local.get()
    cookieData = await browser.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
  }

  const cookieDomain = evt.target.dataset.domain
  const loggedInCookieList = document.querySelector('#loggedInCookies')

  if (data.flagCookies_logged === undefined) data.flagCookies_logged = {}
  if (data.flagCookies_logged[contextName] === undefined) data.flagCookies_logged[contextName] = {}
  if (data.flagCookies_logged[contextName][rootDomain] === undefined) data.flagCookies_logged[contextName][rootDomain] = {}
  if (data.flagCookies_logged[contextName][rootDomain][cookieDomain] === undefined) data.flagCookies_logged[contextName][rootDomain][cookieDomain] = {}

  if (evt.target.classList.contains('locked')) {
    for (const cookie of cookieData.cookies[cookieDomain]) {
      if (data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name] !== undefined) {
        delete data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name]

        if (Object.keys(data.flagCookies_logged[contextName][rootDomain][cookieDomain]).length === 0) {
          delete data.flagCookies_logged[contextName][rootDomain][cookieDomain]

          if (Object.keys(data.flagCookies_logged[contextName][rootDomain]).length === 0) {
            delete data.flagCookies_logged[contextName][rootDomain]

            if (Object.keys(data.flagCookies_logged[contextName]).length === 0) {
              delete data.flagCookies_logged[contextName]

              if (Object.keys(data.flagCookies_logged).length === 0) {
                if (useChrome) await chrome.storage.local.remove('flagCookies_logged')
                else await browser.storage.local.remove('flagCookies_logged')
                delete data.flagCookies_logged
              }
            }
          }
        }
      }
    }

    evt.target.classList.remove('locked')
    evt.target.title = getMsg('SetCookieDomainProfileButtonHelpText')

    const domainCookieEntrys = document.querySelectorAll('.cookieEntry > .setKeyCookie[data-domain="' + cookieDomain + '"]')
    for (const domainCookieLock of domainCookieEntrys) {
      domainCookieLock.classList.remove('locked')
      domainCookieLock.title = getMsg('SetCookieProfileButtonHelpText')
    }

    if (data.flagCookies_logged === undefined || data.flagCookies_logged[contextName] === undefined || data.flagCookies_logged[contextName][rootDomain] === undefined) {
      document.querySelector('#profileNoData').removeAttribute('class')
    }

    if (useChrome) await chrome.storage.local.set(data)
    else await browser.storage.local.set(data)

    return
  }

  for (const cookie of cookieData.cookies[cookieDomain]) {
    data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name] = true

    if (!isDomainCookieInList('#loggedInCookies', cookie.name, cookieDomain)) addCookieToProfileList(loggedInCookieList, cookie.name, cookieDomain, 'flagCookies_logged')
    loggedInCookieList.removeAttribute('class')
  }

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  document.querySelector('#profileNoData').className = 'hidden'
  evt.target.classList.add('locked')
  evt.target.title = getMsg('RemoveCookieDomainProfileButtonHelpText')

  const domainCookieEntrys = document.querySelectorAll('.cookieEntry > .setKeyCookie[data-domain="' + cookieDomain + '"]')
  for (const domainCookieLock of domainCookieEntrys) {
    domainCookieLock.classList.add('locked')
    domainCookieLock.title = getMsg('CookieIsLockedProfileCookieHelpTextSettingsRef')
  }
}

async function cookieLockSwitchNeutral (data, evt) {
  const cookieName = evt.target.dataset.name
  const cookieDomain = evt.target.dataset.domain

  if (data.flagCookies_logged === undefined) data.flagCookies_logged = {}
  if (data.flagCookies_logged[contextName] === undefined) data.flagCookies_logged[contextName] = {}
  if (data.flagCookies_logged[contextName][rootDomain] === undefined) data.flagCookies_logged[contextName][rootDomain] = {}
  if (data.flagCookies_logged[contextName][rootDomain][cookieDomain] === undefined) data.flagCookies_logged[contextName][rootDomain][cookieDomain] = {}

  if (evt.target.classList.contains('locked')) {
    if (data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookieName] !== undefined) {
      delete data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookieName]

      if (Object.keys(data.flagCookies_logged[contextName][rootDomain][cookieDomain]).length === 0) {
        delete data.flagCookies_logged[contextName][rootDomain][cookieDomain]

        if (Object.keys(data.flagCookies_logged[contextName][rootDomain]).length === 0) {
          delete data.flagCookies_logged[contextName][rootDomain]

          if (Object.keys(data.flagCookies_logged[contextName]).length === 0) {
            delete data.flagCookies_logged[contextName]

            if (Object.keys(data.flagCookies_logged).length === 0) {
              if (useChrome) await chrome.storage.local.remove('flagCookies_logged')
              else await browser.storage.local.remove('flagCookies_logged')
              delete data.flagCookies_logged
            }
          }
        }
      }

      if (useChrome) await chrome.storage.local.set(data)
      else await browser.storage.local.set(data)

      const loggedInCookieList = document.querySelector('#loggedInCookies')
      removeCookieOfProfileList(loggedInCookieList, cookieName, cookieDomain)
      evt.target.classList.remove('locked')
      evt.target.title = getMsg('SetCookieProfileButtonHelpText')

      evt.target.parentNode.parentNode.parentNode.querySelector('.setKeyCookie[data-domain="' + cookieDomain + '"]').classList.remove('locked')

      if (data.flagCookies_logged === undefined || data.flagCookies_logged[contextName] === undefined || data.flagCookies_logged[contextName][rootDomain] === undefined) {
        document.querySelector('#profileNoData').removeAttribute('class')
      }
    }
  } else {
    data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookieName] = true

    if (useChrome) await chrome.storage.local.set(data)
    else await browser.storage.local.set(data)

    const loggedInCookieList = document.querySelector('#loggedInCookies')
    if (!isDomainCookieInList('#loggedInCookies', cookieName, cookieDomain)) addCookieToProfileList(loggedInCookieList, cookieName, cookieDomain, 'flagCookies_logged')
    loggedInCookieList.removeAttribute('class')

    document.querySelector('#profileNoData').className = 'hidden'
    evt.target.classList.add('locked')
    evt.target.title = getMsg('CookieIsLockedProfileCookieHelpTextSettingsRef')

    const lockedCookieCount = evt.target.parentNode.parentNode.children.length
    const cookieCount = Object.keys(data.flagCookies_logged[contextName][rootDomain][cookieDomain]).length

    if (lockedCookieCount === cookieCount) {
      evt.target.parentNode.parentNode.parentNode.querySelector('.setKeyCookie[data-domain="' + cookieDomain + '"]').classList.add('locked')
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Switches for main buttons
function unhide () {
  document.querySelector('#searchBar').value = ''
  document.querySelector('#searchBar').dispatchEvent(new window.KeyboardEvent('keyup'))
}

// Switch views
function switchView (evt) {
  const list = document.getElementById(evt.target.dataset.target)
  unhide()

  const content = document.querySelector('#content')
  for (const child of content.children) {
    child.className = 'hidden'
  }

  const tabs = document.querySelector('#tabs')
  for (const child of tabs.children) {
    if (child !== evt.target) child.removeAttribute('class')
  }

  const prefs = document.querySelector('#prefs')
  let prefsActive = false
  if (prefs !== evt.target) prefs.classList.remove('active')
  else if (prefs.classList.contains('active')) prefsActive = true

  const help = document.querySelector('#help')
  let helpActive = false
  if (help !== evt.target) {
    help.classList.remove('active')
    document.querySelector('#help-view').replaceChildren()
  } else if (help.classList.contains('active')) {
    helpActive = true
  } else if (help === evt.target) {
    useChrome ? loadHelp(chrome.i18n.getUILanguage()) : loadHelp(browser.i18n.getUILanguage())
  }

  const donate = document.querySelector('#donate')
  let donateActive = false
  if (donate !== evt.target) {
    donate.classList.remove('active')
    document.querySelector('#donate-view').replaceChildren()
  } else if (donate.classList.contains('active')) {
    donateActive = true
  } else if (donate === evt.target) {
    useChrome ? loadDonate(chrome.i18n.getUILanguage()) : loadDonate(browser.i18n.getUILanguage())
  }

  evt.target.classList.add('active')

  if (!prefsActive && !helpActive && !donateActive) {
    list.removeAttribute('class')
    return
  }

  if (list.children.length === 0) {
    const infoDisplay = document.querySelector('#infoDisplay')

    let contentText = getMsg('NoActiveDomainCookiesText')

    if (isBrowserPage) {
      contentText = getMsg('NoCookiesForInternalBrowserPage')
    } else if (evt.target.dataset.target === 'cookie-list-flagged') {
      contentText = getMsg('NoFlaggedCookiesForDomain')
    } else if (evt.target.dataset.target === 'cookie-list-permitted') {
      contentText = getMsg('NoPermittedCookiesForDomain')
    } else if (evt.target.dataset.target === 'session-data-list') {
      contentText = getMsg('NoSessionDataForDomain')
    }

    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    list.removeAttribute('class')
  }

  if (prefsActive || helpActive || donateActive) document.querySelector('#activeCookies').click()
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Switch auto flagging
async function flagAutoSwitch () {
  const autoFlagButton = document.querySelector('#auto-flag')

  if (!autoFlagButton.classList.contains('active')) {
    autoFlagButton.classList.add('active')
    switchAutoFlag(true, '#cookie-list')
  } else {
    autoFlagButton.classList.remove('active')
    switchAutoFlag(false, '#cookie-list')
  }
}

async function flagGlobalAuto () {
  let data = null
  if (useChrome) {
    data = await chrome.storage.local.get()
  } else {
    data = await browser.storage.local.get()
  }

  const globalFlagButton = document.querySelector('#global-flag')

  if (!globalFlagButton.classList.contains('active')) {
    globalFlagButton.classList.add('active')
    if (data.flagCookies_flagGlobal === undefined) data.flagCookies_flagGlobal = {}
    if (data.flagCookies_flagGlobal[contextName] === undefined) data.flagCookies_flagGlobal[contextName] = true

    if (useChrome) {
      await chrome.storage.local.set(data)
    } else {
      await browser.storage.local.set(data)
    }

    switchAutoFlagGlobal(true, '#cookie-list')
  } else {
    globalFlagButton.classList.remove('active')
    if (data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined) {
      delete data.flagCookies_flagGlobal[contextName]

      if (Object.keys(data.flagCookies_flagGlobal).length === 0) {
        if (useChrome) {
          await chrome.storage.local.remove('flagCookies_flagGlobal')
        } else {
          await browser.storage.local.remove('flagCookies_flagGlobal')
        }

        delete data.flagCookies_flagGlobal
      }

      if (useChrome) {
        await chrome.storage.local.set(data)
      } else {
        await browser.storage.local.set(data)
      }
    }

    const hasAutoFlag = data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined

    if (hasAutoFlag) switchAutoFlag(true, '#cookie-list')
    else switchAutoFlagGlobal(false, '#cookie-list')
  }
}

// Switch auto flag status for cookies
async function switchAutoFlag (doSwitchOn, targetList) {
  let data = null
  if (useChrome) {
    data = await chrome.storage.local.get()
  } else {
    data = await browser.storage.local.get()
  }

  const containerNode = document.querySelectorAll(targetList + ' .cookieEntry')

  if (doSwitchOn) {
    for (const child of containerNode) {
      const contentChild = child.firstChild
      const cookieKey = contentChild.dataset.name
      const cookieDomain = contentChild.dataset.domain

      if (!contentChild.classList.contains('checkmark')) continue
      else if (contentChild.classList.contains('flagged') || contentChild.classList.contains('permit')) continue

      if (data[contextName] === undefined || data[contextName][rootDomain] === undefined || data[contextName][rootDomain][cookieDomain] === undefined || data[contextName][rootDomain][cookieDomain][cookieKey] === undefined || (data[contextName][rootDomain][cookieDomain][cookieKey] !== true && data[contextName][rootDomain][cookieDomain][cookieKey] !== false)) {
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = getMsg('CookieIsAutoFlaggedHelpText')
      }
    }

    if (data.flagCookies_autoFlag === undefined) data.flagCookies_autoFlag = {}
    if (data.flagCookies_autoFlag[contextName] === undefined) data.flagCookies_autoFlag[contextName] = {}
    data.flagCookies_autoFlag[contextName][rootDomain] = true

    if (useChrome) {
      await chrome.storage.local.set(data)
      chrome.runtime.sendMessage({ clearOnActivation: true, tabId })
    } else {
      await browser.storage.local.set(data)
      browser.runtime.sendMessage({ clearOnActivation: true, tabId })
    }
  } else {
    const hasGlobalFlag = data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined

    for (const child of containerNode) {
      const contentChild = child.children[0]

      if (!contentChild.classList.contains('checkmark') && !contentChild.classList.contains('auto-flagged')) continue
      if (contentChild.classList.contains('flagged') || contentChild.classList.contains('permit')) continue

      if (hasGlobalFlag) {
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = getMsg('CookieIsAutoFlaggedHelpText')
      } else {
        contentChild.classList.remove('auto-flagged')
        contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
      }
    }

    if (data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined) {
      delete data.flagCookies_autoFlag[contextName][rootDomain]

      if (Object.keys(data.flagCookies_autoFlag[contextName]).length === 0) {
        delete data.flagCookies_autoFlag[contextName]

        if (Object.keys(data.flagCookies_autoFlag).length === 0) {
          delete data.flagCookies_autoFlag

          if (useChrome) {
            chrome.storage.local.remove('flagCookies_autoFlag')
          } else {
            browser.storage.local.remove('flagCookies_autoFlag')
          }
        }
      }
    }

    if (useChrome) {
      chrome.storage.local.set(data)
    } else {
      browser.storage.local.set(data)
    }
  }
}

// Switch auto globalflag status for cookies
async function switchAutoFlagGlobal (doSwitchOn, targetList) {
  let data = null
  if (useChrome) {
    data = await chrome.storage.local.get()
  } else {
    data = await browser.storage.local.get()
  }

  const containerNode = document.querySelectorAll(targetList + ' .cookieEntry')

  if (doSwitchOn) {
    for (const child of containerNode) {
      const contentChild = child.firstChild
      const cookieKey = contentChild.dataset.name
      const cookieDomain = contentChild.dataset.domain

      if (contentChild.classList.contains('flagged') || contentChild.classList.contains('permit')) continue

      if (data[contextName] === undefined || data[contextName][rootDomain] === undefined || data[contextName][rootDomain][cookieDomain] === undefined || data[contextName][rootDomain][cookieDomain][cookieKey] === undefined || (data[contextName][rootDomain][cookieDomain][cookieKey] !== true && data[contextName][rootDomain][cookieDomain][cookieKey] !== false)) {
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
      }
    }

    if (useChrome) {
      chrome.runtime.sendMessage({ clearOnActivation: true, tabId })
    } else {
      browser.runtime.sendMessage({ clearOnActivation: true, tabId })
    }
  } else {
    for (const child of containerNode) {
      const contentChild = child.firstChild
      const cookieKey = contentChild.dataset.name
      const cookieDomain = contentChild.dataset.domain

      if (contentChild.classList.contains('flagged') || contentChild.classList.contains('permit')) continue

      if (data[contextName] === undefined || data[contextName][rootDomain] === undefined || data[contextName][rootDomain][cookieDomain] === undefined || data[contextName][rootDomain][cookieDomain][cookieKey] === undefined || (data[contextName][rootDomain][cookieDomain][cookieKey] !== true && data[contextName][rootDomain][cookieDomain][cookieKey] !== false)) {
        contentChild.className = 'checkmark'
        contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Search related
function searchContent (evt) {
  const searchVal = evt.target.value.trim().toLowerCase()
  doSearch(searchVal, 'cookie-list')
  doSearch(searchVal, 'cookie-list-flagged')
  doSearch(searchVal, 'cookie-list-permitted')
  doSearch(searchVal, 'session-data-list')
}

function doSearch (searchVal, targetList) {
  let currentParent = null
  let hasVisible = false

  let searchSession = false
  if (targetList === 'session-data-list') {
    searchSession = true
  }

  const subListing = document.querySelectorAll('#' + targetList + ' .cookieEntry')

  for (const child of subListing) {
    if (currentParent === null || currentParent !== child.parentNode.parentNode) {
      if (currentParent !== null && !hasVisible) currentParent.classList.add('hidden')
      hasVisible = false
      currentParent = child.parentNode.parentNode
      currentParent.classList.remove('hidden')
    }

    let searchKey = ''
    let searchValue = ''

    if (searchSession) {
      searchKey = child.firstChild.firstChild.textContent.toLowerCase()
      searchValue = child.firstChild.lastChild.textContent.toLowerCase()
    } else {
      searchKey = child.children[1].firstChild.textContent.toLowerCase()
      searchValue = child.children[1].lastChild.textContent.toLowerCase()
    }

    if (searchKey.indexOf(searchVal) === -1 && searchValue.indexOf(searchVal) === -1) {
      child.classList.add('hidden')
    } else {
      child.classList.remove('hidden')
      hasVisible = true
    }
  }

  if (currentParent !== null && !hasVisible) currentParent.classList.add('hidden')
}

// Settings dialog - clearing flag cookies data
function toggleClearing (evt) {
  if (!evt.target.classList.contains('active')) evt.target.classList.add('active')
  else evt.target.classList.remove('active')
}

async function toggleLogging (evt) {
  let doSwitchOn = false

  if (!evt.target.classList.contains('active')) {
    evt.target.classList.add('active')
    doSwitchOn = true
  } else {
    evt.target.classList.remove('active')
    doSwitchOn = false
  }

  if (useChrome) {
    const data = await chrome.storage.local.get()
    data.flagCookies_logEnabled = doSwitchOn
    await chrome.storage.local.set(data)
    return
  }

  const data = await browser.storage.local.get()
  data.flagCookies_logEnabled = doSwitchOn
  await browser.storage.local.set(data)
}

async function toggleDarkTheme (evt) {
  let doSwitchOn = false

  if (!evt.target.classList.contains('active')) {
    evt.target.classList.add('active')
    doSwitchOn = true
    document.body.classList.add('dark')
  } else {
    evt.target.classList.remove('active')
    doSwitchOn = false
    document.body.classList.remove('dark')
  }

  if (useChrome) {
    const data = await chrome.storage.local.get(null)
    data.flagCookies_darkTheme = doSwitchOn
    await chrome.storage.local.set(data)
    return
  }

  const data = await browser.storage.local.get(null)
  data.flagCookies_darkTheme = doSwitchOn
  await browser.storage.local.set(data)
}

async function toggleNotifications (evt) {
  let doSwitchOn = false

  if (!evt.target.classList.contains('active')) {
    evt.target.classList.add('active')
    doSwitchOn = true

    if (useChrome) chrome.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsEnabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/fc128.png' })
    else browser.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsEnabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/flagcookies_icon.svg' })
  } else {
    evt.target.classList.remove('active')
    doSwitchOn = false

    if (useChrome) chrome.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsDisabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/fc128.png' })
    else browser.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsDisabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/flagcookies_icon.svg' })
  }

  if (useChrome) {
    const data = await chrome.storage.local.get(null)
    data.flagCookies_notifications = doSwitchOn
    await chrome.storage.local.set(data)
    return
  }

  const data = await browser.storage.local.get(null)
  data.flagCookies_notifications = doSwitchOn
  await browser.storage.local.set(data)
}

// Chrome + Firefox
async function clearSettings (evt) {
  const log = document.querySelector('#log')

  if (!document.querySelector('#confirmSettingsClearing').classList.contains('active')) {
    document.querySelector('#log').textContent = getMsg('ConfirmStorageClearingInfoMsg')
    return
  }

  if (useChrome) {
    if (await chrome.storage.local.clear() === undefined) {
      log.textContent = getMsg('SuccessClearingSettingsAndStorageInfoMsg')
      resetUI()
    } else {
      log.textContent = getMsg('ErrorClearingSettingsInfoMsg')
    }

    return
  }
  if (await browser.storage.local.clear() === undefined) {
    log.textContent = getMsg('SuccessClearingSettingsAndStorageInfoMsg')
    resetUI()
  } else {
    log.textContent = getMsg('ErrorClearingSettingsInfoMsg')
  }
}

// Chrome + Firefox - clearing domain data
async function clearDomain (evt) {
  const log = document.querySelector('#log')
  if (!document.querySelector('#confirmDomainClearing').classList.contains('active')) {
    document.querySelector('#log').textContent = getMsg('ConfirmDomainSettingsClearingInfoMsg')
    return
  }

  if (useChrome) {
    const data = await chrome.storage.local.get()
    if (resetUIDomain(data)) log.textContent = getMsg('DomainDataClearedInfoMsg')
    else log.textContent = getMsg('ErrorDomainDataClearingInfoMsg')
    return
  }

  const data = await browser.storage.local.get()
  if (resetUIDomain(data)) log.textContent = getMsg('DomainDataClearedInfoMsg')
  else log.textContent = getMsg('ErrorDomainDataClearingInfoMsg')
}

async function toggleExportExpired (evt) {
  evt.target.classList.toggle('active')
  let doSwitchOn = false

  if (evt.target.classList.contains('active')) {
    doSwitchOn = true
  }

  if (useChrome) {
    const data = await chrome.storage.local.get()
    data.flagCookies_expiredExport = doSwitchOn
    await chrome.storage.local.set(data)
    return
  }

  const data = await browser.storage.local.get()
  data.flagCookies_expiredExport = doSwitchOn
  await browser.storage.local.set(data)
}

function resetUI () {
  document.querySelector('#auto-flag').removeAttribute('class')
  document.querySelector('#global-flag').removeAttribute('class')
  document.querySelector('#account-mode').removeAttribute('class')
  document.querySelector('#donate').removeAttribute('class')

  document.body.classList.remove('dark')
  document.querySelector('#confirmDarkTheme').classList.remove('active')
  document.querySelector('#confirmLoggingEnable').classList.add('active')

  // Reset cookie list
  const cookieList = document.querySelector('#cookie-list')
  for (const child of cookieList.children) {
    const contentChild = child.children[0]
    contentChild.className = 'checkmark'
    contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
  }

  const clearLists = ['cookie-list-flagged', 'cookie-list-permitted', 'loggedInCookies']

  for (const child of clearLists) {
    const parent = document.getElementById(child)
    for (const childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  document.querySelector('#confirmSettingsClearing').classList.remove('active')
  document.querySelector('#confirmExportExpired').classList.remove('active')
}

async function resetUIDomain (data) {
  document.querySelector('#auto-flag').removeAttribute('class')

  // Reset cookie list
  const cookieList = document.querySelector('#cookie-list')

  for (const child of cookieList.children) {
    const contentChild = child.children[0]
    let contentChildProfile = null
    if (child.classList.contains('unremoved-secure-cookie')) contentChildProfile = child.children[3]
    else contentChildProfile = child.children[2]

    if (contentChildProfile === undefined) continue

    if (data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true) {
      contentChild.className = 'checkmark auto-flagged'
      contentChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
    } else {
      contentChild.className = 'checkmark'
      contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
    }

    contentChildProfile.classList.remove('locked')
    contentChildProfile.title = getMsg('SetCookieProfileButtonHelpText')
  }

  const clearLists = ['cookie-list-flagged', 'cookie-list-permitted', 'loggedInCookies']

  for (const child of clearLists) {
    const parent = document.getElementById(child)
    for (const childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  document.querySelector('#profileNoData').removeAttribute('class')
  if (data.flagCookies_autoFlag !== undefined) {
    if (data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] !== undefined) {
      delete data.flagCookies_autoFlag[contextName][rootDomain]
    }

    if (data.flagCookies_autoFlag[contextName] !== undefined && Object.keys(data.flagCookies_autoFlag[contextName]).length === 0) {
      delete data.flagCookies_autoFlag[contextName]
    }

    if (Object.keys(data.flagCookies_autoFlag).length === 0) {
      delete data.flagCookies_autoFlag

      if (useChrome) await chrome.storage.local.remove('flagCookies_autoFlag')
      else await browser.storage.local.remove('flagCookies_autoFlag')
    }
  }

  if (data.flagCookies_logged !== undefined) {
    if (data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined) {
      delete data.flagCookies_logged[contextName][rootDomain]

      if (Object.keys(data.flagCookies_logged[contextName]).length === 0) {
        delete data.flagCookies_logged[contextName]

        if (Object.keys(data.flagCookies_logged).length === 0) {
          delete data.flagCookies_logged

          if (useChrome) await chrome.storage.local.remove('flagCookies_logged')
          else await browser.storage.local.remove('flagCookies_logged')
        }
      }
    }
  }

  if (data.flagCookies_accountMode !== undefined) {
    if (data.flagCookies_accountMode[contextName] !== undefined && data.flagCookies_accountMode[contextName][rootDomain] !== undefined) {
      delete data.flagCookies_accountMode[contextName][rootDomain]

      if (Object.keys(data.flagCookies_accountMode[contextName]).length === 0) {
        delete data.flagCookies_accountMode[contextName]

        if (Object.keys(data.flagCookies_accountMode).length === 0) {
          delete data.flagCookies_accountMode

          if (useChrome) await chrome.storage.local.remove('flagCookies_accountMode')
          else await browser.storage.local.remove('flagCookies_accountMode')
        }
      }
    }

    document.querySelector('#account-mode').removeAttribute('class')
  }

  if (data[contextName] !== undefined && data[contextName][rootDomain] !== undefined) {
    delete data[contextName][rootDomain]

    if (Object.keys(data[contextName]).length === 0) {
      delete data[contextName]

      if (useChrome) await chrome.storage.local.remove(contextName)
      else await browser.storage.local.remove(contextName)
    }
  }

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  const confirmClearing = document.querySelector('#confirmDomainClearing')
  confirmClearing.classList.remove('active')
  return true
}

// Chrome + Firefox: Dump cookie from profile
async function dumpProfileCookie (evt) {
  if (useChrome) {
    dumpProfileCookieNeutral(await chrome.storage.local.get(), evt)
    return
  }

  dumpProfileCookieNeutral(await browser.storage.local.get(), evt)
}

async function dumpProfileCookieNeutral (data, evt) {
  const cookieSrc = evt.target.dataset.src
  const cookieName = evt.target.dataset.name
  const cookieDomain = evt.target.dataset.domain

  if (data[cookieSrc][contextName][rootDomain] === undefined || data[cookieSrc][contextName][rootDomain][cookieDomain] === undefined || data[cookieSrc][contextName][rootDomain][cookieDomain][cookieName] === undefined) return

  delete data[cookieSrc][contextName][rootDomain][cookieDomain][cookieName]

  if (Object.keys(data[cookieSrc][contextName][rootDomain][cookieDomain]).length === 0) {
    delete data[cookieSrc][contextName][rootDomain][cookieDomain]

    if (Object.keys(data[cookieSrc][contextName][rootDomain]).length === 0) {
      delete data[cookieSrc][contextName][rootDomain]

      if (Object.keys(data[cookieSrc][contextName]).length === 0) {
        delete data[cookieSrc][contextName]

        if (Object.keys(data[cookieSrc]).length === 0) {
          if (useChrome) await chrome.storage.local.remove(cookieSrc)
          else await browser.storage.local.remove(cookieSrc)
          delete data[cookieSrc]
        }
      }
    }
  }

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  const cookieList = document.querySelectorAll('#cookie-list .cookieEntry')
  for (const child of cookieList) {
    const contentChild = child.children[2]
    if (contentChild.dataset.name === cookieName && contentChild.dataset.domain === cookieDomain) {
      contentChild.classList.remove('locked')
      contentChild.title = getMsg('SetCookieProfileButtonHelpText')
      document.querySelector('#cookie-list .setKeyCookie[data-domain="' + cookieDomain + '"]').classList.remove('locked')
      break
    }
  }

  if (evt.target.parentNode.parentNode.children.length === 1) {
    document.querySelector('#profileNoData').removeAttribute('class')
    evt.target.parentNode.parentNode.className = 'hidden'
  }

  evt.target.parentNode.parentNode.removeChild(evt.target.parentNode)
}

// Switch profile/account mode
async function accountModeSwitch (evt) {
  if (useChrome) {
    accountModeSwitchNeutral(await chrome.storage.local.get(), evt)
    return
  }

  accountModeSwitchNeutral(await browser.storage.local.get(), evt)
}

async function accountModeSwitchNeutral (data, evt) {
  if (evt.target.classList.contains('active')) {
    if (data.flagCookies_accountMode !== undefined && data.flagCookies_accountMode[contextName] !== undefined && data.flagCookies_accountMode[contextName][rootDomain] !== undefined) {
      delete data.flagCookies_accountMode[contextName][rootDomain]

      if (Object.keys(data.flagCookies_accountMode[contextName]).length === 0) {
        delete data.flagCookies_accountMode[contextName]

        if (Object.keys(data.flagCookies_accountMode).length === 0) {
          if (useChrome) await chrome.storage.local.remove('flagCookies_accountMode')
          else await browser.storage.local.remove('flagCookies_accountMode')
          delete data.flagCookies_accountMode
        }
      }
    }

    if (useChrome) await chrome.storage.local.set(data)
    else await browser.storage.local.set(data)
    evt.target.removeAttribute('class')

    // Account mode icon removal
    if (useChrome) chrome.action.setIcon({ tabId, path: { 16: 'icons/fc16.png', 48: 'icons/fc48.png', 128: 'icons/fc128.png' } })
    else browserActionAPI.setIcon({ tabId, path: { 48: 'icons/flagcookies_icon.svg', 64: 'icons/flagcookies_icon.svg', 96: 'icons/flagcookies_icon.svg', 128: 'icons/flagcookies_icon.svg' } })
    return
  }

  if (data.flagCookies_accountMode === undefined) data.flagCookies_accountMode = {}
  if (data.flagCookies_accountMode[contextName] === undefined) data.flagCookies_accountMode[contextName] = {}
  data.flagCookies_accountMode[contextName][rootDomain] = true
  evt.target.className = 'active'

  if (useChrome) await chrome.storage.local.set(data)
  else await browser.storage.local.set(data)

  // Account mode icon
  if (useChrome) chrome.action.setIcon({ tabId, path: { 16: 'icons/fc16p.png', 48: 'icons/fc48p.png', 128: 'icons/fc128p.png' } })
  else browserActionAPI.setIcon({ tabId, path: { 48: 'icons/flagcookies_profil_icon.svg', 64: 'icons/flagcookies_profil_icon.svg', 96: 'icons/flagcookies_profil_icon.svg', 128: 'icons/flagcookies_profil_icon.svg' } })
}

function loadHelp (currentLocal) {
  const helpLoader = new window.XMLHttpRequest()
  helpLoader.addEventListener('readystatechange', function (evt) {
    if (evt.target.status === 200 && evt.target.readyState === 4) {
      document.querySelector('#help-view').innerHTML = evt.target.responseText
      buildHelpIndex()
    }

    if (evt.target.status !== 200 && evt.target.readyState === 4) {
      helpLoader.open('GET', './_locales/en/help.html')
      helpLoader.send()
    }
  })

  helpLoader.open('GET', './_locales/' + currentLocal + '/help.html')
  helpLoader.send()
}

function loadDonate (currentLocal) {
  const donateLoader = new window.XMLHttpRequest()
  donateLoader.addEventListener('readystatechange', function (evt) {
    if (evt.target.status === 200 && evt.target.readyState === 4) {
      document.querySelector('#donate-view').innerHTML = evt.target.responseText
    }

    if (evt.target.status !== 200 && evt.target.readyState === 4) {
      donateLoader.open('GET', './_locales/en/donate.html')
      donateLoader.send()
    }
  })

  donateLoader.open('GET', './_locales/' + currentLocal + '/donate.html')
  donateLoader.send()
}

// --------------------------------------------------------------------------------------------------------------------------------

/*
function toggleImportOverwrite (evt) {
  if (!evt.target.classList.contains('active')) evt.target.classList.add('active')
  else evt.target.classList.remove('active')
}
*/

function generateZip (rawData) {
  const data = JSON.stringify(rawData)
  const zip = new JSZip()
  zip.file('flagCookieSettings.json', data)

  zip.generateAsync({ type: 'blob' }).then(function (blob) {
    const dlLink = document.createElement('a')
    dlLink.href = URL.createObjectURL(blob)

    const dateObj = new Date()
    dlLink.download = 'FlagCookieSettings_' + dateObj.getFullYear().toString() + '-' + (dateObj.getMonth() + 1).toString() + '-' + dateObj.getDate().toString() + '.zip'
    document.body.appendChild(dlLink)
    dlLink.click()
    dlLink.parentNode.removeChild(dlLink)
    URL.revokeObjectURL(dlLink.href)
  })
}

// --------------------------------------------------------------------------------------------------------------------------------

async function exportSettings () {
  if (useChrome) chrome.storage.local.get(null, generateZip)
  else generateZip(await browser.storage.local.get())
}

// --------------------------------------------------------------------------------------------------------------------------------
function triggerImport () {
  /*
  // Left for historical reasons, this might work again later?
  const bgPage = browser.runtime.getBackgroundPage()
  bgPage.doImportOverwrite = document.querySelector('#confirmImportOverwrite').classList.contains('active')
  bgPage.document.adoptNode(document.querySelector('#importFile')).addEventListener('change', bgPage.importSettings)
  */

  browser.windows.create({ type: 'panel', url: 'importer.html', width: 800, height: 250 })
}

// --------------------------------------------------------------------------------------------------------------------------------
function shadowInputChrome () {
  /*
  // Left for historical reasons, this might work again later?
  chrome.runtime.getBackgroundPage(function (bgPage) {
    window.alert('Settings will be imported.') // Dirty hack(?) to keep the popup window open
    bgPage.doImportOverwrite = document.querySelector('#confirmImportOverwrite').classList.contains('active')
    bgPage.document.adoptNode(document.querySelector('#importFile')).addEventListener('change', bgPage.importSettings)
  })
  */

  chrome.windows.create({ type: 'panel', url: 'importer.html', width: 800, height: 250 })
}

// --------------------------------------------------------------------------------------------------------------------------------

function doExportCookiesFunc (cookies, exportExpired) {
  if (cookies === null) return
  else if (cookies.cookies === undefined) return

  if (cookies.cookies === null) {
    window.alert(getMsg('NoCookieDataExportMsg'))
    return
  }

  if (cookies.rootDomain !== undefined) {
    const timestampNow = Math.floor(Date.now() * 0.001)
    const jsonData = { userAgent: navigator.userAgent }

    for (const cookieDomain of Object.keys(cookies.cookies)) {
      jsonData[cookieDomain] = {}

      for (const cookieKey of Object.keys(cookies.cookies[cookieDomain])) {
        const cookie = cookies.cookies[cookieDomain][cookieKey]
        if (!exportExpired && cookie.expirationDate !== undefined && cookie.expirationDate < timestampNow) {
          continue
        }

        if (jsonData[cookieDomain][cookie.domain] === undefined) {
          jsonData[cookieDomain][cookie.domain] = {}
        }

        jsonData[cookieDomain][cookie.domain][cookie.name] = cookie
      }
    }

    const dlLink = document.createElement('a')
    const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' })
    dlLink.href = URL.createObjectURL(blob)

    const dateObj = new Date()
    dlLink.download = 'FlagCookies_cookieExport_' + (cookies.rootDomain.replace(/^(http:|https:)\/\//i, '').replace('.', '_')) + '_' + dateObj.getFullYear().toString() + '-' + (dateObj.getMonth() + 1).toString() + '-' + dateObj.getDate().toString() + '.json'
    document.body.appendChild(dlLink)
    dlLink.click()
    dlLink.parentNode.removeChild(dlLink)
    URL.revokeObjectURL(dlLink.href)
  }
}

// --------------------------------------------------------------------------------------------------------------------------------

function doExportCookiesClipFunc (cookies, exportExpired) {
  if (cookies === null) return
  else if (cookies.cookies === undefined) return

  if (cookies.cookies === null) {
    window.alert(getMsg('NoCookieDataExportMsg'))
    return
  }

  if (cookies.rootDomain !== undefined) {
    const timestampNow = Math.floor(Date.now() * 0.001)
    const jsonData = { userAgent: navigator.userAgent }

    for (const cookieDomain of Object.keys(cookies.cookies)) {
      jsonData[cookieDomain] = {}

      for (const cookieKey of Object.keys(cookies.cookies[cookieDomain])) {
        const cookie = cookies.cookies[cookieDomain][cookieKey]
        if (!exportExpired && cookie.expirationDate !== undefined && cookie.expirationDate < timestampNow) {
          continue
        }

        if (jsonData[cookieDomain][cookie.domain] === undefined) {
          jsonData[cookieDomain][cookie.domain] = {}
        }

        jsonData[cookieDomain][cookie.domain][cookie.name] = cookie
      }
    }

    navigator.clipboard.writeText(JSON.stringify(jsonData)).then(
      function () { window.alert(getMsg('ExportCookieClipboardMessage')) }
    )
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
async function doExportCookiesTabFunc (tabs) {
  const tab = tabs.pop()

  contextName = 'default'

  if (!useChrome && tab.cookieStoreId !== undefined) {
    contextName = tab.cookieStoreId
  }

  let data = null
  let cookies = []
  let exportExpired = false

  if (useChrome) {
    data = await chrome.storage.local.get()
    cookies = await chrome.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
  } else {
    data = await browser.storage.local.get()
    cookies = await browser.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
  }

  if (data.flagCookies_expiredExport !== undefined && data.flagCookies_expiredExport === true) {
    exportExpired = true
  }

  doExportCookiesFunc(cookies, exportExpired)
}

// --------------------------------------------------------------------------------------------------------------------------------

function exportCookies () {
  if (useChrome) chrome.tabs.query({ currentWindow: true, active: true }, doExportCookiesTabFunc)
  else browser.tabs.query({ currentWindow: true, active: true }, doExportCookiesTabFunc)
}

// --------------------------------------------------------------------------------------------------------------------------------

async function exportCookiesClipboard () {
  let data = null
  let exportExpired = false

  if (useChrome) {
    data = await chrome.storage.local.get()
  } else {
    data = await browser.storage.local.get()
  }

  if (data.flagCookies_expiredExport !== undefined && data.flagCookies_expiredExport === true) {
    exportExpired = true
  }

  if (useChrome) {
    const cookies = await chrome.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
    doExportCookiesClipFunc(cookies, exportExpired)
    return
  }

  const cookies = await browser.runtime.sendMessage({ getCookies: true, storeId: contextName, windowId, tabId })
  doExportCookiesClipFunc(cookies, exportExpired)
}

// --------------------------------------------------------------------------------------------------------------------------------
document.querySelector('#activeCookies').addEventListener('click', switchView)
document.querySelector('#flaggedCookies').addEventListener('click', switchView)
document.querySelector('#permittedCookies').addEventListener('click', switchView)
document.querySelector('#sessionData').addEventListener('click', switchView)
document.querySelector('#help').addEventListener('click', switchView)
document.querySelector('#prefs').addEventListener('click', switchView)
document.querySelector('#auto-flag').addEventListener('click', flagAutoSwitch)
document.querySelector('#donate').addEventListener('click', switchView)
document.querySelector('#global-flag').addEventListener('click', flagGlobalAuto)
document.querySelector('#account-mode').addEventListener('click', accountModeSwitch)
document.querySelector('#searchBar').addEventListener('keyup', searchContent)
document.querySelector('#confirmSettingsClearing').addEventListener('click', toggleClearing)
document.querySelector('#confirmLoggingEnable').addEventListener('click', toggleLogging)
document.querySelector('#confirmDomainClearing').addEventListener('click', toggleClearing)
document.querySelector('#confirmNotifications').addEventListener('click', toggleNotifications)
document.querySelector('#confirmDarkTheme').addEventListener('click', toggleDarkTheme)
document.querySelector('#settings-action-clear').addEventListener('click', clearSettings)
document.querySelector('#domain-action-clear').addEventListener('click', clearDomain)
document.querySelector('#confirmExportExpired').addEventListener('click', toggleExportExpired)
document.querySelector('#settings-action-all-export').addEventListener('click', exportSettings)
document.querySelector('#cookies-action-all-export').addEventListener('click', exportCookies)
document.querySelector('#cookies-action-all-export-clipboard').addEventListener('click', exportCookiesClipboard)
/*
if (useChrome) document.querySelector('label[for="importFile"]').addEventListener('click', shadowInputChrome)
else document.querySelector('#importFile').addEventListener('click', triggerImport)
*/
if (useChrome) document.querySelector('#settings-action-all-import').addEventListener('click', shadowInputChrome)
else document.querySelector('#settings-action-all-import').addEventListener('click', triggerImport)

// document.querySelector('#confirmImportOverwrite').addEventListener('click', toggleImportOverwrite)
if (useChrome) chrome.tabs.query({ currentWindow: true, active: true }, initDomainURLandProceed)
else browser.tabs.query({ currentWindow: true, active: true }, initDomainURLandProceed)
