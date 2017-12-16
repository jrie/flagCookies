// set this to true, to clearCookies when the tab icon is clicked once for all flagged tags, there is a "one" time chance to unflag them from deletion before they disappear for unflagging until next reload
var useActiveClearing = false;

// Shouldnt be required to make changes from here???
var domainURL = ""; // The active domain url

//---------------------------------------------------------------------------------------------------------------------------------
// Slightly modifed version of list-cookies example on MDN github

async function showCookiesForTab(tabs) {
  //get the first tab object in the array
  let tab = tabs.pop();

  // Get storage data and parse tab URL
  let data = await browser.storage.local.get();
  domainURL = tab.url.match(/(http|https):\/\/[a-zA-Z0-9öäüÖÄÜ\.\-\:]*\//)[0];

  //get all cookies in the domain
  var gettingAllCookies = browser.cookies.getAll({url: domainURL});
  gettingAllCookies.then((cookies) => {

    //set the header of the panel
    var activeTabUrl = document.querySelector("#header-title");
    var text = document.createTextNode("Cookies: "+domainURL);
    var cookieList = document.getElementById('cookie-list');
    activeTabUrl.appendChild(text);

    if (cookies.length > 0) {
      for (let cookie of cookies) {
        let li = document.createElement("li");

        let btn = document.createElement("button");
        let btnContent = document.createTextNode("Flag");
        btn.appendChild(btnContent);
        btn.addEventListener("click", flagSwitch);
        btn.dataset['cookieName'] = cookie.name;

        if (data[domainURL] !== undefined && data[domainURL][cookie.name]) {
          btn.className = "flagged";
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
  });

  if (useActiveClearing) {
    clearCookies("active clearing");
  }
}

function getActiveTab() {
  return browser.tabs.query({currentWindow: true, active: true});
}


//---------------------------------------------------------------------------------------------------------------------------------
// Button switch function and store delete cookie name in browser storage

async function flagSwitch(event) {
  let data = await browser.storage.local.get();
  let cookieName = event.target.dataset['cookieName'];

  if (data[domainURL] === undefined) {
    data[domainURL] = {};
  }

  if (data[domainURL][cookieName]) {
    delete data[domainURL][cookieName];
    event.target.className = "";
  } else {
    data[domainURL][cookieName] = true;
    event.target.className = "flagged";
  }

  await browser.storage.local.set(data);
}

// Clear the cookies which are enabled for the domain in browser storage
async function clearCookies(action) {
  let data = await browser.storage.local.get();

  if (data[domainURL] !== undefined) {
    for (let cookie in data[domainURL]) {
      let details = { url: domainURL, name: cookie };
      if ((await browser.cookies.remove(details)) != null) {
        console.log("Deleted on '" + action + "',' cookie: '" + cookie + "' for '" + domainURL + "'");
      }
    }
  }
}

//---------------------------------------------------------------------------------------------------------------------------------
// Startup code

getActiveTab().then(showCookiesForTab);
