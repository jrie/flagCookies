// Chrome
let useChrome = typeof (browser) === 'undefined'
let hasConsole = typeof (console) !== 'undefined'
let contextName = 'default'
let cookieStoreId = null
let domainURL = ''
let tabId = -1
let countList = {
  '#activeCookies': 0,
  '#permittedCookies': 0,
  '#flaggedCookies': 0
}

// Localization
let getMsg = useChrome ? getChromeMessage : getFirefoxMessage

function getChromeMessage (messageName, params) {
  if (params !== undefined) return chrome.i18n.getMessage(messageName, params)
  return chrome.i18n.getMessage(messageName)
}

function getFirefoxMessage (messageName, params) {
  if (params !== undefined) return browser.i18n.getMessage(messageName, params)
  return browser.i18n.getMessage(messageName)
}

// Chrome helpers
function checkChromeHadNoErrors () {
  if (chrome.runtime.lastError !== undefined) {
    if (hasConsole) {
      if (chrome.runtime.lastError.message !== undefined) {
        console.log(chrome.runtime.lastError)
        console.log(getMsg('BrowserErrorChromeDetail', chrome.runtime.lastError.message))
      } else {
        console.log(getMsg('BrowserErrorNeutral'))
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
      if (hasConsole) console.log(getMsg('BrowserRetriveStorageData'))

      func(data)
    } else if (hasConsole) {
      console.log(getMsg('BrowserRetrieveStorageDataError'))
    }
  })
}

function getChromeStorageForFunc1 (func, par1) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log(getMsg('BrowserRetriveStorageData'))

      func(data, par1)
    } else if (hasConsole) {
      console.log(getMsg('BrowserRetrieveStorageDataError'))
    }
  })
}

function getChromeStorageForFunc2 (func, par1, par2) {
  chrome.storage.local.get(null, function (data) {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) console.log(getMsg('BrowserRetriveStorageData'))

      func(data, par1, par2)
    } else if (hasConsole) {
      console.log(getMsg('BrowserRetrieveStorageDataError'))
    }
  })
}

function setChromeStorage (data) {
  chrome.storage.local.set(data, function () {
    if (checkChromeHadNoErrors()) {
      if (hasConsole) {
        console.log(getMsg('BrowserUpdateStorageData'))
      }
    } else if (hasConsole) {
      console.log(getMsg('BrowserUpdateStorageDataError'))
    }
  })
}

function chromeGetStorageAndCookiesForFunc (data, cookies, func, tab) {
  if (!checkChromeHadNoErrors()) return

  if (data === null) {
    chrome.storage.local.get(null, function (data) { chromeGetStorageAndCookiesForFunc(data, null, func, tab) })
    return
  } else if (cookies === null) {
    chrome.runtime.sendMessage({ 'getCookies': domainURL, 'windowId': tab.windowId, 'tabId': tab.id, 'storeId': 'default' }, function (response) { checkChromeHadNoErrors(); chromeGetStorageAndCookiesForFunc(data, response, func, tab) })
    return
  }

  func(data, cookies, 'default', tab, null)
}

// --------------------------------------------------------------------------------------------------------------------------------
function firefoxOnGetContextSuccess (context) {
  contextName = context.name
}

function firefoxOnGetContextError (e) {
  if (hasConsole) {
    // console.log('Firefox getContext profile error: ')
    // console.log(e)
  }
}

// --------------------------------------------------------------------------------------------------------------------------------

async function initDomainURLandProceed (tabs) {
  let tab = tabs.pop()
  tabId = tab.id
  let domain = null
  let domainMatch = tab.url.replace(/www./, '').match(/(http|https):\/\/.[^/]*/)
  if (domainMatch !== null) domainURL = domainMatch[0]
  else domainURL = 'No domain'

  if (useChrome) {
    document.body.className = 'chrome'
    if (navigator.appVersion.toLowerCase().indexOf('opr/') !== -1) {
      document.body.classList.add('opera')
    }
    chromeGetStorageAndCookiesForFunc(null, null, updateUIData, tab, null)
    return
  }

  // Get storage and cookies Firefox
  let data = await browser.storage.local.get()
  let activeCookieStore = 'default'
  activeCookieStore = tab.cookieStoreId
  cookieStoreId = activeCookieStore
  await browser.contextualIdentities.get(activeCookieStore).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)

  let cookies = await browser.runtime.sendMessage({ 'getCookies': domain, 'storeId': contextName, 'windowId': tab.windowId, 'tabId': tab.id })
  updateUIData(data, cookies, contextName, tab, activeCookieStore)
}

function sortObjectByKey (ObjectElements, keyName, doReverse) {
  function sortByKey (elementOne, elementTwo) {
    return elementOne[keyName].toLowerCase() < elementTwo[keyName].toLowerCase()
  }

  if (doReverse !== undefined && doReverse === true) return Object.values(ObjectElements).sort(sortByKey).reverse()
  return Object.values(ObjectElements).sort(sortByKey)
}

function updateUIData (data, cookies, activeCookieStoreName, tab, activeCookieStore) {
  // set the header of the panel
  let activeTabUrl = document.querySelector('#header-title')
  let introSpan = document.createElement('span')
  introSpan.className = 'intro'

  if (!useChrome) browser.contextualIdentities.get(tab.cookieStoreId).then(firefoxOnGetContextSuccess, firefoxOnGetContextError)
  else contextName = 'default'

  let intro = document.createTextNode(getMsg('CookiesForDomainText'))
  introSpan.appendChild(intro)
  let introUrl = document.createElement('span')
  introUrl.className = 'domainurl'
  let url = document.createTextNode(cookies.rootDomain)
  introUrl.appendChild(url)
  activeTabUrl.appendChild(introSpan)
  activeTabUrl.appendChild(introUrl)

  let introSpanStore = document.createElement('span')
  introSpanStore.className = 'intro'

  let introStore = document.createTextNode(getMsg('ActiveContainerGroupText') + ' ' + activeCookieStoreName)
  introSpanStore.appendChild(introStore)
  activeTabUrl.appendChild(introSpanStore)

  let cookieList = document.querySelector('#cookie-list')
  let flaggedCookieList = document.querySelector('#cookie-list-flagged')
  let permittedCookieList = document.querySelector('#cookie-list-permitted')
  let loggedInCookieList = document.querySelector('#loggedInCookies')

  // let hasAutoFlag = (data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined)
  // let hasGlobalFlag = (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] === true)

  if (cookies.cookies === null || Object.keys(cookies.cookies).length === 0) {
    let infoDisplay = document.querySelector('#infoDisplay')
    let contentText = getMsg('NoActiveDomainCookiesText')
    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    let previousCookieDomain = cookies.rootDomain
    let activeCookies = false

    let cookieBase = cookies.rootDomain.replace(/(http|https):\/\//, '').split('.')
    let cookieJoinRoot = cookieBase.splice(cookieBase.length - 2, 2).join('.')

    let cookieDataLists = [Object.keys(cookies.cookies), Object.keys(cookies.cookies).sort()]
    let index = 0
    for (let cookieListEntry of cookieDataLists) {
      ++index

      for (let cookieKey of cookieListEntry) {
        let cookieDomain = null
        let cookieJoin = null
        if (index === 1) {
          let cookieBase = cookieKey.split('.')
          cookieJoin = cookieBase.splice(cookieBase.length - 2, 2).join('.')
        }

        if ((cookieJoin === null && cookieKey !== previousCookieDomain && cookies.cookies[cookieKey]['isAdded'] === undefined) || (cookieJoin !== null && cookieKey.indexOf(cookieJoinRoot) !== -1)) {
          previousCookieDomain = cookieKey
          let cookieSub = document.createElement('h4')
          cookieSub.className = 'subloadbar'
          let cookieSubSpan = document.createElement('span')
          cookieSubSpan.className = 'subloaded'

          if (cookieJoin === null) {
            let cookieSubSpanText = document.createTextNode(getMsg('CrossOriginInformationText'))
            cookieSubSpan.appendChild(cookieSubSpanText)
          }

          let subName
          if (cookieDomain !== null) subName = document.createTextNode(cookieDomain)
          else subName = document.createTextNode(cookieKey)
          cookieSub.appendChild(cookieSubSpan)
          cookieSub.appendChild(subName)
          cookieList.appendChild(cookieSub)

          if (index === 1) {
            cookies.cookies[cookieKey]['isAdded'] = true
          }
        } else if (index === 1) continue

        if (index !== 1 && cookies.cookies[cookieKey]['isAdded'] !== undefined) continue

        let sortedCookies = sortObjectByKey(cookies.cookies[cookieKey]['data'], 'name', true)
        for (let cookie of sortedCookies) {
          activeCookies = true
          ++countList['#activeCookies']

          let li = document.createElement('li')

          let checkMark = document.createElement('button')
          checkMark.className = 'checkmark'
          checkMark.title = getMsg('CookieFlagButtonAllowedHelpText')

          checkMark.addEventListener('click', cookieFlagSwitch)
          checkMark.dataset['name'] = cookie.name
          checkMark.dataset['value'] = cookie.value
          checkMark.dataset['domain'] = cookie.domain

          let lockSwitch = document.createElement('button')
          lockSwitch.className = 'setKeyCookie'
          lockSwitch.title = getMsg('SetCookieProfileButtonHelpText')
          lockSwitch.dataset['name'] = cookie.name
          lockSwitch.dataset['domain'] = cookie.domain
          lockSwitch.addEventListener('click', cookieLockSwitch)

          let isHandledCookie = false
          if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined) {
            if (data[contextName][domainURL][cookie.domain] !== undefined && data[contextName][domainURL][cookie.domain][cookie.name] !== undefined) {
              if (data[contextName][domainURL][cookie.domain][cookie.name] === true) {
                checkMark.className = 'checkmark flagged'
                checkMark.title = getMsg('CookieIsFlaggedHelpText')
                addCookieToList('cookie-list-flagged', cookie.name, cookie.value, cookie.domain, false)
                ++countList['#flaggedCookies']
                isHandledCookie = true
              } else if (data[contextName][domainURL][cookie.domain][cookie.name] === false) {
                checkMark.className = 'checkmark permit'
                checkMark.title = getMsg('CookieIsPermittedHelpText')
                addCookieToList('cookie-list-permitted', cookie.name, cookie.value, cookie.domain, false)
                ++countList['#permittedCookies']
                isHandledCookie = true
              }
            }
          }

          if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.domain] !== undefined && data['flagCookies_logged'][contextName][domainURL][cookie.domain][cookie.name] !== undefined) {
            lockSwitch.classList.add('locked')

            lockSwitch.title = getMsg('CookieIsLockedProfileCookieHelpText')
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

          if (cookie.secure) {
            let pCookieKeySecMessageElm = document.createElement('span')
            let pCookieKeySecMessage = document.createTextNode('(secure cookie)')
            pCookieKeySecMessageElm.className = 'secure-cookie'
            pCookieKeySecMessageElm.appendChild(pCookieKeySecMessage)

            pCookieKeyElm.appendChild(pCookieKeySecMessageElm)

            if (cookie['fgRoot'] === undefined && (cookie['fgProfile'] !== undefined || cookie['fgProtected'] !== undefined || cookie['fgLogged'] !== undefined || (cookie['fgRemoved'] !== undefined && cookie['fgRemovedDomain'] !== undefined) || cookie['fgPermitted'] !== undefined || cookie['fgDomain'] !== undefined)) {
              let pCookieDomainMessageElm = document.createElement('span')
              let pCookieDomainMessage = ''
              if (cookie['fgPermitted'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainAllowed', [cookie['fgDomain']])
              } else if (cookie['fgLogged'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainUnprotected', [cookie['fgDomain']])
              } else if (cookie['fgProtected'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainProtected', [cookie['fgDomain']])
              } else if (cookie['fgProfile'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainGlobalProtected', [cookie['fgDomain']])
              }

              if (!isHandledCookie && cookie['fgRemoved'] !== undefined && cookie['fgRemovedDomain'] !== undefined) {
                if (pCookieDomainMessage === '') pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainRemoved', [cookie['fgDomain']])
              } else if (cookie['fgDomain'] !== undefined && pCookieDomainMessage === '') {
                pCookieDomainMessage = ' ' + getMsg('CookieHelpTextBaseDomainRulePresent', [cookie['fgDomain']])
              }

              if (pCookieDomainMessage !== '') {
                pCookieDomainMessageElm.className = 'secure-cookie'
                pCookieDomainMessageElm.appendChild(document.createTextNode(pCookieDomainMessage))
                pCookieKeyElm.appendChild(pCookieDomainMessageElm)
              }
            }

            p.appendChild(pCookieValueElm)
            if (cookie['fgHandled'] && !cookie['fgRemoved'] && !cookie['fgAllowed']) {
              li.title = getMsg('CookieHelpTextSecureMightNotHandled')
              li.classList.add('unremoved-secure-cookie')
            }
          } else {
            if (cookie['fgRoot'] === undefined && (cookie['fgProfile'] !== undefined || cookie['fgProtected'] !== undefined || cookie['fgLogged'] !== undefined || (cookie['fgRemoved'] !== undefined && cookie['fgRemovedDomain'] !== undefined) || cookie['fgPermitted'] !== undefined || cookie['fgDomain'] !== undefined)) {
              let pCookieDomainMessageElm = document.createElement('span')
              let pCookieDomainMessage = ''
              if (cookie['fgPermitted'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainAllowed', [cookie['fgDomain']])
              } else if (cookie['fgLogged'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainUnprotected', [cookie['fgDomain']])
              } else if (cookie['fgProtected'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainProtected', [cookie['fgDomain']])
              } else if (cookie['fgProfile'] !== undefined) {
                pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainGlobalProtected', [cookie['fgDomain']])
              }

              if (!isHandledCookie && cookie['fgRemoved'] !== undefined && cookie['fgRemovedDomain'] !== undefined) {
                if (pCookieDomainMessage === '') pCookieDomainMessage = getMsg('CookieHelpTextBaseDomainRemoved', [cookie['fgDomain']])
              } else if (cookie['fgDomain'] !== undefined && pCookieDomainMessage === '') {
                pCookieDomainMessage = ' ' + getMsg('CookieHelpTextBaseDomainRulePresent', [cookie['fgDomain']])
              }

              if (pCookieDomainMessage !== '') {
                pCookieDomainMessageElm.className = 'secure-cookie'
                pCookieDomainMessageElm.appendChild(document.createTextNode(pCookieDomainMessage))
                pCookieKeyElm.appendChild(pCookieDomainMessageElm)
              }
            }

            p.appendChild(pCookieValueElm)
          }

          li.appendChild(checkMark)
          li.appendChild(p)
          li.appendChild(lockSwitch)
          cookieList.appendChild(li)
        }
      }
    }

    if (!activeCookies) {
      let infoDisplay = document.querySelector('#infoDisplay')
      let contentText = getMsg('NoActiveDomainCookiesText')
      infoDisplay.children[0].textContent = contentText
      infoDisplay.removeAttribute('class')
    }

    cookieList.removeAttribute('class')
  }

  if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined) {
    let domainData = data[contextName][domainURL]
    for (let cookieDomain of Object.keys(domainData)) {
      if (cookieDomain === cookies.rootDomain) continue
      for (let cookieKey of Object.keys(domainData[cookieDomain])) {
        if (domainData[cookieDomain][cookieKey] === true) {
          if (!isDomainCookieInList(flaggedCookieList, cookieKey, cookieDomain)) {
            addCookieToList('cookie-list-flagged', cookieKey, '', cookieDomain, true)
            ++countList['#flaggedCookies']
          }
        } else if (domainData[cookieDomain][cookieKey] === false && !isDomainCookieInList(permittedCookieList, cookieKey, cookieDomain)) {
          addCookieToList('cookie-list-permitted', cookieKey, '', cookieDomain, true)
          ++countList['#permittedCookies']
        }
      }
    }
  }

  if (data['flagCookies_logged'] !== undefined && data['flagCookies_logged'][contextName] !== undefined && data['flagCookies_logged'][contextName][domainURL] !== undefined) {
    let domainData = data['flagCookies_logged'][contextName][domainURL]
    for (let cookieDomain of Object.keys(domainData)) {
      for (let cookieKey of Object.keys(domainData[cookieDomain])) {
        addCookieToProfileList(loggedInCookieList, cookieKey, cookieDomain, 'flagCookies_logged')
      }
    }
  }

  if (loggedInCookieList.children.length !== 0) loggedInCookieList.removeAttribute('class')
  else document.querySelector('#profileNoData').removeAttribute('class')

  if (data['flagCookies_flagGlobal'] && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    flagGlobalAutoNonEvent()
  }

  document.querySelector('#activeCookies').className = 'active'
  if (cookies['logData'] !== null) {
    let log = document.querySelector('#log')

    for (let entry of cookies['logData']) log.textContent += entry + '\n'
  }

  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][contextName] && data['flagCookies_autoFlag'][contextName][domainURL]) {
    document.querySelector('#auto-flag').classList.add('active')
    switchAutoFlag(true, 'cookie-list')
  }

  if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
    document.querySelector('#account-mode').classList.add('active')
  }

  if (data['flagCookies_notifications'] !== undefined && data['flagCookies_notifications'] === true) {
    document.querySelector('#confirmNotifications').classList.add('active')
  }

  for (let key of Object.keys(countList)) {
    let bubble = document.createElement('span')
    bubble.className = 'cookieCount'
    bubble.dataset['key'] = key
    let countText = document.createTextNode(countList[key])
    bubble.appendChild(countText)
    document.querySelector(key).appendChild(bubble)
  }

  if (!useChrome) getTempContainerStatus(contextName)
}

function buildHelpIndex () {
  let index = document.querySelector('.helpNavigation')

  let helpIndex = document.querySelector('.helpIndex')
  if (helpIndex !== null) index.removeChild(helpIndex)

  let contentHeads = document.querySelectorAll('#help-view a')

  let list = document.createElement('ul')
  list.className = 'helpIndex'

  for (let link of contentHeads) {
    link.className = 'anchor'

    let child = document.createElement('li')
    let href = document.createElement('a')
    href.href = '#' + link.name
    let textContent = document.createTextNode(link.textContent)
    href.appendChild(textContent)
    child.appendChild(href)
    list.appendChild(child)
  }

  index.appendChild(list)
}

function getTempContainerStatus (contextName) {
  browser.runtime.sendMessage('{c607c8df-14a7-4f28-894f-29e8722976af}', { 'method': 'isTempContainer', 'cookieStoreId': cookieStoreId }).then(function (isTmp) {
    if (isTmp === true) {
      getMsg('CookieHelpTextSecureMightNotHandled', [document.querySelectorAll('.intro')[1].textContent])
    }
  })
}

function addCookieToProfileList (targetList, cookieName, cookieDomain, src) {
  let li = document.createElement('li')
  let cookieKey = document.createElement('span')
  cookieKey.appendChild(document.createTextNode(cookieName))

  let dumpster = document.createElement('button')
  dumpster.addEventListener('click', dumpProfileCookie)
  dumpster.dataset['name'] = cookieName
  dumpster.dataset['domain'] = cookieDomain
  dumpster.dataset['src'] = src
  dumpster.className = 'dumpster'

  li.appendChild(cookieKey)
  li.appendChild(dumpster)
  targetList.appendChild(li)
}

function removeCookieOfProfileList (targetList, cookieName, cookieDomain) {
  for (let child of targetList.children) {
    if (child.nodeName !== 'LI' || child.hasAttribute('title')) continue
    if (child.children[1].dataset['name'] === cookieName && child.children[1].dataset['domain'] === cookieDomain) {
      targetList.removeChild(child)
      return
    }
  }
}

function isDomainCookieInList (targetList, cookieKey, cookieDomain) {
  for (let child of targetList.children) {
    if (child.nodeName !== 'LI' || child.hasAttribute('title')) continue
    if (child.children[0].dataset['name'] === cookieKey && child.children[0].dataset['domain'] === cookieDomain) {
      return true
    }
  }

  return false
}

function addCookieToList (targetList, name, value, domain, inactiveCookie) {
  let targetCookieList = document.getElementById(targetList)
  let li = document.createElement('li')
  li.dataset['name'] = name
  li.dataset['domain'] = domain

  if (inactiveCookie) li.classList.add('inactive-cookie')

  let checkMark = document.createElement('button')

  checkMark.dataset['name'] = name
  checkMark.dataset['domain'] = domain
  checkMark.dataset['value'] = value

  if (targetList === 'cookie-list-flagged') {
    checkMark.className = 'checkmark flagged'
    checkMark.title = getMsg('CookieIsFlaggedHelpText')
    checkMark.addEventListener('click', flaggedCookieSwitch)
  } else {
    checkMark.className = 'checkmark permit'
    checkMark.title = getMsg('CookieIsPermittedHelpText')
    checkMark.addEventListener('click', permittedCookieSwitch)
  }

  let p = document.createElement('p')

  let pCookieKeyElm = document.createElement('span')
  let pCookieKey = document.createTextNode(name)
  pCookieKeyElm.className = 'cookieKey'
  pCookieKeyElm.appendChild(pCookieKey)
  p.appendChild(pCookieKeyElm)

  let pCookieKeySecMessageElm = document.createElement('span')
  let pCookieKeySecMessage = document.createTextNode('(' + (domain.charAt(0) === '.' ? domain.substr(1) : domain) + ')')
  pCookieKeySecMessageElm.className = 'cookie-domain'
  pCookieKeySecMessageElm.appendChild(pCookieKeySecMessage)
  pCookieKeyElm.appendChild(pCookieKeySecMessageElm)

  let pCookieValueElm = document.createElement('span')
  let pCookieValue = document.createTextNode(value === '' ? getMsg('CookieIsInactiveText') : value)
  pCookieValueElm.className = 'cookieValue'
  pCookieValueElm.appendChild(pCookieValue)
  p.appendChild(pCookieValueElm)

  li.appendChild(checkMark)
  li.appendChild(p)
  targetCookieList.appendChild(li)
}

async function getActiveTab () {
  return browser.tabs.query({ currentWindow: true, active: true })
}

// --------------------------------------------------------------------------------------------------------------------------------
// Button switch function and store delete cookie name in browser storage

// Chrome + Firefox
async function flaggedCookieSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(flaggedCookieSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  flaggedCookieSwitchNeutral(data, evt)
}

// Kinda neutral
async function flaggedCookieSwitchNeutral (data, evt) {
  let cookieName = evt.target.dataset['name']
  let cookieDomain = evt.target.dataset['domain']

  // Uncheck from flagged in active cookies, if present
  let domainCookieList = document.querySelector('#cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true

  for (let child of domainCookieList.children) {
    if (child.nodeName !== 'LI' || child.hasAttribute('title')) continue
    if (child.children[0].dataset['name'] === cookieName && child.children[0].dataset['domain'] === cookieDomain) {
      if (hasAutoFlag) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = getMsg('CookieIsAutoFlaggedHelpText')
      } else if (hasGlobal) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = getMsg('CookieIsGlobalFlaggedHelpText')
      } else {
        child.children[0].className = 'checkmark'
        child.children[0].title = getMsg('CookieFlagButtonAllowedHelpText')
      }

      break
    }
  }

  delete data[contextName][domainURL][cookieDomain][cookieName]
  if (Object.keys(data[contextName][domainURL][cookieDomain]).length === 0) {
    delete data[contextName][domainURL][cookieDomain]

    if (Object.keys(data[contextName][domainURL]).length === 0) {
      delete data[contextName][domainURL]

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
        else await browser.storage.local.remove(contextName)
        delete data[contextName]
      }
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let parent = evt.target.parentNode.parentNode
  parent.removeChild(evt.target.parentNode)

  if (parent.children.length === 0) {
    let infoDisplay = document.querySelector('#infoDisplay')
    let contentText = getMsg('NoFlaggedCookiesForDomain')
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }

  --countList['#flaggedCookies']
  updateCookieCount()
}

// Permitted view flag switch
// Chrome + Firefox
async function permittedCookieSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(permittedCookieSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  permittedCookieSwitchNeutral(data, evt)
}

// Kinda neutral
async function permittedCookieSwitchNeutral (data, evt) {
  let cookieName = evt.target.dataset['name']
  let cookieDomain = evt.target.dataset['domain']

  // Uncheck from permitted in active cookies, if present
  let domainCookieList = document.querySelector('#cookie-list')
  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasGlobal = data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true

  for (let child of domainCookieList.children) {
    if (child.nodeName !== 'LI' || child.hasAttribute('title')) continue
    if (child.children[0].dataset['name'] === cookieName && child.children[0].dataset['domain'] === cookieDomain) {
      if (hasAutoFlag) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = getMsg('CookieIsAutoFlaggedHelpText')
      } else if (hasGlobal) {
        child.children[0].className = 'checkmark auto-flagged'
        child.children[0].title = getMsg('CookieIsGlobalFlaggedHelpText')
      } else {
        child.children[0].className = 'checkmark'
        child.children[0].title = getMsg('CookieFlagButtonAllowedHelpText')
      }

      break
    }
  }

  delete data[contextName][domainURL][cookieDomain][cookieName]
  if (Object.keys(data[contextName][domainURL][cookieDomain]).length === 0) {
    delete data[contextName][domainURL][cookieDomain]

    if (Object.keys(data[contextName][domainURL]).length === 0) {
      delete data[contextName][domainURL]

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
        else await browser.storage.local.remove(contextName)
        delete data[contextName]
      }
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let parent = evt.target.parentNode.parentNode

  parent.removeChild(evt.target.parentNode)
  if (parent.children.length === 0) {
    let infoDisplay = document.querySelector('#infoDisplay')
    let contentText = getMsg('NoPermittedCookiesForDomain')
    infoDisplay.children[0].textContent = contentText
    parent.className = 'hidden'
    infoDisplay.removeAttribute('class')
  }

  --countList['#permittedCookies']
  updateCookieCount()
}

// Switch the cookie flag

// Chrome + Firefox
async function cookieFlagSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(cookieFlagSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  cookieFlagSwitchNeutral(data, evt)
}

// Kinda neutral
async function cookieFlagSwitchNeutral (data, evt) {
  let cookieName = evt.target.dataset['name']
  let cookieDomain = evt.target.dataset['domain']
  let cookieValue = evt.target.dataset['value']

  if (data[contextName] === undefined) data[contextName] = {}
  if (data[contextName][domainURL] === undefined) data[contextName][domainURL] = {}
  if (data[contextName][domainURL][cookieDomain] === undefined) data[contextName][domainURL][cookieDomain] = {}

  let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined
  let hasCookie = data[contextName][domainURL][cookieDomain][cookieName] !== undefined

  if (!hasCookie || (hasAutoFlag && (hasCookie && data[contextName][domainURL][cookieDomain][cookieName] !== true && data[contextName][domainURL][cookieDomain][cookieName] !== false))) {
    data[contextName][domainURL][cookieDomain][cookieName] = true
    evt.target.className = 'checkmark flagged'
    evt.target.title = getMsg('CookieIsFlaggedHelpText')
    addCookieToList('cookie-list-flagged', cookieName, cookieValue, cookieDomain, false)
    ++countList['#flaggedCookies']
  } else if (data[contextName][domainURL][cookieDomain][cookieName] === true) {
    data[contextName][domainURL][cookieDomain][cookieName] = false
    evt.target.className = 'checkmark permit'
    evt.target.title = getMsg('CookieIsPermittedHelpText')
    addCookieToList('cookie-list-permitted', cookieName, cookieValue, cookieDomain, false)
    ++countList['#permittedCookies']

    // Remove from flagged list if present
    let flaggedCookieList = document.querySelector('#cookie-list-flagged')
    for (let child of flaggedCookieList.children) {
      if (child.children[0].dataset['name'] === cookieName && child.children[0].dataset['domain'] === cookieDomain) {
        child.parentNode.removeChild(child)
        --countList['#flaggedCookies']
        break
      }
    }
  } else if (hasAutoFlag) {
    delete data[contextName][domainURL][cookieDomain][cookieName]

    if (Object.keys(data[contextName][domainURL][cookieDomain]).length === 0) {
      delete data[contextName][domainURL][cookieDomain]

      if (Object.keys(data[contextName][domainURL]).length === 0) {
        delete data[contextName][domainURL]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark auto-flagged'
    evt.target.title = getMsg('CookieIsAutoFlaggedHelpText')
  } else if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
    delete data[contextName][domainURL][cookieDomain][cookieName]

    if (Object.keys(data[contextName][domainURL][cookieDomain]).length === 0) {
      delete data[contextName][domainURL][cookieDomain]

      if (Object.keys(data[contextName][domainURL]).length === 0) {
        delete data[contextName][domainURL]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark auto-flagged'
    evt.target.title = getMsg('CookieIsGlobalFlaggedHelpText')
  } else {
    delete data[contextName][domainURL][cookieDomain][cookieName]

    if (Object.keys(data[contextName][domainURL][cookieDomain]).length === 0) {
      delete data[contextName][domainURL][cookieDomain]

      if (Object.keys(data[contextName][domainURL]).length === 0) {
        delete data[contextName][domainURL]

        if (Object.keys(data[contextName]).length === 0) {
          if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(contextName)
          delete data[contextName]
        }
      }
    }

    evt.target.className = 'checkmark'
    evt.target.title = getMsg('CookieFlagButtonAllowedHelpText')
  }

  if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieDomain] === undefined || data[contextName][domainURL][cookieDomain][cookieName] === undefined) {
    // Remove from permitted list if present
    let permittedCookieList = document.querySelector('#cookie-list-permitted')
    for (let child of permittedCookieList.children) {
      if (child.children[0].dataset['name'] === cookieName && child.children[0].dataset['domain'] === cookieDomain) {
        child.parentNode.removeChild(child)
        --countList['#permittedCookies']
        break
      }
    }
  }

  updateCookieCount()

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)
}

function updateCookieCount () {
  for (let key of Object.keys(countList)) {
    let countItem = document.querySelector(key + ' .cookieCount')
    countItem.textContent = countList[key]
  }
}

// Switch lockSwitch
async function cookieLockSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(cookieLockSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  cookieLockSwitchNeutral(data, evt)
}

async function cookieLockSwitchNeutral (data, evt) {
  let cookieName = evt.target.dataset['name']
  let cookieDomain = evt.target.dataset['domain']

  if (data['flagCookies_logged'] === undefined) data['flagCookies_logged'] = {}
  if (data['flagCookies_logged'][contextName] === undefined) data['flagCookies_logged'][contextName] = {}
  if (data['flagCookies_logged'][contextName][domainURL] === undefined) data['flagCookies_logged'][contextName][domainURL] = {}
  if (data['flagCookies_logged'][contextName][domainURL][cookieDomain] === undefined) data['flagCookies_logged'][contextName][domainURL][cookieDomain] = {}

  if (evt.target.classList.contains('locked')) {
    if (data['flagCookies_logged'][contextName][domainURL][cookieDomain][cookieName] !== undefined) {
      delete data['flagCookies_logged'][contextName][domainURL][cookieDomain][cookieName]

      if (Object.keys(data['flagCookies_logged'][contextName][domainURL][cookieDomain]).length === 0) {
        delete data['flagCookies_logged'][contextName][domainURL][cookieDomain]

        if (Object.keys(data['flagCookies_logged'][contextName][domainURL]).length === 0) {
          delete data['flagCookies_logged'][contextName][domainURL]

          if (Object.keys(data['flagCookies_logged'][contextName]).length === 0) {
            delete data['flagCookies_logged'][contextName]

            if (Object.keys(data['flagCookies_logged']).length === 0) {
              if (useChrome) chrome.storage.local.remove('flagCookies_logged', function () { checkChromeHadNoErrors() })
              else await browser.storage.local.remove('flagCookies_logged')
              delete data['flagCookies_logged']
            }
          }
        }
      }

      if (useChrome) setChromeStorage(data)
      else await browser.storage.local.set(data)

      let loggedInCookieList = document.querySelector('#loggedInCookies')
      removeCookieOfProfileList(loggedInCookieList, cookieName, cookieDomain)
      evt.target.classList.remove('locked')
      evt.target.title = getMsg('SetCookieProfileButtonHelpText')

      if (data['flagCookies_logged'] === undefined || data['flagCookies_logged'][contextName] === undefined || data['flagCookies_logged'][contextName][domainURL] === undefined) {
        document.querySelector('#profileNoData').removeAttribute('class')
      }
    }
  } else {
    data['flagCookies_logged'][contextName][domainURL][cookieDomain][cookieName] = true

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    let loggedInCookieList = document.querySelector('#loggedInCookies')
    addCookieToProfileList(loggedInCookieList, cookieName, cookieDomain, 'flagCookies_logged')
    loggedInCookieList.removeAttribute('class')

    document.querySelector('#profileNoData').className = 'hidden'
    evt.target.classList.add('locked')
    evt.target.title = getMsg('CookieIsLockedProfileCookieHelpTextSettingsRef')
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Switches for main buttons
function unhide (targetList) {
  let searchVal = document.querySelector('#searchBar').value.trim().toLowerCase()
  if (searchVal !== '') {
    doSearch(searchVal)
  } else {
    for (let child of targetList.children) {
      if (child.className === 'hidden') child.removeAttribute('class')
    }
  }
}

// Switch views
function switchView (evt) {
  let list = document.getElementById(evt.target.dataset.target)
  unhide(list)

  let content = document.querySelector('#content')
  for (let child of content.children) {
    child.className = 'hidden'
  }

  let tabs = document.querySelector('#tabs')
  for (let child of tabs.children) {
    if (child !== evt.target) child.removeAttribute('class')
  }

  let prefs = document.querySelector('#prefs')
  let prefsActive = false
  if (prefs !== evt.target) prefs.removeAttribute('class')
  else if (prefs.classList.contains('active')) prefsActive = true
  evt.target.className = 'active'

  if (list.children.length === 0) {
    let infoDisplay = document.querySelector('#infoDisplay')

    let contentText = getMsg('NoActiveDomainCookiesText')
    if (evt.target.dataset.target === 'cookie-list-flagged') {
      contentText = getMsg('NoFlaggedCookiesForDomain')
    } else if (evt.target.dataset.target === 'cookie-list-permitted') {
      contentText = getMsg('NoPermittedCookiesForDomain')
    }

    infoDisplay.children[0].textContent = contentText
    infoDisplay.removeAttribute('class')
  } else {
    list.removeAttribute('class')
  }

  if (prefsActive) document.querySelector('#activeCookies').click()
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Switch auto flagging
// Chrome + Firefox
async function flagAutoSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(flagAutoSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  flagAutoSwitchNeutral(data, evt)
}

// Kinda neutral
async function flagAutoSwitchNeutral (data, evt) {
  if (data['flagCookies_autoFlag'] === undefined) data['flagCookies_autoFlag'] = {}
  if (data['flagCookies_autoFlag'][contextName] === undefined) data['flagCookies_autoFlag'][contextName] = {}
  if (!evt.target.classList.contains('active')) {
    data['flagCookies_autoFlag'][contextName][domainURL] = true
    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)

    evt.target.classList.add('active')
    switchAutoFlag(true, 'cookie-list')
  } else {
    delete data['flagCookies_autoFlag'][contextName][domainURL]

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)
    evt.target.classList.remove('active')

    switchAutoFlag(false, 'cookie-list')
  }
}

// Switch global auto flagging
// Chrome
function flagGlobalAutoNonEventWrapper (data) {
  if (data['flagCookies_flagGlobal'] === undefined) data['flagCookies_flagGlobal'] = {}
  if (data['flagCookies_flagGlobal'][contextName] === undefined) data['flagCookies_flagGlobal'][contextName] = false

  let globalFlagButton = document.querySelector('#global-flag')

  if (!globalFlagButton.classList.contains('active')) {
    globalFlagButton.classList.add('active')
    data['flagCookies_flagGlobal'][contextName] = true
    setChromeStorage(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.classList.remove('active')
    data['flagCookies_flagGlobal'][contextName] = false
    setChromeStorage(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined

    if (hasAutoFlag) switchAutoFlagGlobal(true, 'cookie-list')
    else switchAutoFlagGlobal(false, 'cookie-list')
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

  let globalFlagButton = document.querySelector('#global-flag')

  if (!globalFlagButton.classList.contains('active')) {
    globalFlagButton.classList.add('active')
    data['flagCookies_flagGlobal'][contextName] = true
    await browser.storage.local.set(data)
    switchAutoFlagGlobal(true, 'cookie-list')
  } else {
    globalFlagButton.classList.remove('active')
    data['flagCookies_flagGlobal'][contextName] = false
    await browser.storage.local.set(data)

    let hasAutoFlag = data['flagCookies_autoFlag'] !== undefined && data['flagCookies_autoFlag'][contextName] !== undefined && data['flagCookies_autoFlag'][contextName][domainURL] !== undefined

    if (hasAutoFlag) switchAutoFlag(true, 'cookie-list')
    else switchAutoFlagGlobal(false, 'cookie-list')
  }
}

async function flagGlobalAuto (evt) {
  flagGlobalAutoNonEvent()
  evt.preventDefault()
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
      if (child.nodeName !== 'LI') continue
      let contentChild = child.children[0]
      if (!contentChild.classList.contains('checkmark')) continue

      contentChild.className = 'checkmark auto-flagged'
      contentChild.title = getMsg('CookieIsAutoFlaggedHelpText')
    }
  } else {
    for (let child of searchTarget.children) {
      if (child.nodeName !== 'LI') continue
      let contentChild = child.children[0]

      if (!contentChild.classList.contains('checkmark') && !contentChild.classList.contains('auto-flagged')) continue

      if (data['flagCookies_flagGlobal'] === undefined || data['flagCookies_flagGlobal'][contextName] === undefined || data['flagCookies_flagGlobal'][contextName] !== true) {
        contentChild.className = 'checkmark'
        contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
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
      if (child.nodeName !== 'LI') continue
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']
      let cookieDomain = contentChild.dataset['domain']

      if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieDomain] === undefined || data[contextName][domainURL][cookieDomain][cookieKey] === undefined || (data[contextName][domainURL][cookieDomain][cookieKey] !== true && data[contextName][domainURL][cookieDomain][cookieKey] !== false)) {
        contentChild.className = 'checkmark auto-flagged'
        contentChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
      }
    }
  } else {
    for (let child of searchTarget.children) {
      if (child.nodeName !== 'LI') continue
      let contentChild = child.children[0]
      let cookieKey = contentChild.dataset['name']
      let cookieDomain = contentChild.dataset['domain']

      if (data[contextName] === undefined || data[contextName][domainURL] === undefined || data[contextName][domainURL][cookieDomain] === undefined || data[contextName][domainURL][cookieDomain][cookieKey] === undefined || (data[contextName][domainURL][cookieDomain][cookieKey] !== true && data[contextName][domainURL][cookieDomain][cookieKey] !== false)) {
        contentChild.className = 'checkmark'
        contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Search related
function searchContent (evt) {
  let searchVal = evt.target.value.trim().toLowerCase()
  doSearch(searchVal, 'cookie-list')
  doSearch(searchVal, 'cookie-list-flagged')
}

function doSearch (searchVal, targetList) {
  let searchTarget = document.getElementById(targetList)
  for (let child of searchTarget.children) {
    if (child.nodeName !== 'LI') continue
    let contentChild = child.children[0]
    let cookieKey = contentChild.dataset['name'].toLowerCase()
    let cookieValue = contentChild.dataset['value'].toLowerCase()
    if (cookieKey.indexOf(searchVal) === -1 && cookieValue.indexOf(searchVal) === -1) {
      child.classList.add('hidden')
    } else contentChild.classList.remove('hidden')
  }
}

// Settings dialog - clearing flag cookies data
function toggleClearing (evt) {
  if (!evt.target.classList.contains('active')) evt.target.classList.add('active')
  else evt.target.classList.remove('active')
}

async function toggleNotifications (evt) {
  let doSwitchOn = false

  if (!evt.target.classList.contains('active')) {
    evt.target.classList.add('active')
    doSwitchOn = true

    if (useChrome) chrome.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsEnabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/cookie_128.png' })
    else browser.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsEnabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/cookie_128.png' })
  } else {
    evt.target.classList.remove('active')
    doSwitchOn = false

    if (useChrome) chrome.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsDisabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/cookie_128.png' })
    else browser.notifications.create('notifications_info', { type: 'basic', message: getMsg('NotificationsDisabledNotifications'), title: getMsg('NotificationsHeadlineNeutral'), iconUrl: 'icons/cookie_128.png' })
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
async function clearSettings (evt) {
  let log = document.querySelector('#log')
  if (!document.querySelector('#confirmSettingsClearing').classList.contains('active')) {
    document.querySelector('#log').textContent = getMsg('ConfirmStorageClearingInfoMsg')
    return
  }

  if (useChrome) {
    chrome.storage.local.clear(function () {
      if (!checkChromeHadNoErrors) {
        log.textContent = getMsg('ErrorClearingSettingsInfoMsg')
      } else {
        log.textContent = getMsg('SuccessClearingSettingsAndStorageInfoMsg')
        resetUI()
      }
    })

    return
  }

  if (await browser.storage.local.clear() === null) {
    log.textContent = getMsg('SuccessClearingSettingsAndStorageInfoMsg')
    resetUI()
  } else {
    log.textContent = getMsg('ErrorClearingSettingsInfoMsg')
  }
}

// Chrome + Firefox - clearing domain data
async function clearDomain (evt) {
  let log = document.querySelector('#log')
  if (!document.querySelector('#confirmDomainClearing').classList.contains('active')) {
    document.querySelector('#log').textContent = getMsg('ConfirmDomainSettingsClearingInfoMsg')
    return
  }

  if (useChrome) {
    chrome.storage.local.remove(domainURL, function () {
      if (!checkChromeHadNoErrors) {
        log.textContent = getMsg('ErrorDomainDataClearingInfoMsg')
      } else {
        getChromeStorageForFunc(resetUIDomain)
        if (checkChromeHadNoErrors) log.textContent = getMsg('DomainDataClearedInfoMsg')
      }
    })

    return
  }

  let data = await browser.storage.local.get()
  if (resetUIDomain(data)) log.textContent = getMsg('DomainDataClearedInfoMsg')
  else log.textContent = getMsg('ErrorDomainDataClearingInfoMsg')
}

function resetUI () {
  document.querySelector('#auto-flag').removeAttribute('class')
  document.querySelector('#global-flag').removeAttribute('class')
  document.querySelector('#account-mode').removeAttribute('class')

  // Reset cookie list
  let cookieList = document.querySelector('#cookie-list')
  for (let child of cookieList.children) {
    let contentChild = child.children[0]
    contentChild.className = 'checkmark'
    contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
  }

  let clearLists = ['cookie-list-flagged', 'cookie-list-permitted']

  for (let child of clearLists) {
    let parent = document.getElementById(child)
    for (let childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  let confirmClearing = document.querySelector('#confirmSettingsClearing')
  confirmClearing.classList.remove('active')
}

async function resetUIDomain (data) {
  document.querySelector('#auto-flag').removeAttribute('class')

  // Reset cookie list
  let cookieList = document.querySelector('#cookie-list')

  for (let child of cookieList.children) {
    let contentChild = child.children[0]
    let contentChildProfile
    if (child.classList.contains('unremoved-secure-cookie')) contentChildProfile = child.children[3]
    else contentChildProfile = child.children[2]

    if (contentChildProfile === undefined) continue

    if (data['flagCookies_flagGlobal'] !== undefined && data['flagCookies_flagGlobal'][contextName] !== undefined && data['flagCookies_flagGlobal'][contextName] === true) {
      contentChild.className = 'checkmark auto-flagged'
      contentChild.title = getMsg('CookieIsGlobalFlaggedHelpText')
    } else {
      contentChild.className = 'checkmark'
      contentChild.title = getMsg('CookieFlagButtonAllowedHelpText')
    }

    contentChildProfile.classList.remove('locked')
    contentChildProfile.title = getMsg('SetCookieProfileButtonHelpText')
  }

  let clearLists = ['cookie-list-flagged', 'cookie-list-permitted', 'loggedInCookies']

  for (let child of clearLists) {
    let parent = document.getElementById(child)
    for (let childElement of parent.children) {
      parent.removeChild(childElement)
    }

    parent.className = 'hidden'
  }

  document.querySelector('#profileNoData').removeAttribute('class')
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

      if (Object.keys(data['flagCookies_logged'][contextName]).length === 0) {
        delete data['flagCookies_logged'][contextName]

        if (Object.keys(data['flagCookies_logged']).length === 0) {
          delete data['flagCookies_logged']

          if (useChrome) chrome.storage.local.remove('flagCookies_logged', function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove('flagCookies_logged')
        }
      }
    }
  }

  if (data['flagCookies_accountMode'] !== undefined) {
    if (data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][contextName][domainURL]

      if (Object.keys(data['flagCookies_accountMode'][contextName]).length === 0) {
        delete data['flagCookies_accountMode'][contextName]

        if (Object.keys(data['flagCookies_accountMode']).length === 0) {
          delete data['flagCookies_accountMode']

          if (useChrome) chrome.storage.local.remove('flagCookies_accountMode', function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove('flagCookies_accountMode')
        }
      }
    }

    document.querySelector('#account-mode').removeAttribute('class')
  }

  if (data[contextName] !== undefined && data[contextName][domainURL] !== undefined) {
    delete data[contextName][domainURL]

    if (Object.keys(data[contextName]).length === 0) {
      delete data[contextName]

      if (useChrome) chrome.storage.local.remove(contextName, function () { checkChromeHadNoErrors() })
      else await browser.storage.local.remove(contextName)
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let confirmClearing = document.querySelector('#confirmDomainClearing')
  confirmClearing.classList.remfove('active')
  return true
}

// Chrome + Firefox: Dump cookie from profile
async function dumpProfileCookie (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(dumpProfileCookieNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  dumpProfileCookieNeutral(data, evt)
}

async function dumpProfileCookieNeutral (data, evt) {
  let cookieSrc = evt.target.dataset['src']
  let cookieName = evt.target.dataset['name']
  let cookieDomain = evt.target.dataset['domain']

  if (data[cookieSrc][contextName][domainURL] === undefined || data[cookieSrc][contextName][domainURL][cookieDomain] === undefined || data[cookieSrc][contextName][domainURL][cookieDomain][cookieName] === undefined) return

  delete data[cookieSrc][contextName][domainURL][cookieDomain][cookieName]

  if (Object.keys(data[cookieSrc][contextName][domainURL][cookieDomain]).length === 0) {
    delete data[cookieSrc][contextName][domainURL][cookieDomain]

    if (Object.keys(data[cookieSrc][contextName][domainURL]).length === 0) {
      delete data[cookieSrc][contextName][domainURL]

      if (Object.keys(data[cookieSrc][contextName]).length === 0) {
        delete data[cookieSrc][contextName]

        if (Object.keys(data[cookieSrc]).length === 0) {
          if (useChrome) chrome.storage.local.remove(cookieSrc, function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove(cookieSrc)
          delete data[cookieSrc]
        }
      }
    }
  }

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  let cookieList = document.querySelector('#cookie-list')
  for (let child of cookieList.children) {
    if (child.nodeName !== 'LI') continue
    let contentChild = child.children[2]
    if (contentChild.dataset['name'] === cookieName && contentChild.dataset['domain'] === cookieDomain) {
      contentChild.classList.remove('locked')
      contentChild.title = getMsg('SetCookieProfileButtonHelpText')
      break
    }
  }

  if (evt.target.parentNode.parentNode.children.length === 1) {
    document.querySelector('#profileNoData').removeAttribute('class')
    evt.target.parentNode.parentNode.className = 'hidden'
  }

  evt.target.parentNode.parentNode.removeChild(evt.target.parentNode)
}

// Switch profile/account mode
async function accountModeSwitch (evt) {
  if (useChrome) {
    getChromeStorageForFunc1(accountModeSwitchNeutral, evt)
    return
  }

  let data = await browser.storage.local.get()
  accountModeSwitchNeutral(data, evt)
}

async function accountModeSwitchNeutral (data, evt) {
  if (evt.target.classList.contains('active')) {
    if (data['flagCookies_accountMode'] !== undefined && data['flagCookies_accountMode'][contextName] !== undefined && data['flagCookies_accountMode'][contextName][domainURL] !== undefined) {
      delete data['flagCookies_accountMode'][contextName][domainURL]

      if (Object.keys(data['flagCookies_accountMode'][contextName]).length === 0) {
        delete data['flagCookies_accountMode'][contextName]

        if (Object.keys(data['flagCookies_accountMode']).length === 0) {
          if (useChrome) chrome.storage.local.remove('flagCookies_accountMode', function () { checkChromeHadNoErrors() })
          else await browser.storage.local.remove('flagCookies_accountMode')
        }
      }
    }

    if (useChrome) setChromeStorage(data)
    else await browser.storage.local.set(data)
    evt.target.removeAttribute('class')

    // Account mode icon removal
    if (useChrome) chrome.browserAction.setIcon({ 'tabId': tabId, 'path': { '19': 'icons/cookie_19.png', '38': 'icons/cookie_38.png', '48': 'icons/cookie_48.png', '64': 'icons/cookie_64.png', '96': 'icons/cookie_96.png', '128': 'icons/cookie_128.png' } })
    else browser.browserAction.setIcon({ 'tabId': tabId, 'path': { '19': 'icons/cookie_19.png', '38': 'icons/cookie_38.png', '48': 'icons/cookie_48.png', '64': 'icons/cookie_64.png', '96': 'icons/cookie_96.png', '128': 'icons/cookie_128.png' } })
    return
  }

  if (data['flagCookies_accountMode'] === undefined) data['flagCookies_accountMode'] = {}
  if (data['flagCookies_accountMode'][contextName] === undefined) data['flagCookies_accountMode'][contextName] = {}
  data['flagCookies_accountMode'][contextName][domainURL] = true
  evt.target.className = 'active'

  if (useChrome) setChromeStorage(data)
  else await browser.storage.local.set(data)

  // Account mode icon
  if (useChrome) chrome.browserAction.setIcon({ 'tabId': tabId, 'path': { '19': 'icons/cookie_19_profil.png', '38': 'icons/cookie_38_profil.png', '48': 'icons/cookie_48_profil.png', '64': 'icons/cookie_64_profil.png', '96': 'icons/cookie_96_profil.png', '128': 'icons/cookie_128_profil.png' } })
  else browser.browserAction.setIcon({ 'tabId': tabId, 'path': { '19': 'icons/cookie_19_profil.png', '38': 'icons/cookie_38_profil.png', '48': 'icons/cookie_48_profil.png', '64': 'icons/cookie_64_profil.png', '96': 'icons/cookie_96_profil.png', '128': 'icons/cookie_128_profil.png' } })
}

function loadHelp (currentLocal) {
  console.log(currentLocal)
  let helpLoader = new XMLHttpRequest()
  helpLoader.addEventListener('readystatechange', function (evt) {
    if (evt.target.status === 200 && evt.target.readyState === 4) {
      document.querySelector('#help-view').innerHTML = evt.target.responseText
      buildHelpIndex()
    }

    if (evt.target.status !== 200 && evt.target.readyState === 4) {
      helpLoader.open('GET', './_locales/en/help.html')
      helpLoader.send()
    }
  })

  helpLoader.open('GET', './_locales/' + currentLocal + '/help.html')
  helpLoader.send()
}

// --------------------------------------------------------------------------------------------------------------------------------

function toggleImportOverwrite (evt) {
  if (!evt.target.classList.contains('active')) evt.target.classList.add('active')
  else evt.target.classList.remove('active')
}

function generateZip (rawData) {
  let data = JSON.stringify(rawData)
  let zip = new JSZip()
  zip.file('flagCookieSettings.json', data)

  zip.generateAsync({ 'type': 'blob' }).then(function (blob) {
    let dlLink = document.createElement('a')
    dlLink.href = URL.createObjectURL(blob)

    let dateObj = new Date()
    dlLink.download = 'FlagCookieSettings_' + dateObj.getFullYear().toString() + '-' + (dateObj.getMonth() + 1).toString() + '-' + dateObj.getDate().toString() + '.zip'
    document.body.appendChild(dlLink)
    dlLink.click()
    dlLink.parentNode.removeChild(dlLink)
    URL.revokeObjectURL(dlLink.href)
  })
}

// --------------------------------------------------------------------------------------------------------------------------------

async function exportSettings () {
  if (useChrome) chrome.storage.local.get(null, generateZip)
  else generateZip(await browser.storage.local.get())
}

// --------------------------------------------------------------------------------------------------------------------------------
async function triggerImport () {
  let bgPage = await browser.runtime.getBackgroundPage()
  bgPage.doImportOverwrite = document.querySelector('#confirmImportOverwrite').classList.contains('active')
  bgPage.document.adoptNode(document.querySelector('#importFile')).addEventListener('change', bgPage.importSettings)
}

// --------------------------------------------------------------------------------------------------------------------------------
function shadowInputChrome () {
  chrome.runtime.getBackgroundPage(function (bgPage) {
    alert('Settings will be imported.') // Dirty hack(?) to keep the popup window open
    bgPage.doImportOverwrite = document.querySelector('#confirmImportOverwrite').classList.contains('active')
    bgPage.document.adoptNode(document.querySelector('#importFile')).addEventListener('change', bgPage.importSettings)
  })
}

// --------------------------------------------------------------------------------------------------------------------------------
// Startup code
try {
  useChrome ? loadHelp(chrome.i18n.getUILanguage()) : loadHelp(browser.i18n.getUILanguage())
} catch (e) {
  console.log(e)
}

document.querySelector('#activeCookies').addEventListener('click', switchView)
document.querySelector('#flaggedCookies').addEventListener('click', switchView)
document.querySelector('#permittedCookies').addEventListener('click', switchView)
document.querySelector('#help').addEventListener('click', switchView)
document.querySelector('#prefs').addEventListener('click', switchView)
document.querySelector('#auto-flag').addEventListener('click', flagAutoSwitch)
document.querySelector('#global-flag').addEventListener('click', flagGlobalAuto)
document.querySelector('#account-mode').addEventListener('click', accountModeSwitch)
document.querySelector('#searchBar').addEventListener('keyup', searchContent)
document.querySelector('#confirmSettingsClearing').addEventListener('click', toggleClearing)
document.querySelector('#confirmDomainClearing').addEventListener('click', toggleClearing)
document.querySelector('#confirmNotifications').addEventListener('click', toggleNotifications)
document.querySelector('#settings-action-clear').addEventListener('click', clearSettings)
document.querySelector('#domain-action-clear').addEventListener('click', clearDomain)
document.querySelector('#settings-action-all-export').addEventListener('click', exportSettings)
if (useChrome) document.querySelector('label[for="importFile"]').addEventListener('click', shadowInputChrome)
else document.querySelector('#importFile').addEventListener('click', triggerImport)
document.querySelector('#confirmImportOverwrite').addEventListener('click', toggleImportOverwrite)

if (useChrome) chrome.tabs.query({ currentWindow: true, active: true }, initDomainURLandProceed)
else getActiveTab().then(initDomainURLandProceed)
