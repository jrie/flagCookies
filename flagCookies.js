//---------------------------------------------------------------------------------------------------------------------------------
let domainURL = "";
// Slightly modifed version of list-cookies example on MDN github

async function showCookiesForTab(tabs) {
  //get the first tab object in the array
  let tab = tabs.pop();

  // Get storage data and parse tab URL
  let data = await browser.storage.local.get();
  domainURL = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ\.\-\:]*\//)[0];

  //get all cookies in the domain
  let gettingAllCookies = browser.cookies.getAll({url: domainURL});
  gettingAllCookies.then((cookies) => {

    //set the header of the panel
    let activeTabUrl = document.querySelector("#header-title");
    let text = document.createTextNode("Cookies: "+domainURL);
    let cookieList = document.getElementById('cookie-list');
    let flaggedCookieList = document.getElementById('cookie-list-flagged');
    activeTabUrl.appendChild(text);

    if (cookies.length > 0) {
      for (let cookie of cookies) {
        let li = document.createElement("li");

        let btn = document.createElement("button");
        let btnContent = document.createTextNode("Flag");
        btn.appendChild(btnContent);
        btn.addEventListener("click", flagSwitch);
        btn.dataset['name'] = cookie.name;
        btn.dataset['value'] = cookie.value;

        if (data[domainURL] !== undefined && data[domainURL][cookie.name]) {
          btn.className = "flagged";
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

        li.appendChild(btn);
        li.appendChild(p);

        cookieList.appendChild(li);
      }

    } else {
      let p = document.createElement("p");
      let content = document.createTextNode("No cookies in this tab.");
      let parent = cookieList.parentNode;

      p.appendChild(content);
      parent.appendChild(p);
    }

    if (data[domainURL] !== undefined) {
      let childCount = flaggedCookieList.children.length;

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

  });
}

function addFlaggedCookie(name, value) {
  let flaggedCookieList = document.getElementById('cookie-list-flagged');
  let li = document.createElement("li");
  li.dataset['name'] = name;

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

  if (data[domainURL] === undefined) {
    data[domainURL] = {};
  }

  if (data[domainURL][cookieName]) {
    delete data[domainURL][cookieName];
    event.target.className = "";

    let flaggedCookieList = document.getElementById('cookie-list-flagged');
    for (let index in flaggedCookieList.children) {
      let child = flaggedCookieList.children[index];
      if (child.dataset['name'] == cookieName) {
        child.parentNode.removeChild(child);
        break;
      }
    }

  } else {
    data[domainURL][cookieName] = true;
    event.target.className = "flagged";
    addFlaggedCookie(cookieName, cookieValue);
  }

  await browser.storage.local.set(data);
}

//---------------------------------------------------------------------------------------------------------------------------------
function switchFlagged() {
  document.getElementById("cookie-list").className = "hidden";
  document.getElementById("cookie-list-flagged").className = "";
}

function switchAll() {
  document.getElementById("cookie-list").className = "";
  document.getElementById("cookie-list-flagged").className = "hidden";
}

// Startup code

document.getElementById("flaggedCookies").addEventListener("click", switchFlagged);
document.getElementById("allCookies").addEventListener("click", switchAll);
getActiveTab().then(showCookiesForTab);
