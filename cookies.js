let logData = {} // The log data we seen as a report to the settings view
let logTime = {}
let cookieData = {} // Storage for cookie shadow, for the interface only!
let contextName = 'default'
// Chrome
let useChrome = typeof (browser) === 'undefined'
let hasConsole = typeof (console) !== 'undefined'

// Chrome helpers
function checkChromeHadNoErrors () {
  if (chrome.runtime.lastError) {
    if (hasConsole) {
      if (chrome.runtime.lastError.message !== undefined) {
        console.log(chrome.runtime.lastError)
        console.log('Browser had an error, with mesage: ' + chrome.runtime.lastError.message)
      } else {
        console.log('Browser had an error.')
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
        console.log('Browser updated the storage data.')
      }
    } else if (hasConsole) {
      console.log('Browser updating storage error.')
    }
  })
}

function chromeGetStorageAndClearCookies (action, data, cookies, domainURL, currentTab) {
  if (data === null) {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab) })
  } else if (cookies === null) {
    if (openTabData === undefined || openTabData[currentTab.windowId] === undefined || openTabData[currentTab.windowId][currentTab.id] === undefined) return
    chrome.cookies.getAll({}, function (cookiesSub) {
      checkChromeHadNoErrors()
      cookies = []

      for (let domainData of Object.values(openTabData[currentTab.windowId][currentTab.id])) {
        let domainName = domainData.d.charAt(0) === '.' ? domainData.d.substr(1) : domainData.d

        for (let cookie of cookiesSub) if (cookie.domain.replace('www.', '.').indexOf(domainName) !== -1) cookies.push(cookie)
      }

      clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default')
    })
  }
}

function getChromeStorageForFunc1 (func, par1) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log('Browser retrieved storage data.')

      func(data, par1)
    } else if (hasConsole) {
      console.log('Browser storage retrieval error.')
    }
  })
}

function getChromeStorageForFunc3 (func, par1, par2, par3) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log('Browser retrieved storage data.')

      func(data, par1, par2, par3)
    } else if (hasConsole) {
      console.log('Browser storage retrieval error.')
    }
  })
}

async function getDomainURLFirefox () {
  let tab = await getActiveTabFirefox()
  if (tab !== null) {
    if (tab.url !== undefined) {
      let urlMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
      if (urlMatch !== null) return urlMatch[0]
      else return tab.url.replace(/\/www\./, '/')
    }
  }

  return ''
}

async function getActiveTabFirefox () {
  let activeTabs = await browser.tabs.query({currentWindow: true, active: true})
  if (activeTabs.length !== 0) {
    return activeTabs.pop()
  }

  return null
}

function getChromeActiveTabForClearing (action) {
  chrome.tabs.query({currentWindow: true, active: true}, function (activeTabs) {
    if (!checkChromeHadNoErrors()) return
    if (activeTabs.length !== 0) {
      let tab = activeTabs.pop()
      if (tab.url !== undefined) {
        let urlMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
        if (urlMatch !== null) {
          let domainURL = urlMatch[0]
          chromeGetStorageAndClearCookies(action, null, null, domainURL, tab)
        }
      }
    }
  })
}

function getURLDomain (domainURL) {
  let urlMatch = domainURL.replace('/www\.', '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
  if (urlMatch !== null) return urlMatch[0].replace(/(http|https):\/\//, '').replace('www.', '').replace('/', '')
  else return ''
}

// Chrome + Firefox
function firefoxOnGetContextSuccess (context) {
  contextName = context.name
}

function firefoxOnGetContextError (e) {
  if (hasConsole) {
    console.log('Firefox getContext profile error: ')
    console.log(e)
  }

  contextName = 'default'
}

async function clearCookiesWrapper (action, doChromeLoad) {
  if (useChrome && doChromeLoad) {
    getChromeActiveTabForClearing(action)
    return
  }

  let domainURL = await getDomainURLFirefox()
  if (domainURL === '') return
  let currentTab = await getActiveTabFirefox()
  let data = await browser.storage.local.get()

  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  let domain = getURLDomain(domainURL)
  let cookies
  let cookiesURL = []
  let cookiesURL2 = []
  let cookiesSec = []
  let cookies2 = []
  let cookiesSec2 = []
  if (!useChrome && currentTab.cookieStoreId !== undefined) {
    cookies = await browser.cookies.getAll({domain: domain, storeId: currentTab.cookieStoreId})
    cookiesURL = await browser.cookies.getAll({url: domainURL, storeId: currentTab.cookieStoreId})
    cookiesURL2 = await browser.cookies.getAll({url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:'), storeId: currentTab.cookieStoreId})
    cookiesSec = await browser.cookies.getAll({domain: domain, secure: true, storeId: currentTab.cookieStoreId})
    cookies2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), storeId: currentTab.cookieStoreId})
    cookiesSec2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true, storeId: currentTab.cookieStoreId})
    browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  } else {
    cookies = await browser.cookies.getAll({domain: domain})
    cookies = await browser.cookies.getAll({domain: domain})
    cookiesURL = await browser.cookies.getAll({url: domainURL.replace(/\/www\./, '/')})
    cookiesURL2 = await browser.cookies.getAll({url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:').replace(/\/www\./, '/') : domainURL.replace('https:', 'http:').replace(/\/www\./, '/')})
    cookiesSec = await browser.cookies.getAll({domain: domain, secure: true})
    cookies2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.')})
    cookiesSec2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true})
  }

  let hasCookie = false
  for (let cookie of cookiesURL) {
    hasCookie = false
    for (let cookieEntry of cookies) {
      if (cookieEntry.name === cookie.name) {
        hasCookie = true
        break
      }
    }

    if (!hasCookie) cookies.push(cookie)
  }

  for (let cookie of cookiesURL2) {
    hasCookie = false
    for (let cookieEntry of cookies) {
      if (cookieEntry.name === cookie.name) {
        hasCookie = true
        break
      }
    }

    if (!hasCookie) cookies.push(cookie)
  }

  for (let cookie of cookiesSec) {
    hasCookie = false
    for (let cookieEntry of cookies) {
      if (cookieEntry.name === cookie.name) {
        hasCookie = true
        break
      }
    }

    if (!hasCookie) cookies.push(cookie)
  }

  for (let cookie of cookies2) {
    hasCookie = false
    for (let cookieEntry of cookies) {
      if (cookieEntry.name === cookie.name) {
        hasCookie = true
        break
      }
    }

    if (!hasCookie) cookies.push(cookie)
  }

  for (let cookie of cookiesSec2) {
    hasCookie = false
    for (let cookieEntry of cookies) {
      if (cookieEntry.name === cookie.name) {
        hasCookie = true
        break
      }
    }

    if (!hasCookie) cookies.push(cookie)
  }

  if (currentTab.cookieStoreId !== undefined) clearCookiesAction(action, data, cookies, domainURL, currentTab, currentTab.cookieStoreId)
  else clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default')
}

function handleMessage (request, sender, sendResponse) {
  if (request.getCookies !== undefined && request.windowId !== undefined && request.tabId !== undefined && openTabData[request.windowId] !== undefined && openTabData[request.windowId][request.tabId] !== undefined) {
    let cookieDataDomain = {}

    let domainData = openTabData[request.windowId][request.tabId]
    let rootDomain = 'No active domain'
    let contextName = request.storeId

    if (useChrome) contextName = 'default'

    for (let key of Object.keys(domainData)) {
      if (domainData[key]['isRoot'] !== undefined) {
        rootDomain = domainData[key].u
        cookieDataDomain[rootDomain] = []
        if (cookieData[rootDomain][contextName] === undefined || cookieData[rootDomain][contextName].length === 0) continue
        for (let cookieInfo of cookieData[rootDomain][contextName]) {
          cookieDataDomain[rootDomain].push(cookieInfo)
        }

        break
      }
    }

    if (cookieDataDomain[rootDomain] !== undefined && cookieDataDomain[rootDomain].length === 0) {
      delete cookieDataDomain[rootDomain]
    }

    for (let key of Object.keys(domainData)) {
      if (domainData[key]['isRoot'] !== undefined) continue
      let domainName = domainData[key].u
      if (cookieDataDomain[domainName] === undefined) cookieDataDomain[domainName] = []
      if (cookieData[domainName] === undefined || cookieData[domainName][contextName] === undefined || cookieData[domainName][contextName].length === 0) continue
      for (let cookieInfo of cookieData[domainName][contextName]) {
        let isFound = false

        for (let cookieExistingInfo of cookieDataDomain[domainName]) {
          if (cookieInfo.name === cookieExistingInfo.name) {
            isFound = true
            break
          }
        }

        if (!isFound) {
          for (let cookieExistingInfo of cookieDataDomain[domainName]) {
            if (cookieInfo.name === cookieExistingInfo.name) {
              isFound = true
              break
            }
          }
        }

        if (!isFound) cookieDataDomain[domainName].push(cookieInfo)
      }

      if (cookieDataDomain[domainName].length === 0) {
        delete cookieDataDomain[domainName]
      }
    }

    sendResponse({'cookies': cookieDataDomain, 'rootDomain': rootDomain})
    return
  }

  sendResponse({'cookies': null, 'rootDomain': 'Unknown domain'})
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, domainURL, currentTab, activeCookieStore) {
  domainURL = domainURL.replace('/www.', '/')
  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  if (cookieData[domainURL] === undefined) cookieData[domainURL] = {}
  if (cookieData[domainURL][contextName] === undefined) cookieData[domainURL][contextName] = []

  for (let cookie of cookies) {
    let foundCookie = false
    let index = 0
    for (let cookieEntry of cookieData[domainURL][contextName]) {
      if (cookieEntry.name === cookie.name) {
        cookie['fgRemoved'] = false
        cookie['fgAllowed'] = true
        cookie['fgHandled'] = true
        if (!useChrome && cookieEntry.storeId !== undefined && cookieEntry.storeId === cookie.storeId) {
          cookieData[domainURL][contextName][index] = cookie
          foundCookie = true
          break
        } else {
          cookieData[domainURL][contextName][index] = cookie
          foundCookie = true
          break
        }
      }
      index++
    }

    if (!foundCookie) {
      cookie['fgRemoved'] = false
      cookie['fgAllowed'] = true
      cookie['fgHandled'] = true
      if (!useChrome) {
        if (cookie.storeId === currentTab.cookieStoreId) cookieData[domainURL][contextName].push(cookie)
      } else cookieData[domainURL][contextName].push(cookie)
    }
  }

  let hasProfile = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] && data['flagCookies_accountMode'][contextName][domainURL] !== undefined
  let protectDomainCookies = false
  let hasLogged = false
  if (hasProfile) {
    hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined
    if (data['flagCookies_logged'] === undefined || data['flagCookies_logged'][contextName] === undefined || data['flagCookies_logged'][contextName][domainURL] === undefined || Object.keys(data['flagCookies_logged'][contextName][domainURL]).length === 0) protectDomainCookies = true
  }

  let dateObj = new Date()
  let timeString = (dateObj.getHours() < 10 ? '0' + dateObj.getHours() : dateObj.getHours()) + ':' + (dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes()) + ':' + (dateObj.getSeconds() < 10 ? '0' + dateObj.getSeconds() : dateObj.getSeconds())
  let timestamp = dateObj.getTime()

  let urlInFlag = false
  if (openTabData[currentTab.windowId] === undefined || openTabData[currentTab.windowId][currentTab.id] === undefined || openTabData[currentTab.windowId][currentTab.id]['0'] === undefined) return
  let storageDomain = openTabData[currentTab.windowId][currentTab.id]['0']['u']

  if (data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined && data['flagCookies_autoFlag'][contextName][openTabData[currentTab.windowId][currentTab.id]['0']['u']]) {
    for (let entry of Object.values(openTabData[currentTab.windowId][currentTab.id])) {
      if (entry.u === domainURL) {
        urlInFlag = true
        break
      }
    }
  }

  if (data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && urlInFlag) {
    for (let cookie of cookieData[domainURL][contextName]) {
      let cookieDomain = cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1, cookie.domain.length - 1) : cookie.domain
      if (protectDomainCookies && (('https://' + cookieDomain.replace('www.', '')) === domainURL || ('http://' + cookieDomain.replace('www.', '')) === domainURL)) continue

      cookie['fgHandled'] = true

      if (hasProfile && hasLogged && data['flagCookies_logged'][contextName][storageDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][storageDomain][cookie.domain][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      } else if (data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      if (useChrome) {
        let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        if (chrome.cookies.remove(details) !== null) {
          if (data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          } else {
            let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          cookie['fgRemoved'] = true
        }

        if (chrome.cookies.remove(details2) !== null) {
          if (data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          } else {
            let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          cookie['fgRemoved'] = true
        }

        continue
      }

      let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
        if (data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        } else {
          let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        }

        cookie['fgRemoved'] = true
      }

      if (await browser.cookies.remove(details2) !== null && await browser.cookies.get(details2) === null) {
        if (data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        } else {
          let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        }

        cookie['fgRemoved'] = true
      }
    }
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    for (let cookie of cookieData[domainURL][contextName]) {
      let cookieDomain = cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1, cookie.domain.length - 1) : cookie.domain
      if (protectDomainCookies && (('https://' + cookieDomain.replace('www.', '')) === domainURL || ('http://' + cookieDomain.replace('www.', '')) === domainURL)) continue

      cookie['fgHandled'] = true

      if (hasProfile && hasLogged && data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data['flagCookies_logged'][contextName][storageDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][storageDomain][cookie.domain][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      } else if (data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      if (useChrome) {
        let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        if (chrome.cookies.remove(details) !== null) {
          if (data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          cookie['fgRemoved'] = true
        }

        if (chrome.cookies.remove(details2) !== null) {
          if (data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
            addToLogData(currentTab, msg, timeString, timestamp)
          }

          cookie['fgRemoved'] = true
        }

        continue
      }

      let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
        if (data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        } else {
          let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        }

        cookie['fgRemoved'] = true
      }

      if (await browser.cookies.remove(details2) !== null && await browser.cookies.get(details2) === null) {
        if (data[contextName] !== undefined && data[contextName][storageDomain] !== undefined && data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        } else {
          let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
        }

        cookie['fgRemoved'] = true
      }
    }
  } else {
    if (data[contextName] === undefined || data[contextName][storageDomain] === undefined || Object.keys(data[contextName][storageDomain]) === 0) {
      for (let cookie of cookieData[domainURL][contextName]) {
        cookie['fgHandled'] = false
      }
      return
    }

    for (let cookie of cookieData[domainURL][contextName]) {
      cookie['fgHandled'] = true
      if (data[contextName][storageDomain][cookie.domain] === undefined || (data[contextName][storageDomain][cookie.domain] !== undefined && data[contextName][storageDomain][cookie.domain][cookie.name] === undefined)) {
        continue
      }

      let cookieDomain = cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1, cookie.domain.length - 1) : cookie.domain
      if (protectDomainCookies && (('https://' + cookieDomain.replace('www.', '')) === domainURL || ('http://' + cookieDomain.replace('www.', '')) === domainURL)) continue

      if (data[contextName][storageDomain][cookie.domain][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      } else if (hasProfile && hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][storageDomain] !== undefined && data['flagCookies_logged'][contextName][storageDomain][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][storageDomain][cookie.domain][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      if (useChrome) {
        let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name }
        let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name }
        if (chrome.cookies.remove(details) !== null) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgRemoved'] = true
        }

        if (chrome.cookies.remove(details2) !== null) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
          addToLogData(currentTab, msg, timeString, timestamp)
          cookie['fgRemoved'] = true
        }

        continue
      }

      let details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      let details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name, storeId: activeCookieStore }
      if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
        let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'https://' + cookieDomain + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgRemoved'] = true
      }

      if (await browser.cookies.remove(details2) !== null && await browser.cookies.get(details2) === null) {
        let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + 'http://' + cookieDomain + "'"
        addToLogData(currentTab, msg, timeString, timestamp)
        cookie['fgRemoved'] = true
      }
    }
  }

  if (data['flagCookies'] === undefined) data['flagCookies'] = {}
  if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
  if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = {}
  if (data['flagCookies']['logData'][contextName][currentTab.windowId] === undefined) data['flagCookies']['logData'][contextName][currentTab.windowId] = {}
  if (data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] === undefined) data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = []
  if (logData[contextName] === undefined || logData[contextName][currentTab.windowId] === undefined || logData[contextName][currentTab.windowId][currentTab.id] === undefined) {
    data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = []
  } else {
    data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = logData[contextName][currentTab.windowId][currentTab.id].sort()
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
}

// --------------------------------------------------------------------------------------------------------------------------------
// Chrome: Update storage log data
function chromeUpdateLogData (data, writeData, currentTab) {
  function updatedData () {
    if (chrome.runtime.lastError !== undefined) {
      if (hasConsole) console.log('Browser could not store data')

      void chrome.runtime.lastError
      return
    }

    if (hasConsole) console.log('Browser updated the browser storage')
  }

  if (writeData) {
    if (data['flagCookies'] === undefined) data['flagCookies'] = {}
    if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
    if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = {}
    if (data['flagCookies']['logData'][contextName][currentTab.windowId] === undefined) data['flagCookies']['logData'][contextName][currentTab.windowId] = {}
    if (data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] === undefined) data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = []
    if (logData[contextName] === undefined || logData[contextName][currentTab.windowId] === undefined || logData[contextName][currentTab.windowId][currentTab.id] === undefined) {
      data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = []
    } else {
      data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id] = logData[contextName][currentTab.windowId][currentTab.id].sort()
    }

    chrome.storage.local.set(data, updatedData)
  } else {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeUpdateLogData(data, true, currentTab) })
  }
}

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    if (useChrome) chrome.browserAction.disable(tab.id)
    else browser.browserAction.disable(tab.id)
    clearCookiesWrapper('tab reload/load', useChrome)
  } else if (changeInfo.status !== undefined && changeInfo.status === 'complete') {
    addTabURLtoDataList(tab, {'url': tab.url, 'frameId': 0, 'parentFrameId': -1, 'type': 'main_frame'})

    if (!useChrome) browser.contextualIdentities.get(tab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
    else contextName = 'default'

    let urlMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)

    let tabDomain
    if (urlMatch) tabDomain = urlMatch[0]

    let titleString = '::::::::::::::::::: Flag Cookies :: Action log :::::::::::::::::::'
    let statuses = ['Global-flag', 'Auto-flag', 'Deleted', 'Permitted']
    let hasTitleChange = false

    if (logData[contextName] !== undefined && logData[contextName][tab.windowId] !== undefined && logData[contextName][tab.windowId][tab.id] !== undefined) {
      for (let status of statuses) {
        let titleJoin = []
        let index = 0

        for (let msg of logData[contextName][tab.windowId][tab.id]) {
          if (msg.indexOf(status) !== -1) {
            let cookieName = '"' + msg.match(/cookie: '(.*)' for/)[1] + '"'
            if (titleJoin.indexOf(cookieName) === -1) {
              titleJoin.push(cookieName)

              if (index !== 0 && index % 4 === 0) titleJoin.push('\n')
              ++index
            }
          }
        }

        if (titleJoin.length !== 0) {
          titleString += '\n' + status + ': \'' + titleJoin.join(',')
          hasTitleChange = true
        }
      }
    }

    if (!hasTitleChange) titleString += '\nNo actions taken on this page'

    if (useChrome) {
      chrome.browserAction.enable(tab.id)
      chrome.browserAction.setTitle({'title': titleString, 'tabId': tab.id})
      getChromeStorageForFunc3(setBrowserActionIconChrome, contextName, tabDomain, tabId)
    } else {
      browser.browserAction.enable(tab.id)
      browser.browserAction.setTitle({'title': titleString, 'tabId': tab.id})
      setBrowserActionIconFirefox(contextName, tabDomain, tab.id)
    }

    let count = 0
    if (logData[contextName] !== undefined && logData[contextName][tab.windowId] !== undefined && logData[contextName][tab.windowId][tab.id] !== undefined) {
      let foundCookies = []

      for (let entry of logData[contextName][tab.windowId][tab.id]) {
        if (entry.toLowerCase().indexOf('deleted') !== -1) {
          let cookieName = entry.match(/cookie: '[^']*/)[0]
          let cookieDomain = entry.match(/for '[^']*/)[0]
          cookieName = cookieName.substr(cookieName.indexOf("'") + 1, cookieName.length)
          cookieDomain = cookieName.substr(cookieDomain.indexOf("'") + 1, cookieDomain.length)
          let cookieString = cookieName + ' ' + cookieDomain

          if (foundCookies.indexOf(cookieString) !== -1) continue
          foundCookies.push(cookieString)
          count++
        }
      }

      if (useChrome) {
        if (count !== 0) chrome.browserAction.setBadgeText({ text: count.toString(), tabId: tab.id })
        else chrome.browserAction.setBadgeText({ text: '', tabId: tab.id })
      } else {
        if (count !== 0) browser.browserAction.setBadgeText({ text: count.toString(), tabId: tab.id })
        else browser.browserAction.setBadgeText({ text: '', tabId: tab.id })
      }
    }

    if (useChrome) {
      chromeUpdateLogData(null, false, tab)
      getChromeStorageForFunc3(displayCookieDeleteChrome, count, tabDomain, contextName)
      return
    }

    let data = await browser.storage.local.get(null)
    if (data['flagCookies'] === undefined) data['flagCookies'] = {}
    if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
    if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = {}
    if (data['flagCookies']['logData'][contextName][tab.windowId] === undefined) data['flagCookies']['logData'][contextName][tab.windowId] = {}
    if (data['flagCookies']['logData'][contextName][tab.windowId][tab.id] === undefined) data['flagCookies']['logData'][contextName][tab.windowId][tab.id] = []
    if (logData[contextName] === undefined || logData[contextName][tab.windowId] === undefined || logData[contextName][tab.windowId][tab.id] === undefined) {
      data['flagCookies']['logData'][contextName][tab.windowId][tab.id] = []
    } else {
      data['flagCookies']['logData'][contextName][tab.windowId][tab.id] = logData[contextName][tab.windowId][tab.id].sort()
    }

    await browser.storage.local.set(data)

    if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
      browser.notifications.create('cookie_cleared', {type: 'basic', message: count + ' cookie(s) removed for domain "' + tabDomain + '" in context "' + contextName + '".', title: 'Flag Cookies: Cookies removed', iconUrl: 'icons/cookie_128.png'})
    }
  }
}

function displayCookieDeleteChrome (data, count, tabDomain, contextName) {
  if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
    chrome.notifications.create('cookie_cleared', {type: 'basic', message: count + ' cookie(s) removed for domain "' + tabDomain + '" in context "' + contextName + '".', title: 'Flag Cookies: Cookies removed', iconUrl: 'icons/cookie_128.png'})
  }
}

function clearCookiesOnLeave (tabId, moveInfo) {
  removeTabIdfromDataList(tabId, moveInfo)
  clearCookiesWrapper('tab close', useChrome)
}

function setBrowserActionIconChrome (data, contextName, tabDomain, tabId) {
  let inAccountMode = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][tabDomain] !== undefined
  if (inAccountMode) {
    chrome.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '19': 'icons/cookie_19_profil.png',
        '38': 'icons/cookie_38_profil.png',
        '48': 'icons/cookie_48_profil.png',
        '64': 'icons/cookie_64_profil.png',
        '96': 'icons/cookie_96_profil.png',
        '128': 'icons/cookie_128_profil.png'
      }
    })
  } else {
    chrome.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '19': 'icons/cookie_19.png',
        '38': 'icons/cookie_38.png',
        '48': 'icons/cookie_48.png',
        '64': 'icons/cookie_64.png',
        '96': 'icons/cookie_96.png',
        '128': 'icons/cookie_128.png'
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
        '19': 'icons/cookie_19_profil.png',
        '38': 'icons/cookie_38_profil.png',
        '48': 'icons/cookie_48_profil.png',
        '64': 'icons/cookie_64_profil.png',
        '96': 'icons/cookie_96_profil.png',
        '128': 'icons/cookie_128_profil.png'
      }
    })
  } else {
    browser.browserAction.setIcon({
      'tabId': tabId,
      'path': {
        '19': 'icons/cookie_19.png',
        '38': 'icons/cookie_38.png',
        '48': 'icons/cookie_48.png',
        '64': 'icons/cookie_64.png',
        '96': 'icons/cookie_96.png',
        '128': 'icons/cookie_128.png'
      }
    })
  }
}
// --------------------------------------------------------------------------------------------------------------------------------
// Log info
async function clearDomainLog (chromeData, currentTab) {
  if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
    if (useChrome) {
      if (chromeData === null) {
        getChromeStorageForFunc1(clearDomainLog, currentTab)
        return
      } else {
        delete logData[contextName][currentTab.windowId][currentTab.id]
        if (Object.keys(logData[contextName][currentTab.windowId]).length === 0) delete logData[contextName][currentTab.windowId]

        delete chromeData['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id]
        if (Object.keys(chromeData['flagCookies']['logData'][contextName][currentTab.windowId]).length === 0) delete chromeData['flagCookies']['logData'][contextName][currentTab.windowId]
        setChromeStorage(chromeData)
        return
      }
    }

    delete logData[contextName][currentTab.windowId][currentTab.id]
    if (Object.keys(logData[contextName][currentTab.windowId]).length === 0) delete logData[contextName][currentTab.windowId]

    let data = await browser.storage.local.get(null)
    delete data['flagCookies']['logData'][contextName][currentTab.windowId][currentTab.id]

    if (Object.keys(data['flagCookies']['logData'][contextName][currentTab.windowId]).length === 0) delete data['flagCookies']['logData'][contextName][currentTab.windowId]

    await browser.storage.local.set(data)
  }
}

function addToLogData (currentTab, msg, timeString, timestamp) {
  if (!useChrome) browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  if (logData[contextName] === undefined) logData[contextName] = {}
  if (logData[contextName][currentTab.windowId] === undefined) logData[contextName][currentTab.windowId] = {}
  if (logData[contextName][currentTab.windowId][currentTab.id] === undefined) logData[contextName][currentTab.windowId][currentTab.id] = []

  if (logTime[contextName] === undefined) logTime[contextName] = {}
  if (logTime[contextName][currentTab.windowId] === undefined) logTime[contextName][currentTab.windowId] = {}
  if (logTime[contextName][currentTab.windowId][currentTab.id] === undefined) logTime[contextName][currentTab.windowId][currentTab.id] = 0

  msg = msg.replace(/\/www\./, '/')
  msg = '[' + timeString + ']  ' + msg
  logData[contextName][currentTab.windowId][currentTab.id].push(msg)
  logTime[contextName][currentTab.windowId][currentTab.id] = timestamp
}

// Account mode switch key command
async function toggleAccountMode (data, contextName, url, tabid, useNotifcations) {
  if (data['flagCookies_accountMode'] === undefined) data['flagCookies_accountMode'] = {}
  if (data['flagCookies_accountMode'][contextName] === undefined) data['flagCookies_accountMode'][contextName] = {}

  let useNotifications = data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true

  if (data['flagCookies_accountMode'][contextName][url] === undefined) {
    data['flagCookies_accountMode'][contextName][url] = true

    if (useNotifications) {
      if (useChrome) chrome.notifications.create('profile_activated', {type: 'basic', message: 'Profile mode enabled for domain "' + url + '" in "' + contextName + '".', title: 'Flag Cookies: Profile mode enabled', iconUrl: 'icons/cookie_128_profil.png'})
      else browser.notifications.create('profile_activated', {type: 'basic', message: 'Profile mode enabled for domain "' + url + '" in context "' + contextName + '".', title: 'Flag Cookies: Profile mode enabled', iconUrl: 'icons/cookie_128_profil.png'})
    }
  } else {
    delete data['flagCookies_accountMode'][contextName][url]

    if (useNotifications) {
      if (useChrome) chrome.notifications.create('profile_deactivated', {type: 'basic', message: 'Profile mode disabled for domain "' + url + '" in "' + contextName + '".', title: 'Flag Cookies: Profile mode disabled', iconUrl: 'icons/cookie_128.png'})
      else browser.notifications.create('profile_deactivated', {type: 'basic', message: 'Profile mode disabled for domain "' + url + '" in context "' + contextName + '".', title: 'Flag Cookies: Profile mode disabled', iconUrl: 'icons/cookie_128.png'})
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
      chrome.tabs.query({currentWindow: true, active: true}, function (activeTabs) {
        if (!checkChromeHadNoErrors()) return
        if (activeTabs.length !== 0) {
          let activeTab = activeTabs.pop()
          if (activeTab.url !== undefined) {
            let urlMatch = activeTab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
            if (urlMatch !== null) getChromeStorageForFunc3(toggleAccountMode, contextName, urlMatch[0], activeTab.id)
          }
        }
      })
    } else {
      let activeTab = await getActiveTabFirefox()

      if (activeTab.url !== undefined) {
        let urlMatch = activeTab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
        if (urlMatch !== null) {
          let data = await browser.storage.local.get(null)
          toggleAccountMode(data, contextName, urlMatch[0], activeTab.id)
        }
      }
    }
  }
}

function onCookieChanged (changeInfo) {
  if (!changeInfo.removed && (changeInfo.cause === 'explicit' || changeInfo.cause === 'expired_overwrite' || changeInfo.cause === 'overwrite')) {
    let cookieDetails = changeInfo.cookie

    let activeCookieStore = 'default'

    if (!useChrome) {
      activeCookieStore = cookieDetails.storeId !== undefined ? cookieDetails.storeId : 'default'
    }

    let domainName = cookieDetails['domain'].charAt(0) === '.' ? cookieDetails['domain'].substr(1, cookieDetails['domain'].length) : cookieDetails['domain']

    let activeDomain = null
    for (let domainKey of Object.keys(cookieData)) {
      if (domainKey.indexOf(domainName) !== -1) {
        activeDomain = domainKey
        break
      }
    }

    if (activeDomain === null) return
    if (cookieData[activeDomain][contextName] === undefined) return

    let foundCookie = false
    let index = 0
    for (let cookie of cookieData[activeDomain][contextName]) {
      if (cookieDetails.name === cookie.name) {
        cookieData[activeDomain][contextName][index] = cookieDetails
        foundCookie = true
        break
      }

      ++index
    }

    if (!foundCookie) {
      cookieData[activeDomain][contextName].push(cookieDetails)
    }
  }
}

async function onContextRemoved (changeInfo) {
  let activeCookieStore = changeInfo.contextualIdentity.name
  let data = await browser.storage.local.get()

  if (data[activeCookieStore] !== undefined) {
    delete data[activeCookieStore]
    browser.storage.local.remove(activeCookieStore)
  }

  if (data['flagCookies'] !== undefined) {
    if (data['flagCookies']['logData'] !== undefined && data['flagCookies']['logData'][activeCookieStore] !== undefined) {
      delete data['flagCookies']['logData'][activeCookieStore]
      if (Object.keys(data['flagCookies']['logData']).length === 0) delete data['flagCookies']['logData']
    }

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

function addTabURLtoDataList (tab, details) {
  if (!details.url.startsWith('chrome:') && !details.url.startsWith('about:')) {
    if (openTabData[tab.windowId] === undefined) openTabData[tab.windowId] = {}
    if (openTabData[tab.windowId][tab.id] === undefined) openTabData[tab.windowId][tab.id] = {}

    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      if (openTabData[tab.windowId][tab.id][details.frameId] !== undefined && openTabData[tab.windowId][tab.id][details.frameId].d !== getURLDomain(details.url)) {
        openTabData[tab.windowId][tab.id] = {}
      }

      if (useChrome) openTabData[tab.windowId][tab.id][details.frameId] = {'u': details.url.replace('/www.', '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)[0], 'd': getURLDomain(details.url), 'isRoot': true}
      else openTabData[tab.windowId][tab.id][details.frameId] = {'s': tab.cookieStoreId, 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)[0], 'd': getURLDomain(details.url), 'isRoot': true}
      return
    }

    if (openTabData[tab.windowId][tab.id][details.frameId] === undefined) {
      if (useChrome) openTabData[tab.windowId][tab.id][details.frameId] = {'u': details.url.replace('/www.', '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)[0], 'd': getURLDomain(details.url)}
      else openTabData[tab.windowId][tab.id][details.frameId] = {'s': tab.cookieStoreId, 'u': details.url.replace('/www.', '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)[0], 'd': getURLDomain(details.url)}
    }
  }
}

async function removeTabIdfromDataList (tabId, removeInfo) {
  if (removeInfo === undefined) return
  if (openTabData[removeInfo.windowId] !== undefined && openTabData[removeInfo.windowId][tabId] !== undefined) {
    let domainData = openTabData[removeInfo.windowId][tabId]
    let rootDomain = null
    let activeCookieStore = 'default'

    for (let key of Object.keys(domainData)) {
      if (domainData[key]['isRoot'] !== undefined) {
        rootDomain = domainData[key].u
        if (domainData[key]['s'] !== undefined) {
          activeCookieStore = domainData[key].s
        }
        break
      }
    }

    if (rootDomain !== null && cookieData[rootDomain] !== undefined && cookieData[rootDomain][activeCookieStore] !== undefined) {
      delete cookieData[rootDomain][activeCookieStore]
      if (Object.keys(cookieData[rootDomain]).length === 0) delete cookieData[rootDomain]
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

    if (Object.keys(openTabData[removeInfo.windowId]).length === 0) {
      delete openTabData[removeInfo.windowId]
    }
  }
}

function clearCookiesOnRequestChrome (details) {
  if (logData[contextName] === undefined) logData[contextName] = {}
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    chrome.tabs.query({}, function (activeTabs) {
      let currentTab

      for (let tab of activeTabs) {
        if (tab.id === details.tabId) {
          currentTab = tab
          break
        }
      }

      if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
        let domainURL
        let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
        if (urlMatch !== null) domainURL = urlMatch[0]
        else domainURL = details.url.replace(/\/www\./, '/')

        if (logTime[contextName] !== undefined && logTime[contextName][currentTab.windowId] !== undefined && logTime[contextName][currentTab.windowId][currentTab.id] !== undefined) {
          let dateObj = new Date()
          if (logTime[contextName][currentTab.windowId][currentTab.id] <= dateObj.getTime()) clearDomainLog(null, currentTab)
        }

        if (currentTab.url !== details.url) {
          if (cookieData[domainURL] !== undefined && cookieData[domainURL][contextName] !== undefined) cookieData[domainURL][contextName] = []
        }

        if (openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined) {
          openTabData[currentTab.windowId][currentTab.id] = {}
        }
      }

      addTabURLtoDataList(currentTab, details)

      if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
        let domainURL
        let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
        if (urlMatch !== null) domainURL = urlMatch[0]
        else domainURL = details.url.replace(/\/www\./, '/')

        chromeGetStorageAndClearCookies('document load', null, null, domainURL, currentTab)
      }
    })
  }
}

async function clearCookiesOnRequest (details) {
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    let currentTab
    let tabList

    switch (details.type) {
      case 'xmlhttprequest':
        tabList = await browser.tabs.query({'url': details.originUrl})
        break
      case 'sub_frame':
        tabList = await browser.tabs.query({})
        break
      case 'main_frame':
        tabList = await browser.tabs.query({'url': details.url})
        break
    }

    for (let tab of tabList) {
      if (tab.id === details.tabId) {
        currentTab = tab
        break
      }
    }

    let data = await browser.storage.local.get()

    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)

      let domainURL
      let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
      if (urlMatch !== null) domainURL = urlMatch[0]
      else domainURL = details.url.replace(/\/www\./, '/')

      if (logTime[contextName] !== undefined && logTime[contextName][currentTab.windowId] !== undefined && logTime[contextName][currentTab.windowId][currentTab.id] !== undefined) {
        let dateObj = new Date()
        if (logTime[contextName][currentTab.windowId][currentTab.id] <= dateObj.getTime()) clearDomainLog(null, currentTab)
      }

      if (currentTab.url !== details.url) {
        if (cookieData[domainURL] !== undefined && cookieData[domainURL][contextName] !== undefined) cookieData[domainURL][contextName] = []
      }

      if (openTabData[currentTab.windowId] !== undefined && openTabData[currentTab.windowId][currentTab.id] !== undefined) {
        openTabData[currentTab.windowId][currentTab.id] = {}
      }

      if (data[contextName] === undefined) data[contextName] = {}
      if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}
    }

    addTabURLtoDataList(currentTab, details)

    let domainURL
    let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
    if (urlMatch !== null) domainURL = urlMatch[0]
    else domainURL = details.url.replace(/\/www\./, '/')

    let domain = getURLDomain(domainURL)
    let cookies
    let cookiesURL = []
    let cookiesURL2 = []
    let cookiesSec = []
    let cookies2 = []
    let cookiesSec2 = []
    if (currentTab.cookieStoreId !== undefined) {
      cookies = await browser.cookies.getAll({domain: domain, storeId: currentTab.cookieStoreId})
      cookiesURL = await browser.cookies.getAll({url: domainURL, storeId: currentTab.cookieStoreId})
      cookiesURL2 = await browser.cookies.getAll({url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:') : domainURL.replace('https:', 'http:'), storeId: currentTab.cookieStoreId})
      cookiesSec = await browser.cookies.getAll({domain: domain, secure: true, storeId: currentTab.cookieStoreId})
      cookies2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), storeId: currentTab.cookieStoreId})
      cookiesSec2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true, storeId: currentTab.cookieStoreId})
    } else {
      cookies = await browser.cookies.getAll({domain: domain})
      cookies = await browser.cookies.getAll({domain: domain})
      cookiesURL = await browser.cookies.getAll({url: domainURL.replace(/\/www\./, '/')})
      cookiesSec = await browser.cookies.getAll({domain: domain, secure: true})
      cookies2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.')})
      cookiesURL2 = await browser.cookies.getAll({url: domainURL.indexOf('http:') !== -1 ? domainURL.replace('http:', 'https:').replace(/\/www\./, '/') : domainURL.replace('https:', 'http:').replace(/\/www\./, '/')})
      cookiesSec2 = await browser.cookies.getAll({domain: domainURL.replace(/(http|https):\/\//, '.'), secure: true})
    }

    let hasCookie = false
    for (let cookie of cookiesURL) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) cookies.push(cookie)
    }

    for (let cookie of cookiesURL2) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) cookies.push(cookie)
    }

    for (let cookie of cookies2) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) cookies.push(cookie)
    }

    for (let cookie of cookiesSec) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) cookies.push(cookie)
    }

    for (let cookie of cookiesSec2) {
      hasCookie = false
      for (let cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name) {
          hasCookie = true
          break
        }
      }

      if (!hasCookie) cookies.push(cookie)
    }

    if (currentTab.cookieStoreId !== undefined) clearCookiesAction('document load', data, cookies, domainURL, currentTab, currentTab.cookieStoreId)
    else clearCookiesAction('document load', data, cookies, domainURL, currentTab, 'default')
  }
}

// --------------------------------------------------------------------------------------------------------------------------------

if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave)
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  chrome.runtime.onMessage.addListener(handleMessage)
  chrome.commands.onCommand.addListener(getCommand)
  chrome.cookies.onChanged.addListener(onCookieChanged)

  chrome.windows.onRemoved.addListener(removeTabIdfromDataList)
  chrome.webRequest.onBeforeRequest.addListener(clearCookiesOnRequestChrome, {urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest']}, ['blocking'])
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.runtime.onMessage.addListener(handleMessage)
  browser.commands.onCommand.addListener(getCommand)
  browser.cookies.onChanged.addListener(onCookieChanged)
  browser.contextualIdentities.onRemoved.addListener(onContextRemoved)
  browser.windows.onRemoved.addListener(removeTabIdfromDataList)
  browser.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, {urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest']}, ['blocking'])
}
