let logData = {} // The log data we seen as a report to the settings view
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

// Chrome
function chromeGetStorageAndClearCookies (action, data, cookies, domainURL, doLoadURLCookies) {
  if (data === null) {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, false) })
    return
  } else if (cookies === null) {
    let domain = getURLDomain(domainURL)
    chrome.cookies.getAll({domain: domain}, function (cookies) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, true) })
    return
  } else if (doLoadURLCookies === true) {
    let cookieDomain = domainURL.replace(/\/www./, '/')
    chrome.cookies.getAll({url: cookieDomain}, function (cookieSub) {
      checkChromeHadNoErrors()

      for (let cookie of cookieSub) {
        cookies.push(cookie)
      }

      chromeGetStorageAndClearCookies(action, data, cookies, domainURL, false)
    })
    return
  }

  clearCookiesAction(action, data, cookies, domainURL, 'default')
}

async function getDomainURLFirefox () {
  let tab = await getActiveTabFirefox()
  if (tab !== null) {
    if (tab.url !== undefined) {
      let urlMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
      if (urlMatch) {
        return urlMatch[0]
      }
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
        let urlMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
        if (urlMatch) {
          let domainURL = urlMatch[0]
          chromeGetStorageAndClearCookies(action, null, null, domainURL, false)
        }
      }
    }
  })
}

function getURLDomain (domainURL) {
  let outDomainName = domainURL.replace(/(http|https):\/\//, '').replace('www.', '')
  let tip1 = outDomainName.indexOf('.')
  let tip2 = outDomainName.lastIndexOf('.')
  if (tip1 !== tip2) {
    return outDomainName.substr(tip1 + 1, tip2).replace('/', '')
  } else {
    return outDomainName.replace('/', '')
  }
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

  let domain = getURLDomain(domainURL)
  let cookies
  let cookiesURL = []
  if (currentTab.cookieStoreId !== undefined) {
    cookies = await browser.cookies.getAll({domain: domain, storeId: currentTab.cookieStoreId})
    cookiesURL = await browser.cookies.getAll({url: domainURL, storeId: currentTab.cookieStoreId})

    await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  } else {
    cookies = await browser.cookies.getAll({domain: domain})
    cookiesURL = await browser.cookies.getAll({url: domainURL.replace(/\/www./, '/')})
  }

  for (let cookie of cookiesURL) {
    cookies.push(cookie)
  }

  if (currentTab.cookieStoreId !== undefined) clearCookiesAction(action, data, cookies, domainURL, currentTab.cookieStoreId)
  else clearCookiesAction(action, data, cookies, domainURL, 'default')
}

function handleMessage (request, sender, sendResponse) {
  if (request.getCookies !== undefined) {
    if (cookieData[request.getCookies] !== undefined) {
      sendResponse({'cookies': cookieData[request.getCookies][request.storeId]})
    } else {
      let found = false
      for (let entry of Object.keys(cookieData)) {
        let modDomainName = entry.replace(/\/www./, '/')
        if (modDomainName === request.getCookies) {
          found = true
          sendResponse({'cookies': cookieData[entry][request.storeId]})
          break
        }
      }

      if (!found) sendResponse({'cookies': []})
    }
  }
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, domainURL, activeCookieStore) {
  if (domainURL === '' || cookies === undefined) return

  let useWWW = false
  let urls = [domainURL]

  if (domainURL.indexOf('www.') !== -1) {
    useWWW = domainURL
    domainURL = domainURL.replace('www.', '')
    urls = [useWWW, domainURL]
  }

  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}

  if (cookieData[domainURL] === undefined) {
    cookieData[domainURL] = {}
  }

  if (cookieData[domainURL][activeCookieStore] === undefined) {
    cookieData[domainURL][activeCookieStore] = []
  }

  for (let cookie of cookies) {
    let foundCookie = false
    let index = 0
    for (let cookieEntry of cookieData[domainURL][activeCookieStore]) {
      if (cookieEntry.name === cookie.name) {
        cookieData[domainURL][activeCookieStore][index] = cookie
        foundCookie = true
        break
      }
      index++
    }

    if (!foundCookie) cookieData[domainURL][activeCookieStore].push(cookie)
  }

  let hasProfile = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] && data['flagCookies_accountMode'][contextName][domainURL] !== undefined
  let hasLogged = false
  if (hasProfile) {
    hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][contextName] && data['flagCookies_autoFlag'][contextName][domainURL]) {
    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      if (hasProfile && hasLogged && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + urls[0] + "'"
        addToLogData(msg)
        continue
      }

      if (data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        continue
      }

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (data[contextName][domainURL][cookie.name] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            } else {
              let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            }
          }

          if (chrome.cookies.remove(details) !== null) {
            if (data[contextName][domainURL][cookie.name] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            } else {
              let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            }
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }
        if (await browser.cookies.remove(details) !== null) {
          if (data[contextName][domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
          } else {
            let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
          }
        }
      }
    }
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      if (hasProfile && hasLogged && data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
        continue
      }

      if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        continue
      }

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            } else {
              let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(msg)
            }
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }
        if (await browser.cookies.remove(details) !== null) {
          if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
          }
        }
      }
    }
  } else {
    if (data[contextName] === undefined || data[contextName][domainURL] === undefined || Object.keys(data[contextName][domainURL]) === 0) {
      return
    }

    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      if (data[contextName][domainURL][cookie.name] === undefined) {
        continue
      }

      if (data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        continue
      }

      if (hasProfile && hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        continue
      }

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }
        if (await browser.cookies.remove(details) != null) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
        }
      }
    }
  }

  if (action.toLowerCase().indexOf('close') !== -1 && cookieData[domainURL][activeCookieStore] !== undefined) {
    delete cookieData[domainURL][activeCookieStore]

    if (Object.keys(cookieData[domainURL]).length === 0) {
      delete cookieData[domainURL]
    }

    if (data[contextName] !== undefined) {
      let hasDeleted = false
      if (data[contextName][domainURL] !== undefined && Object.keys(data[contextName][domainURL]).length === 0) {
        delete data[contextName][domainURL]
        hasDeleted = true
      }

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
        else await browser.storage.local.remove(contextName)
        delete data[contextName]
      } else if (hasDeleted) {
        if (useChrome) setChromeStorage(data)
        else await browser.storage.local.set(data)
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Chrome: Update storage log data
function chromeUpdateLogData (data, writeData) {
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
    if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = []

    data['flagCookies']['logData'][contextName] = logData[contextName]

    chrome.storage.local.set(data, updatedData)
  } else {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeUpdateLogData(data, true) })
  }
}

async function clearCookiesOnNavigate (details) {
  if (details.parentFrameId === undefined || details.parentFrameId !== -1 || details.url === undefined) return

  let activeCookieStore = 'default'
  if (!useChrome) {
    let currentTab = await getActiveTabFirefox()
    if (currentTab.cookieStoreId !== undefined) {
      activeCookieStore = currentTab.cookieStoreId
    }
  }

  let domainURL
  let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
  if (urlMatch) {
    domainURL = urlMatch[0]
  } else {
    if (hasConsole) console.log('Error reading out domain name on clearCookiesOnNavigate.')
    return
  }

  clearDomainLog(domainURL, activeCookieStore)
  clearCookiesWrapper('tab navigate', useChrome)

  if (cookieData[domainURL] !== undefined && cookieData[domainURL][activeCookieStore] !== undefined) {
    delete cookieData[domainURL][activeCookieStore]
    if (Object.keys(cookieData[domainURL]).length === 0) delete cookieData[domainURL]
  }
}

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    if (useChrome) chrome.browserAction.disable(tabId)
    else browser.browserAction.disable(tabId)
    clearCookiesWrapper('tab reload/load', useChrome, tab)
  } else if (changeInfo.status && changeInfo.status === 'complete') {
    if (useChrome) chrome.browserAction.enable(tabId)
    else browser.browserAction.enable(tabId)
    if (logData[contextName] !== undefined) {
      let urlMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
      if (urlMatch) {
        let tabDomain = urlMatch[0]

        let count = 0
        let foundCookies = []
        for (let entry of logData[contextName]) {
          if (entry.indexOf(tabDomain) !== -1 && entry.toLowerCase().indexOf('deleted') !== -1) {
            let cookieMatch = entry.match(/cookie: '[^']*/)
            if (cookieMatch !== null) {
              let cookieName = cookieMatch[0]
              cookieName = cookieName.substr(cookieName.indexOf("'") + 1, cookieName.length)
              if (foundCookies.indexOf(cookieName) !== -1) continue
              foundCookies.push(cookieName)
            }
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
        chromeUpdateLogData(null, false)
        return
      }

      let data = await browser.storage.local.get('flagCookies')

      if (data['flagCookies'] === undefined) data['flagCookies'] = {}
      if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
      if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = []
      data['flagCookies']['logData'][contextName] = logData[contextName]

      await browser.storage.local.set(data)
    }
  }
}

function clearCookiesOnLeave (tabId, moveInfo) {
  clearCookiesWrapper('tab close/window close', useChrome)
}

// --------------------------------------------------------------------------------------------------------------------------------
// Log info
function clearDomainLog (detailsURL) {
  if (logData[contextName] === undefined) logData[contextName] = []

  if (logData[contextName] !== []) {
    let newLog = []
    detailsURL = detailsURL.replace(/\/www./, '/')

    for (let entry of logData[contextName]) {
      if (entry.indexOf(detailsURL) === -1) {
        newLog.push(entry)
      }
    }

    logData[contextName] = newLog
  }
}

function addToLogData (msg) {
  if (logData[contextName] === undefined) logData[contextName] = []
  msg = msg.replace(/\/www./, '/')

  if (logData[contextName].indexOf(msg) === -1) {
    if (hasConsole) console.log(msg)
    logData[contextName].push(msg)
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave)
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  chrome.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
  chrome.runtime.onMessage.addListener(handleMessage)
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
  browser.runtime.onMessage.addListener(handleMessage)
}
