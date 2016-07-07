var propagateToNested = function() {
	
	
	var uri = Util.parseUri(document.location.href);
	if (uri.path == "/main-nested-slow.html") {
		uri.path = "/main-slow.html";
	} else {
		uri.path = "/main.html";		
	}

	var iframe = document.getElementById("nestingIframe");
	iframe.src = Util.formatUri(uri);
	
	
	
}

propagateToNested();