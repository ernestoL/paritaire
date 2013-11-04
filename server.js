// node.js modules
var http = require("http");
var net = require("net");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");

// custom modules
var shell = require('./server/prt_shell');
var socket = require('./server/prt_socket');
var game = require('./server/prt_game_obj');

// global variables
var sessions = []; // stores all game sessions
var sid = 1; // next available session ID
var cache = {}; // stores static documents
var playPage = String(fs.readFileSync("play.html")); // html skeleton
var mimeTypes = {"html": "text/html",
	"js": "text/javascript",
	"png": "image/png",
	"css": "text/css"};

// web server callback
function onRequest(request,response) {

	log(request.url);

	var requrl = url.parse(request.url,true);
	var path = requrl.pathname;
	
	if(path === '/') path = 'index.html';
	else path = path.substr(1,path.length);

	switch(path) {

	case 'create':
		
		var params = "";
		request.on("data", function(data) {
			params += data; // TODO: 1e6 anti flooding
			});
		request.on("end", function() {
			var id = sid++; // auto increment
			sessions[id] = new game.Session(id,querystring.parse(params)); // create new session from post data
			if(sessions[id]) {
				
				log("created new session (" + id + "): " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				response.write("" + id);
				response.end();
			}
			else { // invalid post data
				
				// the session ID remains unused
				log("invalid session request (" + id + "): " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				//response.write(); no content
				response.end();
			}
			response.end();
			});
		break;
		
	case 'play':
		
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write(buildGame(requrl.query["id"]));
		response.end();
		break;
		
	default:
		
		var doc = cache[path];
		var bFound = true;
	
		if(doc == undefined) { // document not in cache
			
			if(path.substr(0,6) == "server") bFound = false;
			else if(fs.existsSync(path)) {
				doc = fs.readFileSync(path);
				cache[path] = doc;
			}
			else bFound = false;
		}

		if(bFound) {
			// mime type
			var frags = path.split(".");
			var ext = frags[frags.length-1];
			var mime = mimeTypes[ext];
			if(mime == undefined) mime = "text/" + ext;
			
			response.writeHead(200, {"Content-Type": mime});
			response.write(doc);
		}
		else {
			log("returned 404");
			response.writeHead(404);
			response.write("Error 404: Page not found!");
		}
		
		response.end();
	}
}

function buildGame(id) {

	if(id == undefined || isNaN(id)) return "Incorrect URL syntax!";

	var s = sessions[id];
	
	if(s == undefined) return "Invalid session ID!";
	if(s.players[1].connected && (!s.online || s.players[2].connected)) return "Session is full!";
	
	var html = playPage;
	
	var lineSession = "session = new ";

	if(!s.online) {
	
		html = html.replace("##1","session-local");
		lineSession += "Local";
		
	}
	else {
		
		html = html.replace("##1","session-online");
		lineSession += "Online";
		
	}
	
	lineSession += "Session(document.getElementById('field'),io.connect('http://elsaesser.servegame.com/')," + id + 
		",'" + s.col1 + "','" + s.col2 + "');";

	html = html.replace("##2",lineSession);
	
	return html;
}

function log(msg) {
	
	var d = new Date();
	console.log((1900+d.getYear()) + "/" + d.getMonth() + "/" + d.getDay() + "-" + d.getHours() + ":" + d.getMinutes()  + " http: " + msg);
	
}

var server = http.createServer(onRequest);

server.listen(80);

socket.attachSocket(server,sessions);

shell.createShell(5001,{sessions: sessions, clients: socket.clients, cache: cache});
