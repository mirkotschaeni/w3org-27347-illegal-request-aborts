# w3org-27347-illegal-request-aborts
DESCRIPTION
-----------

Some browsers abort pending requests (ajax, images, websockets...) when a new location is assigned (user clicks 
a link, form is submitted, document.location.href is assigned a new value...). This application implements a 
test suite that can be used to test a browser whether it is affected or not.

Please also have a look at the reported issues:

https://bugzilla.mozilla.org/show_bug.cgi?id=1084399
https://bugs.webkit.org/show_bug.cgi?id=137817

Please also feel free to contact the author via mirko.tschaeni@unblu.com


INSTALLATION
------------

Prerequisites:
* Node.js (node and npm command)

Unpack to a folder. 
Run npm inside the folder.
Run node server.js

The server starts with default port 8080. 

Open http://localhost:8080 in your browser.
Read http://localhost:8080/info.html for more details.


The port can be changed by defining the environment variable HTTP_PORT.

If you want to test using multiple origins (for x-origin requests), you need to define two valid origins where 
the server is reachable in the SERVER_ORIGINS environment variable, separated by a coma.

i.e.
SERVER_ORIGINS="http://localhost:8080,http://127.0.0.1:8080


