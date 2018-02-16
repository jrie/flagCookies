// Chrome
let useChrome = typeof (browser) === 'undefined'
let hasConsole = typeof (console) !== 'undefined'
let contextName = 'default'
let domainURL = ''
let tabId
// --------------------------------------------------------------------------------------------------------------------------------
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

function getChromeStorageForFunc (func) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log('Browser retrieved storage data.')

      func(data)
    } else if (hasConsole) {
      console.log('Browser storage retrieval error.')
    }
  })
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

function getChromeStorageForFunc2 (func, par1, par2) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log('Browser retrieved storage data.')

      func(data, par1, par2)
    } else if (hasConsole) {
      console.log('Browser storage retrieval error.')
    }
  })
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

function chromeGetStorageAndCookiesForFunc (data, cookies, func) {
  if (!checkChromeHadNoErrors()) return

  if (data === null) {
    chrome.storage.local.get(null, function (data) { chromeGetStorageAndCookiesForFunc(data, null, func) })
    return
  } else if (cookies === null) {
    chrome.runtime.sendMessage({'getCookies': domainURL, 'storeId': 'default'}, function (response) { checkChromeHadNoErrors(); chromeGetStorageAndCookiesForFunc(data, response['cookies'], func) })
    return
  }

  func(data, cookies, 'default')
}

function chromeGetStorageAndCookiesForFunc1 (data, cookies, func, par1) {
  if (!checkChromeHadNoErrors()) return

  if (data === null) {
    chrome.storage.local.get(null, function (data) { chromeGetStorageAndCookiesForFunc(data, null, func, par1) })
    return
  } else if (cookies === null) {
    chrome.runtime.sendMessage({'getCookies': domainURL, 'storeId': 'default'}, function (response) { checkChromeHadNoErrors(); chromeGetStorageAndCookiesForFunc(data, response['cookies'], func, par1) })
    return
  }

  func(data, cookies, par1)
}

// --------------------------------------------------------------------------------------------------------------------------------
// Firefox
async function getActiveTabFirefox () {
  let activeTabs = await browser.tabs.query({currentWindow: true, active: true})
  if (activeTabs.length !== 0) {
    return activeTabs.pop()
  }

  return null
}

function firefoxOnGetContextSuccess (context) {
  contextName = context.name
}

function firefoxOnGetContextError (e) {
  if (hasConsole) {
    console.log('Firefox getContext profile error: ')
    console.log(e)
  }
}

// --------------------------------------------------------------------------------------------------------------------------------

async function initDomainURLandProceed (tabs) {
  let tab = tabs.pop()
  tabId = tab.id

  let domainMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
  if (domainMatch) {
    domainURL = domainMatch[0]
  } else {
    domainURL = 'No domain'
  }

  if (useChrome) {
    document.body.className = 'chrome'
    if (navigator.appVersion.toLowerCase().indexOf('opr/') !== -1) {
      document.body.className += ' opera'
    }
    chromeGetStorageAndCookiesForFunc(null, null, updateUIData)
    return
  }

  // Get storage and cookies Firefox
  let data = await browser.storage.local.get()
  let activeCookieStore = 'default'
  if (tab.cookieStoreId !== undefined) {
    activeCookieStore = tab.cookieStoreId
    await browser.contextualIdentities.get(activeCookieStore).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  }

  let cookieData = await browser.runtime.sendMessage({'getCookies': domainURL, 'storeId': activeCookieStore})
  let cookies = cookieData['cookies']

  updateUIData(data, cookies, contextName)
}

function updateUIData (data, cookies, activeCookieStoreName) {
  // set the header of the panel
  let activeTabUrl = document.querySelector('#header-title')
  let introSpan = document.createElement('span')
  introSpan.className = 'intro'

  let intro = document.createTextNode('Cookies for domain:')
  introSpan.appendChild(intro)

  let url = document.createTextNode(domainURL)
  url.className = 'domainurl'
  activeTabUrl.appendChild(introSpan)
  activeTabUrl.appendChild(url)

  let introSpanStore = document.createElement('span')
  introSpanStore.className = 'intro'
  let introStore = document.createTextNode('Active container group: ' + activeCookieStoreName)
  introSpanStore.appendChild(introStore)
  activeTabUrl.appendChild(introSpanStore)

  let cookieList = document.getElementById('cookie-list')
  let flaggedCookieList = document.getElementById('cookie-list-flagged')
  let loggedInCookieList = document.getElementById('loggedInCookies')

  if (cookies.length === 0) {
    let infoDisplay = document.getElementById('infoDisplay')
    let contentText = 'No active cookies for domain, you might need to reload the tab.'
    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    for (let cookie of cookies) {
      let li = document.createElement('li')

      let checkMark = document.createElement('button')
      checkMark.className = 'checkmark'
      checkMark.title = 'This cookie is allowed and unhandled'

      checkMark.addEventListener('click', cookieFlagSwitch)
      checkMark.dataset['name'] = cookie.name
      checkMark.dataset['value'] = cookie.value

      let lockSwitch = document.createElement('button')
      lockSwitch.className = 'setKeyCookie'
      lockSwitch.title = 'Set this cookie as profile-mode cookie'
      lockSwitch.dataset['name'] = cookie.name
      lockSwitch.addEventListener('click', cookieLockSwitch)

      if (data[contextName] && data[contextName][domainURL]) {
        if (data[contextName][domainURL][cookie.name] !== undefined) {
          if (data[contextName][domainURL][cookie.name] === true) {
            checkMark.className = 'checkmark flagged'
            checkMark.title = 'This cookie is flagged by you and will be removed on page action'
            addCookieToList('cookie-list-flagged', cookie.name, cookie.value)
          } else if (data[contextName][domainURL][cookie.name] === false) {
            checkMark.className = 'checkmark permit'
            checkMark.title = 'This cookie is permitted and will be kept'
            addCookieToList('cookie-list-permitted', cookie.name, cookie.value)
          }
        }
      }

      if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.name] !== undefined) {
        lockSwitch.className += ' locked'
        lockSwitch.title = 'This cookie is set locked as profile-mode cookie for this domain'
        loggedInCookieList.removeAttribute('class')
      }

      let p = document.createElement('p')

      let pCookieKeyElm = document.createElement('span')
      let pCookieKey = document.createTextNode(cookie.name)
      pCookieKeyElm.className = 'cookieKey'
      pCookieKeyElm.appendChild(pCookieKey)

      let pCookieValueElm = document.createElement('span')
      let pCookieValue = document.createTextNode(cookie.value)
      pCookieValueElm.className = 'cookieValue'
      pCookieValueElm.appendChild(pCookieValue)

      p.appendChild(pCookieKeyElm)
      p.appendChild(pCookieValueElm)

      li.appendChild(checkMark)
      li.appendChild(p)
      li.appendChild(lockSwitch)

      cookieList.appendChild(li)
    }

    cookieList.removeAttribute('class')
  }

  if (data[contextName] && data[contextName][domainURL]) {
    let domainData = data[contextName][domainURL]

    for (let cookieKey in domainData) {
      if (domainData[cookieKey] !== true) continue

      if (!isDomainCookieInList(flaggedCookieList, cookieKey)) addCookieToList('cookie-list-flagged', cookieKey, '')
    }
  }

  if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined) {
    for (let cookie in data['flagCookies_logged'][contextName][domainURL]) {
      addCookieToProfileList(loggedInCookieList, cookie, 'flagCookies_logged')
    }
  }

  if (loggedInCookieList.children.length !== 0) {
    loggedInCookieList.removeAttribute('class')
  } else {
    document.getElementById('profileNoData').removeAttribute('class')
  }

  if (data['flagCookies_flagGlobal'] && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    flagGlobalAutoNonEvent()
  }

  document.getElementById('activeCookies').className = 'active'
  if (data['flagCookies'] !== undefined && data['flagCookies']['logData'] !== undefined && data['flagCookies']['logData'][contextName] !== undefined) {
    let log = document.getElementById('log')
    for (let entry of data['flagCookies']['logData'][contextName]) {
      if (entry.indexOf(domainURL) !== -1) {
        log.textContent += entry + '\n'
      }
    }
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][contextName] && data['flagCookies_autoFlag'][contextName][domainURL]) {
    document.getElementById('auto-flag').className = 'active'
    switchAutoFlag(true, 'cookie-list')
  }

  if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
    document.getElementById('account-mode').className = 'active'
  }

  if (data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
    document.getElementById('confirmNotifications').className += ' active'
  }
}

function addCookieToProfileList (targetList, cookieName, src) {
  let li = document.createElement('li')
  let cookieKey = document.createElement('span')
  cookieKey.appendChild(document.createTextNode(cookieName))

  let dumpster = document.createElement('button')
  dumpster.addEventListener('click', dumpProfileCookie)
  dumpster.dataset['name'] = cookieName
  dumpster.dataset['src'] = src
  dumpster.className = 'dumpster'

  li.appendChild(cookieKey)
  li.appendChild(dumpster)
  targetList.appendChild(li)
}

function removeCookieOfProfileList (targetList, cookieName, src) {
  for (let child of targetList.children) {
    if (child.children[0].textContent === cookieName) {
      targetList.removeChild(child)
      return
    }
  }
}

function isDomainCookieInList (targetList, cookieKey) {
  for (let child of targetList.children) {
    if (child.children[0].dataset['name'] === cookieKey) {
      return true
    }
  }

  return false
}

function addCookieToList (targetList, name, value) {
  let targetCookieList = document.getElementById(targetList)
  let li = document.createElement('li')
  li.dataset['name'] = name

  let checkMark = document.createElement('button')

  checkMark.dataset['name'] = name
  checkMark.dataset['value'] = value

  if (targetList === 'cookie-list-flagged') {
    checkMark.className = 'checkmark flagged'
    checkMark.title = 'This cookie is flagged by you and will be removed on page action'
    checkMark.addEventListener('click', flaggedCookieSwitch)
  } else {
    checkMark.className = 'checkmark permit'
    checkMark.title = 'This cookie is permitted and will be kept'
    checkMark.addEventListener('click', permittedCookieSwitch)
  }

  let p = document.createElement('p')

  let pCookieKeyElm = document.createElement('span')
  let pCookieKey = document.createTextNode(name)
  pCookieKeyElm.className = 'cookieKey'
  pCookieKeyElm.appendChild(pCookieKey)
  p.appendChild(pCookieKeyElm)

  let pCookieValueElm = document.createElement('span')
  let pCookieValue = document.createTextNode(value === '' ? 'Inactive cookie' : value)
  pCookieValueElm.className = 'cookieValue'
  pCookieValueElm.appendChild(pCookieValue)
  p.appendChild(pCookieValueElm)

  li.appendChild(checkMark)
  li.appendChild(p)
  targetCookieList.appendChild(li)
}

function getActiveTab () {
  return browser.tabs.query({currentWindow: true, active: true})
}

// --------------------------------------------------------------------------------------------------------------------------------
// Button switch function and store delete cookie name in browser storage

// Chrome + Firefox
async function flaggedCookieSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(flaggedCookieSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  flaggedCookieSwitchNeutral(data, event)
}

// Kinda neutral
async function flaggedCookieSwitchNeutral (data, event) {
  let cookieName = event.target.dataset['name']

  // Uncheck from flagged in active cookies, if present
  let domainCookieList = document.getElementById('cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true

  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      if (hasAutoFlag) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = 'This cookie is auto-flagged and will be deleted'
      } else if (hasGlobal) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = 'This cookie is globally flagged and will be deleted'
      } else {
        child.children[0].className = 'checkmark'
        child.children[0].title = 'This cookie is allowed and unhandled'
      }

      if (useChrome) setChromeStorage(data)
      else await browser.storage.local.set(data)

      break
    }
  }

  if (hasAutoFlag) reFlagDomainCookies('af')
  else if (hasGlobal) reFlagDomainCookies(null)
  else reFlagDomainCookies(null)

  let parent = event.target.parentNode.parentNode

  parent.removeChild(event.target.parentNode)
  if (parent.children.length === 0) {
    let infoDisplay = document.getElementById('infoDisplay')
    let contentText = 'No flagged cookies for domain.'
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }
}

async function reFlagDomainCookies (newStatus) {
  if (useChrome) {
    chromeGetStorageAndCookiesForFunc1(null, null, reFlagDomainCookiesNeutral, newStatus)
    return
  }

  // Get storage and cookies Firefox
  let activeCookieStore = 'default'
  let currentTab = await getActiveTabFirefox()
  if (currentTab.cookieStoreId !== undefined) {
    activeCookieStore = currentTab.cookieStoreId
  }

  let data = await browser.storage.local.get()
  let cookieData = await browser.runtime.sendMessage({'getCookies': domainURL, 'storeId': activeCookieStore})
  let cookies = cookieData['cookies']
  reFlagDomainCookiesNeutral(data, cookies, newStatus)
}

async function reFlagDomainCookiesNeutral (data, cookies, newStatus) {
  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}

  for (let cookie of cookies) {
    if (newStatus === null) {
      if (data[contextName][domainURL][cookie.name] === undefined || data[contextName][domainURL][cookie.name] === false || data[contextName][domainURL][cookie.name] === true) {
        continue
      }

      delete data[contextName][domainURL][cookie.name]
      continue
    }

    if (data[contextName][domainURL][cookie.name] === undefined || (data[contextName][domainURL][cookie.name] !== false && data[contextName][domainURL][cookie.name] !== true)) {
      data[contextName][domainURL][cookie.name] = newStatus
    }
  }

  if (newStatus === null) {
    if (Object.keys(data[contextName][domainURL]).length === 0) delete data[contextName][domainURL]
    if (Object.keys(data[contextName]).length === 0) {
      if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove(contextName)
      delete data[contextName]
    }

    return
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
}

// Permitted view flag switch
// Chrome + Firefox
async function permittedCookieSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(permittedCookieSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  permittedCookieSwitchNeutral(data, event)
}

// Kinda neutral
async function permittedCookieSwitchNeutral (data, event) {
  let cookieName = event.target.dataset['name']

  // Uncheck from permitted in active cookies, if present
  let domainCookieList = document.getElementById('cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true

  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      if (hasAutoFlag) {
        data[contextName][domainURL][cookieName] = 'af'
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = 'This cookie is auto-flagged and will be removed'
      } else if (hasGlobal) {
        delete data[contextName][domainURL][cookieName]

        if (Object.keys(data[contextName][domainURL]).length === 0) delete data[contextName][domainURL]
        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }

        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = 'This cookie is globally flagged and will be removed'
      } else {
        delete data[contextName][domainURL][cookieName]

        if (Object.keys(data[contextName][domainURL]).length === 0) delete data[contextName][domainURL]
        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }

        child.children[0].className = 'checkmark'
        child.children[0].title = 'This cookie is allowed and unhandled'
      }

      if (useChrome) setChromeStorage(data)
      else await browser.storage.local.set(data)
      break
    }
  }

  let parent = event.target.parentNode.parentNode

  parent.removeChild(event.target.parentNode)
  if (parent.children.length === 0) {
    let infoDisplay = document.getElementById('infoDisplay')
    let contentText = 'No permitted cookies for domain.'
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }
}

// Switch the cookie flag

// Chrome + Firefox
async function cookieFlagSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(cookieFlagSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  cookieFlagSwitchNeutral(data, event)
}

// Kinda neutral
async function cookieFlagSwitchNeutral (data, event) {
  let cookieName = event.target.dataset['name']
  let cookieValue = event.target.dataset['value']

  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}

  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasCookie = data[contextName][domainURL][cookieName] !== undefined

  if (!hasCookie || (hasCookie && data[contextName][domainURL][cookieName] !== true && data[contextName][domainURL][cookieName] !== false)) {
    data[contextName][domainURL][cookieName] = true
    event.target.className = 'checkmark flagged'
    event.target.title = 'This cookie is flagged by you and will be removed'
    addCookieToList('cookie-list-flagged', cookieName, cookieValue)
  } else if (data[contextName][domainURL][cookieName] === true) {
    data[contextName][domainURL][cookieName] = false
    event.target.className = 'checkmark permit'
    event.target.title = 'This cookie is permitted and will be kept'
    addCookieToList('cookie-list-permitted', cookieName, cookieValue)

    // Remove from flagged list if present
    let flaggedCookieList = document.getElementById('cookie-list-flagged')
    for (let child of flaggedCookieList.children) {
      if (child.children[0].dataset['name'] === cookieName) {
        child.parentNode.removeChild(child)
        break
      }
    }
  } else if (hasAutoFlag && data[contextName][domainURL][cookieName] !== 'af') {
    data[contextName][domainURL][cookieName] = 'af'
    event.target.className = 'checkmark auto-flagged'
    event.target.title = 'This cookie is auto-flagged and will be removed'
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    delete data[contextName][domainURL][cookieName]

    if (Object.keys(data[contextName][domainURL]).length === 0) delete data[contextName][domainURL]
    if (Object.keys(data[contextName]).length === 0) {
      if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove(contextName)
      delete data[contextName]
    }

    event.target.className = 'checkmark auto-flagged'
    event.target.title = 'This cookie is globally flagged and will be removed'
  } else {
    delete data[contextName][domainURL][cookieName]

    if (Object.keys(data[contextName][domainURL]).length === 0) delete data[contextName][domainURL]
    if (Object.keys(data[contextName]).length === 0) {
      if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove(contextName)
      delete data[contextName]
    }

    event.target.className = 'checkmark'
    event.target.title = 'This cookie is allowed and unhandled'
  }

  if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieName] === undefined || (hasAutoFlag && data[contextName][domainURL][cookieName] === 'af')) {
    // Remove from permitted list if present
    let permittedCookieList = document.getElementById('cookie-list-permitted')
    for (let child of permittedCookieList.children) {
      if (child.children[0].dataset['name'] === cookieName) {
        child.parentNode.removeChild(child)
        break
      }
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
}

// Switch lockSwitch
async function cookieLockSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(cookieLockSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  cookieLockSwitchNeutral(data, event)
}

async function cookieLockSwitchNeutral (data, event) {
  let cookieName = event.target.dataset['name']

  if (data['flagCookies_logged'] === undefined) data['flagCookies_logged'] = {}
  if (data['flagCookies_logged'][contextName] === undefined) data['flagCookies_logged'][contextName] = {}
  if (data['flagCookies_logged'][contextName][domainURL] === undefined) data['flagCookies_logged'][contextName][domainURL] = {}

  if (event.target.className.indexOf('locked') !== -1) {
    if (data['flagCookies_logged'][contextName][domainURL][cookieName] !== undefined) {
      delete data['flagCookies_logged'][contextName][domainURL][cookieName]

      if (Object.keys(data['flagCookies_logged'][contextName][domainURL]).length === 0) delete data['flagCookies_logged'][contextName][domainURL]
      if (Object.keys(data['flagCookies_logged'][contextName]).length === 0) delete data['flagCookies_logged'][contextName]

      if (useChrome) setChromeStorage(data)
      else await browser.storage.local.set(data)

      let loggedInCookieList = document.getElementById('loggedInCookies')
      removeCookieOfProfileList(loggedInCookieList, cookieName, 'flagCookies_logged')
      event.target.className = event.target.className.replace(' locked', '')
      event.target.title = 'Set this cookie as profile-mode cookie'

      if (data['flagCookies_logged'][contextName] === undefined || data['flagCookies_logged'][contextName][domainURL] === undefined) {
        document.getElementById('profileNoData').removeAttribute('class')
      }
    }
  } else {
    data['flagCookies_logged'][contextName][domainURL][cookieName] = true

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    let loggedInCookieList = document.getElementById('loggedInCookies')
    addCookieToProfileList(loggedInCookieList, cookieName, 'flagCookies_logged')
    loggedInCookieList.removeAttribute('class')

    document.getElementById('profileNoData').className = 'hidden'
    event.target.className += ' locked'
    event.target.title = 'This cookie is set locked as profile-mode cookie for this domain'
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Switches for main buttons
function unhide (targetList) {
  let searchVal = document.getElementById('searchBar').value.trim().toLowerCase()
  if (searchVal !== '') {
    doSearch(searchVal)
  } else {
    for (let child of targetList.children) {
      if (child.className === 'hidden') child.removeAttribute('class')
    }
  }
}

// Switch views
function switchView (event) {
  let list = document.getElementById(event.target.dataset.target)
  unhide(list)

  let content = document.getElementById('content')
  for (let child of content.children) {
    child.className = 'hidden'
  }

  let tabs = document.getElementById('tabs')
  for (let child of tabs.children) {
    if (child !== event.target) child.removeAttribute('class')
  }

  let prefs = document.getElementById('prefs')
  let prefsActive = false
  if (prefs !== event.target) prefs.removeAttribute('class')
  else if (prefs.className.indexOf('active') !== -1) prefsActive = true
  event.target.className = 'active'

  if (list.children.length === 0) {
    let infoDisplay = document.getElementById('infoDisplay')

    let contentText = 'No active cookies for domain.'
    if (event.target.dataset.target === 'cookie-list-flagged') {
      contentText = 'No flagged cookies for domain.'
    } else if (event.target.dataset.target === 'cookie-list-permitted') {
      contentText = 'No permitted cookies for domain.'
    }

    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    list.removeAttribute('class')
  }

  if (prefsActive) document.getElementById('activeCookies').click()
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Switch auto flagging
// Chrome + Firefox
async function flagAutoSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(flagAutoSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  flagAutoSwitchNeutral(data, event)
}

// Kinda neutral
async function flagAutoSwitchNeutral (data, event) {
  if (data['flagCookies_autoFlag'] === undefined) data['flagCookies_autoFlag'] = {}
  if (data['flagCookies_autoFlag'][contextName] === undefined) data['flagCookies_autoFlag'][contextName] = {}

  if (event.target.className !== 'active') {
    data['flagCookies_autoFlag'][contextName][domainURL] = true
    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    event.target.className = 'active'
    switchAutoFlag(true, 'cookie-list')
  } else {
    delete data['flagCookies_autoFlag'][contextName][domainURL]

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)
    event.target.removeAttribute('class')

    switchAutoFlag(false, 'cookie-list')
  }
}

// Switch global auto flagging
// Chrome
function flagGlobalAutoNonEventWrapper (data) {
  if (data['flagCookies_flagGlobal'] === undefined) data['flagCookies_flagGlobal'] = {}
  if (data['flagCookies_flagGlobal'][contextName] === undefined) data['flagCookies_flagGlobal'][contextName] = false

  let globalFlagButton = document.getElementById('global-flag')

  if (globalFlagButton.className !== 'active') {
    globalFlagButton.className = 'active'
    data['flagCookies_flagGlobal'][contextName] = true
    setChromeStorage(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.removeAttribute('class')
    data['flagCookies_flagGlobal'][contextName] = false
    setChromeStorage(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined

    if (hasAutoFlag) {
      switchAutoFlagGlobal(true, 'cookie-list')
    } else {
      switchAutoFlagGlobal(false, 'cookie-list')
    }
  }
}

// Firefox
async function flagGlobalAutoNonEvent () {
  if (useChrome) {
    getChromeStorageForFunc(flagGlobalAutoNonEventWrapper)
    return
  }

  let data = await browser.storage.local.get()

  if (data['flagCookies_flagGlobal'] === undefined) data['flagCookies_flagGlobal'] = {}
  if (data['flagCookies_flagGlobal'][contextName] === undefined) data['flagCookies_flagGlobal'][contextName] = false

  let globalFlagButton = document.getElementById('global-flag')

  if (globalFlagButton.className !== 'active') {
    globalFlagButton.className = 'active'
    data['flagCookies_flagGlobal'][contextName] = true
    await browser.storage.local.set(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.removeAttribute('class')
    data['flagCookies_flagGlobal'][contextName] = false
    await browser.storage.local.set(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined

    if (hasAutoFlag) {
      switchAutoFlag(true, 'cookie-list')
    } else {
      switchAutoFlagGlobal(false, 'cookie-list')
    }
  }
}

async function flagGlobalAuto (event) {
  flagGlobalAutoNonEvent()
  event.preventDefault()
}

// Switch auto flag status for cookies
// Chrome + Firefox
async function switchAutoFlag (doSwitchOn, targetList) {
  if (useChrome) {
    getChromeStorageForFunc2(switchAutoFlagNeutral, doSwitchOn, targetList)
    return
  }

  let data = await browser.storage.local.get()
  switchAutoFlagNeutral(data, doSwitchOn, targetList)
}

// Kinda neutral
async function switchAutoFlagNeutral (data, doSwitchOn, targetList) {
  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}

  let searchTarget = document.getElementById(targetList)
  if (doSwitchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[contextName][domainURL][cookieKey] !== undefined) {
        if (data[contextName][domainURL][cookieKey] !== true && data[contextName][domainURL][cookieKey] !== false) {
          data[contextName][domainURL][cookieKey] = 'af'
          contentChild.className = 'checkmark auto-flagged'
          contentChild.title = 'This cookie is auto-flagged and will be removed'
        }
      } else {
        data[contextName][domainURL][cookieKey] = 'af'
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = 'This cookie is auto-flagged and will be removed'
      }
    }
  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[contextName][domainURL][cookieKey] === undefined) continue

      if (data[contextName][domainURL][cookieKey] === 'af') {
        delete data[contextName][domainURL][cookieKey]
        if (data['flagCookies_flagGlobal'] === undefined || data['flagCookies_flagGlobal'][contextName] === undefined || data['flagCookies_flagGlobal'][contextName] !== true) {
          contentChild.className = 'checkmark'
          contentChild.title = 'This cookie is allowed and unhandled'
        }
      }
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
}

// Switch auto globalflag status for cookies
// Chrome + Firefox
async function switchAutoFlagGlobal (doSwitchOn, targetList) {
  if (useChrome) {
    getChromeStorageForFunc2(switchAutoFlagGlobalNeutral, doSwitchOn, targetList)
    return
  }

  let data = await browser.storage.local.get()
  switchAutoFlagGlobalNeutral(data, doSwitchOn, targetList)
}

// Neutral
function switchAutoFlagGlobalNeutral (data, doSwitchOn, targetList) {
  let searchTarget = document.getElementById(targetList)

  if (doSwitchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']
      if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieKey] === undefined || (data[contextName][domainURL][cookieKey] !== true && data[contextName][domainURL][cookieKey] !== false)) {
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = 'This cookie is globally flagged and will be removed'
      }
    }
  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieKey] === undefined || (data[contextName][domainURL][cookieKey] !== true && data[contextName][domainURL][cookieKey] !== false)) {
        contentChild.className = 'checkmark'
        contentChild.title = 'This cookie is allowed and unhandled'
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Search related
function searchContent (event) {
  let searchVal = event.target.value.trim().toLowerCase()
  doSearch(searchVal, 'cookie-list')
  doSearch(searchVal, 'cookie-list-flagged')
}

function doSearch (searchVal, targetList) {
  let searchTarget = document.getElementById(targetList)
  for (let child of searchTarget.children) {
    let contentChild = child.children[0]
    let cookieKey = contentChild.dataset['name'].toLowerCase()
    let cookieValue = contentChild.dataset['value'].toLowerCase()
    if (cookieKey.indexOf(searchVal) === -1 && cookieValue.indexOf(searchVal) === -1) child.className = 'hidden'
    else child.removeAttribute('class')
  }
}

// Settings dialog - clearing flag cookies data
function toggleClearing (event) {
  if (event.target.className.indexOf('active') === -1) event.target.className += ' active'
  else event.target.className = event.target.className.replace(' active', '')
}

async function toggleNotifications (event) {
  let doSwitchOn = false

  if (event.target.className.indexOf('active') === -1) {
    event.target.className += ' active'
    doSwitchOn = true

    if (useChrome) chrome.notifications.create('notifications_info', {type: 'basic', message: 'Flag Cookie notifications enabled.', title: 'Flag Cookies: Notifications enabled', iconUrl: 'icons/cookie_128.png'})
    else browser.notifications.create('notifications_info', {type: 'basic', message: 'Flag Cookie notifications enabled.', title: 'Flag Cookies: Notifications enabled', iconUrl: 'icons/cookie_128.png'})
  } else {
    event.target.className = event.target.className.replace(' active', '')
    doSwitchOn = false

    if (useChrome) chrome.notifications.create('notifications_info', {type: 'basic', message: 'Flag Cookie notifications disabled.', title: 'Flag Cookies: Notifications disabled', iconUrl: 'icons/cookie_128.png'})
    else browser.notifications.create('notifications_info', {type: 'basic', message: 'Flag Cookie notifications disabled.', title: 'Flag Cookies: Notifications disabled', iconUrl: 'icons/cookie_128.png'})
  }

  if (useChrome) {
    getChromeStorageForFunc1(switchNotificationsChrome, doSwitchOn)
    return
  }

  let data = await browser.storage.local.get(null)
  data['flagCookies_notifications'] = doSwitchOn
  await browser.storage.local.set(data)
}

function switchNotificationsChrome (data, doSwitchOn) {
  data['flagCookies_notifications'] = doSwitchOn
  setChromeStorage(data)
}

// Chrome + Firefox
async function clearSettings (event) {
  let log = document.getElementById('log')
  if (document.getElementById('confirmSettingsClearing').className.indexOf('active') === -1) {
    document.getElementById('log').textContent = 'Please confirm storage clearing.'
    return
  }

  if (useChrome) {
    chrome.storage.local.clear(function () {
      if (!checkChromeHadNoErrors) {
        log.textContent = 'Error clearing settings.'
      } else {
        log.textContent = 'Flag cookies settings and storage cleared'
        resetUI()
      }
    })

    return
  }

  if (await browser.storage.local.clear() === null) {
    log.textContent = 'Flag cookies settings and storage cleared'
    resetUI()
  } else {
    log.textContent = 'Error clearing settings.'
  }
}

// Chrome + Firefox - clearing domain data
async function clearDomain (event) {
  let log = document.getElementById('log')
  if (document.getElementById('confirmDomainClearing').className.indexOf('active') === -1) {
    document.getElementById('log').textContent = 'Please confirm domain clearing.'
    return
  }

  if (useChrome) {
    chrome.storage.local.remove(domainURL, function () {
      if (!checkChromeHadNoErrors) {
        log.textContent = 'Error clearing domain data.'
      } else {
        getChromeStorageForFunc(resetUIDomain)
        if (checkChromeHadNoErrors) log.textContent = 'Flag cookies domain data cleared'
      }
    })

    return
  }

  if (await browser.storage.local.remove(domainURL) === null) {
    log.textContent = 'Flag cookies domain data cleared'
    let data = await browser.storage.local.get()
    resetUIDomain(data)
  } else {
    log.textContent = 'Error clearing domain data.'
  }
}

function resetUI () {
  document.getElementById('auto-flag').removeAttribute('class')
  document.getElementById('global-flag').removeAttribute('class')
  document.getElementById('account-mode').removeAttribute('class')

  // Reset cookie list
  let cookieList = document.getElementById('cookie-list')
  for (let child of cookieList.children) {
    let contentChild = child.children[0]
    contentChild.className = 'checkmark'
    contentChild.title = 'This cookie is allowed and unhandled'
  }

  let clearLists = ['cookie-list-flagged', 'cookie-list-permitted']

  for (let child of clearLists) {
    let parent = document.getElementById(child)
    for (let childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  let confirmClearing = document.getElementById('confirmSettingsClearing')
  confirmClearing.className = confirmClearing.className.replace(' active', '')
}

async function resetUIDomain (data) {
  document.getElementById('auto-flag').removeAttribute('class')

  // Reset cookie list
  let cookieList = document.getElementById('cookie-list')

  for (let child of cookieList.children) {
    let contentChild = child.children[0]
    let contentChildProfile = child.children[2]

    if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
      contentChild.className = 'checkmark auto-flagged'
      contentChild.title = 'This cookie is globally flagged and will be removed'
    } else {
      contentChild.className = 'checkmark'
      contentChild.title = 'This cookie is allowed and unhandled'
    }

    contentChildProfile.className = contentChildProfile.className.replace(' locked', '')
    contentChildProfile.title = 'Set this cookie as profile-mode cookie'
  }

  let clearLists = ['cookie-list-flagged', 'cookie-list-permitted', 'loggedInCookies']

  for (let child of clearLists) {
    let parent = document.getElementById(child)
    for (let childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  document.getElementById('profileNoData').removeAttribute('class')
  if (data['flagCookies_autoFlag'] !== undefined) {
    if (data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_autoFlag'][contextName][domainURL]
    }

    if (data['flagCookies_autoFlag'][contextName] !== undefined && Object.keys(data['flagCookies_autoFlag'][contextName]).length === 0) {
      delete data['flagCookies_autoFlag'][contextName]
    }

    if (Object.keys(data['flagCookies_autoFlag']).length === 0) {
      delete data['flagCookies_autoFlag']

      if (useChrome) chrome.storage.local.remove('flagCookies_autoFlag', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_autoFlag')
    }
  }

  if (data['flagCookies_logged'] !== undefined) {
    if (data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_logged'][contextName][domainURL]
    }

    if (data['flagCookies_logged'][contextName] !== undefined && Object.keys(data['flagCookies_logged'][contextName]).length === 0) {
      delete data['flagCookies_logged'][contextName]
    }

    if (Object.keys(data['flagCookies_logged']).length === 0) {
      delete data['flagCookies_logged']

      if (useChrome) chrome.storage.local.remove('flagCookies_logged', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_logged')
    }
  }

  if (data['flagCookies_accountMode'] !== undefined) {
    if (data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][contextName][domainURL]
    }

    if (data['flagCookies_accountMode'][contextName] !== undefined && Object.keys(data['flagCookies_accountMode'][contextName]).length === 0) {
      delete data['flagCookies_accountMode'][contextName]
    }

    if (Object.keys(data['flagCookies_accountMode']).length === 0) {
      delete data['flagCookies_accountMode']

      if (useChrome) chrome.storage.local.remove('flagCookies_accountMode', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_accountMode')
    }

    document.getElementById('account-mode').removeAttribute('class')
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let confirmClearing = document.getElementById('confirmDomainClearing')
  confirmClearing.className = confirmClearing.className.replace(' active', '')
}

// Chrome + Firefox: Dump cookie from profile
async function dumpProfileCookie (event) {
  if (useChrome) {
    getChromeStorageForFunc1(dumpProfileCookieNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  dumpProfileCookieNeutral(data, event)
}

async function dumpProfileCookieNeutral (data, event) {
  let cookieSrc = event.target.dataset['src']
  let cookieName = event.target.dataset['name']

  if (data[cookieSrc][contextName][domainURL] === undefined || data[cookieSrc][contextName][domainURL][cookieName] === undefined) {
    return
  }

  delete data[cookieSrc][contextName][domainURL][cookieName]

  if (Object.keys(data[cookieSrc][contextName][domainURL]).length === 0) {
    delete data[cookieSrc][contextName][domainURL]
  }

  if (Object.keys(data[cookieSrc][contextName]).length === 0) {
    delete data[cookieSrc][contextName]
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let cookieList = document.getElementById('cookie-list')
  for (let child of cookieList.children) {
    let contentChild = child.children[2]
    if (contentChild.dataset['name'] === cookieName) {
      contentChild.className = contentChild.className.replace(' locked', '')
      contentChild.title = 'Set this cookie as profile-mode cookie'
      break
    }
  }

  if (event.target.parentNode.parentNode.children.length === 1) {
    document.getElementById('profileNoData').removeAttribute('class')
    event.target.parentNode.parentNode.className = 'hidden'
  }

  event.target.parentNode.parentNode.removeChild(event.target.parentNode)
}

// Switch profile/account mode
async function accountModeSwitch (event) {
  if (useChrome) {
    getChromeStorageForFunc1(accountModeSwitchNeutral, event)
    return
  }

  let data = await browser.storage.local.get()
  accountModeSwitchNeutral(data, event)
}

async function accountModeSwitchNeutral (data, event) {
  if (event.target.className.indexOf('active') !== -1) {
    if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][contextName][domainURL]
    }

    if (Object.keys(data['flagCookies_accountMode'][contextName]).length === 0) {
      delete data['flagCookies_accountMode'][contextName]
    }

    if (Object.keys(data['flagCookies_accountMode']).length === 0) {
      if (useChrome) chrome.storage.local.remove('flagCookies_accountMode', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_accountMode')
    }

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    event.target.removeAttribute('class')

    // Account mode icon removal
    if (useChrome) chrome.browserAction.setIcon({'tabId': tabId, 'path': { '19': 'icons/cookie_19.png', '38': 'icons/cookie_38.png', '48': 'icons/cookie_48.png', '64': 'icons/cookie_64.png', '96': 'icons/cookie_96.png', '128': 'icons/cookie_128.png' }})
    else browser.browserAction.setIcon({'tabId': tabId, 'path': { '19': 'icons/cookie_19.png', '38': 'icons/cookie_38.png', '48': 'icons/cookie_48.png', '64': 'icons/cookie_64.png', '96': 'icons/cookie_96.png', '128': 'icons/cookie_128.png' }})
    return
  }

  if (data['flagCookies_accountMode'] === undefined) data['flagCookies_accountMode'] = {}
  if (data['flagCookies_accountMode'][contextName] === undefined) data['flagCookies_accountMode'][contextName] = {}
  data['flagCookies_accountMode'][contextName][domainURL] = true
  event.target.className = 'active'

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  // Account mode icon
  if (useChrome) chrome.browserAction.setIcon({'tabId': tabId, 'path': {'19': 'icons/cookie_19_profil.png', '38': 'icons/cookie_38_profil.png', '48': 'icons/cookie_48_profil.png', '64': 'icons/cookie_64_profil.png', '96': 'icons/cookie_96_profil.png', '128': 'icons/cookie_128_profil.png'}})
  else browser.browserAction.setIcon({'tabId': tabId, 'path': {'19': 'icons/cookie_19_profil.png', '38': 'icons/cookie_38_profil.png', '48': 'icons/cookie_48_profil.png', '64': 'icons/cookie_64_profil.png', '96': 'icons/cookie_96_profil.png', '128': 'icons/cookie_128_profil.png'}})
}

// --------------------------------------------------------------------------------------------------------------------------------
// Startup code
document.getElementById('activeCookies').addEventListener('click', switchView)
document.getElementById('flaggedCookies').addEventListener('click', switchView)
document.getElementById('permittedCookies').addEventListener('click', switchView)
document.getElementById('prefs').addEventListener('click', switchView)
document.getElementById('auto-flag').addEventListener('click', flagAutoSwitch)
document.getElementById('global-flag').addEventListener('click', flagGlobalAuto)
document.getElementById('account-mode').addEventListener('click', accountModeSwitch)
document.getElementById('searchBar').addEventListener('keyup', searchContent)
document.getElementById('confirmSettingsClearing').addEventListener('click', toggleClearing)
document.getElementById('confirmDomainClearing').addEventListener('click', toggleClearing)
document.getElementById('confirmNotifications').addEventListener('click', toggleNotifications)
document.getElementById('settings-action-clear').addEventListener('click', clearSettings)
document.getElementById('domain-action-clear').addEventListener('click', clearDomain)

if (useChrome) chrome.tabs.query({currentWindow: true, active: true}, initDomainURLandProceed)
else getActiveTab().then(initDomainURLandProceed)
