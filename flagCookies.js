// Chrome
let useChrome = typeof (browser) === 'undefined'

// Chrome helpers
function checkChromeHadNoErrors () {
  if (chrome.runtime.lastError) {
    if (chrome.runtime.lastError.message !== undefined) {
      console.log('Chrome had an error, with mesage: ' + chrome.runtime.lastError.message)
    } else {
      console.log('Chrome had an error.')
    }

    void chrome.runtime.lastError

    return false
  }

  return true
}

function getChromeStorageForFunc (func) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      console.log('Chrome retrieved storage data.')

      func(data)
    } else console.log('Chrome storage retrieval error.')
  })
}

function getChromeStorageForFunc1 (func, par1) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      console.log('Chrome retrieved storage data.')

      func(data, par1)
    } else console.log('Chrome storage retrieval error.')
  })
}

function getChromeStorageForFunc2 (func, par1, par2) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      console.log('Chrome retrieved storage data.')

      func(data, par1, par2)
    } else console.log('Chrome storage retrieval error.')
  })
}

function getChromeStorageForFunc3 (func, par1, par2, par3) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      console.log('Chrome retrieved storage data.')

      func(data, par1, par2, par3)
    } else console.log('Chrome storage retrieval error.')
  })
}

function setChromeStorage (data) {
  chrome.storage.local.set(data, function () {
    if (checkChromeHadNoErrors()) console.log('Chrome updated the storage data.')
    else console.log('Chrome updating storage error.')
  })
}

function chromeGetStorageAndCookiesForFunc (data, cookies, func) {
  if (!checkChromeHadNoErrors()) return

  if (data === null) {
    chrome.storage.local.get(null, function (data) { chromeGetStorageAndCookiesForFunc(data, null, func) })
    return
  } else if (cookies === null) {
    let targetDomain = domainURL.replace(/(http|https):\/\//, '').replace('/', '')
    chrome.cookies.getAll({domain: targetDomain}, function(cookies) { chromeGetStorageAndCookiesForFunc(data, cookies, func) })
    return
  }

  func(data, cookies)
}

// ---------------------------------------------------------------------

// Special functions

// --------------------------------------------------------------------------------------------------------------------------------
let domainURL = ''

// Slightly modifed version of list-cookies example on MDN github

async function initDomainURLandProceed (tabs) {
  // Get first tab
  let tab = tabs.pop()

  // Parse tab URL and set domainURL
  let domainMatch = tab.url.replace(/\/www\./, '/').match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-]*\//)
  if (domainMatch) {
    domainURL = domainMatch[0]
  } else {
    domainURL = 'No domain'
  }

  if (useChrome) {
    document.body.className = 'chrome'
    chromeGetStorageAndCookiesForFunc(null, null, updateUIData)
    return
  }

  // Get storage and cookies Firefox
  let data = await browser.storage.local.get()
  let cookies = await browser.cookies.getAll({url: domainURL})
  updateUIData(data, cookies)
}

function updateUIData (data, cookies) {
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

  let cookieList = document.getElementById('cookie-list')
  let flaggedCookieList = document.getElementById('cookie-list-flagged')
  let loggedInCookieList = document.getElementById('loggedInCookies')

  if (cookies.length === 0) {
    let infoDisplay = document.getElementById('infoDisplay')
    let contentText = 'No active cookies for domain.'
    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    for (let cookie of cookies) {
      let li = document.createElement('li')

      let checkMark = document.createElement('button')
      checkMark.className = 'checkmark'

      checkMark.addEventListener('click', cookieFlagSwitch)
      checkMark.dataset['name'] = cookie.name
      checkMark.dataset['value'] = cookie.value

      let lockSwitch = document.createElement('button')
      lockSwitch.className = 'setKeyCookie'
      lockSwitch.dataset['name'] = cookie.name
      lockSwitch.addEventListener('click', cookieLockSwitch)

      if (data[domainURL]) {
        if (data[domainURL][cookie.name] !== undefined) {
          if (data[domainURL][cookie.name] === true) {
            checkMark.className = 'checkmark flagged'
            addCookieToList('cookie-list-flagged', cookie.name, cookie.value)
          } else if (data[domainURL][cookie.name] === false) {
            checkMark.className = 'checkmark permit'
            addCookieToList('cookie-list-permitted', cookie.name, cookie.value)
          }
        }
      }

      if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][domainURL] !== undefined && data['flagCookies_logged'][domainURL][cookie.name] !== undefined) {
        lockSwitch.className += ' locked'
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

  if (data[domainURL]) {
    let domainData = data[domainURL]

    for (let cookieKey in domainData) {
      if (domainData[cookieKey] !== true) continue

      if (!isDomainCookieInList(flaggedCookieList, cookieKey)) addCookieToList('cookie-list-flagged', cookieKey, '')
    }
  }

  if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][domainURL] !== undefined) {
    for (let cookie in data['flagCookies_logged'][domainURL]) {
      addCookieToProfileList(loggedInCookieList, cookie, 'flagCookies_logged')
    }
  }

  if (loggedInCookieList.children.length !== 0) {
    loggedInCookieList.removeAttribute('class')
  } else {
    document.getElementById('profileNoData').removeAttribute('class')
  }

  if (data['flagCookies_flagGlobal'] && data['flagCookies_flagGlobal']['use'] === true) {
    flagGlobalAutoNonEvent()
  }

  document.getElementById('activeCookies').className = 'active'
  if (data['flagCookies'] !== undefined && data['flagCookies']['logData'] !== '') {
    let log = document.getElementById('log')
    for (let entry of data['flagCookies']['logData']) {
      if (entry.indexOf(domainURL) !== -1) {
        log.textContent += entry + '\n'
      }
    }
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
    document.getElementById('auto-flag').className = 'active'
    switchAutoFlag(true, 'cookie-list')
  }

  if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][domainURL] !== undefined) {
    document.getElementById('account-mode').className = 'active'
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
    checkMark.addEventListener('click', flaggedCookieSwitch);
  } else {
    checkMark.className = 'checkmark permit'
    checkMark.addEventListener('click', permittedCookieSwitch);
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
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal']['use'] === true

  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      if (hasAutoFlag) {
        data[domainURL][cookieName] = 'af'
        child.children[0].className = 'checkmark auto-flagged'
      } else if (hasGlobal) {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark auto-flagged'
      } else {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark'
      }

      if (useChrome) {
        setChromeStorage(data)
        if (!checkChromeHadNoErrors()) {
          return
        }
      } else await browser.storage.local.set(data)
      break
    }
  }



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
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal']['use'] === true
  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      if (hasAutoFlag) {
        data[domainURL][cookieName] = 'af'
        child.children[0].className = 'checkmark auto-flagged'
      } else if (hasGlobal) {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark auto-flagged'
      } else {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark'
      }

      if (useChrome) {
        setChromeStorage(data)
        if (!checkChromeHadNoErrors()) {
          return
        }
      } else await browser.storage.local.set(data)
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

  if (!data[domainURL]) {
    data[domainURL] = {}
  }

  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined ? data['flagCookies_autoFlag'][domainURL] !== undefined : false
  let hasCookie = data[domainURL][cookieName] !== undefined

  if (!hasCookie || (hasCookie && data[domainURL][cookieName] !== true && data[domainURL][cookieName] !== false)) {
    data[domainURL][cookieName] = true
    event.target.className = 'checkmark flagged'
    addCookieToList('cookie-list-flagged', cookieName, cookieValue)
  } else if (data[domainURL][cookieName] === true) {
    data[domainURL][cookieName] = false
    event.target.className = 'checkmark permit'
    addCookieToList('cookie-list-permitted', cookieName, cookieValue)

    // Remove from flagged list if present
    let flaggedCookieList = document.getElementById('cookie-list-flagged')
    for (let child of flaggedCookieList.children) {
      if (child.children[0].dataset['name'] === cookieName) {
        child.parentNode.removeChild(child)
        break
      }
    }
  } else if (hasAutoFlag && data[domainURL][cookieName] !== 'af') {
    data[domainURL][cookieName] = 'af'
    event.target.className = 'checkmark auto-flagged'
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal']['use'] !== undefined && data['flagCookies_flagGlobal']['use'] === true) {
    delete data[domainURL][cookieName]
    event.target.className = 'checkmark auto-flagged'
  } else {
    delete data[domainURL][cookieName]
    event.target.className = 'checkmark'
  }

  if (data[domainURL][cookieName] === undefined || (hasAutoFlag && data[domainURL][cookieName] === 'af')) {
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
  if (data['flagCookies_logged'][domainURL] === undefined) data['flagCookies_logged'][domainURL] = {}

  if (event.target.className.indexOf('locked') !== -1) {
    if (data['flagCookies_logged'][domainURL][cookieName] !== undefined) {
      delete data['flagCookies_logged'][domainURL][cookieName]

      if (Object.keys(data['flagCookies_logged'][domainURL]).length === 0) {
        delete data['flagCookies_logged'][domainURL]
      }

      if (useChrome) {
        setChromeStorage(data)
        if (!checkChromeHadNoErrors) return
      } else {
        await browser.storage.local.set(data)
      }

      let loggedInCookieList = document.getElementById('loggedInCookies')
      removeCookieOfProfileList(loggedInCookieList, cookieName, 'flagCookies_logged')
      event.target.className = event.target.className.replace(' locked', '')

      if (data['flagCookies_logged'][domainURL] === undefined) {
        document.getElementById('profileNoData').removeAttribute('class')
      }
    }
  } else {
    data['flagCookies_logged'][domainURL][cookieName] = true

    if (useChrome) {
      setChromeStorage(data)
      if (!checkChromeHadNoErrors) return
    } else {
      await browser.storage.local.set(data)
    }

    let loggedInCookieList = document.getElementById('loggedInCookies')
    addCookieToProfileList(loggedInCookieList, cookieName, 'flagCookies_logged')
    loggedInCookieList.removeAttribute('class')

    document.getElementById('profileNoData').className = 'hidden'
    event.target.className += ' locked'
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
  if (prefs !== event.target) prefs.removeAttribute('class')

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
async function flagAutoSwitchNeutral(data, event) {
  if (!data['flagCookies_autoFlag']) {
    data['flagCookies_autoFlag'] = {}
  }

  if (event.target.className !== 'active') {
    data['flagCookies_autoFlag'][domainURL] = true
    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    event.target.className = 'active'
    switchAutoFlag(true, 'cookie-list')
  } else {
    delete data['flagCookies_autoFlag'][domainURL]

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)
    event.target.removeAttribute('class')

    switchAutoFlag(false, 'cookie-list')
  }
}

// Switch global auto flagging
// Chrome
function flagGlobalAutoNonEventWrapper(data) {
  if (data['flagCookies_flagGlobal'] === undefined) {
    data['flagCookies_flagGlobal'] = {'use': false}
  }

  let globalFlagButton = document.getElementById('global-flag')

  if (globalFlagButton.className !== 'active') {
    globalFlagButton.className = 'active'
    data['flagCookies_flagGlobal']['use'] = true
    setChromeStorage(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.removeAttribute('class')
    data['flagCookies_flagGlobal']['use'] = false
    setChromeStorage(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][domainURL] !== undefined

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

  if (data['flagCookies_flagGlobal'] === undefined) {
    data['flagCookies_flagGlobal'] = {'use': false}
  }

  let globalFlagButton = document.getElementById('global-flag')

  if (globalFlagButton.className !== 'active') {
    globalFlagButton.className = 'active'
    data['flagCookies_flagGlobal']['use'] = true
    await browser.storage.local.set(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.removeAttribute('class')
    data['flagCookies_flagGlobal']['use'] = false
    await browser.storage.local.set(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined ? data['flagCookies_autoFlag'][domainURL] !== undefined : false

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
async function switchAutoFlag (switchOn, targetList) {
  if (useChrome) {
    getChromeStorageForFunc2(switchAutoFlagNeutral, switchOn, targetList)
    return
  }

  let data = await browser.storage.local.get()
  switchAutoFlagNeutral(data, switchOn, targetList)
}

// Kinda neutral
async function switchAutoFlagNeutral(data, switchOn, targetList) {
  if (!data[domainURL]) {
    data[domainURL] = {}
  }

  let searchTarget = document.getElementById(targetList)

  if (switchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[domainURL][cookieKey] !== undefined) {
        if (data[domainURL][cookieKey] !== true && data[domainURL][cookieKey] !== false) {
          data[domainURL][cookieKey] = 'af'
          contentChild.className = 'checkmark auto-flagged'
        }
      } else {
        data[domainURL][cookieKey] = 'af'
        contentChild.className = 'checkmark auto-flagged'
      }
    }
  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[domainURL][cookieKey]) {
        if (data[domainURL][cookieKey] === 'af') {
          delete data[domainURL][cookieKey]

          if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal']['use'] !== true) {
            contentChild.className = 'checkmark'
          }
        }
      }
    }
  }

  if (useChrome) {
    setChromeStorage(data)
    return
  }

  await browser.storage.local.set(data)
}

// Switch auto globalflag status for cookies
// Chrome + Firefox
async function switchAutoFlagGlobal (switchOn, targetList) {
  if (useChrome) {
    getChromeStorageForFunc2(switchAutoFlagGlobalNeutral, switchOn, targetList)
    return
  }

  let data = await browser.storage.local.get()
  switchAutoFlagGlobalNeutral(data, switchOn, targetList)
}

// Neutral
function switchAutoFlagGlobalNeutral (data, switchOn, targetList) {
  let searchTarget = document.getElementById(targetList)

  if (switchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']
      if (data[domainURL] === undefined || (data[domainURL] !== undefined && (data[domainURL][cookieKey] === undefined || (data[domainURL][cookieKey] !== true && data[domainURL][cookieKey] !== false)))) {
        contentChild.className = 'checkmark auto-flagged'
      }
    }
  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[domainURL] === undefined || (data[domainURL] !== undefined && (data[domainURL][cookieKey] === undefined || (data[domainURL][cookieKey] !== true && data[domainURL][cookieKey] !== false)))) {
        contentChild.className = 'checkmark'
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
    if (cookieKey.indexOf(searchVal) === -1 && cookieValue.indexOf(searchVal) === -1) {
      child.className = 'hidden'
    } else {
      child.removeAttribute('class')
    }
  }
}

// Settings dialog - clearing flag cookies data
function toggleClearing (event) {
  if (event.target.className.indexOf('active') === -1) event.target.className += ' active'
  else event.target.className = event.target.className.replace(' active', '')
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

function resetUI() {
  document.getElementById('auto-flag').removeAttribute('class')
  document.getElementById('global-flag').removeAttribute('class')
  document.getElementById('account-mode').removeAttribute('class')

  // Reset cookie list
  let cookieList = document.getElementById('cookie-list')
  for (let child of cookieList.children) {
    let contentChild = child.children[0]
    contentChild.className = 'checkmark'
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

    if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal']['use'] === true) {
      contentChild.className = 'checkmark auto-flagged'
    } else {
      contentChild.className = 'checkmark'
    }

    contentChildProfile.className = contentChildProfile.className.replace(' locked', '')
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
    if (data['flagCookies_autoFlag'][domainURL] !== undefined) {
      delete data['flagCookies_autoFlag'][domainURL]
    }

    if (Object.keys(data['flagCookies_autoFlag']).length === 0) {
      delete data['flagCookies_autoFlag']

      if (useChrome) chrome.storage.local.remove('flagCookies_autoFlag', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_autoFlag')
    }
  }

  if (data['flagCookies_logged'] !== undefined) {
    if (data['flagCookies_logged'][domainURL] !== undefined) {
      delete data['flagCookies_logged'][domainURL]
    }

    if (Object.keys(data['flagCookies_logged']).length === 0) {
      delete data['flagCookies_logged']

      if (useChrome) chrome.storage.local.remove('flagCookies_logged', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_logged')
    }
  }

  if (data['flagCookies_accountMode'] !== undefined) {
    if (data['flagCookies_accountMode'][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][domainURL]
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

  if (data[cookieSrc][domainURL] === undefined || data[cookieSrc][domainURL][cookieName] === undefined) {
    return
  }

  delete data[cookieSrc][domainURL][cookieName]

  if (useChrome) {
    setChromeStorage(data)

    if (!checkChromeHadNoErrors) {
      return
    }
  } else {
    await browser.storage.local.set(data)
  }

  let cookieList = document.getElementById('cookie-list')
  for (let child of cookieList.children) {
    let contentChild = child.children[2]
    if (contentChild.dataset['name'] === cookieName) {
      contentChild.className = contentChild.className.replace(' locked', '')
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
    if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][domainURL]
    }

    if (Object.keys(data['flagCookies_accountMode']).length === 0) {
      if (useChrome) chrome.storage.local.remove('flagCookies_accountMode', function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove('flagCookies_accountMode')
    }

    if (useChrome) {
      setChromeStorage(data)
      if (checkChromeHadNoErrors) event.target.removeAttribute('class')
      return
    }

    await browser.storage.local.set(data)
    event.target.removeAttribute('class')
    return
  }

  if (data['flagCookies_accountMode'] === undefined) data['flagCookies_accountMode'] = {}
  data['flagCookies_accountMode'][domainURL] = true
  event.target.className = 'active'


  if (useChrome) {
    setChromeStorage(data)
    return
  }

  await browser.storage.local.set(data)
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
document.getElementById('settings-action-clear').addEventListener('click', clearSettings)
document.getElementById('domain-action-clear').addEventListener('click', clearDomain)

if (useChrome) {
  chrome.tabs.query({currentWindow: true, active: true}, initDomainURLandProceed)
} else {
  getActiveTab().then(initDomainURLandProceed)
}
