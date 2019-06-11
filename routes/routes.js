var STATUS = require('../inc/statusCode.js').STATUS_CODE;
var webSocketCtl = require('./websocket.js');
var advlog = require('../apps/log_mgt/AdvJSLog.js');


// Global Variables
var ReturnHead = {'Connection':'close',
				  'Content-Type':'application/json'};

var ReturnHead2 = {'Connection':'close',
'Content-Type':'application/json',
'Access-Control-Allow-Origin':'*'};			

function setCORSHeaders (res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'accept, content-type');
}

var procAsynRequest = function( res, status, result ) {

	if( res == undefined ) return;

	setCORSHeaders(res);
	
	if( status >= STATUS.BAD_REQUEST ) { // Error
		res.writeHead(status,ReturnHead);
		res.end();
	} else {
		res.writeHead(status,ReturnHead);
		res.end(result);
	}
}

var procReply = function(req, res, next, app ) {
	
	var outret = {};
	var code = STATUS.METHOD_NOT_ALLOWED;
	var uri = '';
	advLogWrite(LOG_DEBUG, 'method: '+ req.method);
	advLogWrite(LOG_DEBUG, 'path: '+ req.path);
	
	var n = app.group.length + 2;
	uri = req.path.substring(n);  

	switch( req.method )
	{
		case 'GET':
			if( app.get != undefined )
				code = app.get(uri,null, outret);
			break;
		case 'PUT':
			if( app.put != undefined ) 
				return app.put(uri, req.body, res, procAsynRequest);
			break;
		case 'POST':
			if( app.post != undefined )
				code = app.post(uri,req.body);
		case 'DELETE':
			if( app.delete != undefined )
				code = app.delete();
		default:
			code = STATUS.METHOD_NOT_ALLOWED;
	}	

	setCORSHeaders(res);
	
	if( code >= STATUS.BAD_REQUEST ) { // Error
		res.writeHead(code,ReturnHead);
		res.end();
	} else {
		res.writeHead(code,ReturnHead);
		res.end(outret.ret);
	}

}

//var gGroups = [ "log_mgt","wsn_manage","service" ];
var gGroups = [ "log_mgt", "wsn_manage","service", "sample" ];

var loadAppService = function( router , ioSocket, wss ) {

	var services = {"service":{ "e":[]}};

	var sList = [];
	var hLd = null;	

	//advLogWrite(LOG_INFO, 'file name: '+ __filename + '[routes.js] name '+global.AppName + ' ver: ' + global.AppVersion);

	for( var j =0; j < gGroups.length; j ++ )
	{			
		var app = {"n":null}; 

		try{
			hLd = require('../apps/'+gGroups[j]+'/index.js');
			if( hLd == undefined || hLd == null ) {
				advLogWrite(LOG_ERROR,'handle is null '+ gGroups[j]);
				continue;
			}	
			}catch(e)
			{
				advLogWrite(LOG_ERROR,'Load Module is failed '+ gGroups[j]);
				continue;
			}
	
			hLd.APIs.usrObj = procReply;


		// Add Router's' Process function point to Module Event Listen
		if( hLd.APIs.addListener != undefined )
			hLd.APIs.addListener(webSocketCtl.procEvents);
		
		// Add appInf to websocket hash map
		webSocketCtl.setWebSocketGoup(hLd.APIs.group, hLd.APIs);
		// Set WebSocket callback fn to proc websocket event 
		hLd.APIs.websktCb = webSocketCtl.proceWebSocket;

        // To combine app in services list
		app.n = hLd.APIs.group;
		sList.push(app);
		
		// Load path to Router	
		var paths = hLd.APIs.routers;
		for (var index in paths ){
			var path = '/' + hLd.APIs.group + '/' + paths[index].path;
			var tmp = paths[index].action;
			var actions = tmp.split(",");

			for(var i in actions) {
				switch( actions[i])
				{				
					case 'GET':
						router.get(path,hLd.APIs.procFn);						
						break;
					case 'PUT':
						router.put(path,hLd.APIs.procFn);
						break;
					case 'POST':
						router.post(path,hLd.APIs.procFn);
						break;
					case 'DELETE':
						router.delete(path,hLd.APIs.procFn);
						break;
					default:
					advLogWrite(LOG_INFO, 'Unknow Action: "'+ actions[i] + '" in Module: '+ hLd.APIs.group );
				}
			} // End of For actions 
			advLogWrite(LOG_INFO, 'path:' + path); 
		} // End of For paths

	}

    services.service.e = sList;
	webSocketCtl.setWebSocket(wss);
	webSocketCtl.setIoSocket( ioSocket, JSON.stringify(services) );
}



// Router Function
var appRouter = function(router,socketio,wss) {
	
	
	router.all('*',function(req, res, next){
		// Debug for ALL Command
		advLogWrite(LOG_DEBUG, 'all method captured param'+JSON.stringify(req.params) +'body=' + JSON.stringify(req.body));
		next();
	});
	loadAppService(router,socketio,wss);
	
}

module.exports = appRouter;
