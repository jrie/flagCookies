const useChrome = typeof (browser) === 'undefined'

function handleMessage (message) {
  if (message.getStorageData !== undefined && message.getStorageData === true) {
    const localStorageData = {}
    const sessionStorageData = {}

    for (const key of Object.keys(window.localStorage)) {
      localStorageData[key] = window.localStorage.getItem(key)
    }

    for (const key of Object.keys(window.sessionStorage)) {
      sessionStorageData[key] = window.localStorage.getItem(key)
    }

    if (useChrome) {
      chrome.runtime.sendMessage({ local: localStorageData, session: sessionStorageData })
    } else {
      browser.runtime.sendMessage({ local: localStorageData, session: sessionStorageData })
    }

    return
  }

  if (message.clearStorage !== undefined) {
    if (message.clearStorage === 'local') {
      window.localStorage.clear()
    } else if (message.clearStorage === 'session') {
      window.sessionStorage.clear()
    }

    storageWindowHandler(null)
  }
}

function storageWindowHandler () {
  handleMessage({ getStorageData: true })
}

if (useChrome) {
  chrome.runtime.onMessage.addListener(handleMessage)
} else {
  browser.runtime.onMessage.addListener(handleMessage)
}

window.addEventListener('storage', storageWindowHandler)
