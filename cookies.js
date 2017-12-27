let domainURL = '' // The active domain url
let logData = [] // The log data we seen as a report to the settings view

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookies (action) {
  let data = await browser.storage.local.get()
  if (data[domainURL] === undefined && data['flagCookies_flag_global'] === undefined) {
    return
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
    let domainCookies = await browser.cookies.getAll({url: domainURL})
    for (let cookie of domainCookies) {
      if (data[domainURL][cookie.name] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        console.log(msg)
        continue
      }

      let details = { url: domainURL, name: cookie.name }
      if ((await browser.cookies.remove(details)) !== null) {
        if (data[domainURL][cookie.name] === true) {
          let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          console.log(msg)
        } else {
          let msg = "Auto-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          console.log(msg)
        }
      }
    }
  } else if (data['flagCookies_flag_global'] !== undefined && data['flagCookies_flag_global']['use'] === true) {
    let domainCookies = await browser.cookies.getAll({url: domainURL})

    if (data[domainURL] === undefined) {
        for (let cookie of domainCookies) {
          let details = { url: domainURL, name: cookie.name }
          if ((await browser.cookies.remove(details)) !== null) {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            console.log(msg)
          }
        }
    } else {
      for (let cookie of domainCookies) {
        if (data[domainURL][cookie.name] !== undefined && data[domainURL][cookie.name] === false) {
          let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
          addToLogData(msg)
          console.log(msg)
          continue
        }

        let details = { url: domainURL, name: cookie.name }
        if ((await browser.cookies.remove(details)) !== null) {
          if (data[domainURL] !== undefined && data[domainURL][cookie.name] !== undefined && data[domainURL][cookie.name] === true) {
            let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            console.log(msg)
          } else {
            let msg = "Global-flag deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
            addToLogData(msg)
            console.log(msg)
          }
        }
      }
    }
  } else {
    for (let cookie in data[domainURL]) {
      if (data[domainURL][cookie] === false) {
        let msg = "Permitted cookie on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        console.log(msg)
        continue
      }

      let details = { url: domainURL, name: cookie }
      if ((await browser.cookies.remove(details)) != null) {
        let msg = "Deleted on '" + action + "', cookie: '" + cookie.name + "' for '" + domainURL + "'"
        addToLogData(msg)
        console.log(msg)
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Firefox 58.01a/Nightly/In Dev? Tab-Features
async function setdomainURLOnActivation (activeInfo) {
  let activeTabs = await browser.tabs.query({currentWindow: true, active: true})
  if (activeTabs.length !== 0) {
    let currentTab = activeTabs[0]
    let urlMatch = currentTab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
    if (urlMatch) {
      domainURL = urlMatch[0]
      console.log('Switched active domain to: ' + domainURL)
    }
  }
}

async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'loading') {
    clearCookies('tab load')
    if (changeInfo['url'] === undefined) {
      clearDomainLog();
    }
  } else if (changeInfo.status && changeInfo.status === 'complete') {
    if (logData !== '') {
      let data = await browser.storage.local.get()

      if (data['flagCookies'] === undefined) data['flagCookies'] = {}

      data['flagCookies']['logData'] = logData
      await browser.storage.local.set(data)
    }
  }
}

let clearCookiesOnLeave = (tabId, moveInfo) => {
  clearCookies('tab close/window close')
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

function addToLogData (msg) {
  if (logData.indexOf(msg) === -1) logData.push(msg)
}

// --------------------------------------------------------------------------------------------------------------------------------

browser.tabs.onRemoved.addListener(clearCookiesOnLeave)
browser.tabs.onUpdated.addListener(clearCookiesOnUpdate)
browser.tabs.onActivated.addListener(setdomainURLOnActivation)
