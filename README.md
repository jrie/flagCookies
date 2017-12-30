# flagCookies
A cookie manager on steroids.

## Feature list

**Flag Cookies distinguishes between base and subdomains** for the following features:

- Automatically delete flagged cookies for a domain on tab load/reload/tab or window close
- Explicitly allow cookies through "permit" permission
- "Auto flag" one domain, affects only this (sub)domain, to delete all-non permitted cookies, even "unknown" on tab actions
- "Global" flag mode allows to delete every non-permitted cookie, while browsing for example, for all domains
- "Preferences" allows you to delete all saved settings
- "Preferences" shows a log of what actions have been done on tab actions

## Screenshots

#### Main interface

[![FlagCookies v1.54](https://www.picflash.org/img/2017/12/27/eknl0uj9lt6tfww.png "Flag Cookies v1.54")](https://www.picflash.org/viewer.php?img=eknl0uj9lt6tfww.png)

#### Log view in preferences

[![FlagCookies v1.54 - Preferences](https://www.picflash.org/img/2017/12/27/21ddkv2jjlaz2jr.png "Version 1.54 - Log view in preferences")](https://www.picflash.org/viewer.php?img=21ddkv2jjlaz2jr.png)

#### Settings dialog with clearing in 1.55

[![FlagCookies v1.55 - Preferences](https://www.picflash.org/img/2017/12/28/b731uwf22iks7dj.png "Settings view in version 1.55, with option to clear all stored settings and data")](https://www.picflash.org/viewer.php?img=b731uwf22iks7dj.png)

#### Gallery
A gallery showing the serveral versions and history of the project from beginning, can be found here: https://www.picflash.org/gallery.php?id=V29RSVUG0M

## Description

Flag Cookies allows to globally delete all or some domain cookies (with particular permissions), separated by subdomains and even unknown and on every domain/subdomain on page load/reload/tab and window close.

Cookies can be allowed (permitted) or in particular forced to be deleted by "flagging" them.

Auto-flagging can be used for a domain (subdomain based) to auto clear all non permitted cookies, even undiscovered ones.

Global flagging does remove all non particular permitted cookies for all domains, even new ones.

Cookies are shown with name and value, to get a grasp on what is in the box.

Get a grip on what cookies are allowed while you browse a website or the web in general


## Requirements

**Firefox in version 58.0a1 is minimum** or a recent version of **Chrome** or **Opera** browser(s).


## Installation

#### Firefox
Please use the addons.mozilla.org : [Flag Cookies on Add-ons Mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/flag-cookies/) or download the **.xpi** from the release page.

Please notice, the more downloads and users the add-on receives on Mozilla, they more the word can spread about this little project. But you also can, of course, download from source or the release pages.

### Chrome
The extension is not listed in the webstore, because this would cost money to do so, I am not at the moment willing to pay, just people can use the extension, therefore please download the **.crx** from the releases page.

### Opera
At the moment of writing, the add on is not listed on Opera add-ons site. This hopefully changes soon.
In the meantime, you can download the Flag Cookies from the releases page, as **.nex** file.

### Cloning/Testing on Firefox and Chrome

Or download/clone the repository.

To add the Add-on dynamically in Firefox: Type **about:debugging** in the Firefox address bar, which allows you to install, using the "manifest.json" file, if you point to it.

In Chrome navigate to **chrome://extensions/**, check **dev mode** and you can debug the add-on. For usage testing, the ***dev mode*** is not required.

## Thanks and notes

To phre4k for the initially idea!

To Cybergreek who pushed the major style change(s).

### German speaking thread @ ngb.to
[Flag Cookies on german bulletin board ngb.to](https://ngb.to/threads/32496-Firefox-Addon-FlagCookies)
