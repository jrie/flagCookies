// --------------------------------------------------------------------------------------------------------------------------------
let domainURL = ''
// Slightly modifed version of list-cookies example on MDN github

async function showCookiesForTab (tabs) {
  // get the first tab object in the array
  let tab = tabs.pop()

  // Get storage data and parse tab URL
  let data = await browser.storage.local.get()
  let domainMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ.-:]*\//)
  if (domainMatch) {
    domainURL = domainMatch[0]
  } else {
    domainURL = 'No domain'
  }

  // get all cookies in the domain
  let gettingAllCookies = browser.cookies.getAll({url: domainURL})
  gettingAllCookies.then((cookies) => {
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
    if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
      document.getElementById('auto-flag').className = 'active'
      switchAutoFlag(true, 'cookie-list')
    }

    let cookieList = document.getElementById('cookie-list')
    let flaggedCookieList = document.getElementById('cookie-list-flagged')

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

        if (data[domainURL] && data[domainURL][cookie.name] !== undefined) {
          if (data[domainURL][cookie.name] === true) {
            checkMark.className = 'checkmark flagged'
            addCookieToList('cookie-list-flagged', cookie.name, cookie.value)
          } else if (data[domainURL][cookie.name] === false) {
            checkMark.className = 'checkmark permit'
            addCookieToList('cookie-list-permitted', cookie.name, cookie.value)
          }
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

        cookieList.appendChild(li)
      }

      cookieList.removeAttribute('class')
    }

    if (data[domainURL]) {
      if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
        for (let cookieName in data[domainURL]) {
          if (data[domainURL][cookieName] !== true) {
            continue
          }

          let found = false

          for (let child of flaggedCookieList.children) {
            if (child.children[0].dataset['name'] === cookieName) {
              found = true
              break
            }
          }

          if (!found) addCookieToList('cookie-list-flagged', cookieName, '')
        }
      } else {
        for (let cookieName in data[domainURL]) {
          if (data[domainURL][cookieName] !== true) {
            continue
          }

          let found = false

          for (let child of flaggedCookieList.children) {
            if (child.children[0].dataset['name'] === cookieName) {
              found = true
              break
            }
          }

          if (!found) addCookieToList('cookie-list-flagged', cookieName, '')
        }
      }
    }
  })

  if (data['flagCookies_flag_global'] && data['flagCookies_flag_global']['use'] === true) {
      flagGlobalAutoNonEvent()
  }
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

async function flaggedCookieSwitch (event) {
  let data = await browser.storage.local.get()
  let cookieName = event.target.dataset['name']

  // Uncheck from flagged in active cookies, if present
  let domainCookieList = document.getElementById('cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined ? data['flagCookies_autoFlag'][domainURL] !== undefined : false
  let hasGlobal = data['flagCookies_flag_global'] !== undefined && data['flagCookies_flag_global']['use'] === true

  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      delete data[domainURL][cookieName]
      await browser.storage.local.set(data)
      if (hasAutoFlag) {
        data[domainURL][cookieName] = 'af'
        child.children[0].className = 'checkmark auto-flagged'
      } else if (hasGlobal) {
        child.children[0].className = 'checkmark auto-flagged'
      } else {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark'
      }
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

async function permittedCookieSwitch (event) {
  let data = await browser.storage.local.get()
  let cookieName = event.target.dataset['name']

  // Uncheck from permitted in active cookies, if present
  let domainCookieList = document.getElementById('cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined ? data['flagCookies_autoFlag'][domainURL] !== undefined : false
  let hasGlobal = data['flagCookies_flag_global'] !== undefined && data['flagCookies_flag_global']['use'] === true
  for (let child of domainCookieList.children) {
    if (child.children[0].dataset['name'] === cookieName) {
      if (hasAutoFlag) {
        data[domainURL][cookieName] = 'af'
        child.children[0].className = 'checkmark auto-flagged'
      } else if (hasGlobal) {
        child.children[0].className = 'checkmark auto-flagged'
      } else {
        delete data[domainURL][cookieName]
        child.children[0].className = 'checkmark'
      }
      await browser.storage.local.set(data)
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

async function cookieFlagSwitch (event) {
  let data = await browser.storage.local.get()
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
  } else if (data['flagCookies_flag_global'] !== undefined && data['flagCookies_flag_global']['use'] !== undefined && data['flagCookies_flag_global']['use'] === true) {
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

  await browser.storage.local.set(data)
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
async function flagAutoSwitch (event) {
  let data = await browser.storage.local.get()

  if (!data['flagCookies_autoFlag']) {
    data['flagCookies_autoFlag'] = {}
  }

  if (event.target.className !== 'active') {
    data['flagCookies_autoFlag'][domainURL] = true
    await browser.storage.local.set(data)
    event.target.className = 'active'
    switchAutoFlag(true, 'cookie-list')
  } else {
    delete data['flagCookies_autoFlag'][domainURL]
    await browser.storage.local.set(data)
    event.target.removeAttribute('class')
    switchAutoFlag(false, 'cookie-list')
  }
}

// Switch global auto flagging
async function flagGlobalAutoNonEvent () {
  let data = await browser.storage.local.get()

  if (data['flagCookies_flag_global'] === undefined) {
    data['flagCookies_flag_global'] = {'use': false}
  }

  let globalFlagButton = document.getElementById('global-flag')
  let autoFlagButton = document.getElementById('auto-flag')

  if (globalFlagButton.className !== 'active') {
    globalFlagButton.className = 'active'
    data['flagCookies_flag_global']['use'] = true
    await browser.storage.local.set(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.removeAttribute('class')
    data['flagCookies_flag_global']['use'] = false
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
async function switchAutoFlag (switchOn, targetList) {
  let data = await browser.storage.local.get()

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

          if (data['flagCookies_flag_global'] !== undefined && data['flagCookies_flag_global']['use'] !== true) {
            contentChild.className = 'checkmark'
          }
        }
      }
    }
  }

  await browser.storage.local.set(data)
}

// Switch auto globalflag status for cookies
async function switchAutoFlagGlobal (switchOn, targetList) {
  let data = await browser.storage.local.get()
  let searchTarget = document.getElementById(targetList)

  if (switchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']
      if (data[domainURL] === undefined || (data[domainURL] !== undefined && data[domainURL][cookieKey] !== true && data[domainURL][cookieKey] !== false)) {
        contentChild.className = 'checkmark auto-flagged'
      }
    }
  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']

      if (data[domainURL] === undefined || (data[domainURL] !== undefined && data[domainURL][cookieKey] !== true && data[domainURL][cookieKey] !== false)) {
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

// --------------------------------------------------------------------------------------------------------------------------------
// Startup code
document.getElementById('activeCookies').addEventListener('click', switchView)
document.getElementById('flaggedCookies').addEventListener('click', switchView)
document.getElementById('permittedCookies').addEventListener('click', switchView)
document.getElementById('auto-flag').addEventListener('click', flagAutoSwitch)
document.getElementById('global-flag').addEventListener('click', flagGlobalAuto)
document.getElementById('searchBar').addEventListener('keyup', searchContent)

getActiveTab().then(showCookiesForTab)
