//---------------------------------------------------------------------------------------------------------------------------------
let domainURL = "";
// Slightly modifed version of list-cookies example on MDN github

async function showCookiesForTab(tabs) {
  //get the first tab object in the array
  let tab = tabs.pop();

  // Get storage data and parse tab URL
  let data = await browser.storage.local.get();
  domainMatch = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ\.\-\:]*\//);
  if (domainMatch) {
    domainURL = domainMatch[0];
  } else {
    domainURL = "No domain";
  }

  //get all cookies in the domain
  let gettingAllCookies = browser.cookies.getAll({url: domainURL});
  gettingAllCookies.then((cookies) => {

    //set the header of the panel
    let activeTabUrl = document.querySelector("#header-title");
    let introSpan = document.createElement('span');
    introSpan.className = "intro";

    let intro = document.createTextNode("Cookies for domain:");
    introSpan.appendChild(intro);

    let url = document.createTextNode(domainURL);
    url.className = "domainurl";
    activeTabUrl.appendChild(introSpan);
    activeTabUrl.appendChild(url);
    if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {
      document.getElementById('auto-flag').className = "active";
      switchAutoFlag(true, 'cookie-list');
    }

    let cookieList = document.getElementById('cookie-list');
    let flaggedCookieList = document.getElementById('cookie-list-flagged');

    if (cookies.length > 0) {
      for (let cookie of cookies) {
        let li = document.createElement("li");

        let checkMark = document.createElement("button");
        checkMark.className = "checkmark";

        checkMark.addEventListener("click", flagSwitch);
        checkMark.dataset['name'] = cookie.name;
        checkMark.dataset['value'] = cookie.value;

        if (data[domainURL] && data[domainURL][cookie.name] && data[domainURL][cookie.name] === true) {
          checkMark.className = "checkmark flagged";
          addFlaggedCookie(cookie.name, cookie.value);
        }

        let p = document.createElement("p");

        let pCookieKeyElm= document.createElement("span");
        let pCookieKey = document.createTextNode(cookie.name);
        pCookieKeyElm.className = "cookieKey";
        pCookieKeyElm.appendChild(pCookieKey);

        let pCookieValueElm= document.createElement("span");
        let pCookieValue = document.createTextNode(cookie.value);
        pCookieValueElm.className = "cookieValue";
        pCookieValueElm.appendChild(pCookieValue);

        p.appendChild(pCookieKeyElm);
        p.appendChild(pCookieValueElm);

        li.appendChild(checkMark);
        li.appendChild(p);

        cookieList.appendChild(li);
      }

    } else {
      let p = document.createElement("p");
      p.className = "info";

      let content = document.createTextNode("No cookies in this tab.");
      p.appendChild(content);

      cookieList.parentNode.appendChild(p);
    }

    if (data[domainURL]) {
      let childCount = flaggedCookieList.children.length;

      if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL]) {

        for (let cookieName in data[domainURL]) {
          let found = false;

          if (data[domainURL][cookieName] !== true) {
              continue;
          }

          for (let i = 0; i < childCount; ++i) {
            let child = flaggedCookieList.children[i];
            if (child.dataset['name'] == cookieName) {
              found = true;
              break;
            }
          }

          if (!found) {
            addFlaggedCookie(cookieName, "");
          }
        }
      } else {
        for (let cookieName in data[domainURL]) {
          let found = false;

          for (let i = 0; i < childCount; ++i) {
            let child = flaggedCookieList.children[i];
            if (child.dataset['name'] == cookieName) {
              found = true;
              break;
            }
          }

          if (!found) {
            addFlaggedCookie(cookieName, "");
          }
        }
      }
    }

  });
}

function addFlaggedCookie(name, value) {
  let flaggedCookieList = document.getElementById('cookie-list-flagged');
  let li = document.createElement("li");
  li.dataset['name'] = name;

  let checkMark = document.createElement("button");
  checkMark.className = "checkmark flagged";
  checkMark.dataset['name'] = name;
  checkMark.dataset['value'] = value;
  checkMark.addEventListener("click", flagSwitch);

  let p = document.createElement("p");

  let pCookieKeyElm= document.createElement("span");
  let pCookieKey = document.createTextNode(name);
  pCookieKeyElm.className = "cookieKey";
  pCookieKeyElm.appendChild(pCookieKey);
  p.appendChild(pCookieKeyElm);

  if (value != "") {
    let pCookieValueElm= document.createElement("span");
    let pCookieValue = document.createTextNode(value);
    pCookieValueElm.className = "cookieValue";
    pCookieValueElm.appendChild(pCookieValue);
    p.appendChild(pCookieValueElm);
  }

  li.appendChild(checkMark);
  li.appendChild(p);
  flaggedCookieList.appendChild(li);
}

function getActiveTab() {
  return browser.tabs.query({currentWindow: true, active: true});
}

//---------------------------------------------------------------------------------------------------------------------------------
// Button switch function and store delete cookie name in browser storage

async function flagSwitch(event) {
  let data = await browser.storage.local.get();
  let cookieName = event.target.dataset['name'];
  let cookieValue = event.target.dataset['value'];

  if (!data[domainURL]) {
    data[domainURL] = {};
  }

  if (data[domainURL][cookieName] && (data['flagCookies_autoFlag'] && !data['flagCookies_autoFlag'][domainURL])) {
    delete data[domainURL][cookieName];
    event.target.className = "checkmark";

    // Remove from flagged list
    let flaggedCookieList = document.getElementById('cookie-list-flagged');
    for (let child of flaggedCookieList.children) {
      if (child.dataset['name'] == cookieName) {
        child.parentNode.removeChild(child);
        break;
      }
    }

    // Uncheck from flagged in active cookies, if present
    let domainCookieList = document.getElementById('cookie-list');
    for (let child of domainCookieList.children) {
      if (child.children[0].dataset['name'] == cookieName) {
        child.children[0].className = "checkmark";
        break;
      }
    }
  } else if (data['flagCookies_autoFlag'] && data['flagCookies_autoFlag'][domainURL] && data[domainURL][cookieName] === true) {
    data[domainURL][cookieName] ="af";
    event.target.className = "checkmark auto-flagged";

    // Remove from flagged list
    let flaggedCookieList = document.getElementById('cookie-list-flagged');
    for (let child of flaggedCookieList.children) {
      if (child.dataset['name'] == cookieName) {
        child.parentNode.removeChild(child);
        break;
      }
    }
  } else {
    data[domainURL][cookieName] = true;
    event.target.className = "checkmark flagged";
    addFlaggedCookie(cookieName, cookieValue);
  }

  await browser.storage.local.set(data);
}

//---------------------------------------------------------------------------------------------------------------------------------
// Switches for main buttons
function unhide(targetList) {
  let searchVal = document.getElementById("searchBar").value.trim().toLowerCase();
  if (searchVal.length != 0) {
    doSearch(searchVal);
  } else {
    for (let child of targetList.children) {
      if (child.className == "hidden") {
        child.className = "";
      }
    }
  }
}

// Switch views
function switchFlagged() {
  let list = document.getElementById("cookie-list-flagged");
  unhide(list);

  document.getElementById("cookie-list").className = "hidden";
  list.className = "";
}

function switchAll() {
  let list = document.getElementById("cookie-list");
  unhide(list);

  document.getElementById("cookie-list-flagged").className = "hidden";
  list.className = "";
}

// Switch auto flagging
async function flagAutoSwitch(event) {
  let data = await browser.storage.local.get();

  if (!data['flagCookies_autoFlag']) {
    data['flagCookies_autoFlag'] = {};
  }

  if (event.target.className != "active") {
    data['flagCookies_autoFlag'][domainURL] = true;
    await browser.storage.local.set(data);
    event.target.className = "active";
    switchAutoFlag(true, 'cookie-list');
  } else {
    delete data['flagCookies_autoFlag'][domainURL];
    await browser.storage.local.set(data);
    event.target.className = "";
    switchAutoFlag(false, 'cookie-list');
  }
}

// Switch auto flag status for cookies
async function switchAutoFlag(switchOn, targetList) {
  let data = await browser.storage.local.get();

  if (!data[domainURL]) {
    data[domainURL] = {};
  }

  let searchTarget = document.getElementById(targetList);

  if (switchOn) {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0];
      let cookieKey = contentChild.dataset["name"];

      if (data[domainURL][cookieKey]) {
        if (data[domainURL][cookieKey] != true) {
          contentChild.className = "checkmark auto-flagged";
        } else {
          contentChild.className = "checkmark flagged";
        }
      } else {
        data[domainURL][cookieKey] = "af";
        contentChild.className = "checkmark auto-flagged";
      }
    }

  } else {
    for (let child of searchTarget.children) {
      let contentChild = child.children[0];
      let cookieKey = contentChild.dataset["name"];

      if (data[domainURL][cookieKey]) {
        if (data[domainURL][cookieKey] == "af") {
          delete data[domainURL][cookieKey];
          contentChild.className = "checkmark";
        } else {
          contentChild.className = "checkmark flagged";
        }
      }
    }
  }

  await browser.storage.local.set(data);
}

//---------------------------------------------------------------------------------------------------------------------------------
// Search related
function searchContent(event) {
  let searchVal = event.target.value.trim().toLowerCase();
  doSearch(searchVal, "cookie-list");
  doSearch(searchVal, "cookie-list-flagged");
}

function doSearch(searchVal, targetList) {
  let searchTarget = document.getElementById(targetList);
  for (let child of searchTarget.children) {
    let contentChild = child.children[0];
    let cookieKey = contentChild.dataset["name"].toLowerCase();
    let cookieValue = contentChild.dataset["value"].toLowerCase();
    if (cookieKey.indexOf(searchVal) == -1 && cookieValue.indexOf(searchVal) == -1) {
        child.className = "hidden";
    } else {
      child.className = "";
    }
  }
}

//---------------------------------------------------------------------------------------------------------------------------------
// Startup code
document.getElementById("flaggedCookies").addEventListener("click", switchFlagged);
document.getElementById("allCookies").addEventListener("click", switchAll);
document.getElementById("auto-flag").addEventListener("click", flagAutoSwitch);
document.getElementById("searchBar").addEventListener("keyup", searchContent);

getActiveTab().then(showCookiesForTab);
