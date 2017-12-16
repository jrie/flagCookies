# flagCookies
Firefox - flag cookies which track you, and delete those on page reload/update

You can select cookies, which might track you and flag them using a toolbar icon. A list of cookies, if present, is opened and you can select "flag" cookies to be remove on page load or while browsing. Those cookies, shown by cookie name and value below it, are deleted on every browsing on that page or while you close the tab/window.

## Usage

Open the "cookie icon" - see the "yellow flag"? Those are the cookies set by the page. The yellow "flag" icon indicates the cookies are unflagged, click on "flag" - it turns red, meaning they are flagged and are about to remove on the page load/reload/window close.

This is working in Firefox Version 58.0a1 at minimum - which is also listed in the "manifest.json".

## Installation

You can use the .xpi provided on the release page and install, or download/clone the repository, to add the Add-on dynamically by using "about:debugging" in Firefox, which allows you to install, using the "manifest.json" file, if you point to it.

The addon then is loaded. If you like to know what kind of cookies are deleted, there is output of the add-on, which can be displayed using "Debug" - if you enable debugging of extensions in "about:debbuging" in Firefox. And "allow add-on debugging" feature. Click on "Debug". And watch the console showing output.

## What is shown

You can see, next to the "flag" button, the cookie name on the first line, and secondly the cookie value. Which might be of interest to you so.
