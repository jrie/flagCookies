'use strict'

const logData = {} // The log data we seen as a report to the settings view
const logTime = {}
let cookieData = {} // Storage for cookie shadow, for the interface only!
let removedData = {}
let permittedData = {}
const openTabData = {}
let cookieCount = {}

const localStorageData = {}
const sessionStorageData = {}

// Chrome
const useChrome = typeof (browser) === 'undefined'

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

async function clearCookiesWrapper (action, cookieDetails, currentTab) {
  let contextName = 'default'

  if (currentTab.cookieStoreId !== undefined) {
    contextName = currentTab.cookieStoreId
  }

  const cookieDomain = currentTab.url.replace(/^(http:|https:)\/\//i, '').replace(/^\./, '').match(/.[^/]*/)[0]

  let firstPartyIsolate = null
  if (cookieDetails !== null && cookieDetails.firstPartyDomain !== undefined) {
    firstPartyIsolate = cookieDetails.firstPartyDomain
  }

  let cookieList = []
  const splittedDomain = cookieDomain.split('.')
  const rootDomain = splittedDomain.splice(splittedDomain.length - 2, 2).join('.')

  if (!useChrome) {
    const domainHttp = 'http://' + cookieDomain
    const domainHttps = 'https://' + cookieDomain
    const domainDot = '.' + cookieDomain
    const rootDomainDot = '.' + rootDomain

    const cookiesBase = await browser.cookies.getAll({ domain: cookieDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesBaseWWW = await browser.cookies.getAll({ domain:'www.' + cookieDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec = await browser.cookies.getAll({ domain: cookieDomain, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookies2 = await browser.cookies.getAll({ domain: domainDot, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec2 = await browser.cookies.getAll({ domain: domainDot, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookies3 = await browser.cookies.getAll({ domain: domainHttp, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec3 = await browser.cookies.getAll({ domain: domainHttp, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookies4 = await browser.cookies.getAll({ domain: domainHttps, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec4 = await browser.cookies.getAll({ domain: domainHttps, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookies5 = await browser.cookies.getAll({ domain: rootDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec5 = await browser.cookies.getAll({ domain: rootDomain, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookies6 = await browser.cookies.getAll({ domain: rootDomainDot, firstPartyDomain: firstPartyIsolate, storeId: contextName })
    const cookiesSec6 = await browser.cookies.getAll({ domain: rootDomainDot, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })

    cookieList = [cookiesBase, cookiesBaseWWW, cookiesSec, cookies2, cookiesSec2, cookies3, cookiesSec3, cookies4, cookiesSec4, cookies5, cookiesSec5, cookies6, cookiesSec6]
  } else {
    const domainSplit = cookieDomain.split('.')
    const targetDomain = domainSplit.splice(domainSplit.length - 2, 2).join('.')

    const cookiesBase = await chrome.cookies.getAll({ domain: cookieDomain })
    const cookiesRoot = await chrome.cookies.getAll({ domain: targetDomain })
    const cookiesRootDot = await chrome.cookies.getAll({ domain: '.' + targetDomain })
    cookieList = [cookiesBase, cookiesRoot, cookiesRootDot]

    if (openTabData !== undefined && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.tabId] !== undefined) {
      for (const tab of Object.keys(openTabData[currentTab.windowId][currentTab.id])) {
        const targetURL = openTabData[currentTab.windowId][currentTab.id][tab].d
        cookieList.push(await chrome.cookies.getAll({ domain: targetURL }))
      }
    }
  }

  const cookies = []
  for (const list of cookieList) {
    for (const cookie of list) {
      let hasCookie = false

      for (const cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
          hasCookie = true
          break
        }
      }

      if (hasCookie) {
        continue
      }

      for (const key of Object.keys(cookie)) {
        switch (key) {
          case 'name':
          case 'value':
          case 'domain':
          case 'path':
          case 'secure':
          case 'expirationDate':
          case 'firstPartyDomain':
          case 'partitionKey':
            // case 'storeId':
            continue
          default:
            delete cookie[key]
            continue
        }
      }

      cookies.push(cookie)
      addTabURLtoDataList(currentTab, { url: currentTab.url }, cookie.domain)
    }
  }

  setMouseOverTitle(contextName, currentTab)
  if (cookies.length === 0) return

  let data = {}
  if (useChrome) {
    data = await chrome.storage.local.get()
  } else {
    data = await browser.storage.local.get()
  }

  clearCookiesAction(action, data, cookies, currentTab)
}

async function handleTabChange (activeInfo) {
  let tab = null

  if (useChrome) {
    tab = await chrome.tabs.get(activeInfo.tabId)
  } else {
    tab = await browser.tabs.get(activeInfo.tabId)
  }

  const activeTabUrl = tab.url.toLowerCase()
  if (activeTabUrl.startsWith('chrome:') || activeTabUrl.startsWith('about:') || activeTabUrl.startsWith('edge:')) {
    return
  }

  if (useChrome) {
    chrome.tabs.sendMessage(activeInfo.tabId, { getStorageData: true })
    return
  }

  browser.tabs.sendMessage(activeInfo.tabId, { getStorageData: true })
}

function setTabForClearCookies (tab) {
  // TODO: Add translation for log message in locales
  clearCookiesWrapper(getMsg('ActionDocumentLoad'), null, tab)
}

function handleMessage (request, sender, sendResponse) {
  if (request.clearOnActivation !== undefined && request.tabId !== undefined) {
    let tab = null

    if (useChrome) {
      chrome.tabs.get(request.tabId).then(setTabForClearCookies)
      return
    }

    browser.tabs.get(request.tabId).then(setTabForClearCookies)
    return
  }

  if (request.clearStorage !== undefined && request.tabId !== undefined) {
    if (useChrome) {
      chrome.tabs.sendMessage(request.tabId, { clearStorage: request.clearStorage })
    } else {
      browser.tabs.sendMessage(request.tabId, { clearStorage: request.clearStorage })
    }

    return
  }

  if (request.getLocalData !== undefined && request.windowId !== undefined && request.tabId !== undefined) {
    let contextName = 'default'

    if (request.storeId !== undefined) {
      contextName = request.storeId
    }

    const sessionData = { local: {}, session: {} }

    if (localStorageData[contextName] !== undefined && localStorageData[contextName][request.windowId] !== undefined && localStorageData[contextName][request.windowId][request.tabId] !== undefined) {
      sessionData.local = localStorageData[contextName][request.windowId][request.tabId]
    }

    if (sessionStorageData[contextName] !== undefined && sessionStorageData[contextName][request.windowId] !== undefined && sessionStorageData[contextName][request.windowId][request.tabId] !== undefined) {
      sessionData.session = sessionStorageData[contextName][request.windowId][request.tabId]
    }

    sendResponse(sessionData)
    return
  }

  if (request.local !== undefined && request.session !== undefined) {
    const tab = sender.tab
    let contextName = 'default'

    if (tab.cookieStoreId !== undefined) {
      contextName = tab.cookieStoreId
    }

    if (localStorageData[contextName] === undefined) localStorageData[contextName] = {}
    if (localStorageData[contextName][tab.windowId] === undefined) localStorageData[contextName][tab.windowId] = {}
    localStorageData[contextName][tab.windowId][tab.id] = {}

    if (sessionStorageData[contextName] === undefined) sessionStorageData[contextName] = {}
    if (sessionStorageData[contextName][tab.windowId] === undefined) sessionStorageData[contextName][tab.windowId] = {}
    sessionStorageData[contextName][tab.windowId][tab.id] = {}

    for (const key of Object.keys(request.local)) {
      try {
        localStorageData[contextName][tab.windowId][tab.id][key] = JSON.parse(request.local[key])
      } catch {
        localStorageData[contextName][tab.windowId][tab.id][key] = request.local[key]
      }
    }

    for (const key of Object.keys(request.session)) {
      try {
        sessionStorageData[contextName][tab.windowId][tab.id][key] = JSON.parse(request.session[key])
      } catch {
        sessionStorageData[contextName][tab.windowId][tab.id][key] = request.session[key]
      }
    }

    setMouseOverTitle(contextName, tab)
    return
  }

  if (request.getCookies !== undefined && request.windowId !== undefined && request.tabId !== undefined) {
    const cookieDataDomain = {}

    let contextName = 'default'
    if (request.storeId !== undefined) {
      contextName = request.storeId
    }

    if (cookieData[contextName] === undefined || cookieData[contextName][request.windowId] === undefined || cookieData[contextName][request.windowId][request.tabId] === undefined) {
      sendResponse({ sessionData: null, cookies: null, rootDomain: null, msg: getMsg('UnknownDomain'), logData: null })
      return
    }

    const rootDomain = cookieData[contextName][request.windowId][request.tabId].fgRoot

    for (const domainKey of Object.keys(cookieData[contextName][request.windowId][request.tabId])) {
      if (domainKey === 'fgRoot') continue

      if (cookieDataDomain[domainKey] === undefined) cookieDataDomain[domainKey] = []

      for (const cookie of cookieData[contextName][request.windowId][request.tabId][domainKey]) {
        for (const key of Object.keys(cookie)) {
          if (key.startsWith('fg')) {
            continue
          }

          switch (key) {
            case 'name':
            case 'value':
            case 'domain':
            case 'path':
            case 'secure':
            case 'expirationDate':
            case 'firstPartyDomain':
            case 'partitionKey':
              // case 'storeId':
              continue
            default:
              delete cookie[key]
              continue
          }
        }

        cookieDataDomain[domainKey].push(cookie)
      }
    }

    if (logData[contextName] !== undefined && logData[contextName][request.windowId] !== undefined && logData[contextName][request.windowId][request.tabId] !== undefined) {
      sendResponse({ cookies: cookieDataDomain, rootDomain, msg: false, logData: logData[contextName][request.windowId][request.tabId] })
    } else {
      sendResponse({ cookies: cookieDataDomain, rootDomain, msg: false, logData: null })
    }

    return
  }

  sendResponse({ sessionData: null, cookies: null, rootDomain: null, msg: getMsg('UnknownDomain'), logData: null })
}

function resetCookieInformation (tab) {
  let contextName = 'default'
  if (tab.cookieStoreId !== undefined) {
    contextName = tab.cookieStoreId
  }

  if (removedData === undefined) removedData = {}
  if (removedData[contextName] === undefined) removedData[contextName] = {}
  if (removedData[contextName][tab.windowId] === undefined) removedData[contextName][tab.windowId] = {}
  if (removedData[contextName][tab.windowId][tab.id] === undefined) removedData[contextName][tab.windowId][tab.id] = 0
  else removedData[contextName][tab.windowId][tab.id] = 0

  if (permittedData === undefined) permittedData = {}
  if (permittedData[contextName] === undefined) permittedData[contextName] = {}
  if (permittedData[contextName][tab.windowId] === undefined) permittedData[contextName][tab.windowId] = {}
  if (permittedData[contextName][tab.windowId][tab.id] === undefined) permittedData[contextName][tab.windowId][tab.id] = 0
  else permittedData[contextName][tab.windowId][tab.id] = 0

  if (cookieCount === undefined) cookieCount = {}
  if (cookieCount[contextName] === undefined) cookieCount[contextName] = {}
  if (cookieCount[contextName][tab.windowId] === undefined) cookieCount[contextName][tab.windowId] = {}
  if (cookieCount[contextName][tab.windowId][tab.id] === undefined) cookieCount[contextName][tab.windowId][tab.id] = { count: 0, domains: {} }
  else {
    cookieCount[contextName][tab.windowId][tab.id].domains = {}
    cookieCount[contextName][tab.windowId][tab.id].count = 0
  }

  if (cookieData === undefined) cookieData = {}
  if (cookieData[contextName] === undefined) cookieData[contextName] = {}
  if (cookieData[contextName][tab.windowId] === undefined) cookieData[contextName][tab.windowId] = {}
  if (cookieData[contextName][tab.windowId][tab.id] === undefined) cookieData[contextName][tab.windowId][tab.id] = {}
  else cookieData[contextName][tab.windowId][tab.id] = {}
}

function increaseCount (contextName, tab, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '')

  if (cookieCount[contextName] === undefined) cookieCount[contextName] = {}
  if (cookieCount[contextName][tab.windowId] === undefined) cookieCount[contextName][tab.windowId] = {}
  if (cookieCount[contextName][tab.windowId][tab.id] === undefined) cookieCount[contextName][tab.windowId][tab.id] = { count: 0, domains: {} }
  if (cookieCount[contextName][tab.windowId][tab.id].domains[strippedDomainURL] === undefined) cookieCount[contextName][tab.windowId][tab.id].domains[strippedDomainURL] = []

  if (cookieCount[contextName][tab.windowId][tab.id].domains[strippedDomainURL].indexOf(cookieName) === -1) {
    cookieCount[contextName][tab.windowId][tab.id].domains[strippedDomainURL].push(cookieName)
    ++cookieCount[contextName][tab.windowId][tab.id].count
  }
}

function increaseRemoved (contextName, tab) {
  if (removedData[contextName] === undefined) removedData[contextName] = {}
  if (removedData[contextName][tab.windowId] === undefined) removedData[contextName][tab.windowId] = {}
  if (removedData[contextName][tab.windowId][tab.id] === undefined) removedData[contextName][tab.windowId][tab.id] = 0
  else ++removedData[contextName][tab.windowId][tab.id]
}

function increasePermitted (contextName, tab) {
  if (permittedData[contextName] === undefined) permittedData[contextName] = {}
  if (permittedData[contextName][tab.windowId] === undefined) permittedData[contextName][tab.windowId] = {}
  if (permittedData[contextName][tab.windowId][tab.id] === undefined) permittedData[contextName][tab.windowId][tab.id] = 0
  else ++permittedData[contextName][tab.windowId][tab.id]
}

async function setMouseOverTitle (contextName, tab) {
  if (useChrome) {
    if (await chrome.tabs.get(tab.id) === undefined) {
      return
    }
  } else if (await browser.tabs.get(tab.id) === undefined) {
    return
  }

  let titleString = '::::::::::::::::::: ' + getMsg('IconDisplayLog') + ' :::::::::::::::::::'
  if (cookieCount[contextName] !== undefined && cookieCount[contextName][tab.windowId] !== undefined && cookieCount[contextName][tab.windowId][tab.id] !== undefined) {
    titleString += '\n' + getMsg('cookieCountDisplayIconHover', cookieCount[contextName][tab.windowId][tab.id].count.toString())
  }

  if (localStorageData[contextName] !== undefined && localStorageData[contextName][tab.windowId] !== undefined && localStorageData[contextName][tab.windowId][tab.id] !== undefined) {
    titleString += '\n' + getMsg('localStorageKeyCountTitle', Object.keys(localStorageData[contextName][tab.windowId][tab.id]).length.toString())
  }

  if (sessionStorageData[contextName] !== undefined && sessionStorageData[contextName][tab.windowId] !== undefined && sessionStorageData[contextName][tab.windowId][tab.id] !== undefined) {
    titleString += '\n' + getMsg('sessionStorageKeyCountTitle', Object.keys(sessionStorageData[contextName][tab.windowId][tab.id]).length.toString())
  }

  let msgsAdded = false
  if (logData[contextName] !== undefined && logData[contextName][tab.windowId] !== undefined && logData[contextName][tab.windowId][tab.id] !== undefined) {
    const statuses = [getMsg('GlobalFlagState'), getMsg('AutoFlagState'), getMsg('PermittedState'), getMsg('AllowedState'), getMsg('DeletedStateMsg')]
    let hasTitleChange = false

    const cookiesInMessages = []
    for (let status of statuses) {
      const titleJoin = []
      let index = 0
      const statusLower = status.toLowerCase()

      for (const msg of logData[contextName][tab.windowId][tab.id]) {
        if (msg.toLowerCase().indexOf(statusLower) !== -1) {
          const cookieName = msg.match(/ '([^']*)' /)[1]
          if (cookiesInMessages.indexOf(cookieName) === -1) {
            titleJoin.push(cookieName)
            cookiesInMessages.push(cookieName)

            if (index !== 0 && index % 7 === 0) titleJoin.push('\n')
            ++index
          }
        }
      }

      if (titleJoin.length !== 0) {
        if (status === getMsg('DeletedStateMsg')) status = getMsg('DeletedState')
        titleString += '\n' + status.replace(' ', '') + ': ' + titleJoin.join(', ')
        hasTitleChange = true
        msgsAdded = true
      }
    }

    if (!hasTitleChange) {
      titleString += '\n' + getMsg('NoActionOnPage')
      msgsAdded = true
    }
  }

  let countStr = '0'

  const hasRemove = removedData[contextName] !== undefined && removedData[contextName][tab.windowId] !== undefined && removedData[contextName][tab.windowId][tab.id] !== undefined && removedData[contextName][tab.windowId][tab.id] !== 0
  const hasPermit = permittedData[contextName] !== undefined && permittedData[contextName][tab.windowId] !== undefined && permittedData[contextName][tab.windowId][tab.id] !== undefined && permittedData[contextName][tab.windowId][tab.id] !== 0

  if (hasRemove) {
    countStr = removedData[contextName][tab.windowId][tab.id].toString()
    titleString += '\n' + getMsg('DeletedCookiesMsg', countStr)
  }

  if (hasPermit) {
    titleString += '\n' + getMsg('PermittedCookiesMsg', permittedData[contextName][tab.windowId][tab.id].toString())
  }

  if (!hasRemove && !hasPermit && !msgsAdded) {
    titleString += '\n' + getMsg('NoActionOnPage')
  }

  if (useChrome) {
    if (countStr !== '0') chrome.action.setBadgeText({ text: countStr, tabId: tab.id })
    else chrome.action.setBadgeText({ text: '', tabId: tab.id })

    chrome.action.setTitle({ title: titleString, tabId: tab.id })
  } else {
    if (countStr !== '0') browser.action.setBadgeText({ text: countStr, tabId: tab.id })
    else browser.action.setBadgeText({ text: '', tabId: tab.id })

    browser.action.setTitle({ title: titleString, tabId: tab.id })
  }
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, currentTab) {
  if (openTabData[currentTab.windowId] === undefined || openTabData[currentTab.windowId][currentTab.id] === undefined || openTabData[currentTab.windowId][currentTab.id][0] === undefined) return
  const rootDomain = openTabData[currentTab.windowId][currentTab.id][0].u

  let contextName = 'default'
  if (currentTab.cookieStoreId !== undefined) {
    contextName = currentTab.cookieStoreId
  }

  const hasDataContext = data[contextName] !== undefined && data[contextName][rootDomain] !== undefined

  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][rootDomain] === undefined) data[contextName][rootDomain] = {}

  const hasAccountsInContext = data.flagCookies_accountMode !== undefined && data.flagCookies_accountMode[contextName] !== undefined
  let accountDomain = null

  let foundCookie = false
  for (const cookie of cookies) {
    foundCookie = false
    if (cookie.fgHandled !== undefined) delete cookie.fgHandled
    if (cookie.fgRemoved !== undefined) delete cookie.fgRemoved
    if (cookie.fgAllowed !== undefined) delete cookie.fgAllowed
    /*
    if (cookie.fgProfile !== undefined) delete cookie.fgProfile
    if (cookie.fgProtected !== undefined) delete cookie.fgProtected
    if (cookie.fgDomain !== undefined) delete cookie.fgDomain
    if (cookie.fgLogged !== undefined) delete cookie.fgLogged
    if (cookie.fgNotPresent !== undefined) delete cookie.fgNotPresent
    */
    const domainKey = cookie.domain
    const domain = domainKey.replace(/^\./, '')
    let hasHttpProfile = false
    let hasHttpsProfile = false
    if (hasAccountsInContext) {
      hasHttpProfile = data.flagCookies_accountMode[contextName]['http://' + domain] !== undefined
      hasHttpsProfile = data.flagCookies_accountMode[contextName]['https://' + domain] !== undefined
    }

    /*
    let hasCookieDomain = false
    if (openTabData !== undefined && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined) {
      for (const tabDomains of Object.values(openTabData[currentTab.windowId][currentTab.id])) {
        if (tabDomains === undefined) break
        if (tabDomains.d === domainKey) {
          hasCookieDomain = true
          break
        }
      }

      if (!hasCookieDomain) continue
    }
    */

    if (hasHttpProfile || hasHttpsProfile) {
      let cookieDomainString = ''
      if (hasHttpProfile) cookieDomainString = 'http://' + domain
      else if (hasHttpsProfile) cookieDomainString = 'https://' + domain

      for (const domain of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
        let index = 0
        for (const cookieEntry of cookieData[contextName][currentTab.windowId][currentTab.id][domain]) {
          if (cookieEntry.name === cookie.name && cookieEntry.domain === domainKey) {
            foundCookie = true

            for (const key of Object.keys(cookieEntry)) {
              if (key.startsWith('fg')) {
                cookie[key] = cookieEntry[key]
              }
            }

            if (data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][cookieDomainString] !== undefined && data.flagCookies_logged[contextName][cookieDomainString][domainKey] !== undefined && data.flagCookies_logged[contextName][cookieDomainString][domainKey][cookie.name] !== undefined && data.flagCookies_logged[contextName][cookieDomainString][domainKey][cookie.name] === true) {
              cookie.fgProfile = true
              cookie.fgAllowed = true
              cookie.fgDomain = cookieDomainString
              cookie.fgProtected = true
            }

            cookieData[contextName][currentTab.windowId][currentTab.id][domain][index] = cookie
            break
          }

          ++index
        }

        if (foundCookie) {
          break
        }
      }
    } else {
      for (const domainKey of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
        if (domainKey === 'fgRoot') continue

        for (const cookieEntry of cookieData[contextName][currentTab.windowId][currentTab.id][domainKey]) {
          if (cookieEntry.name === cookie.name && cookieEntry.domain === domainKey) {
            foundCookie = true
            break
          }
        }

        if (foundCookie) {
          break
        }
      }
    }

    if (!foundCookie) {
      if (cookieData[contextName][currentTab.windowId][currentTab.id][domainKey] === undefined) {
        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey] = []
      }

      cookieData[contextName][currentTab.windowId][currentTab.id][domainKey].push(cookie)
    }
  }

  let protectDomainCookies = false
  let hasLogged = false
  let hasLocalProfile = false
  let hasGlobalProfile = false

  if (accountDomain === null && hasAccountsInContext) {
    hasGlobalProfile = data.flagCookies_accountMode[contextName][rootDomain] !== undefined && data.flagCookies_accountMode[contextName][rootDomain] === true
    hasLocalProfile = data.flagCookies_accountMode[contextName][rootDomain] !== undefined

    if (hasGlobalProfile) {
      if (data.flagCookies_accountMode[contextName][rootDomain] !== undefined) {
        accountDomain = rootDomain
      }

      hasLogged = data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined
      if (hasLogged && Object.keys(data.flagCookies_logged[contextName][rootDomain]).length === 0) protectDomainCookies = true
    } else if (hasLocalProfile) {
      hasLogged = data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined
      accountDomain = rootDomain
      if (hasLogged && Object.keys(data.flagCookies_logged[contextName][rootDomain]).length === 0) protectDomainCookies = true
    } else if (rootDomain !== undefined) {
      const strippedDomainURL = rootDomain.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')
      const targetTab = openTabData[currentTab.windowId][currentTab.id]
      for (const tab of Object.values(targetTab)) {
        if (tab.d === strippedDomainURL) {
          protectDomainCookies = true
          accountDomain = strippedDomainURL
          break
        }
      }
    } else {
      return
    }
  }

  let timeString = ''
  let timestamp = 0

  let isLogEnabled = true
  if (data.flagCookies_logEnabled === undefined || data.flagCookies_logEnabled !== true) {
    isLogEnabled = false
  } else {
    const dateObj = new Date()
    timeString = (dateObj.getHours() < 10 ? '0' + dateObj.getHours() : dateObj.getHours()) + ':' + (dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes()) + ':' + (dateObj.getSeconds() < 10 ? '0' + dateObj.getSeconds() : dateObj.getSeconds())
    timestamp = dateObj.getTime()
  }

  const urlInFlag = (data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && data.flagCookies_autoFlag[contextName][rootDomain] && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && openTabData[currentTab.windowId][currentTab.id][0].u === rootDomain)
  const globalFlagEnabled = data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined && data.flagCookies_flagGlobal[contextName] === true

  if (!globalFlagEnabled && data.flagCookies_autoFlag !== undefined && data.flagCookies_autoFlag[contextName] !== undefined && urlInFlag) {
    for (const domainKey of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
      if (domainKey === 'fgRoot') continue

      let index = 0
      for (const cookie of cookieData[contextName][currentTab.windowId][currentTab.id][domainKey]) {
        if (cookie.fgHandled !== undefined && cookie.fgHandled) {
          ++index
          continue
        }

        let firstPartyIsolate = null
        if (cookie.firstPartyDomain !== undefined) {
          firstPartyIsolate = cookie.firstPartyDomain
        }

        let cookieDomain = domainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')
        increaseCount(contextName, currentTab, cookie.name, domainKey)

        const isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][domainKey] !== undefined && data[contextName]['http://' + cookieDomain][domainKey][cookie.name] !== undefined)
        const isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][domainKey] !== undefined && data[contextName]['https://' + cookieDomain][domainKey][cookie.name] !== undefined)

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain

        if (cookieDomain === rootDomain) cookie.fgRoot = true
        else if (cookie.fgRoot !== undefined) delete cookie.fgRoot

        const isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] !== undefined)
        const isLogged = data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined && ((data.flagCookies_logged[contextName][rootDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey][cookie.name] !== undefined) || (data.flagCookies_logged[contextName][rootDomain] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey][cookie.name] !== undefined))

        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie

        if (!isManagedCookie && hasLocalProfile) {
          if ((isLogged)) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            delete cookie.fgLogged
            cookie.fgProfile = true
            cookie.fgProtected = true
            cookie.fgDomain = accountDomain
            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }

          if ((hasLogged && isLogged) || !hasLogged) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, rootDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookie.fgProfile = true
            cookie.fgDomain = rootDomain

            if (cookie.fgProtected !== undefined) {
              delete cookie.fgProtected
              cookie.fgLogged = true
            }

            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }
        }

        if (cookie.fgProfile !== undefined) delete cookie.fgProfile
        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgAllowed = true
          cookie.fgHandled = true
          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === false) {
            cookie.fgDomain = accountDomain
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (hasLogged && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey][cookie.name] !== undefined) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgAllowed = true
          cookie.fgHandled = true
          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === false) {
            cookie.fgDomain = accountDomain
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgAllowed = true
          cookie.fgHandled = true
          cookie.fgDomain = accountDomain

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        if (cookie.fgHandled === true && cookie.fgDomain !== undefined) {
          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgAllowed = true

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        if (cookie.fgProtected === true) {
          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgHandled = true
          cookie.fgAllowed = true

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        cookie.fgAllowed = false
        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }

          if (cookie.partitionKey !== undefined) {
            details.partitionKey = cookie.partitionKey
            details2.partitionKey = cookie.partitionKey
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsg', [action, cookie.name, cookieDomain])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgAutoFlag', [action, cookie.name, cookieDomain])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          }

          if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }

          if (cookie.fgRemoved === undefined && chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, 'http://'])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
          }

          if (cookie.fgRemoved === undefined || !cookie.fgRemoved) cookie.fgNotPresent = true
          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details5 = { url: 'https://' + cookie.domain, name: cookie.name }
        const details6 = { url: 'http://' + cookie.domain, name: cookie.name }
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name }

        const detailsListTrim = [details, details2, details3, details4]
        const detailsListCookieDomain = [details5, details6, details7]

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            break
          }
        }

        if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
          ++index
          continue
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            break
          }
        }

        if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
          cookie.fgNotPresent = true
        }

        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
        ++index
      }
    }
  } else if (globalFlagEnabled) {
    for (const domainKey of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
      if (domainKey === 'fgRoot') continue

      let index = 0
      for (const cookie of cookieData[contextName][currentTab.windowId][currentTab.id][domainKey]) {
        if (cookie.fgHandled !== undefined && cookie.fgHandled === true) {
          ++index
          continue
        }

        let firstPartyIsolate = null
        if (cookie.firstPartyDomain !== undefined) {
          firstPartyIsolate = cookie.firstPartyDomain
        }

        if (cookie.fgNotPresent !== undefined) delete cookie.fgNotPresent

        let cookieDomain = domainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')
        increaseCount(contextName, currentTab, cookie.name, domainKey)

        const isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain][cookie.name] !== undefined)
        const isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain][cookie.name] !== undefined)

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain

        if (cookieDomain === rootDomain) cookie.fgRoot = true
        else if (cookie.fgRoot !== undefined) delete cookie.fgRoot

        const isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined)

        if (!isManagedCookie && cookie.fgRoot === undefined) {
          if (hasLogged && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined && data.flagCookies_logged[contextName][rootDomain][cookie.domain] !== undefined && data.flagCookies_logged[contextName][rootDomain][cookie.domain][cookie.name] !== undefined) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            delete cookie.fgLogged
            cookie.fgProtected = true
            cookie.fgDomain = accountDomain
            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }

          if (!hasLogged && hasGlobalProfile) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookie.fgProfile = true
            cookie.fgDomain = accountDomain

            if (cookie.fgProtected !== undefined) {
              delete cookie.fgProtected
              cookie.fgLogged = true
            }

            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          } else if (cookie.fgProfile !== undefined && cookie.fgProtected !== undefined) {
            delete cookie.fgProfile
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }
        }

        if (cookie.fgProfile !== undefined) delete cookie.fgProfile

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

          cookie.fgAllowed = true
          cookie.fgHandled = true
          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie.fgDomain = accountDomain
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (hasLogged && isManagedCookie) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          cookie.fgAllowed = true
          cookie.fgHandled = true

          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie.fgDomain = accountDomain
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

          cookie.fgAllowed = true
          cookie.fgHandled = true
          cookie.fgDomain = accountDomain

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        if (cookie.fgHandled === true && cookie.fgDomain !== undefined) continue
        cookie.fgAllowed = false

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }

          if (cookie.partitionKey !== undefined) {
            details.partitionKey = cookie.partitionKey
            details2.partitionKey = cookie.partitionKey
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://'])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'https://'])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          }

          if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
            ++index
            continue
          }

          if (cookie.fgRemoved === undefined && chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }
          }

          if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
            increaseRemoved(contextName, currentTab)
          }

          cookie.fgRemoved = true
          cookie.fgHandled = true
          if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
          if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain

          if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
            cookie.fgNotPresent = true
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name }
        const details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name }
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name }

        const detailsListTrim = [details, details2, details3, details4]
        const detailsListCookieDomain = [details5, details6, details7]

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            break
          }
        }

        if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
          ++index
          continue
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookie.domain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookie.domain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            break
          }
        }

        if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
          cookie.fgNotPresent = true
        }

        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
        ++index
      }
    }
  } else {
    for (const domainKey of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
      if (domainKey === 'fgRoot') continue

      let index = 0
      for (const cookie of cookieData[contextName][currentTab.windowId][currentTab.id][domainKey]) {
        let cookieDomain = domainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')
        increaseCount(contextName, currentTab, cookie.name, domainKey)

        let firstPartyIsolate = null
        if (cookie.firstPartyDomain !== undefined) {
          firstPartyIsolate = cookie.firstPartyDomain
        }

        const isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][domainKey] !== undefined && data[contextName]['http://' + cookieDomain][domainKey][cookie.name] !== undefined)
        const isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][domainKey] !== undefined && data[contextName]['https://' + cookieDomain][domainKey][cookie.name] !== undefined)

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain

        if (cookieDomain === rootDomain) cookie.fgRoot = true
        else if (cookie.fgRoot !== undefined) delete cookie.fgRoot

        if ((data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][cookieDomain] !== undefined && data.flagCookies_logged[contextName][cookieDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][cookieDomain][domainKey][cookie.name] !== undefined && data.flagCookies_logged[contextName][cookieDomain][domainKey][cookie.name] === true) || (data.flagCookies_accountMode !== undefined && data.flagCookies_accountMode[contextName] !== undefined && data.flagCookies_accountMode[contextName][rootDomain] !== undefined)) {
          if (data.flagCookies_logged !== undefined && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][cookieDomain] !== undefined) {
            cookie.fgProfile = true
            cookie.fgDomain = accountDomain
          }
        }

        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie

        const isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] !== undefined)

        if (!isManagedCookie) {
          ++index
          continue
        }

        if (!isManagedCookie && cookie.fgRoot === undefined) {
          const isEmptyProfile = (protectDomainCookies || !hasLogged)
          if (hasLogged && data.flagCookies_logged[contextName][accountDomain] !== undefined && data.flagCookies_logged[contextName][accountDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][accountDomain][domainKey][cookie.name] !== undefined) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

            delete cookie.fgLogged
            cookie.fgProtected = true
            cookie.fgDomain = accountDomain
            cookie.fgAllowed = true
            cookie.fgHandled = true
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }

          if (accountDomain !== null && hasLogged && data.flagCookies_logged[contextName][accountDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][accountDomain][domainKey][cookie.name] === true) cookie.fgProtected = true

          if (!isManagedCookie && ((cookie.fgProfile !== undefined && cookie.fgProtected === undefined) || cookie.fgProtected !== undefined)) {
            if (isEmptyProfile && cookie.fgProfile !== undefined && cookie.fgProtected === undefined) {
              if (isLogEnabled) {
                const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain])
                addToLogData(currentTab, msg, timeString, timestamp)
              }

              if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

              cookie.fgAllowed = true

              if (cookie.fgProtected !== undefined) {
                delete cookie.fgProtected
                cookie.fgLogged = true
              }

              cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
              ++index

              continue
            } else if (!isEmptyProfile && cookie.fgProfile !== undefined && cookie.fgProtected !== undefined) {
              delete cookie.fgProfile

              if (isLogEnabled) {
                const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
                addToLogData(currentTab, msg, timeString, timestamp)
              }

              if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

              cookie.fgAllowed = true
              cookie.fgHandled = true

              if (cookie.fgProtected !== undefined) {
                delete cookie.fgProtected
                cookie.fgLogged = true
              }

              cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
              ++index

              continue
            }
          }
        }

        if (cookie.fgProfile !== undefined) delete cookie.fgProfile

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

          cookie.fgAllowed = true
          cookie.fgHandled = true

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (hasLogged && data.flagCookies_logged[contextName] !== undefined && data.flagCookies_logged[contextName][rootDomain] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey] !== undefined && data.flagCookies_logged[contextName][rootDomain][domainKey][cookie.name] !== undefined) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

          cookie.fgAllowed = true
          cookie.fgHandled = true
          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)

          cookie.fgAllowed = true
          cookie.fgHandled = true
          cookie.fgDomain = accountDomain
          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        if (!isManagedCookie && accountDomain === null && hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] === undefined) {
          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          ++index
          continue
        } else if (!isManagedCookie && hasDataContext && (data[contextName][accountDomain] === undefined || data[contextName][accountDomain][domainKey] === undefined || data[contextName][accountDomain][domainKey][cookie.name] === undefined)) {
          if (cookie.fgAllowed === undefined) increasePermitted(contextName, currentTab)
          ++index
          continue
        }

        cookie.fgAllowed = false
        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }

          if (cookie.partitionKey !== undefined) {
            details.partitionKey = cookie.partitionKey
            details2.partitionKey = cookie.partitionKey
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
          }

          if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
            cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
            ++index
            continue
          }

          if (cookie.fgRemoved === undefined && chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
              increaseRemoved(contextName, currentTab)
            }

            cookie.fgRemoved = true
            cookie.fgHandled = true

            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
          }

          if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
            cookie.fgNotPresent = true
          }

          cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
          ++index
          continue
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name }
        const details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name }
        const details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name }
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name }
        const detailsListTrim = [details, details2, details3, details4]
        const detailsListCookieDomain = [details5, details6, details7]

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
              if (isLogEnabled) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }

              if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
                increaseRemoved(contextName, currentTab)
              }

              cookie.fgRemoved = true
              cookie.fgHandled = true

              if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
              cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
              break
            }
          }
        }

        if (cookie.fgRemoved !== undefined && cookie.fgRemoved) {
          ++index
          continue
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate
          }

          if (cookie.storeId !== undefined) {
            detail.storeId = contextName
          }

          if (cookie.partitionKey !== undefined) {
            detail.partitionKey = cookie.partitionKey
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][domainKey] !== undefined && data[contextName][rootDomain][domainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] === true))) {
              if (isLogEnabled) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, domainKey, modifier])
                addToLogData(currentTab, msg, timeString, timestamp)
              }

              if (cookie.fgRemoved === undefined || !cookie.fgRemoved) {
                increaseRemoved(contextName, currentTab)
              }

              cookie.fgRemoved = true
              cookie.fgHandled = true
              if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][domainKey] !== undefined && data[contextName][cookieDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = cookie.domain
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][domainKey] !== undefined && data[contextName][accountDomain][domainKey][cookie.name] !== undefined) cookie.fgRemovedDomain = accountDomain
              cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
              break
            }
          }
        }

        if (cookie.fgRemoved === undefined || !cookie.fgRemoved) cookie.fgNotPresent = true
        cookieData[contextName][currentTab.windowId][currentTab.id][domainKey][index] = cookie
        ++index
      }
    }
  }

  setMouseOverTitle(contextName, currentTab)
}

// --------------------------------------------------------------------------------------------------------------------------------
async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status !== undefined && changeInfo.status === 'loading') {
    if (openTabData[tab.windowId] === undefined || openTabData[tab.windowId][tabId] === undefined || openTabData[tab.windowId][tabId][0] === undefined) {
      if (useChrome) chrome.action.disable(tabId)
      else browser.action.disable(tabId)
      resetCookieInformation(tab)
    } else {
      if (useChrome) chrome.action.enable(tabId)
      else browser.action.enable(tabId)
    }

    clearCookiesWrapper(getMsg('ActionDocumentLoad'), null, tab)
    return
  }

  if (changeInfo.status !== undefined && changeInfo.status === 'complete') {
    if (useChrome) chrome.action.enable(tabId)
    else browser.action.enable(tabId)

    let domainKey = ''
    const urlMatch = tab.url.match(/^(http:|https:)\/\/.[^/]*/i)
    if (urlMatch !== null) domainKey = urlMatch[0]
    else domainKey = tab.url

    let contextName = 'default'
    if (tab.cookieStoreId !== undefined) {
      contextName = tab.cookieStoreId
    }

    if (openTabData[tab.windowId] !== undefined && openTabData[tab.windowId][tabId] !== undefined && openTabData[tab.windowId][tabId][0] !== undefined && openTabData[tab.windowId][tabId][0].u !== domainKey) {
      delete cookieData[contextName][openTabData[tab.windowId][tabId][0].u]

      if (removedData[tab.windowId] === undefined) removedData[tab.windowId] = {}
      removedData[tab.windowId][tabId] = 0

      if (permittedData[tab.windowId] === undefined) permittedData[tab.windowId] = {}
      permittedData[tab.windowId][tabId] = 0

      if (cookieCount[contextName] === undefined) cookieCount[contextName] = {}
      cookieCount[contextName][tab.windowId][tabId].count = 0
      cookieCount[contextName][tab.windowId][tabId].domains = {}

      removeTabIdfromDataList(tabId, { windowId: tab.windowId })
    }

    addTabURLtoDataList(tab, { url: domainKey, frameId: 0, parentFrameId: -1, type: 'main_frame' }, domainKey)

    if (useChrome) chrome.action.enable(tabId)
    else browser.action.enable(tabId)

    setMouseOverTitle(contextName, tab)
    setBrowserActionIcon(contextName, domainKey, tabId)

    if (removedData[contextName] !== undefined && removedData[contextName][tab.windowId] !== undefined && removedData[contextName][tab.windowId][tabId] !== undefined) {
      const countStr = removedData[contextName][tab.windowId][tabId].toString()
      if (countStr !== '0') {
        const strippedDomainURL = domainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')

        if (useChrome) {
          const data = await chrome.storage.local.get('flagCookies_notifications')
          if (data.flagCookies_notifications !== undefined && data.flagCookies_notifications === true) {
            chrome.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [countStr, strippedDomainURL, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/fc128.png' })
          }

          return
        }

        const data = await browser.storage.local.get('flagCookies_notifications')
        if (data.flagCookies_notifications !== undefined && data.flagCookies_notifications === true) {
          browser.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [countStr, strippedDomainURL, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/fc128.png' })
        }
      }
    }

    const activeTabUrl = tab.url.toLowerCase()
    if (activeTabUrl.startsWith('chrome:') || activeTabUrl.startsWith('about:') || activeTabUrl.startsWith('edge:')) {
      return
    }

    if (useChrome) {
      chrome.tabs.sendMessage(tabId, { getStorageData: true })
      return
    }

    browser.tabs.sendMessage(tabId, { getStorageData: true })
  }
}

function clearCookiesOnLeave (tabId, moveInfo) {
  if (moveInfo !== null) {
    if (openTabData[moveInfo.windowId] !== undefined && openTabData[moveInfo.windowId][tabId] !== undefined) {
      const domainData = openTabData[moveInfo.windowId][tabId]

      if (domainData[0] !== undefined) {
        const contextName = domainData[0].s
        const cookieDetails = { storeId: contextName, domain: domainData[0].d, url: domainData[0].u }
        const currentTab = { cookieStoreId: contextName, url: domainData[0].u, windowId: moveInfo.windowId, id: tabId }
        clearCookiesWrapper(getMsg('ActionTabClose'), cookieDetails, currentTab)
      }
    }

    removeTabIdfromDataList(tabId, moveInfo)
  }
}

async function setBrowserActionIcon (contextName, tabDomain, tabId) {
  if (useChrome) {
    if (await chrome.tabs.get(tabId) === undefined) {
      return
    }
  } else if (await browser.tabs.get(tabId) === undefined) {
    return
  }

  let data = null
  if (useChrome) {
    data = await chrome.storage.local.get('flagCookies_accountMode')
  } else {
    data = await browser.storage.local.get('flagCookies_accountMode')
  }

  const inAccountMode = data.flagCookies_accountMode !== undefined && data.flagCookies_accountMode[contextName] !== undefined && data.flagCookies_accountMode[contextName][tabDomain] !== undefined

  if (inAccountMode) {
    if (useChrome) {
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/fc16p.png',
          48: 'icons/fc48p.png',
          128: 'icons/fc128p.png'
        }
      })

      return
    }

    browser.action.setIcon({
      tabId,
      path: {
        48: 'icons/flagcookies_profil_icon.svg',
        64: 'icons/flagcookies_profil_icon.svg',
        96: 'icons/flagcookies_profil_icon.svg',
        128: 'icons/flagcookies_profil_icon.svg'
      }
    })

    return
  }

  if (useChrome) {
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/fc16.png',
        48: 'icons/fc48.png',
        128: 'icons/fc128.png'
      }
    })

    return
  }

  browser.action.setIcon({
    tabId,
    path: {
      48: 'icons/flagcookies_icon.svg',
      64: 'icons/flagcookies_icon.svg',
      96: 'icons/flagcookies_icon.svg',
      128: 'icons/flagcookies_icon.svg'
    }
  })
}
// --------------------------------------------------------------------------------------------------------------------------------
// Log info
function clearDomainLog (currentTab, details) {
  let contextName = 'default'
  if (currentTab.cookieStoreId !== undefined) {
    contextName = currentTab.cookieStoreId
  }

  if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
    for (let x = 0; x < logData[contextName][currentTab.windowId][currentTab.id].length; ++x) {
      if (logTime[contextName][currentTab.windowId][currentTab.id][x] < details.timeStamp - 5000) {
        logTime[contextName][currentTab.windowId][currentTab.id].splice(x, 1)
        logData[contextName][currentTab.windowId][currentTab.id].splice(x, 1)
        --x
      }
    }

    if (logTime[contextName][currentTab.windowId][currentTab.id].length === 0) {
      delete logData[contextName][currentTab.windowId][currentTab.id]
      if (Object.keys(logData[contextName][currentTab.windowId]).length === 0) delete logData[contextName][currentTab.windowId]
    }
  }
}

function addToLogData (currentTab, msg, timeString, timestamp) {
  let contextName = 'default'
  if (currentTab.cookieStoreId !== undefined) contextName = currentTab.cookieStoreId

  if (logData[contextName] === undefined) logData[contextName] = {}
  if (logData[contextName][currentTab.windowId] === undefined) logData[contextName][currentTab.windowId] = {}
  if (logData[contextName][currentTab.windowId][currentTab.id] === undefined) logData[contextName][currentTab.windowId][currentTab.id] = []

  if (logTime[contextName] === undefined) logTime[contextName] = {}
  if (logTime[contextName][currentTab.windowId] === undefined) logTime[contextName][currentTab.windowId] = {}
  if (logTime[contextName][currentTab.windowId][currentTab.id] === undefined) logTime[contextName][currentTab.windowId][currentTab.id] = []

  msg = '[' + timeString + ']  ' + msg
  if (logData[contextName][currentTab.windowId][currentTab.id].indexOf(msg) === -1) {
    logData[contextName][currentTab.windowId][currentTab.id].push(msg)
    logTime[contextName][currentTab.windowId][currentTab.id].push(timestamp)
  }
}

async function onCookieChanged (changeInfo) {
  const cookieDetails = changeInfo.cookie
  const cookieDomain = cookieDetails.domain.replace(/^(http:|https:)\/\//i, '')

  let currentTab = null
  const tmpDomain = cookieDomain.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '')

  for (const windowId of Object.keys(openTabData)) {
    for (const tabId of Object.keys(openTabData[windowId])) {
      for (const domainName of Object.keys(openTabData[windowId][tabId])) {
        if (openTabData[windowId][tabId][domainName].d === tmpDomain || openTabData[windowId][tabId][domainName].d.endsWith(tmpDomain)) {
          if (useChrome) {
            currentTab = await chrome.tabs.get(parseInt(tabId))
          } else {
            currentTab = await browser.tabs.get(parseInt(tabId))
          }

          break
        }
      }

      if (currentTab !== null) {
        break
      }
    }

    if (currentTab !== null) {
      break
    }
  }

  if (currentTab === null) {
    return
  }

  const details = { url: currentTab.url }

  let contextName = 'default'
  if (currentTab.cookieStoreId !== undefined) {
    contextName = currentTab.cookieStoreId
  }

  if (cookieData[contextName] === undefined) cookieData[contextName] = {}
  if (cookieData[contextName][currentTab.windowId] === undefined) cookieData[contextName][currentTab.windowId] = {}
  if (cookieData[contextName][currentTab.windowId][currentTab.id] === undefined) cookieData[contextName][currentTab.windowId][currentTab.id] = {}

  let foundCookie = false
  let updatedCookie = {}

  for (const domain of Object.keys(cookieData[contextName][currentTab.windowId][currentTab.id])) {
    let index = 0
    foundCookie = false

    for (const cookie of cookieData[contextName][currentTab.windowId][currentTab.id][domain]) {
      if (cookieDetails.name === cookie.name && cookieDetails.domain === cookie.domain) {
        if (cookie.fgProfile !== undefined) delete cookie.fgProfile
        if (cookie.fgProtected !== undefined) delete cookie.fgProtected
        if (cookie.fgDomain !== undefined) delete cookie.fgDomain
        if (cookie.fgLogged !== undefined) delete cookie.fgLogged
        if (cookie.fgHandled !== undefined) delete cookie.fgHandled
        // if (cookie.fgRemoved !== undefined) delete cookie.fgRemoved
        // if (cookie.fgAllowed !== undefined) delete cookie.fgAllowed
        // if (cookie.fgNotPresent !== undefined) delete cookie.fgNotPresent

        for (const key of Object.keys(cookie)) {
          updatedCookie[key] = cookie[key]
        }

        for (const key of Object.keys(cookieDetails)) {
          updatedCookie[key] = cookieDetails[key]
        }

        cookieData[contextName][currentTab.windowId][currentTab.id][domain][index] = updatedCookie
        foundCookie = true
        break
      }

      ++index
    }

    if (foundCookie) {
      break
    }
  }


  if (!foundCookie) {
    for (const key of Object.keys(cookieDetails)) {
      switch (key) {
        case 'name':
        case 'value':
        case 'domain':
        case 'path':
        case 'secure':
        case 'expirationDate':
        case 'firstPartyDomain':
        case 'partitionKey':
          // case 'storeId':
          updatedCookie[key] = cookieDetails[key]
          continue
        default:
          continue
      }
    }

    updatedCookie.fgHandled = false

    if (cookieData[contextName][currentTab.windowId][currentTab.id][cookieDomain] === undefined) {
      cookieData[contextName][currentTab.windowId][currentTab.id][cookieDomain] = []
    }

    cookieData[contextName][currentTab.windowId][currentTab.id][cookieDomain].push(updatedCookie)
    addTabURLtoDataList(currentTab, details, cookieDomain)
  }

  clearCookiesWrapper(getMsg('ActionCookieChange'), updatedCookie, currentTab)
}

async function onContextRemoved (changeInfo) {
  const contextName = changeInfo.contextualIdentity.name
  const data = await browser.storage.local.get()

  if (data[contextName] !== undefined) {
    delete data[contextName]
    browser.storage.local.remove(contextName)
  }

  if (data.flagCookies !== undefined) {
    if (Object.keys(data.flagCookies).length === 0) {
      delete data.flagCookies
      browser.storage.local.remove('flagCookies')
    }
  }

  if (data.flagCookies_flagGlobal !== undefined) {
    if (data.flagCookies_flagGlobal !== undefined && data.flagCookies_flagGlobal[contextName] !== undefined) {
      delete data.flagCookies_flagGlobal[contextName]
    }

    if (Object.keys(data.flagCookies_flagGlobal).length === 0) {
      delete data.flagCookies_flagGlobal
      browser.storage.local.remove('flagCookies_flagGlobal')
    }
  }

  browser.storage.local.set(data)

  if (logData[contextName] !== undefined) delete logData[contextName]
  if (logTime[contextName] !== undefined) delete logTime[contextName]
}

// --------------------------------------------------------------------------------------------------------------------------------
function addTabURLtoDataList (tab, details, domain) {
  const urlLower = details.url.toLowerCase()
  if (!urlLower.startsWith('chrome:') && !urlLower.startsWith('about:') && !urlLower.startsWith('edge:')) {
    const tabWindowId = tab.windowId
    const tabTabId = tab.id

    if (openTabData[tabWindowId] === undefined) openTabData[tabWindowId] = {}
    if (openTabData[tabWindowId][tabTabId] === undefined) openTabData[tabWindowId][tabTabId] = {}

    const rootDomain = domain.replace(/^(http:|https:)\/\//i, '')
    const requestURL = details.url.match(/^(http:|https:)\/\/.[^/]*/i)[0]

    const frameId = details.frameId
    const parentFrameId = details.parentFrameId
    const requestType = details.type

    if (frameId === 0 && parentFrameId === -1 && requestType === 'main_frame') {
      let contextName = 'default'
      if (tab.cookieStoreId !== undefined) {
        contextName = tab.cookieStoreId
      }

      if (openTabData[tabWindowId][tabTabId][0] === undefined) {
        if (removedData[contextName] === undefined) removedData[contextName] = {}
        if (removedData[contextName][tabWindowId] === undefined) removedData[contextName][tabWindowId] = {}
        removedData[contextName][tabWindowId][tabTabId] = 0

        if (permittedData[contextName] === undefined) permittedData[contextName] = {}
        if (permittedData[contextName][tabWindowId] === undefined) permittedData[contextName][tabWindowId] = {}
        permittedData[contextName][tabWindowId][tabTabId] = 0

        if (cookieCount[contextName] === undefined) cookieCount[contextName] = {}
        if (cookieCount[contextName][tabWindowId] === undefined) cookieCount[contextName][tabWindowId] = {}
        cookieCount[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} }

        openTabData[tabWindowId][tabTabId][0] = { s: contextName, u: requestURL, d: rootDomain }
      }

      return
    }

    for (const tabId of Object.keys(openTabData[tabWindowId][tabTabId])) {
      if (openTabData[tabWindowId][tabTabId][tabId].d === rootDomain) {
        return
      }
    }

    let cnt = Object.keys(openTabData[tabWindowId][tabTabId]).length
    if (openTabData[tabWindowId][tabTabId][0] === undefined) {
      ++cnt
    }

    openTabData[tabWindowId][tabTabId][cnt] = { d: rootDomain }
  }
}

async function removeTabIdfromDataList (tabId, removeInfo) {
  if (removeInfo === undefined) return
  if (openTabData[removeInfo.windowId] !== undefined && openTabData[removeInfo.windowId][tabId] !== undefined) {
    const domainData = openTabData[removeInfo.windowId][tabId]
    if (domainData[0] === undefined) return
    const rootDomain = domainData[0].u
    const contextName = domainData[0].s

    if (cookieData[contextName] !== undefined && cookieData[contextName][removeInfo.windowId] !== undefined && cookieData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete cookieData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(cookieData[contextName][removeInfo.windowId]).length === 0) {
        delete cookieData[contextName][removeInfo.windowId]
      }

      if (Object.keys(cookieData[contextName]).length === 0) {
        delete cookieData[contextName]
      }
    }

    if (removedData[contextName] !== undefined && removedData[contextName][removeInfo.windowId] !== undefined && removedData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete removedData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(removedData[contextName][removeInfo.windowId]).length === 0) {
        delete removedData[contextName][removeInfo.windowId]

        if (Object.keys(removedData[contextName]).length === 0) {
          delete removedData[contextName]
        }
      }
    }

    if (permittedData[contextName] !== undefined && permittedData[contextName][removeInfo.windowId] !== undefined && permittedData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete permittedData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(permittedData[contextName][removeInfo.windowId]).length === 0) {
        delete permittedData[contextName][removeInfo.windowId]

        if (Object.keys(permittedData[contextName]).length === 0) {
          delete permittedData[contextName]
        }
      }
    }

    if (localStorageData[contextName] !== undefined && localStorageData[contextName][removeInfo.windowId] !== undefined && localStorageData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete localStorageData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(localStorageData[contextName][removeInfo.windowId]).length === 0) {
        delete localStorageData[contextName][removeInfo.windowId]

        if (Object.keys(localStorageData[contextName]).length === 0) {
          delete localStorageData[contextName]
        }
      }
    }

    if (sessionStorageData[contextName] !== undefined && sessionStorageData[contextName][removeInfo.windowId] !== undefined && sessionStorageData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete sessionStorageData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(sessionStorageData[contextName][removeInfo.windowId]).length === 0) {
        delete sessionStorageData[contextName][removeInfo.windowId]

        if (Object.keys(sessionStorageData[contextName]).length === 0) {
          delete sessionStorageData[contextName]
        }
      }
    }

    if (cookieCount[contextName] !== undefined && cookieCount[contextName][removeInfo.windowId] !== undefined && cookieCount[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete cookieCount[contextName][removeInfo.windowId][removeInfo.id]

      if (Object.keys(cookieCount[contextName][removeInfo.windowId]).length === 0) {
        delete cookieCount[contextName][removeInfo.windowId]

        if (Object.keys(cookieCount[contextName]).length === 0) {
          delete cookieCount[contextName]
        }
      }
    }

    if (logData[contextName] !== undefined && logData[contextName][removeInfo.windowId] !== undefined && logData[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete logData[contextName][removeInfo.windowId][tabId]

      if (Object.keys(logData[contextName][removeInfo.windowId]).length === 0) {
        delete logData[contextName][removeInfo.windowId]

        if (Object.keys(logData[contextName]).length === 0) delete logData[contextName]
      }
    }

    if (logTime[contextName] !== undefined && logTime[contextName][removeInfo.windowId] !== undefined && logTime[contextName][removeInfo.windowId][tabId] !== undefined) {
      delete logTime[contextName][removeInfo.windowId][tabId]

      if (Object.keys(logTime[contextName][removeInfo.windowId]).length === 0) {
        delete logTime[contextName][removeInfo.windowId]

        if (Object.keys(logTime[contextName]).length === 0) delete logTime[contextName]
      }
    }

    let data = null
    if (useChrome) {
      data = await chrome.storage.local.get()
    } else {
      data = await browser.storage.local.get()
    }

    if (data[contextName] !== undefined) {
      if (data[contextName][rootDomain] !== undefined && Object.keys(data[contextName][rootDomain]).length === 0) {
        delete data[contextName][rootDomain]
      }

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) {
          await chrome.storage.local.remove(contextName)
        } else {
          await browser.storage.local.remove(contextName)
        }

        delete data[contextName]
      }

      if (useChrome) {
        await chrome.storage.local.set(data)
      } else {
        await browser.storage.local.set(data)
      }
    }
  }

  if (openTabData[removeInfo.windowId] !== undefined && openTabData[removeInfo.windowId][tabId] !== undefined) {
    delete openTabData[removeInfo.windowId][tabId]

    if (Object.keys(openTabData[removeInfo.windowId]).length === 0) {
      delete openTabData[removeInfo.windowId]
    }
  }
}

async function clearCookiesOnRequest (details) {
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    let sourceDomain = null
    switch (details.type) {
      case 'xmlhttprequest':
        if (details.originUrl !== undefined) {
          sourceDomain = details.originUrl
        } else {
          sourceDomain = details.url
        }
        break
      case 'outermost_frame':
      case 'main_frame':
      case 'sub_frame':
        sourceDomain = details.url
        break
      default:
        break
    }

    let currentTab = null
    let data = null

    if (useChrome) {
      currentTab = await chrome.tabs.get(details.tabId)
      data = await chrome.storage.local.get()
    } else {
      currentTab = await browser.tabs.get(details.tabId)
      data = await browser.storage.local.get()
    }

    let domainURL = ''
    const urlMatch = sourceDomain.match(/^(http:|https:)\/\/.[^/]*/i)
    if (urlMatch !== null) domainURL = urlMatch[0]
    else domainURL = sourceDomain

    let contextName = 'default'

    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      if (currentTab.cookieStoreId !== undefined) contextName = currentTab.cookieStoreId

      if (openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && openTabData[currentTab.windowId][currentTab.id][0] !== undefined) {
        openTabData[currentTab.windowId][currentTab.id] = {}
        if (cookieData[contextName] === undefined) cookieData[contextName] = {}
        if (cookieData[contextName][currentTab.windowId] === undefined) cookieData[contextName][currentTab.windowId] = {}
        if (cookieData[contextName][currentTab.windowId][currentTab.id] === undefined) cookieData[contextName][currentTab.windowId][currentTab.id] = {}
        if (cookieData[contextName][currentTab.windowId][currentTab.id][domainURL] === undefined) cookieData[contextName][currentTab.windowId][currentTab.id] = {}
        cookieData[contextName][currentTab.windowId][currentTab.id].fgRoot = domainURL
      } else {
        if (cookieData[contextName] === undefined) cookieData[contextName] = {}
        if (cookieData[contextName][currentTab.windowId] === undefined) cookieData[contextName][currentTab.windowId] = {}
        if (cookieData[contextName][currentTab.windowId][currentTab.id] === undefined) cookieData[contextName][currentTab.windowId][currentTab.id] = {}
        cookieData[contextName][currentTab.windowId][currentTab.id].fgRoot = domainURL

        if (removedData[contextName] === undefined) removedData[contextName] = {}
        if (removedData[contextName][currentTab.windowId] === undefined) removedData[contextName][currentTab.windowId] = {}
        removedData[contextName][currentTab.windowId][currentTab.id] = 0

        if (permittedData[contextName] === undefined) permittedData[contextName] = {}
        if (permittedData[contextName][currentTab.windowId] === undefined) permittedData[contextName][currentTab.windowId] = {}
        permittedData[contextName][currentTab.windowId][currentTab.id] = 0

        if (cookieCount[contextName] === undefined) cookieCount[contextName] = {}
        if (cookieCount[contextName][currentTab.windowId] === undefined) cookieCount[contextName][currentTab.windowId] = {}
        if (cookieCount[contextName][currentTab.windowId][currentTab.id] === undefined) {
          cookieCount[contextName][currentTab.windowId][currentTab.id] = { count: 0, cookies: [] }
        }
      }

      if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
        clearDomainLog(currentTab, details)
      }
    }

    addTabURLtoDataList(currentTab, details, domainURL)
    const domainWWW = 'http://www.' + domainURL
    const domainWWW2 = 'https://www.' + domainURL

    // TODO: If in any case we need the first party domain, this will be the place to define that, instead of passing "null" by default
    let firstPartyIsolate = null

    if (details !== null && details.firstPartyDomain !== undefined) {
      firstPartyIsolate = details.firstPartyDomain
    }

    let cookieList = []

    if (!useChrome) {
      const cookiesBase = await browser.cookies.getAll({ domain: domainURL, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookiesURL = await browser.cookies.getAll({ url: domainURL, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookiesSec = await browser.cookies.getAll({ domain: domainURL, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookies2 = await browser.cookies.getAll({ domain: domainURL.replace(/^(http:|https:)\/\//i, '.'), firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookiesSec2 = await browser.cookies.getAll({ domain: domainURL.replace(/^(http:|https:)\/\//i, '.'), secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookies3 = await browser.cookies.getAll({ domain: domainWWW, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookiesSec3 = await browser.cookies.getAll({ domain: domainWWW, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookies4 = await browser.cookies.getAll({ domain: domainWWW2, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      const cookiesSec4 = await browser.cookies.getAll({ domain: domainWWW2, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName })
      cookieList = [cookiesBase, cookiesURL, cookiesSec, cookies2, cookiesSec2, cookies3, cookiesSec3, cookies4, cookiesSec4]
    } else {
      const domainSplit = domainURL.split('.')
      const targetDomain = domainSplit.splice(domainSplit.length - 2, 2).join('.')

      const cookiesBase = await chrome.cookies.getAll({ domain: domainURL })
      const cookiesURL = await chrome.cookies.getAll({ url: currentTab.url })
      const cookiesRoot = await chrome.cookies.getAll({ domain: targetDomain })
      const cookiesRootDot = await chrome.cookies.getAll({ domain: '.' + targetDomain })
      cookieList = [cookiesBase, cookiesURL, cookiesRoot, cookiesRootDot]

      if (openTabData !== undefined && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.tabId] !== undefined) {
        for (const tab of Object.keys(openTabData[currentTab.windowId][currentTab.id])) {
          const targetURL = openTabData[currentTab.windowId][currentTab.id][tab].d
          cookieList.push(await chrome.cookies.getAll({ domain: targetURL }))
        }
      }
    }

    const cookies = []
    for (const list of cookieList) {
      for (const cookie of list) {
        let hasCookie = false

        for (const cookieEntry of cookies) {
          if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
            hasCookie = true
            break
          }
        }

        if (!hasCookie) {
          for (const key of Object.keys(cookie)) {
            if (key.startsWith('fg')) {
              continue
            }

            switch (key) {
              case 'name':
              case 'value':
              case 'domain':
              case 'path':
              case 'secure':
              case 'expirationDate':
              case 'firstPartyDomain':
              case 'partitionKey':
                // case 'storeId':
                continue
              default:
                delete cookie[key]
                continue
            }
          }

          cookies.push(cookie)
        }
      }
    }

    let typeOfRequest = ''
    switch (details.type) {
      case 'xmlhttprequest':
        typeOfRequest = getMsg('ActionJavascriptRequest')
        break
      case 'main_frame':
      case 'sub_frame':
      default:
        typeOfRequest = getMsg('ActionDocumentLoad')
        break
    }

    clearCookiesAction(typeOfRequest, data, cookies, currentTab)
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Import settings
const doImportOverwrite = false

// Called in frontend/UI
function importSettings (evt) {
  if (evt.target.files[0] === undefined) return

  const file = evt.target.files[0]

  JSZip.loadAsync(file).then(function (zip) {
    if (zip.files['flagCookieSettings.json'] === undefined) return

    zip.files['flagCookieSettings.json'].async('string').then(async function (stringData) {
      const data = JSON.parse(stringData)

      if (doImportOverwrite) {
        if (!useChrome) browser.storage.local.set(data)
        else chrome.storage.local.set(data)
        return
      }

      if (!useChrome) {
        const existingData = await browser.storage.local.get()
        browser.storage.local.set(mergeData(existingData, data))
        return
      }

      chrome.storage.local.get(null, function (existingData) {
        chrome.storage.local.set(mergeData(existingData, data))
      })
    })
  })
}

// --------------------------------------------------------------------------------------------------------------------------------

function mergeData (existingData, data) {
  const flagCookieSettings = ['flagCookies_logged', 'flagCookies_flagGlobal', 'flagCookies_autoflag', 'flagCookies_notifications', 'flagCookies_darkTheme']
  for (const key of Object.keys(data)) {
    if (flagCookieSettings.indexOf(key) === -1) {
      if (existingData[key] === undefined) existingData[key] = data[key]
      else {
        for (const domain of Object.keys(data[key])) {
          if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          else {
            for (const setDomain of Object.keys(data[key][domain])) {
              if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
              else {
                for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                  if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey]
                }
              }
            }
          }
        }
      }
    } else {
      if (key === 'flagCookies_logged') {
        if (existingData[key] === undefined) existingData[key] = data[key]
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
            else {
              for (const setDomain of Object.keys(data[key][domain])) {
                if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
                else {
                  for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                    if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey]
                  }
                }
              }
            }
          }
        }
      } else if (key === 'flagCookies_autoFlag') {
        if (existingData[key] === undefined) existingData[key] = data[key]
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          }
        }
      } else if ((key === 'flagCookies_flagGlobal' || key === 'flagCookies_notifications' || key === 'flagCookies_darkTheme')) existingData[key] = data[key]
    }
  }

  return existingData
}

function onInstallNotification (details) {
  let installType = ''

  switch (details.reason) {
    case 'update':
      installType = getMsg('UpdatedInstallationString')
      break
    case 'install':
    default:
      installType = getMsg('NewInstallationString')
      break
  }
  if (useChrome) {
    chrome.notifications.create('installedAddonMessage', { type: 'basic', message: getMsg('InstalledAddonMessage'), title: getMsg('InstalledAddonMessageTitle', installType), iconUrl: 'icons/fc128.png' })
  } else {
    browser.notifications.create('installedAddonMessage', { type: 'basic', message: getMsg('InstalledAddonMessage'), title: getMsg('InstalledAddonMessageTitle', installType), iconUrl: 'icons/fc128.png' })
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave)
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  chrome.tabs.onActivated.addListener(handleTabChange)
  chrome.runtime.onMessage.addListener(handleMessage)
  chrome.cookies.onChanged.addListener(onCookieChanged)
  chrome.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] })
  chrome.runtime.onInstalled.addListener(onInstallNotification)
  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' })
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.tabs.onActivated.addListener(handleTabChange)
  browser.runtime.onMessage.addListener(handleMessage)
  browser.cookies.onChanged.addListener(onCookieChanged)
  browser.contextualIdentities.onRemoved.addListener(onContextRemoved)
  browser.windows.onRemoved.addListener(removeTabIdfromDataList)
  browser.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] })
  browser.runtime.onInstalled.addListener(onInstallNotification)
  browser.action.setBadgeBackgroundColor({ color: '#FF0000' })
  browser.action.setBadgeTextColor({ color: '#FFFFFF' })
}
