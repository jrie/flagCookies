# flagCookies
Firefox - flag cookies which track you for deletion. And delete those on page reload or while browsing a domain or while closing the tab/window.


## Screenshots

[![FlagCookies v1.4 - Permit cookies](https://www.picflash.org/img/2017/12/24/lmrnzabbyebb6x9.png "Permit, flag and legend display")](https://www.picflash.org/viewer.php?img=lmrnzabbyebb6x9.png)

[![FlagCookies v1.3 - Auto-flag cookies](https://www.picflash.org/img/2017/12/23/jb0d8snka8oingz.png "Auto flag cookies")](https://www.picflash.org/viewer.php?img=jb0d8snka8oingz.png)

[![FlagCookies v1.2 - Active cookies view](https://www.picflash.org/img/2017/12/23/1scmjt0dwr5zuyy.png "Active cookies view")](https://www.picflash.org/viewer.php?img=1scmjt0dwr5zuyy.png)

[![FlagCookies v1.2 - Flagged cookies view](https://www.picflash.org/img/2017/12/23/07bsya9xjp9aty5.png "Flagged cookies view")](https://www.picflash.org/viewer.php?img=07bsya9xjp9aty5.png)

[![FlagCookies v1.2 - Search feature](https://www.picflash.org/img/2017/12/23/1kpzjz6cd9jjvpt.png "Search filtering")](https://www.picflash.org/viewer.php?img=1kpzjz6cd9jjvpt.png)


## Requirements and usage

**Firefox in version 58.0a1 is minimum**

## Usage

Open the "cookie icon" - you see the active domain cookies which there name and there value.
Click on button on the left of the list, it will be "checked" for flagging. This means the cookie will be removed on page load/reload/tab and or window close.

click once more and the cookie becomes "permitted", this is a white list for cookies.

If you enable "Auto-flag" - all cookies, even unknown, are deleted for this domain, in case they are not set are not set to be "permitted".

No cookie values are stored by the add-on, only the cookies names are stored in the browser storage by domain name. Or if "auto-flag" is enabled for a domain or not.

## Installation

You can use the signed .xpi provided on the release page and install directly. Or download/clone the repository, to add the Add-on dynamically by using "about:debugging" in Firefox, which allows you to install, using the "manifest.json" file, if you point to it.

The addon then is loaded. If you like to know what kind of cookies are deleted, there is output of the add-on, which can be displayed using "Debug" - if you enable debugging of extensions in "about:debbuging" in Firefox. And "allow add-on debugging" feature. Click on "Debug". And watch the console showing output.

## Thanks and notes

To phre4k for the initially idea!

To Cybergreek who pushed the major style change(s).
