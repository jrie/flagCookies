# flagCookies
Firefox - flag cookies which track you for deletion. And delete those on page reload or while browsing a domain or while closing the tab/window.


## Screenshots

[![FlagCookies v1.2 - Active cookies view](https://www.picflash.org/img/2017/12/23/TB1scmjt0dwr5zuyy.png "Active cookies view")] (https://www.picflash.org/viewer.php?img=1scmjt0dwr5zuyy.png)

[![FlagCookies v1.2 - Flagged cookies view](https://www.picflash.org/img/2017/12/23/TB07bsya9xjp9aty5.png "Flagged cookies view")] (https://www.picflash.org/viewer.php?img=07bsya9xjp9aty5.png)


[![FlagCookies v1.2 - Search feature](https://www.picflash.org/img/2017/12/23/TB1kpzjz6cd9jjvpt.png "Search filtering")] (https://www.picflash.org/viewer.php?img=1kpzjz6cd9jjvpt.png)


## Requirements and usage

Firefox in version 58.0a1 is minimum - which is also listed in the "manifest.json".

Open the "cookie icon" - you see the active domain cookies which there name and there value.
Click on button on the left, it will be "checked" for flagging then - meaning the cookie will be removed on page load/reload/tab and or window close.

In "flagged cookies" all flagged cookies for the domain are shown. There you can "uncheck" even cookies, which are set to be flagged for the domain, but not currently active set by the domain - those are shown only with there name, no values are stored or shown then. Cookies in this list, which have a value, are currently active. Flagged but not present cookies are set at the end of the list.

The cookie values are not stored by the add-on, only the cookies names are stored in the browser storage by domain name.


## Installation

You can use the .xpi provided on the release page and install, or download/clone the repository, to add the Add-on dynamically by using "about:debugging" in Firefox, which allows you to install, using the "manifest.json" file, if you point to it.

The addon then is loaded. If you like to know what kind of cookies are deleted, there is output of the add-on, which can be displayed using "Debug" - if you enable debugging of extensions in "about:debbuging" in Firefox. And "allow add-on debugging" feature. Click on "Debug". And watch the console showing output.

## Thanks

Thanks to Cybergreek who pushed the major style changes!
