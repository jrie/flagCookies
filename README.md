# FlagCookies

A cookie manager with cow powers.  Gives the ability to flag and set rules explicitly for cookies, also third-party cookies, cross origin and secure cookies.

Domain.net and subdomain.domain.net can have individual rights. Providing several modes to set rules onto cookies and keeping a cookie profile, while being logged in in a website or service.

### Before you use this addon
This add-on is mainly aimed at power users, this might sounds harsh, but it is not!

In order to get the most out of it, you have to define either own rules for websites, or use the "Global Flag", or "Auto flag" modes. Also, in case you use payment services, be advised to disable the "Global flag" feature temporarily. For example when using Paypal or other shopping/payment provider websites and such.

### *Long story made short* - Basic usage
1) Use `Global mode` if you are surfing, this will remove all kind of cookies while you browsing the web if not protected by `profile` mode.

2) Use `Auto flag` settings which will remove all cookies for one website/domain - this can be useful if you only want to automatically remove these page cookies every time you are surfing on it.

3) Use `Profile mode` either globally for a website, protecting all cookies of that domain if nothing no cookies are picked. Or protect single cookies even when `Global flag` or `Auto flag` modes are active.

4) `Click / Flag` and set rules for each cookie individually

## Features

**FlagCookies distinguishes between http(s)://domain.net and http(s)://subdomain.domain.net** for the following features:

* Detects and displays stored browser cookies and be able to manage (flag) and delete those while browsing, either automatically through ***global*** or ***auto flag*** mode or by explizit decision
* **Flag cookies** either to be explicitly **deleted** even without *global* or *auto flag* mode or set them to be **permitted** and protected from removal by *global* or *auto flag* modes
* **Profile** mode for a domain or cookies - to switch between *logged into a website/service* and *not logged in* modes in order to remove or keep cookies on demand
* **Auto flag** mode only affecting this particular (sub)domain, removing every domain cookie which is not permitted or used as ***profile cookie***, this also includes third-party and cross origin cookies.
* Support for *Firefox Multi-Account-Containers*
* **Preferences** allowing to import and export settings to a ZIP file. Import does not work in private windows!
* **Preferences** allows to manage *logged in profile* cookies, delete all domain settings and add-on settings
* An **Action log** avaible in Preferences which provides output of what FlagCookies is doing. The **Action log** is disabled by defaul due to performance improvements and RAM usage - even so the log is cleared mostly on reload
* **Displays count** of deleted cookies in the browser toolbar icon and in addition a summary of the action log when hovering the toolbar icon
* Optional **notifications**, disabled by default for: **profile mode** shortcut activation/deactivation, ***cookies removed display*** and ***notifications enabled/disabled message***

## Requirements

A recent version of **Chrome**, **Firefox** or **Opera** or **Edge** browser(s). Please note, there is no mobile version of FlagCookies.


## Installation

### Firefox
Use addons.mozilla.org: [Flag Cookies on Add-ons Mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/flag-cookies/)

### Opera
Use addons.opera.com: [Flag Cookies on Add-ons Opera.com](https://addons.opera.com/en/extensions/details/flag-cookies/) 

### Chrome
Use the Chrome web store: [Flag Cookies on the web store @ chrome.google.com](https://chrome.google.com/webstore/detail/flag-cookies/phcaemipbgodliopfijmcmlbdhpkbndb) 

### Edge
Use Edge addon store: [Flag Cookies @ Microsoft for Edge](https://microsoftedge.microsoft.com/addons/detail/flag-cookies/jonbmefahinfgmdoedhahcohlbmonhkb)

## Help, documentation and usage
Please read along here: https://github.com/jrie/flagCookies/wiki/FlagCookies-help-and-documentation

## Translations
As of version 3.0.27 translations can be done for Flag Cookies.

All translations are located inside **\_locales/** folder - and the folders **en** for general English,as well as **de** for German language. Inside every folder is a **messages.json** located. This file holds all translated strings.

To create a new language, for example French language, use **fr** as code. So it ends up to everything French language related inside **\_locales/fr/messages.json**. To add another layer of help copy the **help.html** from the **en** directory to **fr/help.html** - when everything is done correctly, you will be able to see changes when using **about:debugging** in Firefox and loading the add-on.

More information can be found here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization


## Providing feedback/feature wishes/ideas
Please file an issue on the ***issues*** page. I gladly try to respond to feedback and to improve FlagCookies. If you think a feature is missing or at worst, not working as expected, please also open an issue.

There is also a discussion on Mozillas Discourse where you can provide feedback: [Flag Cookies on Mozilla Discourse](https://discourse.mozilla.org/t/support-flag-cookies-flagcookies-a-new-not-yet-another-cookie-cleaner-manager/31220)

## Thanks and notes

To all who helped so far through critic, general feedback and ideas. Keeps me going!

### German speaking thread @ ngb.to about FlagCookies
[Flag Cookies on german bulletin board ngb.to](https://ngb.to/threads/32496-Firefox-Addon-FlagCookies)
