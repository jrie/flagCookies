# FlagCookies

A cookie manager allowing to flag and set rules explicitly for cookies, also third-party cookies.
domain.net and subdomain.domain.net have individual rights. Providing several modes to set rules onto cookies and keeping a cookie profile, while being logged in in a website or service.

## Screenshot
![Flag Cookies main user interface](https://www.picflash.org/img/2018/09/12/pmr8j816rm7p7tt.png "Flag Cookies main interface")

## Features

**FlagCookies distinguishes between http(s)://domain.net and http(s)://subdomain.domain.net** for the following features:

* Detects and displays stored browser cookies and be able to manage (flag) and delete those while browsing, either automatically through ***global*** or ***auto flag*** mode or by own decision
* **Flag cookies** either to be explicitly **deleted** even without *global* or *auto flag* mode or set them to be **permitted** and protected from removal by *global* or *auto flag* modes
* **Profile** mode for a domain or cookies - to switch between *logged into a website/service* and *not logged in* modes in order to remove or keep cookies on demand
* **Auto flag** mode only affecting this particular (sub)domain, removing every domain cookie which is not permitted or used as ***profile cookie***, this also includes third-party and cross origin cookies.
* Support for *Firefox Multi-Account-Containers*
* **Preferences** allowing to import and export settings to a ZIP file. *Note* - Import overwrites settings.
* **Preferences** allows to manage *logged in profile* cookiee, delete all domain settings and add-on settings and provides a **Action log** to display what FlagCookies is doing
* **Displays count** of deleted cookies in the browser toolbar icon and in addition a summary of the action log when hovering the toolbar icon
* *Keyboard Shortcut* **Alt + Shift + A** to enable/disable **profile mode** for a (sub)domain
* Optional **notifications**, disabled by default for: **profile mode** shortcut activation/deactivation, ***cookies removed display*** and ***notifications enabled/disabled message***

## Requirements

**Firefox 58.0a1+** or a recent version of **Chrome** or **Opera** browser(s).


## Installation

### Firefox
Please use the addons.mozilla.org: [Flag Cookies on Add-ons Mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/flag-cookies/)

### Opera
Please use addons.opera.com: [Flag Cookies on Add-ons Opera.com](https://addons.opera.com/en/extensions/details/flag-cookies/) or download the **.nex** from the releases page.

### Chrome
The extension is not listed in the Chrome addon store, because of costs. You might use the extension **.crx** from the releases page.

**Note:** The Opera and Chrome version might be slightly behind.

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
