'use strict'

let logData = {} // The log data we seen as a report to the settings view
let logTime = {}
let cookieData = {} // Storage for cookie shadow, for the interface only!
let contextName = 'default'
// Chrome
let useChrome = typeof (browser) === 'undefined'
let hasConsole = typeof (console) !== 'undefined'

// Localization
let getMsg = useChrome ? getChromeMessage : getFirefoxMessage

function getChromeMessage (messageName, params) {
  if (params !== undefined) return chrome.i18n.getMessage(messageName, params)
  return chrome.i18n.getMessage(messageName)
}

function getFirefoxMessage (messageName, params) {
  if (params !== undefined) return browser.i18n.getMessage(messageName, params)
  return browser.i18n.getMessage(messageName)
}

// Chrome helpers
function checkChromeHadNoErrors () {
  if (chrome.runtime.lastError !== undefined) {
    if (hasConsole) {
      if (chrome.runtime.lastError.message !== undefined) {
        console.log(chrome.runtime.lastError)
        console.log(getMsg('BrowserErrorChromeDetail', chrome.runtime.lastError.message))
      } else {
        console.log(getMsg('BrowserErrorNeutral'))
      }
    }

    void chrome.runtime.lastError

    return false
  }

  return true
}

function setChromeStorage (data) {
  chrome.storage.local.set(data, function () {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) {
        console.log(getMsg('BrowserUpdateStorageData'))
      }
    } else if (hasConsole) {
      console.log(getMsg('BrowserUpdateStorageDataError'))
    }
  })
}

function chromeGetStorageAndClearCookies (action, data, cookies, domainURL, currentTab, count) {
  if (currentTab === undefined || openTabData === undefined || openTabData[currentTab.windowId] === undefined || openTabData[currentTab.windowId][currentTab.id] === undefined) return

  if (data === null) {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab) })
  } else if (cookies === null || (count !== undefined && count < Object.keys(openTabData[currentTab.windowId][currentTab.id]).length - 1)) {
    if (cookies === null) cookies = []

    if (count === undefined) count = 0

    if (openTabData[currentTab.windowId][currentTab.id][count] !== undefined && openTabData[currentTab.windowId][currentTab.id][count]['d'] !== undefined) {
      let targetURL = openTabData[currentTab.windowId][currentTab.id][count]['d'].replace(/(http|https):\/\//, '').replace('www.', '')
      chrome.cookies.getAll({ 'domain': targetURL }, function (cookiesSub) {
        ++count
        for (let cookie of cookiesSub) {
          cookies.push(cookie)
        }

        let contextName = 'default'

        let hasDataContext = data[contextName] !== undefined && data[contextName][domainURL] !== undefined

        if (cookieData[contextName] !== undefined && cookieData[contextName][domainURL] !== undefined) {
          let entries = cookieData[contextName][domainURL].length
          for (let i = 0; i < entries; ++i) {
            let isLeftOverCookie = true
            let cookieEntry = cookieData[contextName][domainURL][i]
            if (hasDataContext && data[contextName][domainURL][cookieEntry.domain] !== undefined && data[contextName][domainURL][cookieEntry.domain][cookieEntry.name] !== undefined) continue

            for (let cookie of cookies) {
              if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
                isLeftOverCookie = false
                break
              }
            }

            if (isLeftOverCookie) {
              cookieData[contextName][domainURL].splice(i, 1)
              --i
              --entries
            }
          }

          if (Object.keys(cookieData[contextName]).length === 0) delete cookieData[contextName]
        }

        clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default', count)
      })
    } else {
      chrome.cookies.getAll({ 'url': currentTab.url }, function (cookiesSub) {
        checkChromeHadNoErrors()
        ++count

        for (let cookie of cookiesSub) {
          cookies.push(cookie)
        }

        let contextName = 'default'

        let hasDataContext = data[contextName] !== undefined && data[contextName][domainURL] !== undefined

        if (cookieData[contextName] !== undefined && cookieData[contextName][domainURL] !== undefined) {
          let entries = cookieData[contextName][domainURL].length
          for (let i = 0; i < entries; ++i) {
            let isLeftOverCookie = true
            let cookieEntry = cookieData[contextName][domainURL][i]
            if (hasDataContext && data[contextName][domainURL][cookieEntry.domain] !== undefined && data[contextName][domainURL][cookieEntry.domain][cookieEntry.name] !== undefined) continue

            for (let cookie of cookies) {
              if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
                isLeftOverCookie = false
                break
              }
            }

            if (isLeftOverCookie) {
              cookieData[contextName][domainURL].splice(i, 1)
              --i
              --entries
            }
          }

          if (Object.keys(cookieData[contextName]).length === 0) delete cookieData[contextName]
        }

        clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default', count)
      })
    }
  }
}

function getChromeStorageForFunc3 (func, par1, par2, par3) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log(getMsg('BrowserRetriveStorageData'))

      func(data, par1, par2, par3)
    } else if (hasConsole) {
      console.log(getMsg('BrowserRetriveStorageDataError'))
    }
  })
}

async function getDomainURLFirefox () {
  let tab = await getActiveTabFirefox()
  if (tab !== null) {
    if (tab.url !== undefined) {
      let urlMatch = tab.url.match(/(http|https):\/\/.[^/]*/)
      if (urlMatch !== null) return urlMatch[0]
      else return tab.url.replace('www.', '')
    }
  }

  return ''
}

async function getActiveTabFirefox () {
  let activeTabs = await browser.tabs.query({ currentWindow: true, active: true })
  if (activeTabs.length !== 0) {
    return activeTabs.pop()
  }

  return null
}

function getChromeActiveTabForClearing (action) {
  chrome.tabs.query({ active: true }, function (activeTabs) {
    if (!checkChromeHadNoErrors()) return
    if (activeTabs.length !== 0) {
      let tab = activeTabs.pop()
      if (tab.url !== undefined) {
        let urlMatch = tab.url.match(/(http|https):\/\/.[^/]*/)
        if (urlMatch !== null) {
          let domainURL = urlMatch[0].replace('www.', '')
          chromeGetStorageAndClearCookies(action, null, null, domainURL, tab)
        }
      }
    }
  })
}

// Chrome + Firefox
function firefoxOnGetContextSuccess (context) {
  contextName = context.name
}

function firefoxOnGetContextError (e) {
  if (hasConsole) {
    // console.log('Firefox getContext profile error: ')
    // console.log(e)
  }

  contextName = 'default'
}

async function clearCookiesWrapper (action) {
  if (useChrome) {
    getChromeActiveTabForClearing(action)
    return
  }

  let domainURL = await getDomainURLFirefox()
  if (domainURL === '') return
  let currentTab = await browser.tabs.getCurrent()
  if (currentTab === undefined) return

  let data = await browser.storage.local.get()

  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  let domainSplit = domainURL.split('.')
  let domain = domainSplit.splice(domainSplit.length - 2, 2).join('.')

  let cookies = []
  let cookiesBase
  let cookiesURL = []
  let cookiesURL2 = []
  let cookiesSec = []
  let cookies2 = []
  let cookiesSec2 = []
  let cookies3 = []
  let cookiesSec3 = []
  let cookies4 = []
  let cookiesSec4 = []

  let domainWWW = 'http://www.' + domain.replace(/(http|https):\/\//, '')
  let domainWWW2 = 'https://www.' + domain.replace(/(http|https):\/\//, '')

  if (currentTab.cookieStoreId !== undefined) {
    cookiesBase = await browser.cookies.getAll({ domain: domain, storeId: currentTab.cookieStoreId })
    cookiesURL = await browser.cookies.getAll({ url: domainURL, storeId: currentTab.cookieStoreId })
    cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:'), storeId: currentTab.cookieStoreId })
    cookiesSec = await browser.cookies.getAll({ domain: domain, secure: true, storeId: currentTab.cookieStoreId })
    cookies2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), storeId: currentTab.cookieStoreId })
    cookiesSec2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true, storeId: currentTab.cookieStoreId })
    cookies3 = await browser.cookies.getAll({ domain: domainWWW, storeId: currentTab.cookieStoreId })
    cookiesSec3 = await browser.cookies.getAll({ domain: domainWWW, secure: true, storeId: currentTab.cookieStoreId })
    cookies4 = await browser.cookies.getAll({ domain: domainWWW2, storeId: currentTab.cookieStoreId })
    cookiesSec4 = await browser.cookies.getAll({ domain: domainWWW2, secure: true, storeId: currentTab.cookieStoreId })
  } else {
    cookiesBase = await browser.cookies.getAll({ domain: domain })
    cookiesURL = await browser.cookies.getAll({ url: domainURL.replace('www.', '') })
    cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:') })
    cookiesSec = await browser.cookies.getAll({ domain: domain, secure: true })
    cookies2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.') })
    cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:').replace('www.', '') : domainURL.replace('https:', 'http:').replace('www.', '') })
    cookiesSec2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true })
    cookies3 = await browser.cookies.getAll({ domain: domainWWW })
    cookiesSec3 = await browser.cookies.getAll({ domain: domainWWW, secure: true })
    cookies4 = await browser.cookies.getAll({ domain: domainWWW2, storeId: currentTab.cookieStoreId })
    cookiesSec4 = await browser.cookies.getAll({ domain: domainWWW2, secure: true, storeId: currentTab.cookieStoreId })
  }

  let cookieList = [cookiesBase, cookiesURL, cookiesURL2, cookiesSec, cookies2, cookiesSec2, cookies3, cookiesSec3, cookies4, cookiesSec4]

  for (let list of cookieList) {
    let hasCookie = false
    for (let cookie of list) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) {
        let details = { 'url': currentTab.url }
        addTabURLtoDataList(currentTab, details, cookie.domain)
        cookies.push(cookie)
      }
    }
  }

  if (cookies.length === 0) return

  if (currentTab.cookieStoreId !== undefined) clearCookiesAction(action, data, cookies, domainURL, currentTab, currentTab.cookieStoreId)
  else clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default')
}

function handleMessage (request, sender, sendResponse) {
  if (request.getCookies !== undefined && request.windowId !== undefined && request.tabId !== undefined && openTabData[request.windowId] !== undefined && openTabData[request.windowId][request.tabId] !== undefined) {
    let cookieDataDomain = {}

    let rootDomain = 'No active domain'
    let contextName = 'default'
    if (!useChrome) contextName = request.storeId

    rootDomain = (openTabData[request.windowId][request.tabId][0] !== undefined && openTabData[request.windowId][request.tabId][0]['u'] !== undefined) ? openTabData[request.windowId][request.tabId][0]['u'] : 'No active domain'

    if (rootDomain === 'No active domain') {
      sendResponse({ 'cookies': null, 'rootDomain': getMsg('UnknownDomain'), 'logData': null })
      return
    }

    if (cookieData[contextName] !== undefined && cookieData[contextName][rootDomain] !== undefined) {
      for (let item of Object.keys(cookieData[contextName][rootDomain])) {
        let cookieItem = item.replace('www.', '')
        if (cookieDataDomain[cookieItem] === undefined) cookieDataDomain[cookieItem] = {}
        if (cookieDataDomain[cookieItem]['data'] === undefined) cookieDataDomain[cookieItem]['data'] = []

        for (let cookie of cookieData[contextName][rootDomain][item]) {
          cookieDataDomain[cookieItem]['data'].push(cookie)
        }
        if (cookieDataDomain[cookieItem]['data'].length === 0) delete cookieDataDomain[cookieItem]
      }
    }

    if (logData[contextName] !== undefined && logData[contextName][request.windowId] !== undefined && logData[contextName][request.windowId][request.tabId] !== undefined) {
      sendResponse({ 'cookies': cookieDataDomain, 'rootDomain': rootDomain, 'logData': logData[contextName][request.windowId][request.tabId] })
    } else {
      sendResponse({ 'cookies': cookieDataDomain, 'rootDomain': rootDomain, 'logData': null })
    }
    return
  }

  sendResponse({ 'cookies': null, 'rootDomain': getMsg('UnknownDomain'), 'logData': null })
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, domainURL, currentTab, activeCookieStore) {
  if (openTabData[currentTab.windowId] === undefined || openTabData[currentTab.windowId][currentTab.id] === undefined) return

  let rootDomain = openTabData[currentTab.windowId][currentTab.id][0] === undefined ? currentTab.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)[0] : openTabData[currentTab.windowId][currentTab.id][0]['u']

  let domainSplit = domainURL.split('.')
  let domain = domainSplit.splice(domainSplit.length - 2, 2).join('.')
  domainURL = domainURL.replace('www.', '')

  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  let hasDataContext = data[contextName] !== undefined && data[contextName][rootDomain] !== undefined
  if (!hasDataContext) {
    data[contextName] = {}
    data[contextName][rootDomain] = {}
  }

  let hasAccountsInContext = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined
  let accountDomain = null

  if (cookieData[contextName] === undefined) cookieData[contextName] = {}
  if (cookieData[contextName][rootDomain] === undefined) cookieData[contextName][rootDomain] = {}

  for (let cookie of cookies) {
    if (cookieData[contextName][rootDomain][cookie.domain] === undefined) cookieData[contextName][rootDomain][cookie.domain] = []

    let foundCookie = false
    for (let cookieEntry of cookieData[contextName][rootDomain][cookie.domain]) {
      if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
        cookie['fgHandled'] = false
        cookie['fgRemoved'] = false
        cookie['fgAllowed'] = true

        foundCookie = true
        cookieEntry = cookie
        break
      }
    }

    if (!foundCookie) {
      cookie['fgRemoved'] = false
      cookie['fgAllowed'] = true
      cookie['fgHandled'] = false
      cookieData[contextName][rootDomain][cookie.domain].push(cookie)
    }
  }

  let protectDomainCookies = false
  let hasLogged = false
  let hasLocalProfile = false
  let hasGlobalProfile = false

  if (accountDomain === null && hasAccountsInContext) {
    hasGlobalProfile = data['flagCookies_accountMode'][contextName]['http://' + domain] !== undefined || data['flagCookies_accountMode'][contextName]['https://' + domain] !== undefined
    hasLocalProfile = data['flagCookies_accountMode'][contextName][domainURL] !== undefined

    if (hasGlobalProfile) {
      if (data['flagCookies_accountMode'][contextName]['https://' + domain] !== undefined) accountDomain = 'https://' + domain
      else accountDomain = 'http://' + domain

      hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][accountDomain] !== undefined
      if (hasLogged && Object.keys(data['flagCookies_logged'][contextName][accountDomain]).length === 0) protectDomainCookies = true
    } else if (hasLocalProfile) {
      hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined
      accountDomain = domainURL
      if (hasLogged) {
        if (Object.keys(data['flagCookies_logged'][contextName][domainURL]).length === 0) protectDomainCookies = true
      }
    }
  }

  let dateObj = new Date()
  let timeString = (dateObj.getHours() < 10 ? '0' + dateObj.getHours() : dateObj.getHours()) + ':' + (dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes()) + ':' + (dateObj.getSeconds() < 10 ? '0' + dateObj.getSeconds() : dateObj.getSeconds())
  let timestamp = dateObj.getTime()

  let urlInFlag = false

  if (data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && data['flagCookies_autoFlag'][contextName][rootDomain]) {
    for (let entry of Object.values(openTabData[currentTab.windowId][currentTab.id])) {
      if (entry.u === rootDomain) {
        urlInFlag = true
        break
      }
    }
  }

  if (!hasDataContext) {
    if (!urlInFlag && (data['flagCookies_flagGlobal'] === undefined || data['flagCookies_flagGlobal'][contextName] === undefined || data['flagCookies_flagGlobal'][contextName] !== true)) return
    else if (data['flagCookies_flagGlobal'] === undefined || data['flagCookies_flagGlobal'][contextName] === undefined || data['flagCookies_flagGlobal'][contextName] !== true) return
  }

  if (data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && urlInFlag) {
    for (let domainKey of Object.keys(cookieData[contextName][rootDomain])) {
      for (let cookie of cookieData[contextName][rootDomain][domainKey]) {
        let cookieDomain = domainKey.startsWith('.') ? domainKey.replace('.', '') : domainKey
        let startHttp = cookieDomain.startsWith('http')
        let isManagedCookieHttp = false
        let isManagedCookieHttps = false

        if (!startHttp) {
          isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain][cookie.name] !== undefined)

          if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
          else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain
        } else {
          isManagedCookieHttp = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
        }

        if (cookieDomain === rootDomain) cookie['fgRoot'] = true
        else if (cookie['fgRoot'] !== undefined) delete cookie['fgRoot']

        if (accountDomain !== null && accountDomain.indexOf(cookieDomain) !== -1) {
          cookie['fgProfile'] = true
          cookie['fgDomain'] = accountDomain
        } else {
          if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']
          if (cookie['fgDomain'] !== undefined) delete cookie['fgDomain']
        }

        let isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined)

        if (!isManagedCookie && cookie['fgRoot'] === undefined) {
          let isEmptyProfile = (protectDomainCookies || !hasLogged)
          if (hasLogged && data['flagCookies_logged'][contextName][accountDomain] !== undefined && data['flagCookies_logged'][contextName][accountDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][accountDomain][cookie.domain][cookie.name] !== undefined) {
            cookie['fgProtected'] = true
            cookie['fgDomain'] = accountDomain
          }

          if ((cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) || cookie['fgProtected'] !== undefined) {
            if (isEmptyProfile && cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) {
              let msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true
              cookie['fgHandled'] = true

              if (cookie['fgProtected'] !== undefined) {
                delete cookie['fgProtected']
                cookie['fgLogged'] = true
              }

              continue
            } else if (!isEmptyProfile && (cookie['fgProfile'] !== undefined && cookie['fgProtected'] !== undefined)) {
              delete cookie['fgProfile']

              let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true
              cookie['fgHandled'] = true

              continue
            }
          }
        }

        if (cookie['fgProtected'] !== undefined) {
          delete cookie['fgProtected']
          cookie['fgLogged'] = true
          cookie['fgDomain'] = accountDomain
        }

        if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          continue
        } else if (hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][rootDomain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain][cookie.name] !== undefined) {
          let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          cookie['fgDomain'] = accountDomain
          continue
        }

        cookie['fgAllowed'] = false

        if (useChrome) {
          let cookieDomainTrim

          if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
          else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

          let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
          let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsg', [action, cookie.name, cookieDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgAutoFlag', [action, cookie.name, cookieDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          if (cookie['fgRemoved'] === undefined && chrome.cookies.remove(details2) !== null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          continue
        }

        let cookieDomainTrim

        if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
        else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

        let details = { url: 'https://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details2 = { url: 'http://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details3 = { url: 'https://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details4 = { url: 'http://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details5 = { url: 'https://' + cookie.domain, name: cookie.name, storeId: activeCookieStore }
        let details6 = { url: 'http://' + cookie.domain, name: cookie.name, storeId: activeCookieStore }
        let details7 = { url: cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }

        let detailsListTrim = [details, details2, details3, details4]
        let detailsListCookieDomain = [details5, details6, details7]

        for (let detail of detailsListTrim) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
            break
          }
        }

        for (let detail of detailsListCookieDomain) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
            break
          }
        }
      }
    }
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    for (let domainKey of Object.keys(cookieData[contextName][rootDomain])) {
      for (let cookie of cookieData[contextName][rootDomain][domainKey]) {
        let cookieDomain = domainKey.startsWith('.') ? domainKey.replace('.', '') : domainKey
        let startHttp = cookieDomain.startsWith('http')
        let isManagedCookieHttp = false
        let isManagedCookieHttps = false

        if (!startHttp) {
          isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain][cookie.name] !== undefined)

          if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
          else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain
        } else {
          isManagedCookieHttp = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
        }

        if (cookieDomain === rootDomain) cookie['fgRoot'] = true
        else if (cookie['fgRoot'] !== undefined) delete cookie['fgRoot']

        if (accountDomain !== null && accountDomain.indexOf(cookieDomain) !== -1) {
          cookie['fgProfile'] = true
          cookie['fgDomain'] = accountDomain
        } else {
          if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']
          if (cookie['fgDomain'] !== undefined) delete cookie['fgDomain']
        }

        let isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined)

        if (!isManagedCookie && cookie['fgRoot'] === undefined) {
          let isEmptyProfile = (protectDomainCookies || !hasLogged)
          if (hasLogged && data['flagCookies_logged'][contextName][accountDomain] !== undefined && data['flagCookies_logged'][contextName][accountDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][accountDomain][cookie.domain][cookie.name] !== undefined) {
            cookie['fgProtected'] = true
            cookie['fgDomain'] = accountDomain
          }

          if ((cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) || cookie['fgProtected'] !== undefined) {
            if (isEmptyProfile && cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) {
              let msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true
              cookie['fgHandled'] = true

              if (cookie['fgProtected'] !== undefined) {
                delete cookie['fgProtected']
                cookie['fgLogged'] = true
              }

              continue
            } else if (!isEmptyProfile && (cookie['fgProfile'] !== undefined && cookie['fgProtected'] !== undefined)) {
              delete cookie['fgProfile']

              let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true
              cookie['fgHandled'] = true

              continue
            }
          }
        }

        if (cookie['fgProtected'] !== undefined && cookie['fgProfile'] !== undefined) {
          delete cookie['fgProtected']

          cookie['fgLogged'] = true
        }

        if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie['fgDomain'] = accountDomain
          }
          continue
        } else if (hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][rootDomain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain][cookie.name] !== undefined) {
          let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          if (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie['fgDomain'] = accountDomain
          }
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          cookie['fgDomain'] = accountDomain
          continue
        }

        cookie['fgAllowed'] = false

        if (useChrome) {
          let cookieDomainTrim

          if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
          else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

          let details = { url: 'https://' + cookieDomainTrim + cookie.path, name: cookie.name }
          let details2 = { url: 'http://' + cookieDomainTrim + cookie.path, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'https://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          if (cookie['fgRemoved'] === undefined && chrome.cookies.remove(details2) !== null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'http://'])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          continue
        }

        let cookieDomainTrim

        if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
        else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

        let details = { url: 'https://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details2 = { url: 'http://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details3 = { url: 'https://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details4 = { url: 'http://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details7 = { url: cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }

        let detailsListTrim = [details, details2, details3, details4]
        let detailsListCookieDomain = [details5, details6, details7]

        for (let detail of detailsListTrim) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
            break
          }
        }

        for (let detail of detailsListCookieDomain) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookie.domain, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            } else {
              let msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookie.domain, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
            }

            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true
            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookie.domain
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
            break
          }
        }
      }
    }
  } else {
    for (let domainKey of Object.keys(cookieData[contextName][rootDomain])) {
      for (let cookie of cookieData[contextName][rootDomain][domainKey]) {
        let cookieDomain = domainKey.startsWith('.') ? domainKey.replace('.', '') : domainKey
        let startHttp = cookieDomain.startsWith('http')
        let isManagedCookieHttp = false
        let isManagedCookieHttps = false

        if (!startHttp) {
          isManagedCookieHttp = (hasDataContext && data[contextName]['http://' + cookieDomain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['http://' + cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName]['https://' + cookieDomain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain] !== undefined && data[contextName]['https://' + cookieDomain][cookie.domain][cookie.name] !== undefined)

          if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain
          else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain
        } else {
          isManagedCookieHttp = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
          isManagedCookieHttps = (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined)
        }

        if (cookieDomain === rootDomain) cookie['fgRoot'] = true
        else if (cookie['fgRoot'] !== undefined) delete cookie['fgRoot']

        if (accountDomain !== null && accountDomain.indexOf(cookieDomain) !== -1) {
          cookie['fgProfile'] = true
          cookie['fgDomain'] = accountDomain
        } else {
          if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']
          if (cookie['fgDomain'] !== undefined) delete cookie['fgDomain']
        }

        let isManagedCookie = (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] !== undefined)

        if (cookie['fgRoot'] === undefined) {
          let isEmptyProfile = protectDomainCookies || !hasLogged
          if (accountDomain !== null && hasLogged && data['flagCookies_logged'][contextName][accountDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][accountDomain][cookie.domain][cookie.name] === true) cookie['fgProtected'] = true

          if (!isManagedCookie && ((cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) || cookie['fgProtected'] !== undefined)) {
            if (isEmptyProfile && cookie['fgProfile'] !== undefined && cookie['fgProtected'] === undefined) {
              let msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true

              if (cookie['fgProtected'] !== undefined) {
                delete cookie['fgProtected']
                cookie['fgLogged'] = true
              }

              continue
            } else if (!isEmptyProfile && cookie['fgProfile'] !== undefined && cookie['fgProtected'] !== undefined) {
              delete cookie['fgProfile']

              let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgAllowed'] = true
              cookie['fgHandled'] = true

              if (cookie['fgProtected'] !== undefined) {
                delete cookie['fgProtected']
                cookie['fgLogged'] = true
              }

              continue
            }
          }
        }

        if (cookie['fgProtected'] !== undefined) {
          delete cookie['fgProtected']
          cookie['fgLogged'] = true
        }

        if (cookie['fgProfile'] !== undefined) delete cookie['fgProfile']

        if (hasDataContext && data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          continue
        } else if (hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][rootDomain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][rootDomain][cookie.domain][cookie.name] !== undefined) {
          let msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, rootDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          continue
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
          let msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain])
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgAllowed'] = true
          cookie['fgHandled'] = true
          cookie['fgDomain'] = accountDomain
          continue
        }

        if (!isManagedCookie && accountDomain === null && hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] === undefined) {
          continue
        } else if (!isManagedCookie && hasDataContext && (data[contextName][accountDomain] === undefined || data[contextName][accountDomain][cookie.domain] === undefined || data[contextName][accountDomain][cookie.domain][cookie.name] === undefined)) {
          continue
        }

        cookie['fgAllowed'] = false

        if (useChrome) {
          let cookieDomainTrim
          if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
          else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

          let details = { url: 'https://' + cookieDomainTrim + cookie.path, name: cookie.name }
          let details2 = { url: 'http://' + cookieDomainTrim + cookie.path, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://'])
            addToLogData(currentTab, msg, timeString, timestamp)
            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true

            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          if (cookie['fgRemoved'] === undefined && chrome.cookies.remove(details2) !== null) {
            let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://'])
            addToLogData(currentTab, msg, timeString, timestamp)
            cookie['fgRemoved'] = true
            cookie['fgHandled'] = true

            if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomainTrim
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
          }

          continue
        }

        let cookieDomainTrim

        if (cookie.domain.startsWith('.')) cookieDomainTrim = cookie.domain.replace('.', '')
        else cookieDomainTrim = cookie.domain.replace('www.', '').replace(/(http|https):\/\//, '')

        let details = { url: 'https://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details2 = { url: 'http://' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details3 = { url: 'https://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details4 = { url: 'http://www.' + cookieDomainTrim + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }
        let details7 = { url: cookie.domain + cookie.path, name: cookie.name, storeId: activeCookieStore }

        let detailsListTrim = [details, details2, details3, details4]
        let detailsListCookieDomain = [details5, details6, details7]

        for (let detail of detailsListTrim) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomainTrim, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgRemoved'] = true
              cookie['fgHandled'] = true

              if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookieDomain
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
              break
            }
          }
        }

        for (let detail of detailsListCookieDomain) {
          let modifier = detail.url.startsWith('https') ? 'https://' : 'http://'
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] !== undefined && data[contextName][rootDomain][cookie.domain] !== undefined && data[contextName][rootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
              let msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookie.domain, modifier])
              addToLogData(currentTab, msg, timeString, timestamp)
              cookie['fgRemoved'] = true
              cookie['fgHandled'] = true

              if (hasDataContext && data[contextName][cookieDomain] !== undefined && data[contextName][cookieDomain][cookie.domain] !== undefined && data[contextName][cookieDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = cookie.domain
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] !== undefined && data[contextName][accountDomain][cookie.domain] !== undefined && data[contextName][accountDomain][cookie.domain][cookie.name] !== undefined) cookie['fgRemovedDomain'] = accountDomain
              break
            }
          }
        }
      }
    }
  }

  if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
    let titleString = '::::::::::::::::::: ' + getMsg('IconDisplayLog') + ' :::::::::::::::::::'
    let statuses = [getMsg('GlobalFlagState'), getMsg('AutoFlagState'), getMsg('PermittedState'), getMsg('AllowedState'), getMsg('DeletedStateMsg')]
    let hasTitleChange = false

    let cookiesInMessages = []
    for (let status of statuses) {
      let titleJoin = []
      let index = 0
      let statusLower = status.toLowerCase()

      for (let msg of logData[contextName][currentTab.windowId][currentTab.id]) {
        if (msg.toLowerCase().indexOf(statusLower) !== -1) {
          let cookieName = msg.match(/ '([^']*)' /)[1]
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
      }
    }

    if (!hasTitleChange) titleString += '\n' + getMsg('NoActionOnPage')

    let count = 0
    for (let msg of logData[contextName][currentTab.windowId][currentTab.id]) {
      if (msg.toLowerCase().indexOf(getMsg('DeletedStateMsg').toLowerCase()) !== -1) ++count
    }

    if (useChrome) {
      chrome.browserAction.setTitle({ 'title': titleString, 'tabId': currentTab.id })
    } else {
      browser.browserAction.setTitle({ 'title': titleString, 'tabId': currentTab.id })
    }

    if (useChrome) {
      if (count !== 0) chrome.browserAction.setBadgeText({ text: count.toString(), tabId: currentTab.id })
      else chrome.browserAction.setBadgeText({ text: '', tabId: currentTab.id })
    } else {
      if (count !== 0) browser.browserAction.setBadgeText({ text: count.toString(), tabId: currentTab.id })
      else browser.browserAction.setBadgeText({ text: '', tabId: currentTab.id })
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
async function clearCookiesOnUpdate (tabId, changeInfo, currentTab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    if (useChrome) chrome.browserAction.disable(currentTab.id)
    else browser.browserAction.disable(currentTab.id)
    clearCookiesWrapper(getMsg('ActionDocumentLoad'))
  } else if (changeInfo.status !== undefined && changeInfo.status === 'complete') {
    let tabDomain
    let urlMatch = currentTab.url.replace(/www./, '').match(/(http|https):\/\/.[^/]*/)
    if (urlMatch !== null) tabDomain = urlMatch[0]
    else tabDomain = currentTab.url.replace(/\/www./, '')

    let domainSplit = tabDomain.split('.')
    let domain = domainSplit.splice(domainSplit.length - 2, 2).join('.')
    addTabURLtoDataList(currentTab, { 'url': tabDomain, 'frameId': 0, 'parentFrameId': -1, 'type': 'main_frame' }, domain, true)

    if (useChrome) {
      chrome.browserAction.enable(currentTab.id)
    } else {
      browser.browserAction.enable(currentTab.id)
    }

    if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
    else contextName = 'default'

    if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
      let titleString = '::::::::::::::::::: ' + getMsg('IconDisplayLog') + ' :::::::::::::::::::'
      let statuses = [getMsg('GlobalFlagState'), getMsg('AutoFlagState'), getMsg('PermittedState'), getMsg('AllowedState'), getMsg('DeletedStateMsg')]
      let hasTitleChange = false

      let cookiesInMessages = []
      for (let status of statuses) {
        let titleJoin = []
        let index = 0
        let statusLower = status.toLowerCase()

        for (let msg of logData[contextName][currentTab.windowId][currentTab.id]) {
          if (msg.toLowerCase().indexOf(statusLower) !== -1) {
            let cookieName = msg.match(/ '([^']*)' /)[1]
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
        }
      }

      if (!hasTitleChange) titleString += '\n' + getMsg('NoActionOnPage')

      if (useChrome) {
        chrome.browserAction.setTitle({ 'title': titleString, 'tabId': currentTab.id })
        getChromeStorageForFunc3(setBrowserActionIconChrome, contextName, tabDomain, currentTab.id)
      } else {
        browser.browserAction.setTitle({ 'title': titleString, 'tabId': currentTab.id })
        setBrowserActionIconFirefox(contextName, tabDomain, currentTab.id)
      }

      let count = 0
      for (let msg of logData[contextName][currentTab.windowId][currentTab.id]) {
        if (msg.toLowerCase().indexOf(getMsg('DeletedStateMsg').toLowerCase()) !== -1) ++count
      }

      if (useChrome) {
        if (count !== 0) chrome.browserAction.setBadgeText({ text: count.toString(), tabId: currentTab.id })
        else chrome.browserAction.setBadgeText({ text: '', tabId: currentTab.id })
      } else {
        if (count !== 0) browser.browserAction.setBadgeText({ text: count.toString(), tabId: currentTab.id })
        else browser.browserAction.setBadgeText({ text: '', tabId: currentTab.id })
      }

      if (useChrome) {
        getChromeStorageForFunc3(displayCookieDeleteChrome, count, tabDomain, contextName)
        return
      }

      let data = await browser.storage.local.get()

      if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
        browser.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [count, tabDomain, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/cookie_128.png' })
      }
    }
  }
}

function displayCookieDeleteChrome (data, count, tabDomain, contextName) {
  if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
    chrome.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [count, tabDomain, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/cookie_128.png' })
  }
}

function clearCookiesOnLeave (tabId, moveInfo) {
  removeTabIdfromDataList(tabId, moveInfo)
  clearCookiesWrapper(getMsg('ActionTabClose'))
}

function setBrowserActionIconChrome (data, contextName, tabDomain, tabId) {
  let inAccountMode = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][tabDomain] !== undefined
  if (inAccountMode) {
    chrome.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '48': 'icons/flagcookies_profil_icon.svg',
        '64': 'icons/flagcookies_profil_icon.svg',
        '96': 'icons/flagcookies_profil_icon.svg',
        '128': 'icons/flagcookies_profil_icon.svg'
      }
    })
  } else {
    chrome.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '48': 'icons/flagcookies_icon.svg',
        '64': 'icons/flagcookies_icon.svg',
        '96': 'icons/flagcookies_icon.svg',
        '128': 'icons/flagcookies_icon.svg'
      }
    })
  }
}

async function setBrowserActionIconFirefox (contextName, tabDomain, tabId) {
  let data = await browser.storage.local.get('flagCookies_accountMode')
  let inAccountMode = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][tabDomain] !== undefined

  if (inAccountMode) {
    browser.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '48': 'icons/flagcookies_profil_icon.svg',
        '64': 'icons/flagcookies_profil_icon.svg',
        '96': 'icons/flagcookies_profil_icon.svg',
        '128': 'icons/flagcookies_profil_icon.svg'
      }
    })
  } else {
    browser.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '48': 'icons/flagcookies_icon.svg',
        '64': 'icons/flagcookies_icon.svg',
        '96': 'icons/flagcookies_icon.svg',
        '128': 'icons/flagcookies_icon.svg'
      }
    })
  }
}
// --------------------------------------------------------------------------------------------------------------------------------
// Log info
function clearDomainLog (currentTab, details) {
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

function addToLogData (currentTab, msg, timeString, timestamp, domain) {
  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  if (logData[contextName] === undefined) logData[contextName] = {}
  if (logData[contextName][currentTab.windowId] === undefined) logData[contextName][currentTab.windowId] = {}
  if (logData[contextName][currentTab.windowId][currentTab.id] === undefined) logData[contextName][currentTab.windowId][currentTab.id] = []

  if (logTime[contextName] === undefined) logTime[contextName] = {}
  if (logTime[contextName][currentTab.windowId] === undefined) logTime[contextName][currentTab.windowId] = {}
  if (logTime[contextName][currentTab.windowId][currentTab.id] === undefined) logTime[contextName][currentTab.windowId][currentTab.id] = []

  msg = msg.replace('www.', '')
  msg = '[' + timeString + ']  ' + msg
  if (logData[contextName][currentTab.windowId][currentTab.id].indexOf(msg) === -1) {
    logData[contextName][currentTab.windowId][currentTab.id].push(msg)
    logTime[contextName][currentTab.windowId][currentTab.id].push(timestamp)
  }
}

// Account mode switch key command
async function toggleAccountMode (data, contextName, url, tabid, useNotifcations) {
  if (data['flagCookies_accountMode'] === undefined) data['flagCookies_accountMode'] = {}
  if (data['flagCookies_accountMode'][contextName] === undefined) data['flagCookies_accountMode'][contextName] = {}

  let useNotifications = data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true

  if (data['flagCookies_accountMode'][contextName][url] === undefined) {
    data['flagCookies_accountMode'][contextName][url] = true

    if (useNotifications) {
      if (useChrome) chrome.notifications.create('profile_activated', { type: 'basic', message: getMsg('NotificationProfileModeEnabled', [url, contextName]), title: getMsg('NotificationProfileModeTitleEnabled'), iconUrl: 'icons/cookie_128_profil.png' })
      else browser.notifications.create('profile_activated', { type: 'basic', message: getMsg('NotificationProfileModeEnabled', [url, contextName]), title: getMsg('NotificationProfileModeTitleEnabled'), iconUrl: 'icons/cookie_128_profil.png' })
    }
  } else {
    delete data['flagCookies_accountMode'][contextName][url]

    if (useNotifications) {
      if (useChrome) chrome.notifications.create('profile_deactivated', { type: 'basic', message: getMsg('NotificationProfileModeDisabled', [url, contextName]), title: getMsg('NotificationProfileModeTitleDisabled'), iconUrl: 'icons/cookie_128.png' })
      else browser.notifications.create('profile_deactivated', { type: 'basic', message: getMsg('NotificationProfileModeDisabled', [url, contextName]), title: getMsg('NotificationProfileModeTitleDisabled'), iconUrl: 'icons/cookie_128.png' })
    }
  }

  if (useChrome) {
    setChromeStorage(data)
    setBrowserActionIconChrome(data, contextName, url, tabid)
  } else {
    await browser.storage.local.set(data)
    setBrowserActionIconFirefox(contextName, url, tabid)
  }
}

async function getCommand (command) {
  if (command === 'toggle-profile') {
    if (useChrome) {
      chrome.tabs.query({ currentWindow: true, active: true }, function (activeTabs) {
        if (!checkChromeHadNoErrors()) return
        if (activeTabs.length !== 0) {
          let activeTab = activeTabs.pop()
          if (activeTab.url !== undefined) {
            let urlMatch = activeTab.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
            if (urlMatch !== null) getChromeStorageForFunc3(toggleAccountMode, contextName, urlMatch[0], activeTab.id)
          }
        }
      })
    } else {
      let activeTab = await getActiveTabFirefox()

      if (activeTab.url !== undefined) {
        let urlMatch = activeTab.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
        if (urlMatch !== null) {
          let data = await browser.storage.local.get(null)
          toggleAccountMode(data, contextName, urlMatch[0], activeTab.id)
        }
      }
    }
  }
}

async function onCookieChanged (changeInfo) {
  let cookieDetails = changeInfo.cookie

  let currentTab
  let details

  if (!useChrome) {
    currentTab = await browser.tabs.getCurrent()
    details = { 'url': currentTab.url }

    let rootDomain = openTabData[currentTab.windowId][currentTab.id][0] === undefined ? currentTab.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)[0] : openTabData[currentTab.windowId][currentTab.id][0]['u']

    if (cookieData[contextName] === undefined) cookieData[contextName] = {}
    if (cookieData[contextName][rootDomain] === undefined) cookieData[contextName][rootDomain] = {}
    if (cookieData[contextName][rootDomain][cookieDetails.domain] === undefined) cookieData[contextName][rootDomain][cookieDetails.domain] = []

    let foundCookie = false
    for (let cookie of cookieData[contextName][rootDomain][cookieDetails.domain]) {
      if (cookieDetails.name === cookie.name) {
        cookie = cookieDetails
        cookie['fgChanged'] = true
        cookie['fgHandled'] = false
        foundCookie = true
        break
      }
    }

    if (!foundCookie) {
      cookieDetails['fgHandled'] = false
      cookieData[contextName][rootDomain][cookieDetails.domain].push(cookieDetails)
      addTabURLtoDataList(currentTab, details, cookieDetails.domain)
    }

    clearCookiesWrapper('cookie change')

    return
  }

  chrome.tabs.getCurrent(function (currentTab) {
    if (currentTab === undefined) return
    details = { 'url': currentTab.url }

    let rootDomain = openTabData[currentTab.windowId][currentTab.id][0] === undefined ? currentTab.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)[0] : openTabData[currentTab.windowId][currentTab.id][0]['u']

    if (cookieData[contextName] === undefined) cookieData[contextName] = {}
    if (cookieData[contextName][rootDomain] === undefined) cookieData[contextName][rootDomain] = {}
    if (cookieData[contextName][rootDomain][cookieDetails.domain] === undefined) cookieData[contextName][rootDomain][cookieDetails.domain] = []

    let foundCookie = false
    for (let cookie of cookieData[contextName][rootDomain][cookieDetails.domain]) {
      if (cookieDetails.name === cookie.name) {
        cookie = cookieDetails
        cookie['fgChanged'] = true
        cookie['fgHandled'] = false
        foundCookie = true
        break
      }
    }

    if (!foundCookie) {
      cookieDetails['fgHandled'] = false
      cookieData[contextName][rootDomain][cookieDetails.domain].push(cookieDetails)
    }

    addTabURLtoDataList(currentTab, details, cookieDetails.domain)
    clearCookiesWrapper('cookie change')
  })
}

async function onContextRemoved (changeInfo) {
  let activeCookieStore = changeInfo.contextualIdentity.name
  let data = await browser.storage.local.get()

  if (data[activeCookieStore] !== undefined) {
    delete data[activeCookieStore]
    browser.storage.local.remove(activeCookieStore)
  }

  if (data['flagCookies'] !== undefined) {
    if (Object.keys(data['flagCookies']).length === 0) {
      delete data['flagCookies']
      browser.storage.local.remove('flagCookies')
    }
  }

  if (data['flagCookies_flagGlobal'] !== undefined) {
    if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][activeCookieStore] !== undefined) {
      delete data['flagCookies_flagGlobal'][activeCookieStore]
    }

    if (Object.keys(data['flagCookies_flagGlobal']).length === 0) {
      delete data['flagCookies_flagGlobal']
      browser.storage.local.remove('flagCookies_flagGlobal')
    }
  }

  browser.storage.local.set(data)

  if (logData[activeCookieStore] !== undefined) delete logData[activeCookieStore]
  if (logTime[activeCookieStore] !== undefined) delete logTime[activeCookieStore]
}

// --------------------------------------------------------------------------------------------------------------------------------
let openTabData = {}

function addTabURLtoDataList (tab, details, domain) {
  if (!details.url.startsWith('chrome:') && !details.url.startsWith('about:')) {
    if (openTabData[tab.windowId] === undefined) openTabData[tab.windowId] = {}
    if (openTabData[tab.windowId][tab.id] === undefined) openTabData[tab.windowId][tab.id] = {}

    // NOTE: add origin to tabdata?
    let targetURL = domain.replace(/(http|https):\/\//, '')
    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      if (useChrome) openTabData[tab.windowId][tab.id][details.frameId] = { 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/.[^/]*/)[0], 'd': targetURL, 'o': details.originUrl, 'du': details.documentUrl, 'k': domain, 'isRoot': true }
      else openTabData[tab.windowId][tab.id][details.frameId] = { 's': tab.cookieStoreId, 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/.[^/]*/)[0], 'o': details.originUrl, 'du': details.documentUrl, 'k': domain, 'd': targetURL, 'isRoot': true }
      return
    }

    let id = Object.keys(openTabData[tab.windowId][tab.id]).length
    if (openTabData[tab.windowId][tab.id][0] === undefined) {
      ++id
    }

    if (useChrome) openTabData[tab.windowId][tab.id][id] = { 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/.[^/]*/)[0], 'o': details.originUrl, 'du': details.documentUrl, 'k': domain, 'd': targetURL }
    else openTabData[tab.windowId][tab.id][id] = { 's': tab.cookieStoreId, 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/.[^/]*/)[0], 'o': details.originUrl, 'du': details.documentUrll, 'k': domain, 'd': targetURL }
  }
}

async function removeTabIdfromDataList (tabId, removeInfo) {
  if (removeInfo === undefined) return
  if (openTabData[removeInfo.windowId] !== undefined && openTabData[removeInfo.windowId][tabId] !== undefined) {
    let domainData = openTabData[removeInfo.windowId][tabId]
    let rootDomain = domainData[0].u
    let activeCookieStore = domainData[0].s

    if (rootDomain !== null && cookieData[activeCookieStore] !== undefined && cookieData[activeCookieStore][rootDomain] !== undefined) {
      delete cookieData[activeCookieStore][rootDomain]
      if (Object.keys(cookieData[activeCookieStore]).length === 0) delete cookieData[activeCookieStore]
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

    if (useChrome) {
      chrome.storage.local.get(null, function (data) {
        if (data[activeCookieStore] !== undefined) {
          let hasDeleted = false
          if (data[activeCookieStore][rootDomain] !== undefined && Object.keys(data[activeCookieStore][rootDomain]).length === 0) {
            delete data[activeCookieStore][rootDomain]
            hasDeleted = true
          }

          if (Object.keys(data[activeCookieStore]).length === 0) {
            chrome.storage.local.remove(activeCookieStore, function () { checkChromeHadNoErrors() })
            delete data[activeCookieStore]
          } else if (hasDeleted) setChromeStorage(data)
        }
      })
    } else {
      let data = await browser.storage.local.get(null)

      if (data[activeCookieStore] !== undefined) {
        let hasDeleted = false
        if (data[activeCookieStore][rootDomain] !== undefined && Object.keys(data[activeCookieStore][rootDomain]).length === 0) {
          delete data[activeCookieStore][rootDomain]
          hasDeleted = true
        }

        if (Object.keys(data[activeCookieStore]).length === 0) {
          await browser.storage.local.remove(activeCookieStore)
          delete data[activeCookieStore]
        } else if (hasDeleted) await browser.storage.local.set(data)
      }
    }

    delete openTabData[removeInfo.windowId][tabId]
    if (Object.keys(openTabData[removeInfo.windowId]).length === 0) {
      delete openTabData[removeInfo.windowId]
    }
  }
}

function clearCookiesOnRequestChrome (details) {
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    chrome.tabs.query({}, function (activeTabs) {
      let currentTab
      let sourceDomain = null

      switch (details.type) {
        case 'xmlhttprequest':
          sourceDomain = details.initiator
          break
        case 'sub_frame':
          sourceDomain = details.url
          break
        case 'main_frame':
        default:
          break
      }

      for (let tab of activeTabs) {
        if (tab.id === details.tabId) {
          currentTab = tab
          break
        }
      }

      if (currentTab === undefined) return

      let domainURL
      if (sourceDomain === null) {
        let urlMatch = details.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
        if (urlMatch !== null) domainURL = urlMatch[0]
        else domainURL = details.url.replace('www.', '')
      } else {
        let urlMatch = sourceDomain.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
        if (urlMatch !== null) domainURL = urlMatch[0]
        else domainURL = sourceDomain.replace('www.', '')
      }

      if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
        if (openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && openTabData[currentTab.windowId][currentTab.id][0] !== undefined) {
          openTabData[currentTab.windowId][currentTab.id] = []
        }

        if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
          clearDomainLog(currentTab, details)
        }
      }

      let domainSplit = domainURL.split('.')
      let domain = domainSplit.splice(domainSplit.length - 2, 2).join('.')

      addTabURLtoDataList(currentTab, details, domain)

      let typeOfRequest = details.type
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

      chromeGetStorageAndClearCookies(typeOfRequest, null, null, domainURL, currentTab)
    })
  }
}

async function clearCookiesOnRequest (details) {
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    let currentTab
    let tabList = await browser.tabs.query({})

    let sourceDomain = null

    switch (details.type) {
      case 'xmlhttprequest':
        sourceDomain = details.originUrl
        break
      case 'sub_frame':
        sourceDomain = details.url
        break
      case 'main_frame':
      default:
        break
    }

    for (let tab of tabList) {
      if (tab.id === details.tabId) {
        currentTab = tab
        break
      }
    }

    let data = await browser.storage.local.get()
    let domainURL
    if (sourceDomain === null) {
      let urlMatch = details.url.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
      if (urlMatch !== null) domainURL = urlMatch[0]
      else domainURL = details.url.replace('www.', '')
    } else {
      let urlMatch = sourceDomain.replace('www.', '').match(/(http|https):\/\/.[^/]*/)
      if (urlMatch !== null) domainURL = urlMatch[0]
      else domainURL = sourceDomain.replace('www.', '')
    }

    let domainSplit = domainURL.split('.')
    let domain = domainSplit.splice(domainSplit.length - 2, 2).join('.')

    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)

      if (openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && openTabData[currentTab.windowId][currentTab.id][0] !== undefined) {
        openTabData[currentTab.windowId][currentTab.id] = []
      }

      if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
        clearDomainLog(currentTab, details)
      }
    }

    addTabURLtoDataList(currentTab, details, domainURL)

    let cookies = []
    let cookiesBase
    let cookiesURL = []
    let cookiesURL2 = []
    let cookiesSec = []
    let cookies2 = []
    let cookiesSec2 = []
    let cookies3 = []
    let cookiesSec3 = []
    let cookies4 = []
    let cookiesSec4 = []

    let domainWWW = 'http://www.' + domain.replace(/(http|https):\/\//, '')
    let domainWWW2 = 'https://www.' + domain.replace(/(http|https):\/\//, '')

    if (currentTab.cookieStoreId !== undefined) {
      cookiesBase = await browser.cookies.getAll({ domain: domain, storeId: currentTab.cookieStoreId })
      cookiesURL = await browser.cookies.getAll({ url: domainURL, storeId: currentTab.cookieStoreId })
      cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:'), storeId: currentTab.cookieStoreId })
      cookiesSec = await browser.cookies.getAll({ domain: domain, secure: true, storeId: currentTab.cookieStoreId })
      cookies2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), storeId: currentTab.cookieStoreId })
      cookiesSec2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true, storeId: currentTab.cookieStoreId })
      cookies3 = await browser.cookies.getAll({ domain: domainWWW, storeId: currentTab.cookieStoreId })
      cookiesSec3 = await browser.cookies.getAll({ domain: domainWWW, secure: true, storeId: currentTab.cookieStoreId })
      cookies4 = await browser.cookies.getAll({ domain: domainWWW2, storeId: currentTab.cookieStoreId })
      cookiesSec4 = await browser.cookies.getAll({ domain: domainWWW2, secure: true, storeId: currentTab.cookieStoreId })
    } else {
      cookiesBase = await browser.cookies.getAll({ domain: domain })
      cookiesURL = await browser.cookies.getAll({ url: domainURL.replace('www.', '') })
      cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:') })
      cookiesSec = await browser.cookies.getAll({ domain: domain, secure: true })
      cookies2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.') })
      cookiesURL2 = await browser.cookies.getAll({ url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:').replace('www.', '') : domainURL.replace('https:', 'http:').replace('www.', '') })
      cookiesSec2 = await browser.cookies.getAll({ domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true })
      cookies3 = await browser.cookies.getAll({ domain: domainWWW })
      cookiesSec3 = await browser.cookies.getAll({ domain: domainWWW, secure: true })
      cookies4 = await browser.cookies.getAll({ domain: domainWWW2, storeId: currentTab.cookieStoreId })
      cookiesSec4 = await browser.cookies.getAll({ domain: domainWWW2, secure: true, storeId: currentTab.cookieStoreId })
    }

    let cookieList = [cookiesBase, cookiesURL, cookiesURL2, cookiesSec, cookies2, cookiesSec2, cookies3, cookiesSec3, cookies4, cookiesSec4]

    for (let list of cookieList) {
      let hasCookie = false
      for (let cookie of list) {
        hasCookie = false
        for (let cookieEntry of cookies) {
          if (cookieEntry.name === cookie.name) {
            hasCookie = true
            break
          }
        }

        if (!hasCookie) {
          addTabURLtoDataList(currentTab, details, cookie.domain)
          cookies.push(cookie)
        }
      }
    }

    let hasDataContext = data[contextName] !== undefined && data[contextName][domainURL] !== undefined

    if (cookieData[contextName] !== undefined && cookieData[contextName][domainURL] !== undefined) {
      let entries = cookieData[contextName][domainURL].length
      for (let i = 0; i < entries; ++i) {
        let isLeftOverCookie = true
        let cookieEntry = cookieData[contextName][domainURL][i]
        if (hasDataContext && data[contextName][domainURL][cookieEntry.domain] !== undefined && data[contextName][domainURL][cookieEntry.domain][cookieEntry.name] !== undefined) continue

        for (let cookie of cookies) {
          if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
            isLeftOverCookie = false
            break
          }
        }

        if (isLeftOverCookie) {
          cookieData[contextName][domainURL].splice(i, 1)
          --i
          --entries
        }
      }

      if (Object.keys(cookieData[contextName]).length === 0) delete cookieData[contextName]
    }

    let typeOfRequest = details.type
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

    if (currentTab.cookieStoreId !== undefined) clearCookiesAction(typeOfRequest, data, cookies, domainURL, currentTab, currentTab.cookieStoreId)
    else clearCookiesAction(typeOfRequest, data, cookies, domainURL, currentTab, 'default')
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Import settings
let doImportOverwrite = false
let jszipScript = document.createElement('script')
jszipScript.type = 'text/javascript'
jszipScript.src = 'libs/jszip/jszip.js'

document.body.appendChild(jszipScript)

// Called in frontend/UI
function importSettings (evt) {
  if (evt.target.files[0] === undefined) return

  let file = evt.target.files[0]

  JSZip.loadAsync(file).then(function (zip) {
    if (zip.files['flagCookieSettings.json'] === undefined) return

    zip.files['flagCookieSettings.json'].async('string').then(async function (stringData) {
      let data = JSON.parse(stringData)

      if (doImportOverwrite) {
        if (!useChrome) browser.storage.local.set(data)
        else chrome.storage.local.set(data)
        return
      }

      if (!useChrome) {
        let existingData = await browser.storage.local.get()
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
  let flagCookieSettings = ['flagCookies_logged', 'flagCookies_flagGlobal', 'flagCookies_autoflag', 'flagCookies_notifications']

  for (let key of Object.keys(data)) {
    if (flagCookieSettings.indexOf(key) === -1) {
      if (existingData[key] === undefined) existingData[key] = data[key]
      else {
        for (let domain of Object.keys(data[key])) {
          if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          else {
            for (let setDomain of Object.keys(data[key][domain])) {
              if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
              else {
                for (let cookieKey of Object.keys(data[key][domain][setDomain])) {
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
          for (let domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
            else {
              for (let setDomain of Object.keys(data[key][domain])) {
                if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain]
                else {
                  for (let cookieKey of Object.keys(data[key][domain][setDomain])) {
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
          for (let domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain]
          }
        }
      } else if ((key === 'flagCookies_flagGlobal' || key === 'flagCookies_notifications') && existingData[key] === undefined) existingData[key] = data[key]
    }
  }

  return existingData
}
// --------------------------------------------------------------------------------------------------------------------------------
if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave)
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  chrome.runtime.onMessage.addListener(handleMessage)
  chrome.commands.onCommand.addListener(getCommand)
  chrome.cookies.onChanged.addListener(onCookieChanged)

  chrome.windows.onRemoved.addListener(removeTabIdfromDataList)
  chrome.webRequest.onBeforeRequest.addListener(clearCookiesOnRequestChrome, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] })
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.runtime.onMessage.addListener(handleMessage)
  browser.commands.onCommand.addListener(getCommand)
  browser.cookies.onChanged.addListener(onCookieChanged)
  browser.contextualIdentities.onRemoved.addListener(onContextRemoved)
  browser.windows.onRemoved.addListener(removeTabIdfromDataList)
  browser.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] })
}
