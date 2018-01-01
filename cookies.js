let logData = [] // The log data we seen as a report to the settings view

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

// Chrome
function chromeGetStorageAndClearCookies (action, data, cookies, domainURL) {
  if (!checkChromeHadNoErrors()) return

  if (data === null) {
    chrome.storage.local.get(null, function(data) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, null, domainURL) })
    return
  } else if (cookies === null) {
    let targetDomain = domainURL.replace(/(http|https):\/\//, '').replace('/', '')
    chrome.cookies.getAll({domain: targetDomain}, function(cookies) { checkChromeHadNoErrors(); chromeGetStorageAndClearCookies(action, data, cookies, domainURL) })
    return
  }

  clearCookiesAction(action, data, cookies, domainURL)
}

async function getDomainURLFirefox() {
  let activeTabs = await browser.tabs.query({currentWindow: true, active: true})
  if (activeTabs.length !== 0) {
    let tab = activeTabs.pop()
    if (tab.url !== undefined) {
      let urlMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
      if (urlMatch) {
        return urlMatch[0]
      }
    }
  }

  return ''
}

function getChromeActiveTabForClearing (action) {
  chrome.tabs.query({currentWindow: true, active: true}, function (activeTabs) {
    if (activeTabs.length !== 0) {
      let tab = activeTabs.pop()
      if (tab.url !== undefined) {
        let urlMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
        if (urlMatch) {
          let domainURL = urlMatch[0]
          chromeGetStorageAndClearCookies(action, null, null, domainURL)
        }
      }
    }
  })
}

// Chrome + Firefox
async function clearCookiesWrapper (action, doChromeLoad) {

  if (useChrome && doChromeLoad) {
    getChromeActiveTabForClearing(action)
    return
  }

  let domainURL = await getDomainURLFirefox()
  if (domainURL === '') return
  let data = await browser.storage.local.get()
  let cookies = await browser.cookies.getAll({url: domainURL})
  clearCookiesAction(action, data, cookies, domainURL)
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, data, cookies, domainURL) {
  if (domainURL === '') return

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
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookieName + "' for '" + domainURL + "'"
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
    data['flagCookies']['logData'] = logData

    chrome.storage.local.set(data, updatedData);
  } else {
    chrome.storage.local.get(null, function(data) { checkChromeHadNoErrors(); chromeUpdateLogData(data, true) })
  }
}

function clearCookiesOnNavigate (tabId, changeInfo, tab) {
  clearCookiesWrapper('tab navigate', useChrome)
}

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {

  if (changeInfo.status && changeInfo.status === 'loading') {
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
  chrome.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
  browser.webNavigation.onBeforeNavigate.addListener(clearCookiesOnNavigate)
}
