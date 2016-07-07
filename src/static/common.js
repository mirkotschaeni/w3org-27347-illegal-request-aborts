/**
 * Utilities
 */
var Util = {};
Util.startTime = new Date().getTime();

/**
 * Navigates to the next test case or the result page
 */
Util.navigateToNext = function() {
	var urls = Util.read("urls");
	
	var index = Util.read("urlsIndex") || 0;
	
	if (urls[index]) {
		var url = urls[index];
		Util.store("urlsIndex", (index+1));
		top.document.location.href = url;
	} else {
		top.document.location.href = "result.html";
	}
}

/**
 * Returns a serverOrigin based on the current document origin and whether the origin should be x-origin 
 * 
 */
Util.getServerOrigin = function(xorigin) {
	var ownOrigin = Util.parseUri(document.location.href).origin;
	
	if (xorigin) {
		var origins = SERVER_ORIGINS.split(",");
		for(var i=0; i<origins.length; i++) {
			if (origins[i].length > 0 && origins[i] != ownOrigin) {
				return origins[i];
			}
		}
		return null;
	} else {
		return ownOrigin;
	}
}

/**
 * returns true of x-origin is supported, false otherwise
 */
Util.isXoriginSupported = function() {
	return Util.getServerOrigin(true) != null;
}

/**
 * Stores data in session storage
 */
Util.store = function(key, value) {
	sessionStorage[key] = JSON.stringify(value);
}

/**
 * Reads data from session storage
 */
Util.read = function(key) {
	var value = sessionStorage[key];
	if (value && value.length > 0) {
		return JSON.parse(value);
	}
	return null;
}

/**
 * Fill a string with blanks until it has the length specified
 */
Util.fillToLength = function(input, length) {
	while(input.length < length) {
		input = input + " ";
	}
	return input;
}

/**
 * Create a URI object 
 * @param origin
 * @param path
 * @param query
 */
Util.createUri = function(origin, path, query) {
	var uri = {};
	uri.origin = origin || "";
	uri.path = path || "";
	uri.query = query || {};
	
	return uri;
}

/**
 * Parses a string to an URI object
 */
Util.parseUri = function(uri) {
	var parsed = Util.createUri();
	
	if (uri.indexOf("http") == 0) {
		var indexHost = 7;
		if (uri.indexOf("https") == 0) {
			indexHost = 8;
		}
		var indexPath = uri.indexOf("/", indexHost);
		if (indexPath < 0) {
			parsed.origin = uri;
			uri = "";
		} else {
			parsed.origin = uri.substring(0, indexPath);
			uri = uri.substring(parsed.origin.length)
		}
	}
	
	var parts = uri.split("?");
	parsed.path = parts[0];
	
	if (parts.length > 1) {
		var queryString = parts[1];
		var pairs = queryString.split("&");
		for (var i=0; i<pairs.length; i++) {
			var keyValue = pairs[i].split("=");
			var key = keyValue[0];
			var value = keyValue[1];
			parsed.query[key] = value;
		}
	}
	
	return parsed;
}

/**
 * Formats an URI object to a string
 */
Util.formatUri = function(uri) {
	var formated = "";
	if (uri.origin) {
		formated += uri.origin;
	}
	if (uri.path) {
		formated += uri.path;
	}
	
	if (uri.query) {
		var queryString = "";
		for (var key in uri.query) {
			var value = uri.query[key];
			if (queryString.length > 0) {
				queryString += "&";
			}
			queryString += key + "=" + value;
		}
		if (queryString.length > 0) {
			formated += "?" + queryString;	
		}
	}
	
	return formated;
}




/** 
 * Helper class to store test results
 */
var TestLogger = function(persistentId) {
	this.persistentId = persistentId;

	// restore data from sessionStorage
	this.data = Util.read(this.persistentId);
	if (!this.data) {
		this.data = {};
		this.data.logEntries = [];
		this.data.testRuns = [];
	}
}

/**
 * Singleton accessor for the default instance
 */
TestLogger.getInstance = function() {
	if (!TestLogger.instance) {
		TestLogger.instance = new TestLogger("defaultTestLogger");
	}
	return TestLogger.instance;
}

/**
 * finds a test run by id
 */
TestLogger.prototype.getTest = function(id) {
	for(var i=0; i<this.data.testRuns.length; i++) {
		var testRun = this.data.testRuns[i];
		if (testRun.id == id) {
			return testRun;
		}
	}
	return null;
}

/**
 * Starts a test run
 */
TestLogger.prototype.startTest = function(id) {
	var testRun = this.getTest(id);
	if (!testRun) {
		testRun = {};
		testRun.id = id;
		this.data.testRuns.push(testRun);
	}
	
	testRun.start = new Date().getTime();
	testRun.result = null;
	testRun.failureReason = "";
	
	this.__persist();
}

/**
 * Reports a test run finished with success
 */
TestLogger.prototype.reportTestSuccess = function(id) {
	var testRun = this.getTest(id);
	if (!testRun) {
		throw "no such test: " + id;
	}
	if (testRun.result !== null) {
		throw "run not open: " + id
	}
	
	testRun.result = true;
	
	this.__persist();
}

/**
 * Reports a test run finished with a failure
 */
TestLogger.prototype.reportTestFailure = function(id, reason) {
	var testRun = this.getTest(id);
	if (!testRun) {
		throw "no such test: " + id;
	}
	if (testRun.result !== null) {
		throw "run not open: " + id
	}
	
	testRun.result = false;
	testRun.failureReason = reason;
	
	this.__persist();
}

/**
 * Logs a message in the context of a test run
 */
TestLogger.prototype.log = function(testRunId, message) {
	var logEntry = {};
	logEntry.message = ""+message;
	logEntry.time = new Date().getTime() - Util.startTime;
	logEntry.pageUrl = document.location.href;
	logEntry.testRunId = testRunId || "global";
	
	this.data.logEntries.push(logEntry);

	this.__persist();
	this.__doLog(logEntry);
}

/**
 * Persists test run data so that is is available in subsequent pages
 */
TestLogger.prototype.__persist = function() {
	Util.store(this.persistentId, this.data);
}

/**
 * logs to the console 
 */
TestLogger.prototype.__doLog = function(logEntry) {
	console.log(this.logEntryToString(logEntry));
}

/**
 * Formats a log entry
 */
TestLogger.prototype.logEntryToString = function(logEntry) {
	return Util.fillToLength(logEntry.testRunId, 27) + " " + Util.fillToLength(""+logEntry.time, 20) + " " + logEntry.message;
}

/**
 * Dumpls all log entries to the console
 */
TestLogger.prototype.dumpLog = function() {
	for(var i=0; i<this.data.logEntries.length; i++) {
		this.__doLog(this.data.logEntries[i]);
	}
}

/**
 * Renders all test runs and logs in HTML
 */
TestLogger.prototype.render = function() {
	var table = document.createElement("table");
	var tr = document.createElement("tr");
	table.appendChild(tr);
	var th = document.createElement("th");
	tr.appendChild(th);
	th.innerHTML = "test results (click to filter log)";
	var th = document.createElement("th");
	tr.appendChild(th);
	th.innerHTML = "log";
	
	var tr = document.createElement("tr");
	
	table.appendChild(tr);
	var td = document.createElement("td");
	td.style.verticalAlign = "top";
	tr.appendChild(td);	
	var results = document.createElement("div");
	td.appendChild(results);
	
	
	results.style.width = "300px";
	results.style.paddingRight = "20px";
	results.style.position = "relative";
	
	
	var logs = document.createElement("td");
	tr.appendChild(logs);
	logs.style.verticalAlign = "top";
	logs.style.width = "500px";
	logs.style.height = "350px";
	logs.style.whiteSpace = "pre";
	logs.style.fontFamily = "monospace";
	logs.style.fontSize = "12px";
	logs.style.backgroundColor = "#EEEEEE";
	logs.style.padding = "6px";
	
	var activateTestRun = function(testRun) {
		if (logs.testRun == testRun) {
			logs.testRun = null;
		} else {
			logs.testRun = testRun;
		}
		
		logs.innerHTML = "";
		var text = Util.fillToLength("TEST_ID", 27) + " " + Util.fillToLength("TIME(ms since start)", 20) + " MESSAGE\n\n";
		
		for(var i=0; i<this.data.logEntries.length; i++) {
			if (!logs.testRun || testRun.id == this.data.logEntries[i].testRunId) {
				text += this.logEntryToString(this.data.logEntries[i]) + "\n";	
			}
		}
		
		logs.appendChild(document.createTextNode(text));
		
		// apply css classes
		for(var i=0; i<results.childNodes.length; i++) {
			var result = results.childNodes[i];
			if (result.testRun == logs.testRun) {
				result.setAttribute("class", "testResultActive");		
			} else {
				result.setAttribute("class", "testResult");
			}
		}
	}

	
	for(var i=0; i<this.data.testRuns.length; i++) {
		var testRun = this.data.testRuns[i];
		
		var testResult = document.createElement("div");
		testResult.testRun = testRun;
		testResult.setAttribute("class", "testResult");
		results.appendChild(testResult);
		
		var label = document.createElement("div");
		label.innerHTML = testRun.id;
		testResult.appendChild(label);
		
		if (testRun.result) {
			label.setAttribute("class", "ok");	
		} else {
			label.setAttribute("class", "nok");
		}
		
		testResult.addEventListener("click", activateTestRun.bind(this, testRun), false);
	}
	
	activateTestRun.bind(this, null)();
	
	return table;
}
