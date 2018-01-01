let domainURL = '' // The active domain url
let logData = [] // The log data we seen as a report to the settings view

// Chrome
let useChrome = typeof (browser) === 'undefined'
let hasConsole = typeof (console) !== 'undefined'

// Chrome helpers
function checkChromeHadNoErrors () {
  if (chrome.runtime.lastError) {
    if (hasConsole) {
      if (chrome.runtime.lastError.message !== undefined) {
        console.log('Chrome had an error, with mesage: ' + chrome.runtime.lastError.message)
      } else {
        console.log('Chrome had an error.')
      }
    }

    void chrome.runtime.lastError
    return false
  }

  return true
}

// Chrome
function chromeGetStorageAndClearCookies (action, data, cookies) {
  if (!checkChromeHadNoErrors()) return

  if (domainURL === '') {
    return
  }

  if (data === null) {
    chrome.storage.local.get(null, function(data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, null) })
    return
  } else if (cookies === null) {
    let targetDomain = domainURL.replace(/(http|https):\/\//, '').replace('/', '')
    chrome.cookies.getAll({domain: targetDomain}, function(cookies) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies) })
    return
  }

  clearCookiesAction(action, data, cookies)
}

// Chrome + Firefox
async function clearCookiesWrapper (action, doChromeLoad) {
  if (useChrome && doChromeLoad) {
    chromeGetStorageAndClearCookies(action, null, null)
    return
  }

  let data = await browser.storage.local.get()
  let cookies = await browser.cookies.getAll({url: domainURL})
  clearCookiesAction(action, data, cookies)
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies) {
  if (data[domainURL] === undefined && data['flagCookies_flagGlobal'] === undefined) {
    return
  }

  let hasProfile = data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][domainURL] !== undefined
  let hasLogged = false
  if (hasProfile) {
    hasLogged = data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][domainURL] !== undefined
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
    for (let cookie of cookies) {
      if (hasProfile && hasLogged && data['flagCookies_logged'][domainURL][cookie.name] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
        continue
      }

      if (data[domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
        continue
      }

      let details = { url: domainURL, name: cookie.name }

      if (useChrome) {
        let cookieName = cookie.name

        if (chrome.cookies.remove(details) !== null) {
          if (data[domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
          } else {
            let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
          }
        }

        continue
      }

      if ((await browser.cookies.remove(details)) !== null) {
        if (data[domainURL][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          if (hasConsole) console.log(msg)
        } else {
          let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          if (hasConsole) console.log(msg)
        }
      }
    }
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'] === true) {
    if (data[domainURL] === undefined) {
        for (let cookie of cookies) {
          if (hasProfile && hasLogged && data['flagCookies_logged'][domainURL][cookie.name] !== undefined) {
            let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
            continue
          }

          let details = { url: domainURL, name: cookie.name }

          if (useChrome) {
            let cookieName = cookie.name
            if (chrome.cookies.remove(details) !== null) {
              let msg = "Global-flag deleted on '" + action + "', cookie: '" +cookieName + "' for '" + domainURL + "'"
              addToLogData(msg)
              if (hasConsole) console.log(msg)
            }

            continue
          }

          if ((await browser.cookies.remove(details)) !== null) {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
          }
        }
    } else {
      for (let cookie of cookies) {
        if (hasProfile && hasLogged && data['flagCookies_logged'][domainURL][cookie.name] !== undefined) {
          let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          if (hasConsole) console.log(msg)
          continue
        }

        if (data[domainURL][cookie.name] !== undefined && data[domainURL][cookie.name] === false) {
          let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          if (hasConsole) console.log(msg)
          continue
        }

        let details = { url: domainURL, name: cookie.name }

        if (useChrome) {
          let cookieName = cookie.name
          if (chrome.cookies.remove(details) !== null) {
            if (data[domainURL] !== undefined && data[domainURL][cookieName] !== undefined && data[domainURL][cookieName] === true) {
              let msg = "Deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
              addToLogData(msg)
              if (hasConsole) console.log(msg)
            } else {
              let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
              addToLogData(msg)
              if (hasConsole) console.log(msg)
            }
          }

          continue
        }

        if ((await browser.cookies.remove(details)) !== null) {
          if (data[domainURL] !== undefined && data[domainURL][cookie.name] !== undefined && data[domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            if (hasConsole) console.log(msg)
          }
        }
      }
    }
  } else {
    for (let cookie in data[domainURL]) {
      if (hasProfile && hasLogged && data['flagCookies_logged'][domainURL][cookie] !== undefined) {
        let msg = "Allowed profile cookie on '" + action + "', cookie: '" + cookie + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
        continue
      }

      if (data[domainURL][cookie] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
        continue
      }

      let details = { url: domainURL, name: cookie }

      if (useChrome) {
        let cookieName = cookie

        if (chrome.cookies.remove(details) !== null) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
          addToLogData(msg)
          if (hasConsole) console.log(msg)
        }

        continue
      }

      if ((await browser.cookies.remove(details)) != null) {
        let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        if (hasConsole) console.log(msg)
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Shared setters
async function setDomainURLWrapper(activeTabs) {
  if (activeTabs.length !== 0) {
    let currentTab = activeTabs[0]

    let urlMatch = currentTab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
    if (urlMatch) {
      domainURL = urlMatch[0]
      if (hasConsole) console.log('Switched active domain to: ' + domainURL)
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Shared getters

// Chrome
function getChromeActiveTabList (func) {
  chrome.tabs.query({currentWindow: true, active: true}, func)
}

// Chrome + Firefox
async function setDomainURLOnActivation (activeInfo) {
  let activeTabs

  if (useChrome) {
    getChromeActiveTabList(setDomainURLWrapper)
    return
  }

  activeTabs = await browser.tabs.query({currentWindow: true, active: true})
  setDomainURLWrapper(activeTabs)
}


// --------------------------------------------------------------------------------------------------------------------------------
// Chrome: Update storage log data
function chromeUpdateLogData (data, writeData) {
  function updatedData () {
    if (chrome.runtime.lastError !== undefined) {
      if (hasConsole) console.log('Chrome could not store data')

      void chrome.runtime.lastError
      return
    }

    if (hasConsole) console.log('Chrome updated the browser storage')
  }

  if (writeData) {
    if (data['flagCookies'] === undefined) data['flagCookies'] = {}
    data['flagCookies']['logData'] = logData

    chrome.storage.local.set(data, updatedData);
  } else {
    chrome.storage.local.get(null, function(data) { checkChromeHadNoErrors(); chromeUpdateLogData(data, true) })
  }
}

function clearCookiesOnNavigate (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    clearCookiesWrapper('tab reload/load', useChrome)
  }
}

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {

  if (changeInfo.status && changeInfo.status === 'loading') {
    clearDomainLog()
    clearCookiesWrapper('tab reload/load', useChrome)
  } else if (changeInfo.status && changeInfo.status === 'complete') {
    if (logData !== '') {
      let urlMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
      if (urlMatch) {
        let tabDomain = urlMatch[0]

        let count = 0
        for (let entry of logData) {
          if (entry.indexOf('deleted') !== -1 && entry.indexOf(tabDomain) !== -1) {
            count++
          }
        }

        if (useChrome) {
          if (count !== 0)  chrome.browserAction.setBadgeText({ text: count.toString(), tabId: tab.id })
          else chrome.browserAction.setBadgeText({ text: '', tabId: tab.id })
        } else {
          if (count !== 0)  browser.browserAction.setBadgeText({ text: count.toString(), tabId: tab.id })
          else browser.browserAction.setBadgeText({ text: '', tabId: tab.id })
        }
      }

      if (useChrome) {
        chromeUpdateLogData(null, false)
        return
      }

      let data = await browser.storage.local.get('flagCookies')

      if (data['flagCookies'] === undefined) data['flagCookies'] = {}

      data['flagCookies']['logData'] = logData
      await browser.storage.local.set(data)
    }
  }
}

let clearCookiesOnLeave = (tabId, moveInfo) => {
  clearCookiesWrapper('tab close/window close', useChrome)
}

// --------------------------------------------------------------------------------------------------------------------------------
// Log info
function clearDomainLog () {
  if (logData !== []) {
    let newLog = [];
    for (let entry of logData) {
      if (entry.indexOf(domainURL) === -1) {
        newLog.push(entry)
      }
    }

    logData = newLog
  }
}

async function addToLogData (msg) {
  if (logData.indexOf(msg) === -1) logData.push(msg)
}

// --------------------------------------------------------------------------------------------------------------------------------
if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave)
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  chrome.tabs.onActivated.addListener(setDomainURLOnActivation)
  chrome.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.tabs.onActivated.addListener(setDomainURLOnActivation)
  browser.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
}
