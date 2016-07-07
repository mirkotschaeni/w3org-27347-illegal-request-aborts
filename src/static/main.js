/**
 * How slow requests should be (within this period, the location assignment takes place) 
 */
var REQUEST_WAIT = 500;

/**
 * How long to wait until a request is considered timed out (in some situations, aborts can only be detected using timeouts)
 */
var REQUEST_TIMEOUT = REQUEST_WAIT + 1500;

/**
 * How slow the navigation request should be
 */
var NAVIGATION_WAIT = 2000;

/**
 * How long to wait until triggering the next test is started (in case downloads are enabled)
 */
var WAIT_BETWEEN_NAVIGATION_AND_NEXT = 1000;

/**
 * How long to wait until the navigation is triggered after the request is started
 */
var WAIT_BETWEEN_REQUEST_AND_NAVIGATION = 50;

/**
 * Test runner class
 */
var TestRunner = function() {
	this.uri = Util.parseUri(document.location.href);
	this.action = this.uri.query.action;
	this.phase = this.uri.query.phase || "loaded";
	this.type = this.uri.query.type || "ajax";
	this.origin = this.uri.query.origin || "same";
	
	this.domReady = false;
	this.documentLoaded = false;
	this.unloading = false;
	
	window.addEventListener("load", this.windowOnLoad.bind(this));
	window.addEventListener("unload", this.windowOnUnload.bind(this));
	window.addEventListener("DOMContentLoaded", this.onDomReady.bind(this));
	
	this.testId = this.type + "-" + this.phase + "-" + this.origin;
	
	
	this.log("running test in nested iframe: " + Util.read("useNested"));
	
	if (this.phase == "loading") {
		this.doRun();
	}
}

/**
 * handle DOM ready event
 */
TestRunner.prototype.onDomReady = function() {
	this.domReady = true;
	this.log("domReady");
	this.outputElement = document.getElementById("main");
	this.outputElement.innerHTML = this.testId + " (" + Util.read("urlsIndex") + "/" + (Util.read("urls").length)  + ")";
}

/**
 * Handle window load event
 */
TestRunner.prototype.windowOnLoad = function() {
	this.documentLoaded = true;
	this.log("loaded");
	if (this.phase == "loaded") {
		this.doRun();
	}
	else if(this.phase == "navigating") {
		this.doNavigate();
		window.setTimeout(this.doRun.bind(this), WAIT_BETWEEN_REQUEST_AND_NAVIGATION);
	}
}

/**
 * Handle window unload event
 */
TestRunner.prototype.windowOnUnload = function() {
	this.unloading = true;
	this.log("unloading");
}

/**
 * Log in the context of the current test
 */
TestRunner.prototype.log = function(message) {
	TestLogger.getInstance().log(this.testId, message);
}

/**
 * Run the test
 */
TestRunner.prototype.doRun = function() {
	var log = this.log.bind(this);
	
	log("starting test: "+ this.testId);
	TestLogger.getInstance().startTest(this.testId, "ajax request");

	var doNavigate = this.doNavigate.bind(this);	
	var requestCreatedCallback = function() {
		log("request created, will navigate in " + WAIT_BETWEEN_REQUEST_AND_NAVIGATION + " ms");
		window.setTimeout(doNavigate, WAIT_BETWEEN_REQUEST_AND_NAVIGATION);		
	}
	
	if (this.phase == "navigating") {
		requestCreatedCallback = function(){
			log("request created");
		};
	}
	
	this.createRequest(requestCreatedCallback);
}

/**
 * Start the navigation (this will trigger the aborts for browsers that are affected)
 */
TestRunner.prototype.doNavigate = function() {
	var log = this.log.bind(this);
	
	log("navigating");
	
	if (Util.read("useDownloads")) {
		// using a downloads (will respond with content-disposition: attachment
		log("using downloads");
		top.document.location.href = "snow.png?wait=" + NAVIGATION_WAIT + "&download=true";
		
		var doNavigateToNext = function() {
			top.document.location.href = "next.html";	
		}
		
		var testAjaxAfterNavigation = function() {
			var timeout = setTimeout(function() {
				log("ajax after download timed out (probably aborted)");
				doNavigateToNext();
			}, REQUEST_TIMEOUT);
			
			var req = new XMLHttpRequest();
			req.open("GET", "/time", true);
			req.addEventListener("load", function() {
				clearTimeout(timeout);		
				log("ajax after download successful");
				doNavigateToNext();
			});
			req.addEventListener("error", function() {
				clearTimeout(timeout);
				log("ajax after download error");
				doNavigateToNext();
			});
			req.addEventListener("abort", function() {
				clearTimeout(timeout);
				log("ajax after download aborted");
				doNavigateToNext();
			});
			req.send();
		}
		
		window.setTimeout(testAjaxAfterNavigation, NAVIGATION_WAIT + WAIT_BETWEEN_NAVIGATION_AND_NEXT);
	} else {
		// using a normal request (will respond with html content)
		top.document.location.href = "next.html?wait=" + NAVIGATION_WAIT;	
	}
}

/**
 * Handle request success (called for requests that are not aborted)
 */
TestRunner.prototype.handleRequestSuccess = function() {
	TestLogger.getInstance().reportTestSuccess(this.testId);
}

/**
 * Handle request abort (called for requests that are aborted)
 */
TestRunner.prototype.handleRequestAbort = function() {
	TestLogger.getInstance().reportTestFailure(this.testId);
}

/**
 * Base url for requests
 */
TestRunner.prototype.getBaseUrlForRequests = function() {
	return Util.getServerOrigin(this.origin == "xorigin");
}

/**
 * Creates a request (dispatches to specific methods based on request type)
 */
TestRunner.prototype.createRequest = function(requestCreatedCallback) {
	if (this.type == "ajax") {
		this.createRequestAjax(requestCreatedCallback);
	} 
	else if (this.type == "image") {
		this.createRequestImage(requestCreatedCallback);
	}
	else if (this.type == "websocket") {
		this.createRequestWebsocket(requestCreatedCallback);
	}
	else if (this.type == "iframe") {
		this.createRequestIframe(requestCreatedCallback);
	} 
	else {
		throw "unsupported request type: " + this.type;
	}
}

TestRunner.prototype.createRequestIframe = function(requestCreatedCallback) {
	var log = this.log.bind(this);
	var onSuccess = this.handleRequestSuccess.bind(this);
	var onAbort = this.handleRequestAbort.bind(this);
	
	var iframe = document.createElement("iframe");
	var uri = this.getBaseUrlForRequests() + "/snow.png?wait=" + REQUEST_WAIT;
	
	
	document.body.appendChild(iframe);
	
	var timeout = setTimeout(function() {
		log("iframe request timed out (probably aborted)");
		onAbort();
	}, REQUEST_TIMEOUT);
	
	
	iframe.addEventListener("load", function() {
		clearTimeout(timeout);
		log("iframe got load event");
		onSuccess();
	});
	
	iframe.src = uri;
	log("iframe request created with uri " + uri);
	
	requestCreatedCallback();
	
}

/**
 * Creates request for type image
 */
TestRunner.prototype.createRequestImage = function(requestCreatedCallback) {
	var log = this.log.bind(this);
	var onSuccess = this.handleRequestSuccess.bind(this);
	var onAbort = this.handleRequestAbort.bind(this);
	
	var done = false;
	
	var uri = this.getBaseUrlForRequests() + "/snow.png?wait=" + REQUEST_WAIT;
	log("image request created with uri " + uri);
	
	var image = new Image();
	image.src = uri;
	
	// detect abort using a timeout (no other option for images...
	var timeout = setTimeout(function() {
		log("image request timed out (probably aborted)");
		onAbort();
	}, REQUEST_TIMEOUT);
	
	image.onload = function() {
		clearTimeout(timeout);
		log("image request successful");
		onSuccess();
	};
	
	image.onerror = function() {
		clearTimeout(timeout);
		log("image request error");
		onAbort();
	};
	
	requestCreatedCallback();
}

/**
 * Creates an request for type ajax
 */
TestRunner.prototype.createRequestAjax = function(requestCreatedCallback) {
	var log = this.log.bind(this);
	var onSuccess = this.handleRequestSuccess.bind(this);
	var onAbort = this.handleRequestAbort.bind(this);
	
	var uri = this.getBaseUrlForRequests() + "/time?wait=" + REQUEST_WAIT;
	log("ajax request created with uri " + uri);
	
	var timeout = setTimeout(function() {
		log("ajax request timed out (probably aborted... safari?)");
		onAbort();
	}, REQUEST_TIMEOUT);
	
	var req = new XMLHttpRequest();
	req.open("GET", uri, true);
	req.addEventListener("load", function() {
		clearTimeout(timeout);		
		log("ajax request successful");
		log("response text: " + req.responseText);
		onSuccess();
	});
	req.addEventListener("error", function() {
		clearTimeout(timeout);
		log("ajax request error (mozilla?)");
		onAbort();
	});
	req.addEventListener("abort", function() {
		clearTimeout(timeout);
		log("ajax request aborted");
		onAbort();
	});
	req.send();
	
	requestCreatedCallback();
}

/**
 * Creates a request of type websocket
 */
TestRunner.prototype.createRequestWebsocket = function(requestCreatedCallback) {
	var log = this.log.bind(this);
	var onSuccess = this.handleRequestSuccess.bind(this);
	var onAbort = this.handleRequestAbort.bind(this);
	
	
	if (window.WebSocket) {
		var websocketGetStateName = function(ws) {
			switch (ws.readyState) {
				case 0:
					return "CONNECTING";
				case 1:
					return "OPEN";
				case 2:
					return "CLOSING";
				case 3:
					return "CLOSED";
				default:
					return "unknown state " + ws.readyState;
			}
		}
		
		var origin = this.getBaseUrlForRequests();
		var uri = origin.replace("http", "ws");
		log("websocket created with uri: " + uri);
		var ws = new WebSocket(uri);
		window.ws = ws;
		ws.onopen = function(event) {
			log("websocket open");
			requestCreatedCallback();
			
			window.setTimeout(function() {
				log("testing websocket... state: " + websocketGetStateName(ws) + " expected OPEN");
				if (ws.readyState == WebSocket.OPEN) {
					ws.send("success");
				} else {
					log("websocket is not open (probably aborted)")
					onAbort();
				}
			}, REQUEST_WAIT);			
		};
		ws.onmessage = function(event) {
			log("websocket got message: " + event.data);
			if (event.data == "success") {
				log("websocket test successful");
				onSuccess();
			}
		};
		ws.onerror = function(event) {
			log("websocket error");
		};
		ws.onclose = function(event) {
			log("websocket closed... code: " + event.code + " reason: " + event.reason);
			if (event.code != 1001) {
				log("unexpected close code: " + event.code + " would expect 1001 (going away)");
			}
		}
		
	} else {
		log("browser does not support websockets, test skipped");
		requestCreatedCallback();
		onSuccess();
	}
}

/**
 * Navigate to the result page
 */
TestRunner.prototype.navigateToResult = function() {
	top.document.location.href = "result.html";
}

/**
 * Initialize
 */
TestRunner.init = function() {
	TestRunner.instance = new TestRunner();
}
TestRunner.init();



