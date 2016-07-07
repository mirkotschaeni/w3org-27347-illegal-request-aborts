/**
 * Node js server for the test runner
 * 
 * use the following env variables to configure:
 * 
 * PORT: port of the http server
 * 
 */

// required modules
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require("url");
var path = require("path");
var fs = require("fs");

// read env vars
var PORT = process.env.HTTP_PORT || 8080;
var SERVER_ORIGINS = process.env.SERVER_ORIGINS || "";

console.log("starting http server on port " + PORT);
if (SERVER_ORIGINS) {
	console.log("serverOrigins: " + SERVER_ORIGINS);	
} else {
	console.log("no server origins provided via SERVER_ORIGINS evn variable, xorigin tests will not run");
}

// create http server 
var server = http.createServer(function(request, response) {
	var requestUrl = url.parse(request.url, true);
	
	
	var wait = 0;
	if (requestUrl.query.wait) {
		wait = parseInt(requestUrl.query.wait);
	}
	var download = false;
	if (requestUrl.query.download) {
		download=true;
	}
	
	var downloadMsg = download ? " as a download" : "";
	console.log("handling request " + requestUrl.pathname + " with a delay of: " + wait + downloadMsg);
	
	var getCorsOrigin = function() {
		var ownOrigin = "http://" + request.headers.host;
		
		var origins = SERVER_ORIGINS.split(",");
		for(var i=0; i<origins.length; i++) {
			if (origins[i].length > 0 && origins[i] != ownOrigin) {
				return origins[i];
			}
		}
		return null;
	}
	
	var createResponseHeaders = function(contentType) {
		responseHeaders = {};
		responseHeaders["pragma"] = "no-cache";
		responseHeaders["cache-control"] = "no-cache, no-store, must-revalidate, max-age=1";
		responseHeaders["Content-Type"] = contentType;
		var corsOrigin = getCorsOrigin();
		if (corsOrigin) {
			responseHeaders["Access-Control-Allow-Origin"] = corsOrigin;	
		}
		
		return responseHeaders;
	}
	
	var serve404 = function() {
		response.writeHead(404, createResponseHeaders("text/plain"));
		response.write("404 Not Found\n");
		response.end();		
	}
	
	var serveServerTime = function() {
		response.writeHead(200, createResponseHeaders("text/plain"));
		response.write(""+new Date().getTime());
		response.end();	
	}
	
	var serveClientConfig = function() {
		response.writeHead(200, createResponseHeaders("application/javascript"));
		response.write("var SERVER_ORIGINS = \"" + SERVER_ORIGINS + "\";");
		response.end();	
	}
	
	var serveRedirect = function() {
		response.writeHead(302, {"Location": "/bla"});
		response.end();	
	}

	var serveStaticFile = function() {
		var uri = requestUrl.pathname;
		
		
		var staticFile = path.join(__dirname + "/static", uri);
		fs.exists(staticFile, function(exists) {
			if(!exists) {
				serve404();
				return;
		    }

			if (fs.statSync(staticFile).isDirectory()) {
				staticFile += 'index.html';
			}
		 
			fs.readFile(staticFile, "binary", function(err, file) {
				if(err) {        
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");
					response.end();
					return;
				}
				
				var contentType = "text/plain";
				if (staticFile.lastIndexOf(".") > 0) {
					var suffix = staticFile.substring(staticFile.lastIndexOf(".")+1).toLowerCase();
					
					if (suffix == "html") {
						contentType = "text/html";
					} else if (suffix == "js") {
						contentType = "application/javascript";
					} else if (suffix == "png") {
						contentType = "image/png";
					} else if (suffix == "css") {
						contentType = "text/css";
					}
				}
				
				var responseHeaders = {};
				responseHeaders["Content-Type"] = contentType;
				if (download) {
					var fileName = staticFile.substring(staticFile.lastIndexOf("/")+1);
					responseHeaders["Content-Disposition"] = "attachment; filename=" + fileName;
				}
				response.writeHead(200, responseHeaders);
				response.write(file, "binary");
				response.end();
			});
		});
	}
	
	var serviceMethod = serveStaticFile;
	
	if (requestUrl.pathname == "/time") {
		serviceMethod = serveServerTime;
	}
	
	else if (requestUrl.pathname == "/clientConfig") {
		serviceMethod = serveClientConfig;
	}

	setTimeout(serviceMethod, wait);	
});
server.listen(PORT, function() { });


// create websocket the server (simple echo service)
wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message

        	var data = message.utf8Data;
        	console.log("message: " + data);
        	connection.sendUTF(data);
        }
    });

    connection.on('close', function(connection) {
        // close user connection
    	console.log("close");
    });
});