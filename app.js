
global.AppVersion = "1.0.1";
global.AppName = "API-GW";



var express = require("express");
var socket_io = require('socket.io');

var app = express();
var router = express.Router();
var bodyParser = require("body-parser");
var basicAuth = require('basic-auth');
//var bcrypt = require('bcrypt');
var http = require('http');
var appRouter = require("./routes/routes.js");
var WebSocketServer = require('ws').Server;

// authorization
//const passport = require('passport')
//const session = require('express-session')

var ServerPort = 4000;
var enableAuth = 0;

var getappInfo = function(  ) {
	var appinfo = require("./package.json");
	if( appinfo != 'undefined')
	{
		global.AppVersion = appinfo.version;
		global.AppName = appinfo.name;
		//console.log('[app.js] name '+global.AppName + ' ver: ' + global.AppVersion);
	}	
}

// app information
getappInfo();

// OPTIONS
app.use(function(req, res, next) {
    if ('OPTIONS' == req.method) {
		//console.log('....!OPTIONS: ' + req.get('access-control-request-headers'));
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'ACCEPT, Content-Type, Authorization, Content-Length');
		res.sendStatus(200);
	} else {
		next();
	}
});


// Authorized
app.use(function(req, res, next ) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.sendStatus(401);
	};


	var user = basicAuth(req);

	if( enableAuth == 0 )
		next();
	else if (!user || !user.name ) {
		return unauthorized(res);
	} else if ( user.name === 'test' && user.pass === '1111') { 
	        // && bcrypt.compareSync(user.pass, apiResource.server_config.login.password)) {
		   	//user.pass === apiResource.server_config.login.password) {
		next();
	} else {
		return unauthorized(res);
	}
});


// bodyParser
//app.use(bodyParser.json());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.raw());
app.use(bodyParser.text());
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


// router service path
app.use('/restapi', router);

//app.use(express.static(__dirname + '/views'));

// static files ( index.html, login.html, images, css...) and front&back end packages
app.use(express.static(__dirname + '/public')); 

// jquery
//app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));

// bootstrap
//app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));


// Create HTTP Server
console.log('Start http port:'+ServerPort);
var server = http.createServer(app).listen(ServerPort);

// websocket server
var wss = new WebSocketServer({ server: server });

// socket.io server
var io = socket_io.listen(server);

// add to router service
appRouter(router,io,wss);






