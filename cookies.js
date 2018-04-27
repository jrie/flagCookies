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

function chromeGetStorageAndClearCookies (action, data, cookies, domainURL, currentTab, doLoadURLCookies, doLoadURLSecure) {
  if (data === null) {
    chrome.storage.local.get(null, function (data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab, false, false) })
    return
  } else if (cookies === null) {
    let domain = getURLDomain(domainURL)
    chrome.cookies.getAll({domain: domain}, function (cookies) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab, true, false) })
    return
  } else if (doLoadURLCookies === true) {
    let cookieDomain = domainURL.replace(/\/www\./, '')
    chrome.cookies.getAll({url: cookieDomain}, function (cookieSub) {
      checkChromeHadNoErrors()

      for (let cookie of cookieSub) {
        cookies.push(cookie)
      }

      chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab, false, true)
    })
    return
  } else if (doLoadURLCookies === true) {
    let cookieDomain = domainURL.replace(/\/www\./, '')
    chrome.cookies.getAll({url: cookieDomain, secure: true}, function (cookieSub) {
      checkChromeHadNoErrors()

      for (let cookie of cookieSub) {
        cookies.push(cookie)
      }

      chromeGetStorageAndClearCookies(action, data, cookies, domainURL, currentTab, false, false)
    })
    return
  }

  clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default')
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
          chromeGetStorageAndClearCookies(action, null, null, domainURL, tab, false, false)
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
  let cookiesSec = []
  if (currentTab.cookieStoreId !== undefined) {
    cookies = await browser.cookies.getAll({domain: domain, storeId: currentTab.cookieStoreId})
    cookiesURL = await browser.cookies.getAll({url: domainURL, storeId: currentTab.cookieStoreId})
    cookiesSec = await browser.cookies.getAll({domain: domain, secure: true, storeId: currentTab.cookieStoreId})
    await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  } else {
    cookies = await browser.cookies.getAll({domain: domain})
    cookiesURL = await browser.cookies.getAll({url: domainURL.replace(/\/www\./, '/')})
    cookiesSec = await browser.cookies.getAll({domain: domain, secure: true})
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

  if (currentTab.cookieStoreId !== undefined) clearCookiesAction(action, data, cookies, domainURL, currentTab, currentTab.cookieStoreId)
  else clearCookiesAction(action, data, cookies, domainURL, currentTab, 'default')
}

function handleMessage (request, sender, sendResponse) {
  if (request.getCookies !== undefined && request.windowId !== undefined && request.tabId !== undefined && openTabData[request.windowId] !== undefined && openTabData[request.windowId][request.tabId] !== undefined) {
    let cookieDataDomain = {}

    let domainData = openTabData[request.windowId][request.tabId]
    let rootDomain = 'No active domain'
    for (let key of Object.keys(domainData)) {
      if (domainData[key]['isRoot'] !== undefined) {
        rootDomain = domainData[key].u
        console.log(rootDomain)
        cookieDataDomain[rootDomain] = []
        for (let cookieInfo of cookieData[rootDomain][request.storeId]) {
          cookieDataDomain[rootDomain].push(cookieInfo)
        }

        break
      }
    }

    console.log(rootDomain)

    for (let key of Object.keys(domainData)) {
      if (domainData[key]['isRoot'] !== undefined) continue
      let domainName = domainData[key].u
      if (cookieDataDomain[domainName] === undefined) cookieDataDomain[domainName] = []
      for (let cookieInfo of cookieData[domainName][request.storeId]) {
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
    }

    sendResponse({'cookies': cookieDataDomain, 'rootDomain': rootDomain})
    return
  }

  sendResponse({'cookies': null, 'rootDomain': 'Unknown domain'})
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, domainURL, currentTab, activeCookieStore) {
  if (domainURL === '' || cookies === undefined) return
  console.log(domainURL)
  let urls = [domainURL]

  if (domainURL.indexOf('www.') !== -1) {
    urls.push(domainURL.replace('www.', ''))
    domainURL = urls[1]
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
        cookie['fgRemoved'] = false
        cookie['fgAllowed'] = true
        cookie['fgHandled'] = true
        if (!useChrome && cookieEntry.storeId !== undefined && cookieEntry.storeId === cookie.storeId) {
          cookieData[domainURL][activeCookieStore][index] = cookie
          foundCookie = true
          break
        } else {
          cookieData[domainURL][activeCookieStore][index] = cookie
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
      if (!useChrome && cookie.storeId === activeCookieStore) cookieData[domainURL][activeCookieStore].push(cookie)
      else cookieData[domainURL][activeCookieStore].push(cookie)
    }
  }

  let hasProfile = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] && data['flagCookies_accountMode'][contextName][domainURL] !== undefined
  let hasLogged = false
  if (hasProfile) {
    hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][contextName] && data['flagCookies_autoFlag'][contextName][domainURL]) {
    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      cookie['fgHandled'] = true

      if (hasProfile && hasLogged && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + urls[0] + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        continue
      } else if (data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (data[contextName][domainURL][cookie.name] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(currentTab, msg)
            } else {
              let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(currentTab, msg)
            }

            cookie['fgRemoved'] = true
            break
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }

        if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
          if (data[contextName][domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg)
          } else {
            let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg)
          }

          cookie['fgRemoved'] = true
          break
        }

        if (await browser.cookies.get(details) === null) {
          let msg = "Cookie not present on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(currentTab, msg)
          break
        }
      }
    }
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      cookie['fgHandled'] = true

      if (hasProfile && hasLogged && data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        if (hasConsole) console.log(msg)
        continue
      } else if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(currentTab, msg)
            } else {
              let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
              addToLogData(currentTab, msg)
            }

            cookie['fgRemoved'] = true
            break
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }

        if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
          if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined && data[contextName][domainURL][cookie.name] !== undefined && data[contextName][domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg)
          }

          cookie['fgRemoved'] = true
          break
        }

        if (await browser.cookies.get(details) === null) {
          let msg = "Cookie not present on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(currentTab, msg)
          break
        }
      }
    }
  } else {
    if (data[contextName] === undefined || data[contextName][domainURL] === undefined || Object.keys(data[contextName][domainURL]) === 0) {
      for (let cookie of cookieData[domainURL][activeCookieStore]) {
        cookie['fgHandled'] = false
      }
      return
    }

    for (let cookie of cookieData[domainURL][activeCookieStore]) {
      cookie['fgHandled'] = true
      if (data[contextName][domainURL][cookie.name] === undefined) {
        continue
      }

      if (data[contextName][domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        continue
      } else if (hasProfile && hasLogged && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(currentTab, msg)
        cookie['fgAllowed'] = true
        continue
      }

      cookie['fgAllowed'] = false

      for (let urlString of urls) {
        if (useChrome) {
          let details = { url: urlString, name: cookie.name }
          if (chrome.cookies.remove(details) !== null) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(currentTab, msg)
            cookie['fgRemoved'] = true
            break
          }

          continue
        }

        let details = { url: urlString, name: cookie.name, storeId: activeCookieStore }
        if (await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(currentTab, msg)
          cookie['fgRemoved'] = true
          break
        }

        if (await browser.cookies.get(details) === null) {
          let msg = "Cookie not present on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(currentTab, msg)
          break
        }
      }
    }
  }

  if (cookieData[domainURL] !== undefined && cookieData[domainURL][activeCookieStore] !== undefined && action.toLowerCase().indexOf(' close') !== -1) {
    delete cookieData[domainURL][activeCookieStore]

    if (Object.keys(cookieData[domainURL]).length === 0) delete cookieData[domainURL]

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

  if (data['flagCookies'] === undefined) data['flagCookies'] = {}
  if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
  if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = []
  data['flagCookies']['logData'][contextName] = logData[contextName]

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
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

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    if (useChrome) chrome.browserAction.disable(tab.id)
    else browser.browserAction.disable(tab.id)
    clearCookiesWrapper('tab reload/load', useChrome)
  } else if (changeInfo.status !== undefined && changeInfo.status === 'complete') {
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
          if (msg.startsWith(status)) {
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
      getChromeStorageForFunc3(displayCookieDeleteChrome, count, tabDomain, contextName)
      return
    }

    let data = await browser.storage.local.get(null)
    if (data['flagCookies'] === undefined) data['flagCookies'] = {}
    if (data['flagCookies']['logData'] === undefined) data['flagCookies']['logData'] = {}
    if (data['flagCookies']['logData'][contextName] === undefined) data['flagCookies']['logData'][contextName] = []
    data['flagCookies']['logData'][contextName] = logData[contextName]

    await browser.storage.local.set(data)

    if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
      browser.notifications.create('cookie_cleared', {type: 'basic', message: count + ' cookies removed for domain "' + tabDomain + '" in context "' + contextName + '".', title: 'Flag Cookies: Cookies removed', iconUrl: 'icons/cookie_128.png'})
    }
  }
}

function displayCookieDeleteChrome (data, count, tabDomain, contextName) {
  if (count !== 0 && data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
    chrome.notifications.create('cookie_cleared', {type: 'basic', message: count + ' cookies removed for domain "' + tabDomain + '" in context "' + contextName + '".', title: 'Flag Cookies: Cookies removed', iconUrl: 'icons/cookie_128.png'})
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
function clearDomainLog (currentTab) {
  if (logData[contextName] !== undefined && logData[contextName][currentTab.windowId] !== undefined && logData[contextName][currentTab.windowId][currentTab.id] !== undefined) {
    delete logData[contextName][currentTab.windowId][currentTab.id]
  }
}

function addToLogData (currentTab, msg) {
  if (logData[contextName] === undefined) logData[contextName] = {}
  if (logData[contextName][currentTab.windowId] === undefined) logData[contextName][currentTab.windowId] = {}
  if (logData[contextName][currentTab.windowId][currentTab.id] === undefined) logData[contextName][currentTab.windowId][currentTab.id] = []

  msg = msg.replace(/\/www\./, '/')
  logData[contextName][currentTab.windowId][currentTab.id].push(msg)
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
    if (cookieData[activeDomain][activeCookieStore] === undefined) return

    let foundCookie = false
    let index = 0
    for (let cookie of cookieData[activeDomain][activeCookieStore]) {
      if (cookieDetails.name === cookie.name) {
        cookieData[activeDomain][activeCookieStore][index] = cookieDetails
        foundCookie = true
        break
      }

      ++index
    }

    if (!foundCookie) {
      cookieData[activeDomain][activeCookieStore].push(cookieDetails)
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
    delete openTabData[removeInfo.windowId][tabId]
    if (Object.keys(openTabData[removeInfo.windowId]).length === 0) {
      delete openTabData[removeInfo.windowId]
    }
  }
}

async function clearCookiesOnRequestChrome (details) {
  if (logData[contextName] === undefined) logData[contextName] = []
  if (details.method === 'GET' && details.parentFrame !== -1 && details.tabId !== -1) {
    chrome.tabs.query({currentWindow: true, active: true}, function (activeTabs) {
      if (!checkChromeHadNoErrors()) return

      if (activeTabs.length !== 0) {
        let currentTab = activeTabs.pop()

        if (details.frameId === 0) {
          clearDomainLog(currentTab)
        }

        addTabURLtoDataList(currentTab, details)
        let domainURL
        let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
        if (urlMatch !== null) domainURL = urlMatch[0]
        else domainURL = details.url.replace(/\/www\./, '/')

        chromeGetStorageAndClearCookies('document load', null, null, domainURL, currentTab, false, false)
      }
    })
  }
}

async function clearCookiesOnRequest (details) {
  if (details.method === 'GET' && details.tabId !== -1) {
    let currentTab = await getActiveTabFirefox()

    currentTab.url = details.url

    await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)

    if (details.frameId === 0) {
      clearDomainLog(currentTab)
    }

    addTabURLtoDataList(currentTab, details)

    let domainURL
    let urlMatch = details.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.\-][^\/]*/)
    if (urlMatch !== null) domainURL = urlMatch[0]
    else domainURL = details.url.replace(/\/www\./, '/')

    let data = await browser.storage.local.get()

    let domain = getURLDomain(domainURL)
    let cookies
    let cookiesURL = []
    let cookiesSec = []
    if (currentTab.cookieStoreId !== undefined) {
      cookies = await browser.cookies.getAll({domain: domain, storeId: currentTab.cookieStoreId})
      cookiesURL = await browser.cookies.getAll({url: domainURL, storeId: currentTab.cookieStoreId})
      cookiesSec = await browser.cookies.getAll({domain: domain, secure: true, storeId: currentTab.cookieStoreId})
      await browser.contextualIdentities.get(currentTab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
    } else {
      cookies = await browser.cookies.getAll({domain: domain})
      cookiesURL = await browser.cookies.getAll({url: domainURL.replace(/\/www\./, '/')})
      cookiesSec = await browser.cookies.getAll({domain: domain, secure: true})
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

    await browser.storage.local.set(data)

    clearDomainLog(currentTab)
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
