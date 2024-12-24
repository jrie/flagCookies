const logData = {}; // The log data we seen as a report to the settings view
const logTime = {};
const cookieData = {}; // Storage for cookie shadow, for the interface only!
const removedData = {};
const removedByDomain = {};
const permittedData = {};
const openTabData = {};
const cookieCount = {};
let removedByUser = 0;
const localStorageData = {};
const sessionStorageData = {};

// Chrome
const useChrome = typeof (browser) === 'undefined';

// Localization
const getMsg = useChrome ? getChromeMessage : getFirefoxMessage;

// Firefox
let browserActionAPI;
if (!useChrome) {
  browserActionAPI = typeof (browser.action) === 'undefined' ? browser.browserAction : browser.action;
} else {
  browserActionAPI = typeof (chrome.action) === 'undefined' ? chrome.browserAction : chrome.action;
}

function getChromeMessage (messageName, params) {
  if (params !== undefined) return chrome.i18n.getMessage(messageName, params);
  return chrome.i18n.getMessage(messageName);
}

function getFirefoxMessage (messageName, params) {
  if (params !== undefined) return browser.i18n.getMessage(messageName, params);
  return browser.i18n.getMessage(messageName);
}

async function getStoreValue (key, keyStore, targetValue) {
  let value = {};

  if (keyStore !== undefined) {
    let request = {};
    if (targetValue !== undefined) {
      request = { [keyStore]: { [key]: targetValue } };
    } else {
      request = { [keyStore]: key };
    }

    if (useChrome) {
      value = await chrome.storage.local.get(request);
    } else {
      value = await browser.storage.local.get(request);
    }
  } else {
    if (useChrome) {
      value = await chrome.storage.local.get(key);
    } else {
      value = await browser.storage.local.get(key);
    }
  }

  if (Object.keys(value).length === 0) {
    return;
  }

  return value;
}

async function setStoreValue (key, keyStore, targetValue) {
  if (keyStore !== undefined) {
    let request = {};
    if (targetValue !== undefined) {
      request = { [keyStore]: { [key]: targetValue } };
    } else {
      request = { [keyStore]: key };
    }

    if (useChrome) {
      await chrome.storage.local.set(request);
    } else {
      await browser.storage.local.set(request);
    }
  } else {
    if (useChrome) {
      await chrome.storage.local.set(key);
    } else {
      await browser.storage.local.set(key);
    }
  }

  return true;
}

async function clearCookiesWrapper (action, cookieDetails, currentTab) {
  if (currentTab === undefined || currentTab.url === undefined || currentTab.url === null) {
    return;
  }

  let contextName = 'default';

  if (currentTab.cookieStoreId) {
    contextName = currentTab.cookieStoreId;
  }

  const tabWindowId = currentTab.windowId;
  const tabTabId = currentTab.id;

  const cookieDomainDetected = currentTab.url.replace(/^(http:|https:)\/\//i, '').replace(/^\./, '').match(/.[^/]*/);

  if (cookieDomainDetected === null) {
    return;
  }

  const cookieDomain = cookieDomainDetected[0];

  let firstPartyIsolate = null;
  if (cookieDetails !== null && cookieDetails.firstPartyDomain) {
    firstPartyIsolate = cookieDetails.firstPartyDomain;
  }

  let cookieList = [];
  const splittedDomain = cookieDomain.split('.');
  const rootDomain = splittedDomain.splice(splittedDomain.length - 2, 2).join('.');

  if (!useChrome) {
    const domainHttp = 'http://' + cookieDomain;
    const domainHttps = 'https://' + cookieDomain;
    const domainDot = '.' + cookieDomain;
    const rootDomainDot = '.' + rootDomain;

    const cookiesBase = await browser.cookies.getAll({ domain: cookieDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesBaseWWW = await browser.cookies.getAll({ domain: 'www.' + cookieDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec = await browser.cookies.getAll({ domain: cookieDomain, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookies2 = await browser.cookies.getAll({ domain: domainDot, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec2 = await browser.cookies.getAll({ domain: domainDot, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookies3 = await browser.cookies.getAll({ domain: domainHttp, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec3 = await browser.cookies.getAll({ domain: domainHttp, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookies4 = await browser.cookies.getAll({ domain: domainHttps, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec4 = await browser.cookies.getAll({ domain: domainHttps, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookies5 = await browser.cookies.getAll({ domain: rootDomain, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec5 = await browser.cookies.getAll({ domain: rootDomain, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookies6 = await browser.cookies.getAll({ domain: rootDomainDot, firstPartyDomain: firstPartyIsolate, storeId: contextName });
    const cookiesSec6 = await browser.cookies.getAll({ domain: rootDomainDot, secure: true, firstPartyDomain: firstPartyIsolate, storeId: contextName });

    cookieList = [cookiesBase, cookiesBaseWWW, cookiesSec, cookies2, cookiesSec2, cookies3, cookiesSec3, cookies4, cookiesSec4, cookies5, cookiesSec5, cookies6, cookiesSec6];
  } else {
    const domainSplit = cookieDomain.split('.');
    const targetDomain = domainSplit.splice(domainSplit.length - 2, 2).join('.');

    const cookiesBase = await chrome.cookies.getAll({ domain: cookieDomain });
    const cookiesRoot = await chrome.cookies.getAll({ domain: targetDomain });
    const cookiesRootDot = await chrome.cookies.getAll({ domain: '.' + targetDomain });
    cookieList = [cookiesBase, cookiesRoot, cookiesRootDot];

    if (openTabData && openTabData[tabWindowId] && openTabData[tabWindowId][tabTabId]) {
      for (const tabUrl of Object.keys(openTabData[tabWindowId][tabTabId])) {
        const targetURL = openTabData[tabWindowId][tabTabId][tabUrl].d;
        cookieList.push(await chrome.cookies.getAll({ domain: targetURL }));
      }
    }
  }

  const cookies = [];
  for (const list of cookieList) {
    for (const cookie of list) {
      let hasCookie = false;

      for (const cookieEntry of cookies) {
        if (cookieEntry.name === cookie.name && cookieEntry.domain === cookie.domain) {
          hasCookie = true;
          break;
        }
      }

      if (hasCookie) {
        continue;
      }

      for (const key of Object.keys(cookie)) {
        switch (key) {
          case 'name':
          case 'value':
          case 'domain':
          case 'path':
          case 'secure':
          case 'expirationDate':
          case 'firstPartyDomain':
          case 'partitionKey':
            // case 'storeId':
            continue;
          default:
            delete cookie[key];
            continue;
        }
      }

      cookies.push(cookie);
      addTabURLtoDataList(currentTab, { url: currentTab.url }, cookie.domain);
    }
  }

  preSetMouseOverTitle(contextName, currentTab.id);
  if (cookies.length === 0) return;

  clearCookiesAction(action, cookies, currentTab);
}

async function handleTabChange (activeInfo) {
  let tab = null;

  if (useChrome) {
    tab = await chrome.tabs.get(activeInfo.tabId);
  } else {
    tab = await browser.tabs.get(activeInfo.tabId);
  }

  const activeTabUrl = tab.url.toLowerCase();
  if (activeTabUrl.startsWith('chrome:') || activeTabUrl.startsWith('about:') || activeTabUrl.startsWith('edge:')) {
    return;
  }

  if (useChrome) {
    chrome.tabs.sendMessage(activeInfo.tabId, { getStorageData: true });
    return;
  }

  browser.tabs.sendMessage(activeInfo.tabId, { getStorageData: true });
}

function setTabForClearCookies (tab) {
  clearCookiesWrapper(getMsg('ActionDomainClearByButton'), null, tab);
}

async function clearByDomainJob (request, sender, sendResponse) {
  const tabId = request.tabId;
  const windowId = request.windowId;
  const contextName = request.contextName;
  const cookieDomain = request.cookieDomain;
  const rootDomain = request.rootDomain;

  let cookieCount = cookieData[contextName][windowId][tabId][cookieDomain].length;
  let removedCookies = 0;

  let data = null;
  if (useChrome) {
    data = await chrome.storage.local.get();
  } else {
    data = await browser.storage.local.get();
  }

  const hasGlobalProfile = data.flagCookies_accountMode && data.flagCookies_accountMode[contextName] && data.flagCookies_accountMode[contextName][rootDomain] && data.flagCookies_accountMode[contextName][rootDomain] === true;

  if (hasGlobalProfile) {
    return false;
  }

  const hasLogged = data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][rootDomain] && data.flagCookies_logged[contextName][rootDomain][cookieDomain] && Object.keys(data.flagCookies_logged[contextName][rootDomain][cookieDomain]).length !== 0;
  const doRemoveByUser = data.flagCookies_removeUserDeleted && data.flagCookies_removeUserDeleted === true;

  let index = 0;
  const cookiesCopy = Array.from(cookieData[contextName][windowId][tabId][cookieDomain]);

  for (const cookie of cookiesCopy) {
    if (hasLogged && data.flagCookies_logged[contextName][rootDomain][cookieDomain] && data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name] && data.flagCookies_logged[contextName][rootDomain][cookieDomain][cookie.name] === true) {
      ++index;
      continue;
    }

    const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
    const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };

    if (contextName) {
      details.storeId = contextName;
      details2.storeId = contextName;
    }

    if (useChrome) {
      if (await chrome.cookies.get(details) === null && await chrome.cookies.get(details2) === null) {
        --cookieCount;

        if (doRemoveByUser) {
          cookieData[contextName][windowId][tabId][cookieDomain].splice(index, 1);
          continue;
        }
      } else if (await chrome.cookies.remove(details) !== null || await chrome.cookies.remove(details2) !== null) {
        ++removedCookies;
        cookieData[contextName][windowId][tabId][cookieDomain][index].fgCleared = true;

        if (doRemoveByUser) {
          cookieData[contextName][windowId][tabId][cookieDomain].splice(index, 1);
          continue;
        }
      }
    } else {
      if (await browser.cookies.get(details) === null && await browser.cookies.get(details2) === null) {
        --cookieCount;

        if (doRemoveByUser) {
          cookieData[contextName][windowId][tabId][cookieDomain].splice(index, 1);
          continue;
        }
      } else if ((await browser.cookies.remove(details) !== null && await browser.cookies.get(details) === null) || (await browser.cookies.remove(details2) !== null && await browser.cookies.get(details2) === null)) {
        ++removedCookies;
        cookieData[contextName][windowId][tabId][cookieDomain][index].fgCleared = true;

        if (doRemoveByUser) {
          cookieData[contextName][windowId][tabId][cookieDomain].splice(index, 1);
          continue;
        }
      }
    }

    ++index;
  }

  if (removedCookies === cookieCount || removedCookies !== 0) {
    if (cookieData[contextName][windowId][tabId][cookieDomain].length === 0) {
      delete cookieData[contextName][windowId][tabId][cookieDomain];

      if (Object.keys(cookieData[contextName][windowId][tabId]).length === 1 && cookieData[contextName][windowId][tabId].fgRoot) {
        delete cookieData[contextName][windowId][tabId];

        if (Object.keys(cookieData[contextName][windowId]).length === 0) {
          delete cookieData[contextName][windowId];

          if (Object.keys(cookieData[contextName]).length === 0) {
            delete cookieData[contextName];
          }
        }
      }
    }

    removedByUser += removedCookies;
    preSetMouseOverTitle(contextName, tabId);
    return true;
  }

  return false;
}

function handleMessage (request, sender, sendResponse) {
  if (request.clearOnActivation && request.tabId) {
    if (useChrome) {
      chrome.tabs.get(request.tabId).then(setTabForClearCookies);
      return;
    }

    browser.tabs.get(request.tabId).then(setTabForClearCookies);
    return;
  }

  if (request.clearStorage && request.tabId) {
    if (useChrome) {
      chrome.tabs.sendMessage(request.tabId, { clearStorage: request.clearStorage });
    } else {
      browser.tabs.sendMessage(request.tabId, { clearStorage: request.clearStorage });
    }

    return;
  }

  if (request.clearByDomain && request.clearByDomain === true) {
    return clearByDomainJob(request, sender, sendResponse);
  }

  if (request.getLocalData && request.windowId && request.tabId) {
    const sessionData = { local: {}, session: {} };

    if (localStorageData[request.windowId] && localStorageData[request.windowId][request.tabId]) {
      sessionData.local = localStorageData[request.windowId][request.tabId];
    }

    if (sessionStorageData[request.windowId] && sessionStorageData[request.windowId][request.tabId]) {
      sessionData.session = sessionStorageData[request.windowId][request.tabId];
    }

    sendResponse(sessionData);
    return;
  }

  if (request.local && request.session) {
    const tab = sender.tab;
    let contextName = 'default';

    if (tab.cookieStoreId) {
      contextName = tab.cookieStoreId;
    }

    const tabWindowId = tab.windowId;
    const tabTabId = tab.id;

    if (localStorageData[tabWindowId] === undefined) localStorageData[tabWindowId] = {};
    localStorageData[tabWindowId][tabTabId] = {};

    if (sessionStorageData[tabWindowId] === undefined) sessionStorageData[tabWindowId] = {};
    sessionStorageData[tabWindowId][tabTabId] = {};

    for (const key of Object.keys(request.local)) {
      try {
        localStorageData[tabWindowId][tabTabId][key] = JSON.parse(request.local[key]);
      } catch {
        localStorageData[tabWindowId][tabTabId][key] = request.local[key];
      }
    }

    for (const key of Object.keys(request.session)) {
      try {
        sessionStorageData[tabWindowId][tabTabId][key] = JSON.parse(request.session[key]);
      } catch {
        sessionStorageData[tabWindowId][tabTabId][key] = request.session[key];
      }
    }

    preSetMouseOverTitle(contextName, tabTabId);
    return;
  }

  if (request.updateCookies && request.cookies && request.targetDomain && request.windowId && request.tabId && request.storeId) {
    // TODO: Add action if targetDomain !== null

    if (cookieData[request.storeId] && cookieData[request.storeId][request.windowId] && cookieData[request.storeId][request.windowId][request.tabId]) {
      if (request.targetDomain === null) {
        for (const domainKey of Object.keys(request.cookies)) {
          if (domainKey === 'fgRoot') {
            continue;
          }

          cookieData[request.storeId][request.windowId][request.tabId][domainKey] = request.cookies[domainKey];
        }
      } else if (cookieData[request.storeId][request.windowId][request.tabId][request.targetDomain]) {
        cookieData[request.storeId][request.windowId][request.tabId][request.targetDomain] = request.cookies[request.targetDomain];
      } else {
        sendResponse({ updateStatus: false });
        return;
      }

      sendResponse({ updateStatus: true });
      return;
    }

    sendResponse({ updateStatus: false });
    return;
  }

  if (request.getCookies && request.windowId && request.tabId) {
    const cookieDataDomain = {};

    let contextName = 'default';
    if (request.storeId) {
      contextName = request.storeId;
    }

    // console.log('cookieData:', cookieData)

    if (cookieData[contextName] === undefined || cookieData[contextName][request.windowId] === undefined || cookieData[contextName][request.windowId][request.tabId] === undefined || cookieData[contextName][request.windowId][request.tabId].fgRoot === undefined) {
      sendResponse({ sessionData: null, cookies: null, rootDomain: null, msg: getMsg('UnknownDomain'), logData: null });
      return;
    }

    const rootDomain = cookieData[contextName][request.windowId][request.tabId].fgRoot;
    if (request.targetDomain && request.targetDomain !== null) {
      if (cookieData[contextName][request.windowId][request.tabId][request.targetDomain]) {
        for (const cookie of cookieData[contextName][request.windowId][request.tabId][request.targetDomain]) {
          if (cookieDataDomain[request.targetDomain] === undefined) cookieDataDomain[request.targetDomain] = [];

          for (const key of Object.keys(cookie)) {
            if (key.startsWith('fg')) {
              continue;
            }

            switch (key) {
              case 'name':
              case 'value':
              case 'domain':
              case 'path':
              case 'secure':
              case 'expirationDate':
              case 'firstPartyDomain':
              case 'partitionKey':
                // case 'storeId':
                continue;
              default:
                delete cookie[key];
                continue;
            }
          }

          cookieDataDomain[request.targetDomain].push(cookie);
        }
      } else {
        cookieDataDomain[request.targetDomain] = [];
      }
    } else {
      for (const cookieDomainKey of Object.keys(cookieData[contextName][request.windowId][request.tabId])) {
        if (cookieDomainKey === 'fgRoot') continue;

        if (cookieDataDomain[cookieDomainKey] === undefined) cookieDataDomain[cookieDomainKey] = [];

        for (const cookie of cookieData[contextName][request.windowId][request.tabId][cookieDomainKey]) {
          for (const key of Object.keys(cookie)) {
            if (key.startsWith('fg')) {
              continue;
            }

            switch (key) {
              case 'name':
              case 'value':
              case 'domain':
              case 'path':
              case 'secure':
              case 'expirationDate':
              case 'firstPartyDomain':
              case 'partitionKey':
                // case 'storeId':
                continue;
              default:
                delete cookie[key];
                continue;
            }
          }

          cookieDataDomain[cookieDomainKey].push(cookie);
        }
      }
    }

    if (logData[contextName] && logData[contextName][request.windowId] && logData[contextName][request.windowId][request.tabId]) {
      sendResponse({ cookies: cookieDataDomain, rootDomain, msg: false, logData: logData[contextName][request.windowId][request.tabId] });
    } else {
      sendResponse({ cookies: cookieDataDomain, rootDomain, msg: false, logData: null });
    }

    return;
  }

  sendResponse({ sessionData: null, cookies: null, rootDomain: null, msg: getMsg('UnknownDomain'), logData: null });
}

function resetCookieInformation (tab) {
  let contextName = 'default';
  if (tab.cookieStoreId) {
    contextName = tab.cookieStoreId;
  }

  const tabWindowId = tab.windowId;
  const tabTabId = tab.id;
  removedByUser = 0;

  if (removedData[contextName] === undefined) removedData[contextName] = {};
  if (removedData[contextName][tabWindowId] === undefined) removedData[contextName][tabWindowId] = {};
  removedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

  if (permittedData[contextName] === undefined) permittedData[contextName] = {};
  if (permittedData[contextName][tabWindowId] === undefined) permittedData[contextName][tabWindowId] = {};
  permittedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

  if (cookieCount[contextName] === undefined) cookieCount[contextName] = {};
  if (cookieCount[contextName][tabWindowId] === undefined) cookieCount[contextName][tabWindowId] = {};
  cookieCount[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

  if (removedByDomain[contextName] === undefined) removedByDomain[contextName] = {};
  if (removedByDomain[contextName][tabWindowId] === undefined) removedByDomain[contextName][tabWindowId] = {};
  removedByDomain[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

  if (cookieData[contextName] === undefined) cookieData[contextName] = {};
  if (cookieData[contextName][tabWindowId] === undefined) cookieData[contextName][tabWindowId] = {};
  cookieData[contextName][tabWindowId][tabTabId] = {};
}

function increaseCount (contextName, tabWindowId, tabTabId, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '');

  if (cookieCount[contextName] === undefined) cookieCount[contextName] = {};
  if (cookieCount[contextName][tabWindowId] === undefined) cookieCount[contextName][tabWindowId] = {};
  if (cookieCount[contextName][tabWindowId][tabTabId] === undefined) cookieCount[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };
  if (cookieCount[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] === undefined) cookieCount[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] = [];

  if (cookieCount[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].indexOf(cookieName) === -1) {
    cookieCount[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].push(cookieName);
    ++cookieCount[contextName][tabWindowId][tabTabId].count;
  }
}

function isInRemoved (contextName, tabWindowId, tabTabId, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '');

  if (removedData[contextName] && removedData[contextName][tabWindowId] && removedData[contextName][tabWindowId][tabTabId] && removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL]) {
    if (removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].indexOf(cookieName) !== -1) {
      return true;
    }
  }

  return false;
}

function addRemovedByDomain (contextName, tabWindowId, tabTabId, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '');

  if (removedByDomain[contextName] === undefined) removedByDomain[contextName] = {};
  if (removedByDomain[contextName][tabWindowId] === undefined) removedByDomain[contextName][tabWindowId] = {};
  if (removedByDomain[contextName][tabWindowId][tabTabId] === undefined) removedByDomain[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };
  if (removedByDomain[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] === undefined) removedByDomain[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] = [];

  if (removedByDomain[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].indexOf(cookieName) === -1) {
    removedByDomain[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].push(cookieName);
    ++removedByDomain[contextName][tabWindowId][tabTabId].count;
  }
}

function increaseRemoved (contextName, tabWindowId, tabTabId, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '');

  if (removedData[contextName] === undefined) removedData[contextName] = {};
  if (removedData[contextName][tabWindowId] === undefined) removedData[contextName][tabWindowId] = {};
  if (removedData[contextName][tabWindowId][tabTabId] === undefined) removedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };
  if (removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] === undefined) removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] = [];

  if (removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].indexOf(cookieName) === -1) {
    removedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].push(cookieName);
    ++removedData[contextName][tabWindowId][tabTabId].count;
  }
}

function increasePermitted (contextName, tabWindowId, tabTabId, cookieName, domain) {
  const strippedDomainURL = domain.replace(/^(http:|https:)\/\//i, '');

  if (permittedData[contextName] === undefined) permittedData[contextName] = {};
  if (permittedData[contextName][tabWindowId] === undefined) permittedData[contextName][tabWindowId] = {};
  if (permittedData[contextName][tabWindowId][tabTabId] === undefined) permittedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };
  if (permittedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] === undefined) permittedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL] = [];

  if (permittedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].indexOf(cookieName) === -1) {
    permittedData[contextName][tabWindowId][tabTabId].domains[strippedDomainURL].push(cookieName);
    ++permittedData[contextName][tabWindowId][tabTabId].count;
  }
}

async function preSetMouseOverTitle (contextName, tabId) {
  let tab = null;

  if (useChrome) {
    tab = await chrome.tabs.get(tabId);
  } else {
    tab = await browser.tabs.get(tabId);
  }

  if (tab === null || tab === undefined || tab.id === undefined) {
    return;
  }

  setMouseOverTitle(contextName, tab.windowId, tab.id);
}

function setMouseOverTitle (contextName, tabWindowId, tabId) {
  let titleString = '::::::::::::::::::: ' + getMsg('IconDisplayLog') + ' :::::::::::::::::::';
  if (cookieCount[contextName] && cookieCount[contextName][tabWindowId] && cookieCount[contextName][tabWindowId][tabId]) {
    titleString += '\n' + getMsg('cookieCountDisplayIconHover', cookieCount[contextName][tabWindowId][tabId].count.toString());
  }

  if (localStorageData[tabWindowId] && localStorageData[tabWindowId][tabId]) {
    titleString += '\n' + getMsg('localStorageKeyCountTitle', Object.keys(localStorageData[tabWindowId][tabId]).length.toString());
  }

  if (sessionStorageData[tabWindowId] && sessionStorageData[tabWindowId][tabId]) {
    titleString += '\n' + getMsg('sessionStorageKeyCountTitle', Object.keys(sessionStorageData[tabWindowId][tabId]).length.toString());
  }

  let msgsAdded = false;
  if (logData[contextName] && logData[contextName][tabWindowId] && logData[contextName][tabWindowId][tabId]) {
    const statuses = [getMsg('GlobalFlagState'), getMsg('AutoFlagState'), getMsg('PermittedState'), getMsg('AllowedState'), getMsg('DeletedStateMsg')];
    let hasTitleChange = false;

    const cookiesInMessages = [];
    for (let status of statuses) {
      const titleJoin = [];
      let index = 0;
      const statusLower = status.toLowerCase();

      for (const msg of logData[contextName][tabWindowId][tabId]) {
        if (msg.toLowerCase().indexOf(statusLower) !== -1) {
          const cookieName = msg.match(/ '([^']*)' /)[1];
          if (cookiesInMessages.indexOf(cookieName) === -1) {
            titleJoin.push(cookieName);
            cookiesInMessages.push(cookieName);

            if (index !== 0 && index % 7 === 0) titleJoin.push('\n');
            ++index;
          }
        }
      }

      if (titleJoin.length !== 0) {
        if (status === getMsg('DeletedStateMsg')) status = getMsg('DeletedState');
        titleString += '\n' + status.replace(' ', '') + ': ' + titleJoin.join(', ');
        hasTitleChange = true;
        msgsAdded = true;
      }
    }

    if (!hasTitleChange) {
      titleString += '\n' + getMsg('NoActionOnPage');
      msgsAdded = true;
    }
  }

  let countStr = '0';
  const hasRemove = removedData[contextName] && removedData[contextName][tabWindowId] && removedData[contextName][tabWindowId][tabId] && removedData[contextName][tabWindowId][tabId].count && removedData[contextName][tabWindowId][tabId].count !== 0;
  const hasPermit = permittedData[contextName] && permittedData[contextName][tabWindowId] && permittedData[contextName][tabWindowId][tabId] && permittedData[contextName][tabWindowId][tabId].count && permittedData[contextName][tabWindowId][tabId].count !== 0;
  const hasDomainRemoved = removedByDomain[contextName] && removedByDomain[contextName][tabWindowId] && removedByDomain[contextName][tabWindowId][tabId] && removedByDomain[contextName][tabWindowId][tabId].count && removedByDomain[contextName][tabWindowId][tabId].count !== 0;

  if (hasRemove) {
    countStr = removedData[contextName][tabWindowId][tabId].count.toString();
    titleString += '\n' + getMsg('DeletedCookiesMsg', countStr);
  }

  if (removedByUser !== 0) {
    titleString += '\n' + getMsg('DeletedByUserMsg', removedByUser.toString());
  }

  if (hasPermit) {
    titleString += '\n' + getMsg('PermittedCookiesMsg', permittedData[contextName][tabWindowId][tabId].count.toString());
  }

  if (hasDomainRemoved) {
    titleString += '\n' + getMsg('RemovedByDomainCookiesMsg', removedByDomain[contextName][tabWindowId][tabId].count.toString());
  }

  if (!hasRemove && !hasPermit && !msgsAdded) {
    titleString += '\n' + getMsg('NoActionOnPage');
  }

  const totalRemoved = (parseInt(countStr) + removedByUser).toString();
  if (totalRemoved !== '0') {
    browserActionAPI.setBadgeText({ text: totalRemoved, tabId });
  } else {
    browserActionAPI.setBadgeText({ text: '', tabId });
  }

  browserActionAPI.setTitle({ title: titleString, tabId });
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookiesAction (action, cookies, currentTab) {
  const tabWindowId = currentTab.windowId;
  const tabTabId = currentTab.id;

  if (openTabData[tabWindowId] === undefined || openTabData[tabWindowId][tabTabId] === undefined || openTabData[tabWindowId][tabTabId][0] === undefined) return;
  const rootDomain = openTabData[tabWindowId][tabTabId][0].u;

  let contextName = 'default';
  if (currentTab.cookieStoreId) {
    contextName = currentTab.cookieStoreId;
  }

  const strippedRootDomain = rootDomain.replace(/^(http:|https:)\/\//i, '');

  // TODO: Start here
  /*
  // This will need a lot of refactoring, but should be able to improve the performance quite a bunch
  // I am not sure when this will be implemented so as everything inside here needs to be refactored, trimmed down to 1/3..
  // .. and also be reflected in the UI accordingly using the "cookie.fg" values
  // If anynone is interested, feel free to make improvements :)
  const flagCookiesAccountMode = await getStoreValue(contextName, 'flagCookies_accountMode', strippedRootDomain);
  const flagCookiesLoggedDomain = await getStoreValue(contextName, 'flagCookies_logged', strippedRootDomain);
  const flagCookiesLogSetting = await getStoreValue('flagCookies_logEnabled');
  const flagCookiesAutoFlagEnabled = await getStoreValue(contextName, 'flagCookies_autoFlag', strippedRootDomain);
  const flagCookiesGlobalFlagEnabled = await getStoreValue(contextName, 'flagCookies_flagGlobal', strippedRootDomain);
  const isLogEnabled = !!flagCookiesLogSetting?.flagCookies_logEnabled;
  const accountMode = !!flagCookiesAccountMode?.flagCookies_accountMode?.[contextName]?.[strippedRootDomain];
  const autoFlagDomain = !!flagCookiesAutoFlagEnabled?.flagCookies_autoFlag?.[contextName]?.[strippedRootDomain];
  const globalFlagDomain = flagCookiesGlobalFlagEnabled?.flagCookies_flagGlobal?.[contextName] === true;
  const loggedDomainData = !!flagCookiesLoggedDomain?.flagCookies_logged?.[contextName]?.[strippedRootDomain];
  */

  let data = {};
  if (useChrome) {
    data = await chrome.storage.local.get();
  } else {
    data = await browser.storage.local.get();
  }

  const hasDataContext = data[contextName] && data[contextName][strippedRootDomain];

  if (data[contextName] === undefined) data[contextName] = {};
  if (data[contextName][strippedRootDomain] === undefined) data[contextName][strippedRootDomain] = {};

  const hasAccountsInContext = data.flagCookies_accountMode && data.flagCookies_accountMode[contextName];
  let accountDomain = null;

  let foundCookie = false;
  if (cookies !== null) {
    for (const cookie of cookies) {
      foundCookie = false;

      for (const key of Object.keys(cookie)) {
        if (key.startsWith('fg')) {
          delete cookie[key];
          continue;
        }
      }

      const domainKey = cookie.domain;
      const domain = domainKey.replace(/^\./, '');
      let hasHttpProfile = false;
      let hasHttpsProfile = false;
      if (hasAccountsInContext) {
        hasHttpProfile = data.flagCookies_accountMode[contextName]['http://' + domain] !== undefined;
        hasHttpsProfile = data.flagCookies_accountMode[contextName]['https://' + domain] !== undefined;
      }

      if (hasHttpProfile || hasHttpsProfile) {
        for (const cookieDomainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
          let index = 0;
          for (const cookieEntry of cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey]) {
            if (cookieEntry.name === cookie.name && cookieEntry.domain === cookieDomainKey) {
              foundCookie = true;

              if (data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookieEntry.name] === true) {
                cookie.fgProfile = true;
                cookie.fgAllowed = true;
                cookie.fgProtected = true;
                cookie.fgDomain = strippedRootDomain;
              }

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
              break;
            }

            ++index;
          }

          if (foundCookie) {
            break;
          }
        }
      } else {
        for (const cookieDomainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
          if (cookieDomainKey === 'fgRoot') continue;
          let index = 0;
          for (const cookieEntry of cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey]) {
            if (cookieEntry.name === cookie.name && cookieEntry.domain === cookieDomainKey) {
              foundCookie = true;

              for (const key of Object.keys(cookieEntry)) {
                cookie[key] = cookieEntry[key];
              }

              cookieData[contextName][tabWindowId][tabTabId][cookie.domain][index] = cookie;
              break;
            }

            ++index;
          }

          if (foundCookie) {
            break;
          }
        }
      }

      if (!foundCookie) {
        if (cookieData[contextName][tabWindowId][tabTabId][domainKey] === undefined) {
          cookieData[contextName][tabWindowId][tabTabId][domainKey] = [];
        }

        cookieData[contextName][tabWindowId][tabTabId][domainKey].push(cookie);
      }
    }
  }

  let protectDomainCookies = false;
  let hasLogged = false;
  let hasLocalProfile = false;
  let hasGlobalProfile = false;

  if (accountDomain === null && hasAccountsInContext) {
    hasGlobalProfile = data.flagCookies_accountMode[contextName][strippedRootDomain] && data.flagCookies_accountMode[contextName][strippedRootDomain] === true;
    hasLocalProfile = data.flagCookies_accountMode[contextName][strippedRootDomain];

    if (hasGlobalProfile) {
      if (data.flagCookies_accountMode[contextName][strippedRootDomain]) {
        accountDomain = strippedRootDomain;
      }

      hasLogged = data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain];
      if (hasLogged && Object.keys(data.flagCookies_logged[contextName][strippedRootDomain]).length === 0) protectDomainCookies = true;
    } else if (hasLocalProfile) {
      hasLogged = data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain];
      if (hasLogged && Object.keys(data.flagCookies_logged[contextName][strippedRootDomain]).length === 0) protectDomainCookies = true;
      accountDomain = strippedRootDomain;
    } else if (strippedRootDomain) {
      const strippedDomainURL = strippedRootDomain.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');
      const targetTab = openTabData[tabWindowId][tabTabId];
      for (const tab of Object.values(targetTab)) {
        if (tab.d === strippedDomainURL) {
          protectDomainCookies = true;
          accountDomain = strippedDomainURL;
          break;
        }
      }
    } else {
      return;
    }
  }

  let timeString = '';
  let timestamp = 0;

  let isLogEnabled = true;
  if (data.flagCookies_logEnabled === undefined || data.flagCookies_logEnabled !== true) {
    isLogEnabled = false;
  } else {
    const dateObj = new Date();
    timeString = (dateObj.getHours() < 10 ? '0' + dateObj.getHours() : dateObj.getHours()) + ':' + (dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes()) + ':' + (dateObj.getSeconds() < 10 ? '0' + dateObj.getSeconds() : dateObj.getSeconds());
    timestamp = dateObj.getTime();
  }

  const urlInFlag = data.flagCookies_autoFlag && data.flagCookies_autoFlag[contextName] && data.flagCookies_autoFlag[contextName][strippedRootDomain] && openTabData[tabWindowId] && data.flagCookies_autoFlag[contextName][strippedRootDomain];
  const globalFlagEnabled = data.flagCookies_flagGlobal && data.flagCookies_flagGlobal[contextName] && data.flagCookies_flagGlobal[contextName];

  if (!globalFlagEnabled && urlInFlag) {
    for (const cookieDomainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
      if (cookieDomainKey === 'fgRoot') continue;
      let cookieDomain = cookieDomainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');

      let index = 0;
      for (const cookie of cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey]) {
        increaseCount(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

        let firstPartyIsolate = null;
        if (cookie.firstPartyDomain) {
          firstPartyIsolate = cookie.firstPartyDomain;
        }

        const isManagedCookieHttp = hasDataContext && data[contextName]['http://' + cookieDomain] && data[contextName]['http://' + cookieDomain][cookieDomainKey] && data[contextName]['http://' + cookieDomain][cookieDomainKey][cookie.name];
        const isManagedCookieHttps = hasDataContext && data[contextName]['https://' + cookieDomain] && data[contextName]['https://' + cookieDomain][cookieDomainKey] && data[contextName]['https://' + cookieDomain][cookieDomainKey][cookie.name];

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain;
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain;

        if (cookieDomain === strippedRootDomain) cookie.fgRoot = true;
        else if (cookie.fgRoot) delete cookie.fgRoot;

        const isManagedCookie = hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name];
        const isLogged = data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && (data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true;

        cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;

        if (!isManagedCookie && hasLocalProfile) {
          if (isLogged) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, cookieDomainKey]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = strippedRootDomain;
            cookie.fgProfile = true;
            cookie.fgProtected = true;
            cookie.fgAllowed = true;

            if (cookie.fgLogged) delete cookie.fgLogged;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          }

          if ((hasLogged && isLogged) || !hasLogged) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, strippedRootDomain]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = strippedRootDomain;
            cookie.fgAllowed = true;
            cookie.fgProfile = true;

            if (cookie.fgProtected) {
              delete cookie.fgProtected;
              cookie.fgLogged = true;
            }

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          }
        }

        if (cookie.fgProfile) delete cookie.fgProfile;

        cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;

        if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          cookie.fgAllowed = true;

          if (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === false) {
            cookie.fgDomain = accountDomain;
          }

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (hasLogged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          cookie.fgAllowed = true;

          if (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === false) {
            cookie.fgDomain = accountDomain;
          }

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = accountDomain;
          cookie.fgAllowed = true;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        if (cookie.fgDomain) {
          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          cookie.fgAllowed = true;
          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        if (cookie.fgProtected === true) {
          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          cookie.fgAllowed = true;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        cookie.fgAllowed = false;
        cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };

          if (cookie.partitionKey) {
            details.partitionKey = cookie.partitionKey;
            details2.partitionKey = cookie.partitionKey;
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsg', [action, cookie.name, cookieDomain]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgAutoFlag', [action, cookie.name, cookieDomain]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][cookieDomain] && data[contextName][cookieDomain][cookieDomainKey] && data[contextName][cookieDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }

          if (cookie.fgRemoved) {
            ++index;
            continue;
          }

          if (chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://']);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, 'http://']);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][cookieDomain] && data[contextName][cookieDomain][cookieDomainKey] && data[contextName][cookieDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;
            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }

          if (cookie.fgRemoved === undefined) {
            if (!isInRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey)) {
              cookie.fgNotPresent = true;
              addRemovedByDomain(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            }
          }

          ++index;
          continue;
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details5 = { url: 'https://' + cookie.domain, name: cookie.name };
        const details6 = { url: 'http://' + cookie.domain, name: cookie.name };
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name };

        const detailsListTrim = [details, details2, details3, details4];
        const detailsListCookieDomain = [details5, details6, details7];

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][cookieDomain] && data[contextName][cookieDomain][cookieDomainKey] && data[contextName][cookieDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            break;
          }
        }

        if (cookie.fgRemoved) {
          ++index;
          continue;
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsAutoFlag', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][cookieDomain] && data[contextName][cookieDomain][cookieDomainKey] && data[contextName][cookieDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            break;
          }
        }

        if (cookie.fgRemoved === undefined) {
          if (!isInRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey)) {
            cookie.fgNotPresent = true;
            addRemovedByDomain(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }
        }

        ++index;
      }
    }
  } else if (globalFlagEnabled) {
    for (const cookieDomainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
      if (cookieDomainKey === 'fgRoot') continue;
      let cookieDomain = cookieDomainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');

      let index = 0;
      for (const cookie of cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey]) {
        increaseCount(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

        let firstPartyIsolate = null;
        if (cookie.firstPartyDomain) {
          firstPartyIsolate = cookie.firstPartyDomain;
        }

        const isManagedCookieHttp = hasDataContext && data[contextName]['http://' + cookieDomain] && data[contextName]['http://' + cookieDomain][cookie.domain] && data[contextName]['http://' + cookieDomain][cookie.domain][cookie.name];
        const isManagedCookieHttps = hasDataContext && data[contextName]['https://' + cookieDomain] && data[contextName]['https://' + cookieDomain][cookie.domain] && data[contextName]['https://' + cookieDomain][cookie.domain][cookie.name];

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain;
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain;

        if (cookieDomain === strippedRootDomain) cookie.fgRoot = true;
        else if (cookie.fgRoot) delete cookie.fgRoot;

        const isManagedCookie = hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name];
        const isLogged = data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && (data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name];

        if (!isManagedCookie && cookie.fgRoot === undefined) {
          if (isLogged) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = accountDomain;
            cookie.fgProtected = true;

            if (cookie.fgLogged) delete cookie.fgLogged;
            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          }

          if (!hasLogged && hasGlobalProfile) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = accountDomain;
            cookie.fgProfile = true;

            if (cookie.fgProtected) {
              delete cookie.fgProtected;
              cookie.fgLogged = true;
            }

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          } else if (cookie.fgProfile && cookie.fgProtected) {
            delete cookie.fgProfile;

            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          }
        }

        if (cookie.fgProfile) delete cookie.fgProfile;

        if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;

          if (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie.fgDomain = accountDomain;
          }

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (hasLogged && isManagedCookie) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;

          if (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
            cookie.fgDomain = accountDomain;
          }

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (!isManagedCookie && accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = accountDomain;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };

          if (cookie.partitionKey) {
            details.partitionKey = cookie.partitionKey;
            details2.partitionKey = cookie.partitionKey;
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://']);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'https://']);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }

          if (cookie.fgRemoved) {
            ++index;
            continue;
          }

          if (chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://']);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            } else {
              const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, 'http://']);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }
          }

          increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgRemoved = true;

          if (hasDataContext && data[contextName][cookieDomain] && data[contextName][cookieDomain][cookieDomainKey] && data[contextName][cookieDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
          if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name };
        const details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name };
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name };

        const detailsListTrim = [details, details2, details3, details4];
        const detailsListCookieDomain = [details5, details6, details7];

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            break;
          }
        }

        if (cookie.fgRemoved) {
          ++index;
          continue;
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (isLogEnabled) {
              if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name] === true))) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookie.domain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              } else {
                const msg = getMsg('DeletedCookieMsgHttpAndHttpsGlobalFlag', [action, cookie.name, cookie.domain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookie.domain] && data[contextName][strippedRootDomain][cookie.domain][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookie.domain] && data[contextName][accountDomain][cookie.domain][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            break;
          }
        }

        if (cookie.fgRemoved === undefined) {
          if (!isInRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey)) {
            cookie.fgNotPresent = true;
            addRemovedByDomain(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }
        }

        ++index;
      }
    }
  } else {
    for (const cookieDomainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
      if (cookieDomainKey === 'fgRoot') continue;
      let cookieDomain = cookieDomainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');

      let index = 0;
      for (const cookie of cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey]) {
        increaseCount(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

        let firstPartyIsolate = null;
        if (cookie.firstPartyDomain) {
          firstPartyIsolate = cookie.firstPartyDomain;
        }

        const isManagedCookieHttp = hasDataContext && data[contextName]['http://' + cookieDomain] && data[contextName]['http://' + cookieDomain][cookieDomainKey] && data[contextName]['http://' + cookieDomain][cookieDomainKey][cookie.name];
        const isManagedCookieHttps = hasDataContext && data[contextName]['https://' + cookieDomain] && data[contextName]['https://' + cookieDomain][cookieDomainKey] && data[contextName]['https://' + cookieDomain][cookieDomainKey][cookie.name];

        if (!isManagedCookieHttp && isManagedCookieHttps) cookieDomain = 'https://' + cookieDomain;
        else if (isManagedCookieHttp) cookieDomain = 'http://' + cookieDomain;

        if (cookieDomain === strippedRootDomain) cookie.fgRoot = true;
        else if (cookie.fgRoot) delete cookie.fgRoot;

        if ((data.flagCookies_logged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (data.flagCookies_accountMode && data.flagCookies_accountMode[contextName] && data.flagCookies_accountMode[contextName][strippedRootDomain])) {
          cookie.fgProfile = true;
          cookie.fgDomain = strippedRootDomain;
        }

        cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
        const isManagedCookie = hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name];

        if (!isManagedCookie) {
          ++index;
          continue;
        }

        // if (cookie.fgDomain !== undefined) delete cookie.fgDomain
        if (cookie.fgRoot === undefined) {
          const isEmptyProfile = protectDomainCookies || !hasLogged;
          if (hasLogged && data.flagCookies_logged[contextName][accountDomain] && data.flagCookies_logged[contextName][accountDomain][cookieDomainKey] && data.flagCookies_logged[contextName][accountDomain][cookieDomainKey][cookie.name]) {
            if (isLogEnabled) {
              const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain]);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgPermitted = true;
            cookie.fgDomain = accountDomain;
            cookie.fgProtected = true;

            if (cookie.fgLogged) delete cookie.fgLogged;
            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            ++index;
            continue;
          }

          if (accountDomain !== null && hasLogged && data.flagCookies_logged[contextName][accountDomain][cookieDomainKey] && data.flagCookies_logged[contextName][accountDomain][cookieDomainKey][cookie.name] === true) cookie.fgProtected = true;

          if (!isManagedCookie && ((cookie.fgProfile && cookie.fgProtected === undefined) || cookie.fgProtected)) {
            if (isEmptyProfile && cookie.fgProfile && cookie.fgProtected === undefined) {
              if (isLogEnabled) {
                const msg = getMsg('AllowedGlobalProfileCookieMsg', [action, cookie.name, accountDomain]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }

              increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
              cookie.fgPermitted = true;
              cookie.fgDomain = strippedRootDomain;

              if (cookie.fgProtected) {
                delete cookie.fgProtected;
                cookie.fgLogged = true;
              }

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
              ++index;

              continue;
            } else if (!isEmptyProfile && cookie.fgProfile && cookie.fgProtected) {
              delete cookie.fgProfile;

              if (isLogEnabled) {
                const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, accountDomain]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }

              increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
              cookie.fgPermitted = true;
              cookie.fgDomain = strippedRootDomain;

              if (cookie.fgProtected) {
                delete cookie.fgProtected;
                cookie.fgLogged = true;
              }

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
              ++index;
              continue;
            }
          }
        }

        if (cookie.fgProfile) delete cookie.fgProfile;

        if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (hasLogged && data.flagCookies_logged[contextName] && data.flagCookies_logged[contextName][strippedRootDomain] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey] && data.flagCookies_logged[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) {
          if (isLogEnabled) {
            const msg = getMsg('AllowedProfileCookieMsg', [action, cookie.name, strippedRootDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        } else if (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === false) {
          if (isLogEnabled) {
            const msg = getMsg('PermittedCookieMsg', [action, cookie.name, accountDomain]);
            addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
          }

          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = accountDomain;

          cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          ++index;
          continue;
        }

        if (!isManagedCookie && accountDomain === null && hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === undefined) {
          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          ++index;
          continue;
        } else if (!isManagedCookie && hasDataContext && (data[contextName][accountDomain] === undefined || data[contextName][accountDomain][cookieDomainKey] === undefined || data[contextName][accountDomain][cookieDomainKey][cookie.name] === undefined)) {
          increasePermitted(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
          cookie.fgPermitted = true;
          cookie.fgDomain = strippedRootDomain;
          ++index;
          continue;
        }

        cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;

        if (useChrome) {
          const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
          const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };

          if (cookie.partitionKey) {
            details.partitionKey = cookie.partitionKey;
            details2.partitionKey = cookie.partitionKey;
          }

          if (chrome.cookies.remove(details) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'https://']);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;
            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }

          if (cookie.fgRemoved) {
            ++index;
            continue;
          }

          if (chrome.cookies.remove(details2) !== null) {
            if (isLogEnabled) {
              const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, 'http://']);
              addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
            }

            increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
            cookie.fgRemoved = true;

            if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
            if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }

          if (cookie.fgRemoved === undefined) {
            if (!isInRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey)) {
              cookie.fgNotPresent = true;
              addRemovedByDomain(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
            }
          }

          ++index;
          continue;
        }

        const details = { url: 'https://' + cookieDomain + cookie.path, name: cookie.name };
        const details2 = { url: 'http://' + cookieDomain + cookie.path, name: cookie.name };
        const details3 = { url: 'https://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details4 = { url: 'http://www.' + cookieDomain + cookie.path, name: cookie.name };
        const details5 = { url: 'https://' + cookie.domain + cookie.path, name: cookie.name };
        const details6 = { url: 'http://' + cookie.domain + cookie.path, name: cookie.name };
        const details7 = { url: cookie.domain + cookie.path, name: cookie.name };
        const detailsListTrim = [details, details2, details3, details4];
        const detailsListCookieDomain = [details5, details6, details7];

        for (const detail of detailsListTrim) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
              if (isLogEnabled) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomain, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }

              increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
              cookie.fgRemoved = true;

              if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
              break;
            }
          }
        }

        if (cookie.fgRemoved) {
          ++index;
          continue;
        }

        for (const detail of detailsListCookieDomain) {
          if (firstPartyIsolate !== null) {
            detail.firstPartyDomain = firstPartyIsolate;
          }

          if (cookie.storeId) {
            detail.storeId = contextName;
          }

          if (cookie.partitionKey) {
            detail.partitionKey = cookie.partitionKey;
          }

          const modifier = detail.url.startsWith('https') ? 'https://' : 'http://';
          if (await browser.cookies.remove(detail) !== null && await browser.cookies.get(detail) === null) {
            if (hasDataContext && ((data[contextName][rootDomain] && data[contextName][rootDomain][cookieDomainKey] && data[contextName][rootDomain][cookieDomainKey][cookie.name] === true) || (accountDomain !== null && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name] === true))) {
              if (isLogEnabled) {
                const msg = getMsg('DeletedCookieMsgHttpAndHttps', [action, cookie.name, cookieDomainKey, modifier]);
                addToLogData(contextName, tabWindowId, tabTabId, msg, timeString, timestamp);
              }

              increaseRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);
              cookie.fgRemoved = true;

              if (hasDataContext && data[contextName][strippedRootDomain] && data[contextName][strippedRootDomain][cookieDomainKey] && data[contextName][strippedRootDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = cookie.domain;
              if (accountDomain !== null && hasDataContext && data[contextName][accountDomain] && data[contextName][accountDomain][cookieDomainKey] && data[contextName][accountDomain][cookieDomainKey][cookie.name]) cookie.fgRemovedDomain = accountDomain;

              cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
              break;
            }
          }
        }

        if (cookie.fgRemoved === undefined) {
          if (!isInRemoved(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey)) {
            cookie.fgNotPresent = true;
            addRemovedByDomain(contextName, tabWindowId, tabTabId, cookie.name, cookieDomainKey);

            cookieData[contextName][tabWindowId][tabTabId][cookieDomainKey][index] = cookie;
          }
        }

        ++index;
      }
    }
  }

  preSetMouseOverTitle(contextName, currentTab.id);
}

// --------------------------------------------------------------------------------------------------------------------------------
async function clearCookiesOnUpdate (tabId, changeInfo, tab) {
  if (changeInfo.status === undefined) {
    return;
  }

  const tabWindowId = tab.windowId;

  if (changeInfo.status === 'loading') {
    if (openTabData[tabWindowId] === undefined || openTabData[tabWindowId][tabId] === undefined || openTabData[tabWindowId][tabId][0] === undefined) {
      browserActionAPI.disable(tabId);
      resetCookieInformation(tab);
    } else {
      // TODO: Check if we can remove this call
      browserActionAPI.enable(tabId);
    }

    // TODO: Check if we can remove this call
    // TODO: Temporary disabled
    clearCookiesWrapper(getMsg('ActionDocumentLoad'), null, tab);
    return;
  }

  if (changeInfo.status === 'complete') {
    browserActionAPI.enable(tabId);

    let domainKey = '';
    const urlMatch = tab.url.match(/^(http:|https:)\/\/.[^/]*/i);
    if (urlMatch !== null) domainKey = urlMatch[0];
    else domainKey = tab.url;

    let contextName = 'default';
    if (tab.cookieStoreId) {
      contextName = tab.cookieStoreId;
    }

    if (openTabData[tabWindowId] && openTabData[tabWindowId][tabId] && openTabData[tabWindowId][tabId][0] && openTabData[tabWindowId][tabId][0].u !== domainKey) {
      delete cookieData[contextName][openTabData[tabWindowId][tabId][0].u];

      if (removedData[contextName] === undefined) removedData[contextName] = {};
      if (removedData[contextName][tabWindowId] === undefined) removedData[contextName][tabWindowId] = {};
      removedData[contextName][tabWindowId][tabId] = { count: 0, domains: {} };

      if (removedByDomain[contextName] === undefined) removedByDomain[contextName] = {};
      if (removedByDomain[contextName][tabWindowId] === undefined) removedByDomain[contextName][tabWindowId] = {};
      removedByDomain[contextName][tabWindowId][tabId] = 0;

      if (permittedData[contextName] === undefined) permittedData[contextName] = {};
      if (permittedData[contextName][tabWindowId] === undefined) permittedData[contextName][tabWindowId] = {};
      permittedData[contextName][tabWindowId][tabId] = { count: 0, domains: {} };

      if (cookieCount[contextName] === undefined) cookieCount[contextName] = {};
      if (cookieCount[contextName][tabWindowId] === undefined) cookieCount[contextName][tabWindowId] = {};
      cookieCount[contextName][tabWindowId][tabId] = { count: 0, domains: {} };

      removeTabIdfromDataList(tabId, { windowId: tabWindowId });
    }

    addTabURLtoDataList(tab, { url: domainKey, frameId: 0, parentFrameId: -1, type: 'main_frame' }, domainKey);

    browserActionAPI.enable(tabId);

    preSetMouseOverTitle(contextName, tabId);
    setBrowserActionIcon(contextName, domainKey, tabId);

    if (removedData[contextName] && removedData[contextName][tabWindowId] && removedData[contextName][tabWindowId][tabId]) {
      const countStr = removedData[contextName][tabWindowId][tabId].count.toString();
      if (countStr !== '0') {
        const strippedDomainURL = domainKey.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');

        if (useChrome) {
          const data = await chrome.storage.local.get('flagCookies_notifications');
          if (data.flagCookies_notifications && data.flagCookies_notifications === true) {
            chrome.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [countStr, strippedDomainURL, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/fc128.png' });
          }

          return;
        }

        const data = await browser.storage.local.get('flagCookies_notifications');
        if (data.flagCookies_notifications && data.flagCookies_notifications === true) {
          browser.notifications.create('cookie_cleared', { type: 'basic', message: getMsg('NotificationCookiesRemoved', [countStr, strippedDomainURL, contextName]), title: getMsg('NotificationCookiesRemovedTitle'), iconUrl: 'icons/flagcookies_icon.svg' });
        }
      }
    }

    const activeTabUrl = tab.url.toLowerCase();
    if (activeTabUrl.startsWith('chrome:') || activeTabUrl.startsWith('about:') || activeTabUrl.startsWith('edge:')) {
      return;
    }

    if (useChrome) {
      chrome.tabs.sendMessage(tabId, { getStorageData: true });
      return;
    }

    browser.tabs.sendMessage(tabId, { getStorageData: true });
  }
}

function clearCookiesOnLeave (tabId, moveInfo) {
  if (moveInfo !== null) {
    if (openTabData[moveInfo.windowId] && openTabData[moveInfo.windowId][tabId]) {
      const domainData = openTabData[moveInfo.windowId][tabId];

      if (domainData[0]) {
        const contextName = domainData[0].s;
        const cookieDetails = { storeId: contextName, domain: domainData[0].d, url: domainData[0].u };
        const currentTab = { cookieStoreId: contextName, url: domainData[0].u, windowId: moveInfo.windowId, id: tabId };
        clearCookiesWrapper(getMsg('ActionTabClose'), cookieDetails, currentTab);
      }
    }

    removeTabIdfromDataList(tabId, moveInfo);
  }
}

async function setBrowserActionIcon (contextName, tabDomain, tabId) {
  if (useChrome) {
    if (await chrome.tabs.get(tabId) === undefined) {
      return;
    }
  } else if (await browser.tabs.get(tabId) === undefined) {
    return;
  }

  let data = null;
  if (useChrome) {
    data = await chrome.storage.local.get('flagCookies_accountMode');
  } else {
    data = await browser.storage.local.get('flagCookies_accountMode');
  }

  const strippedRootDomain = tabDomain.replace(/^(http:|https:)\/\//i, '');
  const inAccountMode = data.flagCookies_accountMode && data.flagCookies_accountMode[contextName] && data.flagCookies_accountMode[contextName][strippedRootDomain];

  if (inAccountMode) {
    if (useChrome) {
      browserActionAPI.setIcon({
        tabId,
        path: {
          16: 'icons/fc16p.png',
          48: 'icons/fc48p.png',
          128: 'icons/fc128p.png'
        }
      });

      return;
    }

    browserActionAPI.setIcon({
      tabId,
      path: {
        48: 'icons/flagcookies_profil_icon.svg',
        64: 'icons/flagcookies_profil_icon.svg',
        96: 'icons/flagcookies_profil_icon.svg',
        128: 'icons/flagcookies_profil_icon.svg'
      }
    });

    return;
  }

  if (useChrome) {
    browserActionAPI.setIcon({
      tabId,
      path: {
        16: 'icons/fc16.png',
        48: 'icons/fc48.png',
        128: 'icons/fc128.png'
      }
    });

    return;
  }

  browserActionAPI.setIcon({
    tabId,
    path: {
      48: 'icons/flagcookies_icon.svg',
      64: 'icons/flagcookies_icon.svg',
      96: 'icons/flagcookies_icon.svg',
      128: 'icons/flagcookies_icon.svg'
    }
  });
}
// --------------------------------------------------------------------------------------------------------------------------------
// Log info
function clearDomainLog (currentTab, details) {
  let contextName = 'default';
  if (currentTab.cookieStoreId) {
    contextName = currentTab.cookieStoreId;
  }

  const tabWindowId = currentTab.windowId;
  const tabTabId = currentTab.id;

  if (logData[contextName] && logData[contextName][tabWindowId] && logData[contextName][tabWindowId][tabTabId]) {
    for (let x = 0; x < logData[contextName][tabWindowId][tabTabId].length; ++x) {
      if (logTime[contextName][tabWindowId][tabTabId][x] < details.timeStamp - 5000) {
        logTime[contextName][tabWindowId][tabTabId].splice(x, 1);
        logData[contextName][tabWindowId][tabTabId].splice(x, 1);
        --x;
      }
    }

    if (logTime[contextName][tabWindowId][tabTabId].length === 0) {
      delete logData[contextName][tabWindowId][tabTabId];
      if (Object.keys(logData[contextName][tabWindowId]).length === 0) delete logData[contextName][tabWindowId];
    }
  }
}

function addToLogData (contextName, tabWindowId, tabTabId, msg, timeString, timestamp) {
  if (logData[contextName] === undefined) logData[contextName] = {};
  if (logData[contextName][tabWindowId] === undefined) logData[contextName][tabWindowId] = {};
  if (logData[contextName][tabWindowId][tabTabId] === undefined) logData[contextName][tabWindowId][tabTabId] = [];

  if (logTime[contextName] === undefined) logTime[contextName] = {};
  if (logTime[contextName][tabWindowId] === undefined) logTime[contextName][tabWindowId] = {};
  if (logTime[contextName][tabWindowId][tabTabId] === undefined) logTime[contextName][tabWindowId][tabTabId] = [];

  msg = '[' + timeString + ']  ' + msg;
  if (logData[contextName][tabWindowId][tabTabId].indexOf(msg) === -1) {
    logData[contextName][tabWindowId][tabTabId].push(msg);
    logTime[contextName][tabWindowId][tabTabId].push(timestamp);
  }
}

async function onCookieChanged (changeInfo) {
  const cookieDetails = changeInfo.cookie;
  const cookieDomain = cookieDetails.domain.replace(/^(http:|https:)\/\//i, '');

  let currentTab = null;
  const tmpDomain = cookieDomain.replace(/^(http:|https:)\/\//i, '').replace(/^www/i, '').replace(/^\./, '');

  for (const windowId of Object.keys(openTabData)) {
    for (const tabId of Object.keys(openTabData[windowId])) {
      for (const domainName of Object.keys(openTabData[windowId][tabId])) {
        if (openTabData[windowId][tabId][domainName].d === tmpDomain || openTabData[windowId][tabId][domainName].d.endsWith(tmpDomain)) {
          if (useChrome) {
            currentTab = await chrome.tabs.get(parseInt(tabId));
          } else {
            currentTab = await browser.tabs.get(parseInt(tabId));
          }

          break;
        }
      }

      if (currentTab !== null) {
        break;
      }
    }

    if (currentTab !== null) {
      break;
    }
  }

  if (currentTab === null) {
    return;
  }

  const details = { url: currentTab.url };

  let contextName = 'default';
  if (currentTab.cookieStoreId) {
    contextName = currentTab.cookieStoreId;
  }

  const tabWindowId = currentTab.windowId;
  const tabTabId = currentTab.id;

  let foundCookie = false;
  let updatedCookie = {};

  if (cookieData[contextName] === undefined) cookieData[contextName] = {};
  if (cookieData[contextName][tabWindowId] === undefined) cookieData[contextName][tabWindowId] = {};
  if (cookieData[contextName][tabWindowId][tabTabId] === undefined) cookieData[contextName][tabWindowId][tabTabId] = {};

  for (const domainKey of Object.keys(cookieData[contextName][tabWindowId][tabTabId])) {
    let index = 0;
    foundCookie = false;

    for (const cookie of cookieData[contextName][tabWindowId][tabTabId][domainKey]) {
      updatedCookie = {};

      if (cookieDetails.name === cookie.name && cookieDetails.domain === cookie.domain) {
        for (const key of Object.keys(cookie)) {
          if (key.startsWith('fg')) {
            continue;
          }

          updatedCookie[key] = cookie[key];
        }

        for (const key of Object.keys(cookieDetails)) {
          updatedCookie[key] = cookieDetails[key];
        }

        cookieData[contextName][tabWindowId][tabTabId][domainKey][index] = updatedCookie;
        foundCookie = true;
        break;
      }

      ++index;
    }

    if (foundCookie) {
      break;
    }
  }

  if (!foundCookie) {
    updatedCookie = {};
    for (const key of Object.keys(cookieDetails)) {
      switch (key) {
        case 'name':
        case 'value':
        case 'domain':
        case 'path':
        case 'secure':
        case 'expirationDate':
        case 'firstPartyDomain':
        case 'partitionKey':
          // case 'storeId':
          updatedCookie[key] = cookieDetails[key];
          continue;
        default:
          continue;
      }
    }

    if (cookieData[contextName][tabWindowId][tabTabId][cookieDomain] === undefined) {
      cookieData[contextName][tabWindowId][tabTabId][cookieDomain] = [];
    }

    cookieData[contextName][tabWindowId][tabTabId][cookieDomain].push(updatedCookie);
    addTabURLtoDataList(currentTab, details, cookieDomain);
  }

  clearCookiesWrapper(getMsg('ActionCookieChange'), updatedCookie, currentTab);
}

async function onContextRemoved (changeInfo) {
  const contextName = changeInfo.contextualIdentity.name;
  const data = await browser.storage.local.get();

  if (data[contextName]) {
    delete data[contextName];
    browser.storage.local.remove(contextName);
  }

  if (data.flagCookies) {
    if (Object.keys(data.flagCookies).length === 0) {
      delete data.flagCookies;
      browser.storage.local.remove('flagCookies');
    }
  }

  if (data.flagCookies_flagGlobal) {
    if (data.flagCookies_flagGlobal && data.flagCookies_flagGlobal[contextName]) {
      delete data.flagCookies_flagGlobal[contextName];
    }

    if (Object.keys(data.flagCookies_flagGlobal).length === 0) {
      delete data.flagCookies_flagGlobal;
      browser.storage.local.remove('flagCookies_flagGlobal');
    }
  }

  browser.storage.local.set(data);

  if (logData[contextName]) delete logData[contextName];
  if (logTime[contextName]) delete logTime[contextName];
}

// --------------------------------------------------------------------------------------------------------------------------------
function addTabURLtoDataList (tab, details, domain) {
  const urlLower = details.url.toLowerCase();
  if (!urlLower.startsWith('chrome:') && !urlLower.startsWith('about:') && !urlLower.startsWith('edge:')) {
    const tabWindowId = tab.windowId;
    const tabTabId = tab.id;

    if (openTabData[tabWindowId] === undefined) openTabData[tabWindowId] = {};
    if (openTabData[tabWindowId][tabTabId] === undefined) openTabData[tabWindowId][tabTabId] = {};

    const rootDomain = domain.replace(/^(http:|https:)\/\//i, '');
    const urlMatch = details.url.match(/^(http:|https:)\/\/.[^/]*/i);
    let requestURL = null;
    if (urlMatch !== null) {
      requestURL = urlMatch[0];
    }

    const frameId = details.frameId;
    const parentFrameId = details.parentFrameId;
    const requestType = details.type;

    if (frameId === 0 && parentFrameId === -1 && requestType === 'main_frame') {
      let contextName = 'default';
      if (tab.cookieStoreId) {
        contextName = tab.cookieStoreId;
      }

      if (openTabData[tabWindowId][tabTabId][0] === undefined) {
        openTabData[tabWindowId][tabTabId][0] = { s: contextName, u: requestURL, d: rootDomain };
        resetCookieInformation(tab);
        cookieData[contextName][tabWindowId][tabTabId].fgRoot = rootDomain;
      }

      return;
    }

    for (const tabId of Object.keys(openTabData[tabWindowId][tabTabId])) {
      if (openTabData[tabWindowId][tabTabId][tabId].d === rootDomain) {
        return;
      }
    }

    let cnt = Object.keys(openTabData[tabWindowId][tabTabId]).length;
    if (openTabData[tabWindowId][tabTabId][0] === undefined) {
      ++cnt;
    }

    openTabData[tabWindowId][tabTabId][cnt] = { d: rootDomain };
  }
}

async function removeTabIdfromDataList (tabId, removeInfo) {
  if (removeInfo === undefined) return;
  if (openTabData[removeInfo.windowId] && openTabData[removeInfo.windowId][tabId]) {
    const domainData = openTabData[removeInfo.windowId][tabId];
    if (domainData[0] === undefined) return;
    const rootDomain = domainData[0].u;
    const contextName = domainData[0].s;

    if (cookieData[contextName] && cookieData[contextName][removeInfo.windowId] && cookieData[contextName][removeInfo.windowId][tabId]) {
      delete cookieData[contextName][removeInfo.windowId][tabId];

      if (Object.keys(cookieData[contextName][removeInfo.windowId]).length === 0) {
        delete cookieData[contextName][removeInfo.windowId];
      }

      if (Object.keys(cookieData[contextName]).length === 0) {
        delete cookieData[contextName];
      }
    }

    if (removedData[contextName] && removedData[contextName][removeInfo.windowId] && removedData[contextName][removeInfo.windowId][tabId]) {
      delete removedData[contextName][removeInfo.windowId][tabId];

      if (Object.keys(removedData[contextName][removeInfo.windowId]).length === 0) {
        delete removedData[contextName][removeInfo.windowId];

        if (Object.keys(removedData[contextName]).length === 0) {
          delete removedData[contextName];
        }
      }
    }

    if (permittedData[contextName] && permittedData[contextName][removeInfo.windowId] && permittedData[contextName][removeInfo.windowId][tabId]) {
      delete permittedData[contextName][removeInfo.windowId][tabId];

      if (Object.keys(permittedData[contextName][removeInfo.windowId]).length === 0) {
        delete permittedData[contextName][removeInfo.windowId];

        if (Object.keys(permittedData[contextName]).length === 0) {
          delete permittedData[contextName];
        }
      }
    }

    if (localStorageData[removeInfo.windowId] && localStorageData[removeInfo.windowId][tabId]) {
      delete localStorageData[removeInfo.windowId][tabId];

      if (Object.keys(localStorageData[removeInfo.windowId]).length === 0) {
        delete localStorageData[removeInfo.windowId];
      }
    }

    if (sessionStorageData[removeInfo.windowId] && sessionStorageData[removeInfo.windowId][tabId]) {
      delete sessionStorageData[removeInfo.windowId][tabId];

      if (Object.keys(sessionStorageData[removeInfo.windowId]).length === 0) {
        delete sessionStorageData[removeInfo.windowId];
      }
    }

    if (cookieCount[contextName] && cookieCount[contextName][removeInfo.windowId] && cookieCount[contextName][removeInfo.windowId][tabId]) {
      delete cookieCount[contextName][removeInfo.windowId][removeInfo.id];

      if (Object.keys(cookieCount[contextName][removeInfo.windowId]).length === 0) {
        delete cookieCount[contextName][removeInfo.windowId];

        if (Object.keys(cookieCount[contextName]).length === 0) {
          delete cookieCount[contextName];
        }
      }
    }

    if (logData[contextName] && logData[contextName][removeInfo.windowId] && logData[contextName][removeInfo.windowId][tabId]) {
      delete logData[contextName][removeInfo.windowId][tabId];

      if (Object.keys(logData[contextName][removeInfo.windowId]).length === 0) {
        delete logData[contextName][removeInfo.windowId];

        if (Object.keys(logData[contextName]).length === 0) delete logData[contextName];
      }
    }

    if (logTime[contextName] && logTime[contextName][removeInfo.windowId] && logTime[contextName][removeInfo.windowId][tabId]) {
      delete logTime[contextName][removeInfo.windowId][tabId];

      if (Object.keys(logTime[contextName][removeInfo.windowId]).length === 0) {
        delete logTime[contextName][removeInfo.windowId];

        if (Object.keys(logTime[contextName]).length === 0) delete logTime[contextName];
      }
    }

    let data = null;
    if (useChrome) {
      data = await chrome.storage.local.get();
    } else {
      data = await browser.storage.local.get();
    }

    if (data[contextName]) {
      if (data[contextName][rootDomain] && Object.keys(data[contextName][rootDomain]).length === 0) {
        delete data[contextName][rootDomain];
      }

      if (Object.keys(data[contextName]).length === 0) {
        if (useChrome) {
          await chrome.storage.local.remove(contextName);
        } else {
          await browser.storage.local.remove(contextName);
        }

        delete data[contextName];
      }

      if (useChrome) {
        await chrome.storage.local.set(data);
      } else {
        await browser.storage.local.set(data);
      }
    }
  }

  if (openTabData[removeInfo.windowId] && openTabData[removeInfo.windowId][tabId]) {
    delete openTabData[removeInfo.windowId][tabId];

    if (Object.keys(openTabData[removeInfo.windowId]).length === 0) {
      delete openTabData[removeInfo.windowId];
    }
  }
}

async function clearCookiesOnRequest (details) {
  if ((details.method === 'GET' || details.method === 'POST') && details.tabId !== -1) {
    let sourceDomain = null;
    switch (details.type) {
      case 'xmlhttprequest':
        if (details.originUrl) {
          sourceDomain = details.originUrl;
        } else {
          sourceDomain = details.url;
        }
        break;
      case 'outermost_frame':
      case 'main_frame':
      case 'sub_frame':
        sourceDomain = details.url;
        break;
      default:
        return;
    }

    let currentTab = null;

    if (useChrome) {
      currentTab = await chrome.tabs.get(details.tabId);
    } else {
      currentTab = await browser.tabs.get(details.tabId);
    }

    let domainURL = '';
    const urlMatch = sourceDomain.match(/^(http:|https:)\/\/.[^/]*/i);
    if (urlMatch !== null) domainURL = urlMatch[0];
    else domainURL = sourceDomain;

    let contextName = 'default';

    const tabWindowId = currentTab.windowId;
    const tabTabId = currentTab.id;

    if (details.frameId === 0 && details.parentFrameId === -1 && details.type === 'main_frame') {
      if (currentTab.cookieStoreId) contextName = currentTab.cookieStoreId;

      if (openTabData[tabWindowId] && openTabData[tabWindowId][tabTabId] && openTabData[tabWindowId][tabTabId][0]) {
        openTabData[tabWindowId][tabTabId] = {};
        if (cookieData[contextName] === undefined) cookieData[contextName] = {};
        if (cookieData[contextName][tabWindowId] === undefined) cookieData[contextName][tabWindowId] = {};
        if (cookieData[contextName][tabWindowId][tabTabId] === undefined) cookieData[contextName][tabWindowId][tabTabId] = {};
      } else {
        if (cookieData[contextName] === undefined) cookieData[contextName] = {};
        if (cookieData[contextName][tabWindowId] === undefined) cookieData[contextName][tabWindowId] = {};
        if (cookieData[contextName][tabWindowId][tabTabId] === undefined) cookieData[contextName][tabWindowId][tabTabId] = {};

        if (removedData[contextName] === undefined) removedData[contextName] = {};
        if (removedData[contextName][tabWindowId] === undefined) removedData[contextName][tabWindowId] = {};
        removedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

        if (permittedData[contextName] === undefined) permittedData[contextName] = {};
        if (permittedData[contextName][tabWindowId] === undefined) permittedData[contextName][tabWindowId] = {};
        permittedData[contextName][tabWindowId][tabTabId] = { count: 0, domains: {} };

        if (cookieCount[contextName] === undefined) cookieCount[contextName] = {};
        if (cookieCount[contextName][tabWindowId] === undefined) cookieCount[contextName][tabWindowId] = {};
        if (cookieCount[contextName][tabWindowId][tabTabId] === undefined) {
          cookieCount[contextName][tabWindowId][tabTabId] = { count: 0, cookies: [] };
        }
      }

      cookieData[contextName][tabWindowId][tabTabId].fgRoot = domainURL;

      if (logData[contextName] && logData[contextName][tabWindowId] && logData[contextName][tabWindowId][tabTabId]) {
        clearDomainLog(currentTab, details);
      }
    }

    addTabURLtoDataList(currentTab, details, domainURL);

    let typeOfRequest = '';
    switch (details.type) {
      case 'xmlhttprequest':
        typeOfRequest = getMsg('ActionJavascriptRequest');
        break;
      case 'main_frame':
      case 'sub_frame':
      default:
        typeOfRequest = getMsg('ActionDocumentLoad');
        break;
    }

    clearCookiesAction(typeOfRequest, null, currentTab);
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
// Import settings
const doImportOverwrite = false;

// Called in frontend/UI
function importSettings (evt) {
  if (evt.target.files[0] === undefined) return;

  const file = evt.target.files[0];

  JSZip.loadAsync(file).then(function (zip) {
    if (zip.files['flagCookieSettings.json'] === undefined) return;

    zip.files['flagCookieSettings.json'].async('string').then(async function (stringData) {
      const data = JSON.parse(stringData);

      if (doImportOverwrite) {
        if (!useChrome) browser.storage.local.set(data);
        else chrome.storage.local.set(data);
        return;
      }

      if (!useChrome) {
        const existingData = await browser.storage.local.get();
        browser.storage.local.set(mergeData(existingData, data));
        return;
      }

      chrome.storage.local.get(null, function (existingData) {
        chrome.storage.local.set(mergeData(existingData, data));
      });
    });
  });
}

// --------------------------------------------------------------------------------------------------------------------------------

function mergeData (existingData, data) {
  const flagCookieSettings = ['flagCookies_logged', 'flagCookies_flagGlobal', 'flagCookies_autoflag', 'flagCookies_notifications', 'flagCookies_darkTheme'];
  for (const key of Object.keys(data)) {
    if (flagCookieSettings.indexOf(key) === -1) {
      if (existingData[key] === undefined) existingData[key] = data[key];
      else {
        for (const domain of Object.keys(data[key])) {
          if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain];
          else {
            for (const setDomain of Object.keys(data[key][domain])) {
              if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain];
              else {
                for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                  if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey];
                }
              }
            }
          }
        }
      }
    } else {
      if (key === 'flagCookies_logged') {
        if (existingData[key] === undefined) existingData[key] = data[key];
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain];
            else {
              for (const setDomain of Object.keys(data[key][domain])) {
                if (existingData[key][domain][setDomain] === undefined) existingData[key][domain][setDomain] = data[key][domain][setDomain];
                else {
                  for (const cookieKey of Object.keys(data[key][domain][setDomain])) {
                    if (existingData[key][domain][setDomain][cookieKey] === undefined) existingData[key][domain][setDomain][cookieKey] = data[key][domain][setDomain][cookieKey];
                  }
                }
              }
            }
          }
        }
      } else if (key === 'flagCookies_autoFlag') {
        if (existingData[key] === undefined) existingData[key] = data[key];
        else {
          for (const domain of Object.keys(data[key])) {
            if (existingData[key][domain] === undefined) existingData[key][domain] = data[key][domain];
          }
        }
      } else if ((key === 'flagCookies_flagGlobal' || key === 'flagCookies_notifications' || key === 'flagCookies_darkTheme')) existingData[key] = data[key];
    }
  }

  return existingData;
}

async function onInstallNotification (details) {
  let data = false;

  if (useChrome) {
    data = await chrome.storage.local.get('flagCookies_updateNotifications');
  } else {
    data = await browser.storage.local.get('flagCookies_updateNotifications');
  }

  if (data.flagCookies_updateNotifications && data.flagCookies_updateNotifications === false) {
    return;
  }

  let installType = '';
  switch (details.reason) {
    case 'update':
      installType = getMsg('UpdatedInstallationString');
      break;
    case 'install':
      installType = getMsg('NewInstallationString');
      break;
    case 'browser_update':
    case 'chrome_update':
    default:
      return;
  }

  if (useChrome) {
    chrome.notifications.create('installedAddonMessage', { type: 'basic', message: getMsg('InstalledAddonMessage'), title: getMsg('InstalledAddonMessageTitle', installType), iconUrl: 'icons/fc128.png' });
  } else {
    browser.notifications.create('installedAddonMessage', { type: 'basic', message: getMsg('InstalledAddonMessage'), title: getMsg('InstalledAddonMessageTitle', installType), iconUrl: 'icons/fc128.png' });
  }
}

// --------------------------------------------------------------------------------------------------------------------------------
if (useChrome) {
  chrome.tabs.onRemoved.addListener(clearCookiesOnLeave);
  chrome.tabs.onUpdated.addListener(clearCookiesOnUpdate);
  chrome.tabs.onActivated.addListener(handleTabChange);
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.cookies.onChanged.addListener(onCookieChanged);
  // Is this the performance culprit in chrome browsers?
  chrome.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] });
  chrome.runtime.onInstalled.addListener(onInstallNotification);
} else {
  browser.tabs.onRemoved.addListener(clearCookiesOnLeave);
  browser.tabs.onUpdated.addListener(clearCookiesOnUpdate);
  browser.tabs.onActivated.addListener(handleTabChange);
  browser.runtime.onMessage.addListener(handleMessage);
  browser.cookies.onChanged.addListener(onCookieChanged);
  browser.contextualIdentities.onRemoved.addListener(onContextRemoved);
  browser.windows.onRemoved.addListener(removeTabIdfromDataList);
  browser.webRequest.onBeforeRequest.addListener(clearCookiesOnRequest, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] });
  browser.runtime.onInstalled.addListener(onInstallNotification);
}

browserActionAPI.setBadgeBackgroundColor({ color: '#FF0000' });
browserActionAPI.setBadgeTextColor({ color: '#FFFFFF' });
