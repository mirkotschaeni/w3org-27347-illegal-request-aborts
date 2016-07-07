/**
 * Prepares and starts the test run
 */
var prepareAndStartTests = function() {
	// clear session storage...
	for(k in sessionStorage) {
		sessionStorage.removeItem(k);
	}
	
	// define list of test setups
	var urls = [];
	
	var testSelector = document.getElementById("testSelector");
	for(var i=0; i<testSelector.childNodes.length; i++) {
		var child = testSelector.childNodes[i];
		if (child.nodeName == "INPUT" && child._type && child.checked) {
			urls.push(createTestUri(child._type, child._phase, child._origin));
		}
	}
	
	// store information about the test run (in sessionStorage)
	Util.store("useDownloads", window.checkboxDownload.checked);
	Util.store("useNested", window.checkboxNested.checked);
	Util.store("urls", urls);
	Util.store("urlsIndex", 0);
	Util.store("autoRun", true);
	Util.store("secondOrigin", "http://localhost:1337");

	// start
	Util.navigateToNext();
}

/** 
 * Initializes the test selector ui
 */
var init = function() {
	var testSelector = document.getElementById("testSelector");
	
	var types = ["ajax", "image", "websocket", "iframe"];
	var phases = ["loading", "loaded", "navigating"];
	var origins = ["same", "xorigin"];
	
	
	var defaultSelection = ["ajax-loaded-same", "websocket-loaded-same", "ajax-navigating-same", "websocket-navigating-same", "iframe-loaded-same"];
	
	var isInDefaultSelection = function(type, phase, origin) {
		var id = type + "-" + phase + "-" + origin;
		for(var i=0; i<defaultSelection.length;i++) {
			if (id == defaultSelection[i]) {
				return true;
			}
		}
		return false;
	}
	
	var selectAll = function() {
		var testSelector = document.getElementById("testSelector");
		for(var i=0; i<testSelector.childNodes.length; i++) {
			var child = testSelector.childNodes[i];
			if (child.nodeName == "INPUT" && child._type) {
				child.checked = true;
			}
		}
	}
	
	var selectNone = function() {
		var testSelector = document.getElementById("testSelector");
		for(var i=0; i<testSelector.childNodes.length; i++) {
			var child = testSelector.childNodes[i];
			if (child.nodeName == "INPUT" && child._type) {
				child.checked = false;
			}
		}
	}
	
	var selectDefault = function() {
		var testSelector = document.getElementById("testSelector");
		for(var i=0; i<testSelector.childNodes.length; i++) {
			var child = testSelector.childNodes[i];
			
			if (child.nodeName == "INPUT" && child._type) {
				child.checked = isInDefaultSelection(child._type, child._phase, child._origin);
			}
		}
	}
	
	var buttonAll = document.createElement("button");
	buttonAll.addEventListener("click", selectAll);
	buttonAll.innerHTML = "all";
	testSelector.appendChild(buttonAll);
	
	var buttonNone = document.createElement("button");
	buttonNone.addEventListener("click", selectNone);
	buttonNone.innerHTML = "none";
	testSelector.appendChild(buttonNone);
	
	var buttonDefault = document.createElement("button");
	buttonDefault.addEventListener("click", selectDefault);
	buttonDefault.innerHTML = "default";
	testSelector.appendChild(buttonDefault);
	
	window.checkboxDownload = document.createElement("input");
	window.checkboxDownload.type = "checkbox";
	testSelector.appendChild(window.checkboxDownload);
	
	testSelector.appendChild(document.createTextNode("use downloads"));
	
	window.checkboxNested = document.createElement("input");
	window.checkboxNested.type = "checkbox";
	testSelector.appendChild(window.checkboxNested);
	
	testSelector.appendChild(document.createTextNode("use nested iframe"));
	testSelector.appendChild(document.createElement("br"));
	
	testSelector.appendChild(document.createElement("br"));
	testSelector.appendChild(document.createElement("br"));
	
	var corsSupported = true;
	if (navigator.userAgent.indexOf("Trident/") > 0) {
		var tridentVersionIndex = navigator.userAgent.indexOf("Trident/") + 8;
		var tridentVersion = parseInt(navigator.userAgent.substring(tridentVersionIndex, tridentVersionIndex+1));
		if (tridentVersion < 7) {
			corsSupported = false;
		}
	}
	
	
	for (typeIndex in types) {
		var type = types[typeIndex];		
		for (phaseIndex in phases) {
			var phase = phases[phaseIndex];
			for (originIndex in origins) {
				var origin = origins[originIndex];
				
				if (origin == "xorigin" && !Util.isXoriginSupported()) {
					continue;
				}
				
				if (type == "websocket" && !window.WebSocket) {
					continue;
				}
				 
				if (type == "ajax" && origin == "xorigin" && !corsSupported) {
					continue;
				}
				
				var checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				testSelector.appendChild(checkbox);
				
				checkbox._type = type;
				checkbox._origin = origin;
				checkbox._phase = phase;
				
				var label = document.createElement("span")
				
				
				testSelector.appendChild(document.createTextNode(type+ "-" + phase + "-" + origin));
				testSelector.appendChild(document.createElement("br"));

				console.log();
			}
 		}
	}
	
	selectDefault();
	
	if (!Util.isXoriginSupported()) {
		var warning = document.createElement("div");
		warning.style.paddingTop = "10px";
		warning.style.fontSize = "12px";
		warning.style.color = "orange";
		warning.innerHTML = "WARNING: xorigin tests disabled, provide SERVER_ORIGINS env variable to enable";
		testSelector.appendChild(warning);
	}
	
	console.log("init");
}

/**
 * Creates a test run URI
 */
var createTestUri = function(type, phase, origin) {
	var page = "main";
	
	if (window.checkboxNested.checked) {
		page += "-nested";
	}
	
	if (phase == "loading") {
		page += "-slow";
	}
	
	page += ".html";
	
	console.log("page: " + page);
	
	return page + "?phase=" + phase + "&origin=" + origin + "&type=" + type;
}

window.addEventListener("load", init);

