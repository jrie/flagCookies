// Shouldnt be required to make changes from here???
var domainURL = ""; // The active domain url

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookies(action) {
  let data = await browser.storage.local.get();
  if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
    let domainCookies = await browser.cookies.getAll({url: domainURL});
    for (let cookie of domainCookies) {
      let details = { url: domainURL, name: cookie.name };
      if ((await browser.cookies.remove(details)) != null) {
        if (data[domainURL] && data[domainURL][cookie.name] == true) {
          console.log("Deleted on '" + action + "',' cookie: '" + cookie.name + "' for '" + domainURL + "'");
        } else {
          console.log("Auto-flag deleted on '" + action + "',' cookie: '" + cookie.name + "' for '" + domainURL + "'");
        }
      }
    }
  } else if (data[domainURL] !== undefined) {
    for (let cookie in data[domainURL]) {
      let details = { url: domainURL, name: cookie };
      if ((await browser.cookies.remove(details)) != null) {
        console.log("Deleted on '" + action + "',' cookie: '" + cookie + "' for '" + domainURL + "'");
      }
    }
  }

}

//---------------------------------------------------------------------------------------------------------------------------------
// Firefox 58.01a/Nightly/In Dev? Tab-Features
async function setdomainURLOnActivation(activeInfo) {
  let activeTabs = await browser.tabs.query({currentWindow: true, active: true});
  if (activeTabs.length != 0) {
    let currentTab = activeTabs[0];
    let urlMatch = currentTab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ\.\-\:]*\//);
    if (urlMatch) {
      domainURL = urlMatch[0];
      console.log("Switched active domain to: " + domainURL);
    }
  }

}

let clearCookiesOnUpdate = (tabId, changeInfo, tab) => {
  if (changeInfo.status && changeInfo.status == "loading") {
    clearCookies("tab update");
  }
}

let clearCookiesOnLeave = (tabId, moveInfo) => {
  clearCookies("tab close/window close");
}


browser.tabs.onRemoved.addListener(clearCookiesOnLeave);
browser.tabs.onUpdated.addListener(clearCookiesOnUpdate);
browser.tabs.onActivated.addListener(setdomainURLOnActivation);
