# FlagCookies

A cookie manager allowing to flag and set rules explicitly for cookies, also third-party cookies.
domain.net and subdomain.domain.net have individual rights. Providing several modes to set rules onto cookies and keeping a cookie profile, while being logged in in a website or service.

### Note
This add-on is aimed at power users. By default it does nothing on its own. In order to get the most out of it, you have to define your own rules for websites or at least make some decisions in order to get the most out of the add-on. Also, in case you use payment services, be advised to disable the `Global flag` feature temporarily. For example when using Paypal.com or similar shopping or payment providers websites.

### *Long story made short*
1) Use `Global mode` if you are surfing, this will remove all kind of cookies while you browsing the web if not protected by `profile` mode.

2) Use `Auto flag` settings which will remove all cookies for one website/domain - this can be useful if you only want to automatically remove these page cookies every time you are surfing on it.

3) Use `Profile mode` either globally for a website, protecting all cookies of that domain if nothing no cookies are picked. Or protect single cookies even when `Global flag` or `Auto flag` modes are active.


## Screenshot
![Flag Cookies main user interface](https://www.picflash.org/img/2018/09/12/pmr8j816rm7p7tt.png "Flag Cookies main interface")

## Features

**FlagCookies distinguishes between http(s)://domain.net and http(s)://subdomain.domain.net** for the following features:

* Detects and displays stored browser cookies and be able to manage (flag) and delete those while browsing, either automatically through ***global*** or ***auto flag*** mode or by own decision
* **Flag cookies** either to be explicitly **deleted** even without *global* or *auto flag* mode or set them to be **permitted** and protected from removal by *global* or *auto flag* modes
* **Profile** mode for a domain or cookies - to switch between *logged into a website/service* and *not logged in* modes in order to remove or keep cookies on demand
* **Auto flag** mode only affecting this particular (sub)domain, removing every domain cookie which is not permitted or used as ***profile cookie***, this also includes third-party and cross origin cookies.
* Support for *Firefox Multi-Account-Containers*
* **Preferences** allowing to import and export settings to a ZIP file. Import does not work in private windows!
* **Preferences** allows to manage *logged in profile* cookiee, delete all domain settings and add-on settings and provides a **Action log** to display what FlagCookies is doing
* **Displays count** of deleted cookies in the browser toolbar icon and in addition a summary of the action log when hovering the toolbar icon
* *Keyboard Shortcut* **Alt + Shift + A** to enable/disable **profile mode** for a (sub)domain
* Optional **notifications**, disabled by default for: **profile mode** shortcut activation/deactivation, ***cookies removed display*** and ***notifications enabled/disabled message***

## Requirements

**Firefox 58.0a1+** or a recent version of **Chrome** or **Opera** browser(s).


## Installation

### Firefox
Use addons.mozilla.org: [Flag Cookies on Add-ons Mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/flag-cookies/)

### Opera
Use addons.opera.com: [Flag Cookies on Add-ons Opera.com](https://addons.opera.com/en/extensions/details/flag-cookies/) 

###Chrome
Use the Chrome web store: [Flag Cookies on the web store @ chrome.google.com](https://chrome.google.com/webstore/detail/flag-cookies/phcaemipbgodliopfijmcmlbdhpkbndb) 

## Help, documentation and usage
Please read along here: https://github.com/jrie/flagCookies/wiki/FlagCookies-help-and-documentation

## Translations
As of version 3.0.27 translations can be done for Flag Cookies.

All translations are located inside **\_locales/** folder - and the folders **en** for general English,as well as **de** for German language. Inside every folder is a **messages.json** located. This file holds all translated strings.

To create a new language, for example French language, use **fr** as code. So it ends up to everything French language related inside **\_locales/fr/messages.json**. To add another layer of help copy the **help.html** from the **en** directory to **fr/help.html** - when everything is done correctly, you will be able to see changes when using **about:debugging** in Firefox and loading the add-on.

More information can be found here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization


## Providing feedback/feature wishes/ideas
Please file an issue on the ***issues*** page. I gladly try to respond to feedback and to improve Flag cookies. If you think a feature is missing or at worst, not working as expected, please also open an issue.

There is also a discussion on Mozillas Discourse where you can provide feedback: https://discourse.mozilla.org/t/support-flag-cookies-flagcookies-a-new-not-yet-another-cookie-cleaner-manager/31220

## Thanks and notes

To all who helped so far through critic, general feedback and ideas. Keeps me going!

### German speaking thread @ ngb.to about FlagCookies
[Flag Cookies on german bulletin board ngb.to](https://ngb.to/threads/32496-Firefox-Addon-FlagCookies)
