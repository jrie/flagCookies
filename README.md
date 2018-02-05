# flagCookies
A cookie manager on steroids.

## Feature list

**Flag Cookies distinguishes between base and subdomains** for the following features:

- Automatically delete flagged cookies for a domain on tab load/reload/tab or window close and while browsing
- Profile feature - to switch between "logged into a website" and "not logged into" to remove or keep cookies on demand
- Explicitly allow cookies through "permit" permission
- "Auto flag" one domain, affects only this (sub)domain, to delete all-non permitted cookies, even "unknown" on tab actions
- "Global" flag mode allows to delete every non-permitted cookie, while browsing for example, for all domains
- Support for Firefox Multi-Account-Containers add on
- "Preferences" allows to manage "logged in profile" cookies, even if this cookies are not present
- "Preferences" allows you to delete all saved settings or domain settings
- "Preferences" shows a log of what actions have been done on tab actions
- Display count of deleted cookies in the browser toolbar

## Screenshots

#### Main interface

[![FlagCookies v1.6 - Main interface](https://www.picflash.org/img/2017/12/30/jxumb3iqtzhu7hy.png "FlagCookies v1.6 with cookies 'keyed' for profile mode (red key icon)")](https://www.picflash.org/viewer.php?img=jxumb3iqtzhu7hy.png)

#### Preferences with profile cookie management

[![FlagCookies v1.6 - Preferences](https://www.picflash.org/img/2017/12/30/0o0aml1ik4lwfhd.png "Flag Cookies 1.6 preferences with profile cookie management")](https://www.picflash.org/viewer.php?img=0o0aml1ik4lwfhd.png)

[![FlagCookies v1.6 - Log with active 'profile'](https://www.picflash.org/img/2017/12/30/e3dlznmo3o8j5pk.png "Log view with active 'profile' after page reload")(https://www.picflash.org/viewer.php?img=e3dlznmo3o8j5pk.png)]


[![FlagCookies v1.6 - Log with non-active 'profile' switch](https://www.picflash.org/img/2017/12/30/fswg4jfckb9d5zq.png "Log view with inactive 'profile' after page reload")](https://www.picflash.org/viewer.php?img=fswg4jfckb9d5zq.png)


#### Gallery
A gallery showing the several versions and history of the project from beginning, can be found here: https://www.picflash.org/gallery.php?id=V29RSVUG0M

## Description

Flag Cookies allows to globally delete all or some domain cookies (with particular permissions), separated by subdomains and even unknown and on every domain/subdomain on page load/reload/tab and window close.

Cookies can be allowed (permitted) or in particular forced to be deleted by "flagging" them.

Auto-flagging can be used for a domain (subdomain based) to auto clear all non permitted cookies, even undiscovered ones.

Global flagging does remove all non particular permitted cookies for all domains, even new ones.

Cookies are shown with name and value, to get a grasp on what is in the box.

Get a grip on what cookies are allowed while you browse a website or the web in general.

### The profile feature
The profile feature can be used to switch between "logged into a account" and "not logged into an account" states by simply pressing the "profile" button in the main view. This works for a particular domain, subdomains have to be threaded separately.

In order to use this functionality, you have to log in the particular website. After login, you then can select - by using the "key symbol" on the right of the main cookie list - to select cookies, which are required to use the website.

After doing so, you can simply press "profile" in the main window and use "global" or "auto flag" features or go on flagging those cookies, without any further changes. Everything what you decided should be kept, wont be deleted anymore, except you turn off the "profile" switch for the domain, meaning, all regular rules, like flag, global, auto flag should apply.

Get a grip on what cookies are allowed while you browse a website or the web in general.

It works as an addition to the regular cookie manager and others. It is not a replacement for the regular cookie manager or something alike that.


## Requirements

**Firefox in version 58.0a1 is minimum** or a recent version of **Chrome** or **Opera** browser(s).
If everything works fine, you will see a log of entries, according to the screenshots above, in the "Preferences" view.


## Installation

#### Firefox
Please use the addons.mozilla.org : [Flag Cookies on Add-ons Mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/flag-cookies/) or download the **.xpi** from the release page.

### Opera
Please use addons.opera.com: [Flag Cookies on Add-ons Opera.com](https://addons.opera.com/en/extensions/details/flag-cookies/)

### Chrome
The extension is not listed in the Crhome store, because this would cost money to do so, I am not at the moment willing to pay, just people can use the extension, therefore please download the **.crx** from the releases page, this should work also.


## Thanks and notes

To phre4k for the initially idea!

To Cybergreek who pushed the major style change(s).

### German speaking thread @ ngb.to
[Flag Cookies on german bulletin board ngb.to](https://ngb.to/threads/32496-Firefox-Addon-FlagCookies)
