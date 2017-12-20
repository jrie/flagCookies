# flagCookies
Firefox - flag cookies which track you for deletion. And delete those on page reload or while browsing a domain or while closing the tab/window.


## Screenshots

[![FlagCookies v1.1b - All cookies view](https://www.picflash.org/img/2017/12/20/TB0x4jc850idg1atd.png "FlagCookies v1.1b - All cookies view")] (https://www.picflash.org/viewer.php?img=0x4jc850idg1atd.png)

[![FlagCookies v1.1b - Flagged cookies view](https://www.picflash.org/img/2017/12/20/TBs260dt7yawrszow.png "FlagCookies v1.1b - Flagged cookies view")] (https://www.picflash.org/viewer.php?img=s260dt7yawrszow.png)


## Requirements and usage

Firefox in version 58.0a1 is minimum - which is also listed in the "manifest.json".

Open the "cookie icon" - see the "yellow flag"? Those are the cookies set by the page. The yellow "flag" icon indicates the cookies are unflagged, click on "flag" - it turns red, meaning they are flagged and are about to remove on the page load/reload/window close.

You can select cookies, which might track you and flag them using a toolbar icon view. A list of cookies, as present, is opened and you can select, "flag", cookies to be removed on page load or while browsing the domain, on every load/reload of the page or when closing the tab/window. To unflag a cookie, simply click again on "Flag" (it turns yellow again).

The cookies are shown in a list by the cookie name and the cookie value. In the "all cookies" tab (active by default) - and actively flagged cookies, as well as inactive cookies, are shown in "flagged cookies".
Inactive cookies are shown only by there name, at the end of the list. Flagged cookies, which are active, are shown with name and there current value, like in "all cookies" view.


## Installation

You can use the .xpi provided on the release page and install, or download/clone the repository, to add the Add-on dynamically by using "about:debugging" in Firefox, which allows you to install, using the "manifest.json" file, if you point to it.

The addon then is loaded. If you like to know what kind of cookies are deleted, there is output of the add-on, which can be displayed using "Debug" - if you enable debugging of extensions in "about:debbuging" in Firefox. And "allow add-on debugging" feature. Click on "Debug". And watch the console showing output.

## What is shown

You can see, next to the "flag" button, the cookie name on the first line, and secondly the cookie value. Which might be of interest to you so.
