// App Plug-in Module Sample
var STATUS = require('../../inc/statusCode.js').STATUS_CODE;

const EventEmitter = require('events');
var eventEmitterObj = new EventEmitter();
var api_utility = require('../../inc/api-gw_utility.js');
/* ====================================================================
    Note
    You need implement below 4 items integrate with EIS RESTful API Interfaces.
    1. <Definition> : Declared your App module
    2. <RESTful>    : get / put / post / delete
    3. <Event>      : for evnet trigger Functions
    4. <Export>     : Export your function map to general interface
    ==================================================================== 
*/


// <1> ============== <Definition> ==============

// Entry path of your app => uri: restapi/LogManage/ => If URI is matching your group name will pass to this Module
const groupName = 'elog';

// path: router path : => rui: restapi/LogManage/* => path match restapi/LogManage/ will pass to this module
// action: Support which HTTP Action ( GET, PUT, POST, DELETE )
// ex: [{"path":"senhub/data","action":"GET,PUT"}];  => Match URI Route: restapi/LogManage/senhub/data   Action: 'GET'
var routers = [{"path":"*","action":"GET,PUT"}];

// Define Event Type for auto update by websocket  
var WSNEVENTS = [];
//var WSNEVENTS = [{"event":"eUpdateLog"},
//               {"event":"eUpdateDataFlowLog"}];

var g_mVersion = "1.0.1";
var g_mDescription = "The eLog is log service of EdgeSense."
var g_Mgt = {info:{e:[{n:'version',sv:g_mVersion,asm:'r'},{n:'description',sv:g_mDescription,asm:'r'}]},
                   config:{e:[{n:'enable-data-flow',bv:false, asm:'rw'}]}};

var g_eEndPoints = ["mgt"]


var wsclients = []; // not support websocket
//    ============== <Definition> ==============



// <2>  ============== <RESTful> ==============
const URI_TYPE = { 
    LIST:   1000,        // <Group>/list
    MGT:       0,        // < Group>/mgt
    SERVICE:   1,        // <Group>/<endpoint>
    UNKNOW: -100,        // Unknow REST Endpoint
};

var getUriType = function ( uri )
{   
    var uriList = uri.split('/');
    var category = uriList[0];

    if ( category === 'list' )
        return URI_TYPE.LIST ;
    else if ( category === g_eEndPoints[URI_TYPE.MGT] || typeof category === 'undefined' )
        return URI_TYPE.MGT ;
    else if ( typeof category !== 'undefined' )
        return URI_TYPE.SERVICE;      
    
    return URI_TYPE.UNKNOW;
}



var getMgtRESTful = function( uri, outObj )
{    
    var path = uri.replace(/^mgt/g,'');
    var ret = STATUS.NOT_FOUND;
    
    advLogWrite( LOG_DEBUG, 'getMgtRESTful uri = ' + path );

    if ( path === '' || path === '/' ){ // Capability with data
        outObj.ret = JSON.stringify(g_Mgt);
        ret = STATUS.OK;
    }else{
        outObj.ret = queryAdvJSONbyPath(uri, g_Mgt);
        if( typeof outObj.ret !== 'undefined' )
            ret = STATUS.OK; 
    }

    return ret;    
}

// Description: process RESTful 'GET' Request
var logget = function( uri, inParam, outData ) {
    var code = STATUS.INTERNAL_SERVER_ERROR;
    advLogWrite( LOG_DEBUG, 'logget uri = ' + uri );
    var uriType = getUriType ( uri );
    var code = STATUS.NOT_FOUND;

    switch( uriType )
    {
      case URI_TYPE.LIST:
      {        
        advLogWrite(LOG_DEBUG,'URI_TYPE.LIST ===============');          
        getListRESTful(uri, outData, g_eEndPoints );
        break;
      }
      case URI_TYPE.MGT:
      {
        advLogWrite(LOG_DEBUG,'URI_TYPE.MGT ===============');
        getMgtRESTful( uri, outData );
        break;
      }
      case URI_TYPE.SERVICE:
      {
        advLogWrite(LOG_DEBUG,'URI_TYPE.SERVICE ===============');
        getListRESTful( uri, outData, g_eEndPoints );
      }
      break;
      default:
      {
        advLogWrite(LOG_DEBUG,'UnKnow URI ===============');
        break;
      }
    }    

    if ( typeof outData.ret !== 'undefined' )
    {
        outData.ret = outData.ret.toString();        
        code = STATUS.OK;

        advLogWrite(LOG_DEBUG,'-----------------------------------------');
        advLogWrite(LOG_DEBUG,outData.ret);
        advLogWrite(LOG_DEBUG,'-----------------------------------------');         
    }

    return code;
}

// Description: process RESTful 'PUT' Request 
var logput = function( path, data, res, callback ) {
    cb = callback;
    if( test1 == 0)
        res1=res;
    else   
        res2=res;

    test1++; 

    if(test1==2)
        test1 = 0;
}
//     ============== <RESTful> ==============




// <3>  ============== <Event> ==============
var addListener = function( userFn )
{
    if( userFn != undefined )
        eventEmitterObj.addListener(groupName,userFn);
}



//     ============== <Event> ==============



// <4>   ============== <Export> ==============
module.exports = {
  group: groupName,
  routers: routers,
  get: logget,
  put: logput,
  events: WSNEVENTS,
  addListener: addListener,
  wsclients: wsclients,
};
//      ============== <Export> ==============

// AdvJSLog

var path = require("path");
var loginfo = 'undefined';
var seq_counter = 0;
var g_enabllog = 1;

// ElasticSearch
var g_els = require('./els_sdk.js');
var els_dmg_name = global.AppName.toLowerCase() +'-debug-message';
var els_df_name  = global.AppName.toLowerCase() +'-data-flow';

Object.defineProperty(global, '__stack', {
	get: function() {
			var orig = Error.prepareStackTrace;
			Error.prepareStackTrace = function(_, stack) {
				return stack;
			};
			var err = new Error;
			Error.captureStackTrace(err, arguments.callee);
			var stack = err.stack;
			Error.prepareStackTrace = orig;
			return stack;
		}
});

Object.defineProperty(global, '__LINE__', {
	get: function() {
			return __stack[1].getLineNumber();
		}
});
    

Object.defineProperty(global, '__func__', {
    get: function() {
		return __stack[1].getFunctionName();
    }
});

Object.defineProperty(global, '__FILE__', {
    get: function() {
        return path.basename(__stack[1].getFileName());
    }
});


// DEBUG LEVEL
var LEVEL = {
    NONE:  0,
    CRASH: 1,
    ERROR: 2,
    WARN:  3,
    NOTICE:4,
    INFO:  5,
    DEBUG: 7,
    TRACE: 8,
    DUMP:  9,
    MAX:  10
}

var LEVEL_MSG = [{"n":"NONE"},{"n":"CRASH"},{"n":"ERROR"},{"n":"WARN"},{"n":"NOTICE"},{"n":"INFO"},{"n":"---"},{"n":"DEBUG"},{"n":"TRACE"},{"n":"TRACE"}];


Object.defineProperty(global, 'LOG_NONE', {
    get: function() {
        return LEVEL.NONE;
    }
});

Object.defineProperty(global, 'LOG_CRASH', {
    get: function() {
        return LEVEL.CRASH;
    }
});

Object.defineProperty(global, 'LOG_ERROR', {
    get: function() {
        return LEVEL.ERROR;
    }
});

Object.defineProperty(global, 'LOG_WARN', {
    get: function() {
        return LEVEL.WARN;
    }
});

Object.defineProperty(global, 'LOG_NOTICE', {
    get: function() {
        return LEVEL.NOTICE;
    }
});

Object.defineProperty(global, 'LOG_INFO', {
    get: function() {
        return LEVEL.INFO;
    }
});

Object.defineProperty(global, 'LOG_DEBUG', {
    get: function() {
        return LEVEL.DEBUG;
    }
});

Object.defineProperty(global, 'LOG_TRACE', {
    get: function() {
        return LEVEL.TRACE;
    }
});

Object.defineProperty(global, 'LOG_DUMP', {
    get: function() {
        return LEVEL.DUMP;
    }
});

global.getMSTime = function()
{
    return new Date().getTime();
}

global.getISOTime = function()
{
    //return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');     // delete the dot and everything after    
    //return new Date().toISOString().replace(/T/, ' ').replace(/Z/,'');     // delete the dot and everything after    
    return new Date().toISOString().replace(/Z/,'');     // delete the dot and everything after    
}  

global.appendDataLog = function( msg )
{
  if( typeof msg === 'undefined') return -1;

  // dataFlow
  if( typeof msg.dataFlow === 'undefined')
      msg.dataFlow = global.AppName;  // From this node
  else
  {
    var path = msg.dataFlow + '/' + global.AppName;
    msg.dataFlow = path;
  }
    

  // seq & srcTs
  if( typeof msg.seq == 'undefined' )
  {
    var srcTs = getMSTime();      
    ++seq_counter;
    msg.seq = seq_counter + '_' + srcTs;   
    msg.srcTs = srcTs; 
  }


  return 0;
}


global.advDataflowWrite = function ( type, seq, dataFlow, msg )
{
    if( loginfo === 'undefined' || loginfo.dataflow.enable !== 1 ) return;

    if( typeof dataFlow === 'undefined' || dataFlow === '') return;

    var data = '';

    //var time = getISOTime();
    var ts = getMSTime();
    var time = new Date(ts).toISOString().replace(/Z/,'');

    data = '[' + time +'] ['+global.AppName+'] ['+ type + '] ['+seq+'] ['+dataFlow+'] ['+msg+']';

    if( typeof loginfo.dataflow.els !== 'undefined' )
    {        
        //console.log('advData= '+ dataFlow );
        var ts = seq.split("_");
        var table = dataFlow.split("/");
        var _index = "";
        if( typeof table === 'undefined')
            _index = dataFlow;
        else
            _index = table[0];

        var body = {};
        body.date = time;
        body.ts = ts;
        body.node = global.AppName; 
        body.type = type;
        body.seq = seq;
        body.srcTs = ts[1]; // 123_13242424
        body.srcName = _index;
        body.dataFlow = dataFlow;
        body.reserved = msg;
        //console.log('_index= '+_index.toLowerCase() + ' body= ' + JSON.stringify(body) );
        //g_els.insert_id(els_df_name, 'logs', seq, body );  
        g_els.insert( _index.toLowerCase(), 'logs', body );   
    }

    //if ( typeof loginfo.dataflow.dynamic !== 'undefined' )
      //  console.log(data);

}

global.advLogWrite = function( level, msg )
{ 
    if( loginfo === 'undefined' || g_enabllog === 0 ) return;

    var full_msg    = '';
    var short_msg   = '';
    var time        = 'undefined';
    var _level      = 'undefined';
    var filename    = 'undefined';
    var linenum     =  'undefined';
    var fnName      = 'undefined';
      

    if( (typeof loginfo.default.dynamic != 'undefined' && loginfo.default.dynamic.level >= level ) || 
        (typeof loginfo.default.els  !== 'undefined' && loginfo.default.els.level >= level)         ||
        (typeof loginfo.default.static !== 'undefined' && loginfo.default.static.level >= level)    )
    {
        time = getISOTime();
        _level = LEVEL_MSG[level].n;
        filename = path.basename(__stack[1].getFileName());
        linenum = __stack[1].getLineNumber();
        fnName = __stack[1].getFunctionName();

        full_msg = '[' + time +'] ['+_level + '] ('+ filename + ','+ linenum + ','+ fnName + ')  ' + msg;
        short_msg = '[' + _level + ']      ' + msg;
    }
    else    
        return;

    // Print to console
    if( typeof loginfo.default.dynamic !== 'undefined' && loginfo.default.dynamic.level >= level )
    {
        if(loginfo.default.dynamic.information === 1 )
            console.log(full_msg);
        else
            console.log(short_msg);
    }

    // save to log file
    /*
    if( typeof loginfo.default.static !== 'undefined' && loginfo.default.static.level >= level )
    {
        if(loginfo.default.static.information === 1 )
            console.log(full_msg);
        else
            console.log(short_msg);
    }*/    

    // elastic search
    if( typeof loginfo.default.els !== 'undefined' && loginfo.default.els.level >= level )
    {
        var body = {};
        body.date = time;
        body.level = level;
        body.filename = filename;
        body.method = fnName;
        body.lineNumber = linenum;
        body.message = msg;
        g_els.insert(els_dmg_name, 'logs', body );        
    }

    // combin to websocket 
};


var initAdvLog = function()
{
    // log.json
    loginfo = require("../../log.json");

    if( typeof loginfo.default.els !== 'undefined' && typeof loginfo.default.els.server !== 'undefined' )
        elsServer = loginfo.default.els.server;
    else if( typeof loginfo.dataflow.els !== 'undefined' && typeof loginfo.dataflow.els.server !== 'undefined' )
        elsServer = loginfo.dataflow.els.server;

    // elasticsearch
    g_els.init(elsServer);    

    // console
}



initAdvLog();





