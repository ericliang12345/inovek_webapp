// App Plug-in Module Sample
var STATUS = require('../../inc/statusCode.js').STATUS_CODE;

const EventEmitter = require('events');
var eventEmitterObj = new EventEmitter();
var HashMap = require('hashmap').HashMap;
var api_utility = require('../../inc/api-gw_utility.js');
var hwise = require('../wsn_manage/wisesnail_msgmgr.js');

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
const groupName = 'service';

// path: router path : => rui: restapi/LogManage/* => path match restapi/LogManage/ will pass to this module
// action: Support which HTTP Action ( GET, PUT, POST, DELETE )
// ex: [{"path":"senhub/data","action":"GET,PUT"}];  => Match URI Route: restapi/LogManage/senhub/data   Action: 'GET'
var routers = [{"path":"*","action":"GET,PUT"}];

// Define Event Type for auto update by websocket  
var WSNEVENTS = [{"event":"eJoinServiceSys"},
                 {"event":"eLevaveServiceSys"},
                 {"event":"eRegisterService"},
                 {"event":"eDeregisterService"},
                 {"event":"eUpdateServiceCapability"},
                 {"event":"eUpdateData"},
                 {"event":"eActionResult"},
                 {"event":"eEventNotify"}];

const EVENT_ID = {
    JOIN:           0,
    LEAVE:          1,
    REG:            2,
    UNREG:          3,
    INFO_SPEC:      4,
    DATA:           5,
    SET_REPLY:      6,
    EVENT_NOTIFY:   7
};


var appInfo =
{
    version: "1.0.1",
    description: "Service is a manager of services of EdgeSense",
    endpoints: ["mgt"],
    //expend: {config:{e:[{n:'enable-data-flow',bv:false, asm:'rw'}]}}
};

var g_Mgt = {info:{e:[{n:'version',sv:appInfo.version,asm:'r'},{n:'description',sv:appInfo.description,asm:'r'}]},
             config:{e:[{n:'enable-data-flow',bv:false, asm:'rw'}]}};

//var g_eEndPoints = ["mgt"]; // dynamic service endpoint list

// web
//var webCfg = {Group:[],Name:'Service'};

// service global variables
var g_ServiceMap = new HashMap();

var wsclients = []; // not support websocket
//    ============== <Definition> ==============



// <2>  ============== <RESTful> ==============
const URI_TYPE = { 
    LIST:   1000,        // <Group>/list
    MGT:       0,        // < Group>/mgt
    SERVICE:   1,        // <Group>/<endpoint> others
    UNKNOW: -100,        // Unknow REST Endpoint
};

var getUriType = function ( uri )
{   
    var uriList = uri.split('/');
    var category = uriList[0];

    if ( category === 'list' )
        return URI_TYPE.LIST ;
    else if ( category === appInfo.endpoints[URI_TYPE.MGT] || typeof category === 'undefined' )
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
var wsnget = function( uri, inParam, outData ) {
    var code = STATUS.INTERNAL_SERVER_ERROR;
    advLogWrite( LOG_DEBUG, 'wsnget uri = ' + uri );
    var uriType = getUriType ( uri );
    var code = STATUS.NOT_FOUND;

    switch( uriType )
    {
      case URI_TYPE.LIST:
      {        
        advLogWrite(LOG_DEBUG,'URI_TYPE.LIST ===============');          
        getListRESTful( uri, outData, appInfo.endpoints );
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
        getListRESTful( uri, outData );
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
var wsnput = function( path, data, res, callback ) {
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

const SERVICE_OBJ = { 
    name:       'null',  // <Handler Name> -> DevID (e.g. HDD_PMQ   )
    connect:    'null',  // Connected Info of AgentLite
    os_info:    'null',  // OS Info of AgentLite
    info_spec:  'null',  // Capability
    info:       'null',  // last data
    last_hb_time:    0,  // heart-beat update time
    status:          0,  // 0: init, 1: ready, -1: remove
  };



const MSG_TYPE = { 
    ERROR:              -1, 
    UNKNOWN:             0,
    CONNECT:             1, 
    OS_INFO:             2, 
    INFO_SPEC:           3, 
    WILLMESSAGE:         4,
    DISCONNECT:          5, 
    REPORT:              6,
    SET_RESPONSE:       11,   
    HEART_BEAT:         13,
    GET_CAPABILITY_REQ: 14,   
    RECONNECT:          15,    
    QUERY_HB_REQ:       16,   
    QUERY_HB_RESPONSE:  17,
    CHANGE_HB_REQ:      18,
    CHANGE_HB_RESPONSE: 19,    
};

function getMsgType(topic, jsonObj){
    
      var topic_arr = topic.toString().split('/');
      //console.log('=======> topic_arr[4] =' + topic_arr[4]);
    
      if ( topic_arr[4] === 'notify'){
        return MSG_TYPE.HEART_BEAT;
      }
      else if ( topic_arr[4] === 'deviceinfo'){   
        if ( jsonObj.susiCommData.commCmd === 2055 ){
            if ( typeof jsonObj.susiCommData.data !== 'undefined' ){
                return MSG_TYPE.REPORT;
            }                               
        }       
     }        
     else if ( topic_arr[4] === 'agentinfoack'){
          //console.log('jsonObj.susiCommData.type =' + jsonObj.susiCommData.type + ',jsonObj.susiCommData.commCmd ='  + jsonObj.susiCommData.commCmd);
          if ( jsonObj.susiCommData.type === 'Service' && 
               jsonObj.susiCommData.commCmd === 1 ) {
               if ( jsonObj.susiCommData.status === 1 ) {
                   return MSG_TYPE.CONNECT;
               }
               if ( jsonObj.susiCommData.status === 0 ) {
                   return MSG_TYPE.DISCONNECT;
               }
          }        
      }    
      else if ( topic_arr[4] === 'agentactionreq'){
          if ( jsonObj.susiCommData.commCmd === 116 ){
              return MSG_TYPE.OS_INFO;
          }
        
          if ( jsonObj.susiCommData.commCmd === 2052 ){
              if ( typeof jsonObj.susiCommData.infoSpec !== 'undefined' ){
                  return MSG_TYPE.INFO_SPEC;
              }              
          }
         
          if ( jsonObj.susiCommData.commCmd === 526 ){
              if ( typeof jsonObj.susiCommData.handlerName !== 'undefined' ){
                  return MSG_TYPE.SET_RESPONSE;
              }

          }
    
          if ( jsonObj.susiCommData.commCmd === 128 ){
            return MSG_TYPE.QUERY_HB_RESPONSE;
          }
  
          if ( jsonObj.susiCommData.commCmd === 130 ){
            return MSG_TYPE.CHANGE_HB_RESPONSE;
          }
   
      }        
      else if ( topic_arr[4] === 'willmessage'){
          return MSG_TYPE.WILLMESSAGE;
      }     
      
      return MSG_TYPE.UNKNOWN;
}

function buildRequestMsg( requestType, messageObj )
{   
    switch(requestType)
    {
        case MSG_TYPE.CHANGE_HB_REQ:
        {
            messageObj.susiCommData = {};
            messageObj.susiCommData.commCmd = 129;
            messageObj.susiCommData.handlerName = 'general';
            messageObj.susiCommData.heartbeatrate = HEART_BEAT_TIMEOUT/1000;
            messageObj.susiCommData.sessionID = new Date().getTime();        
        }
        break;
        case MSG_TYPE.QUERY_HB_REQ:
        {
            messageObj.susiCommData = {};
            messageObj.susiCommData.commCmd = 127;
            messageObj.susiCommData.handlerName = 'general';
            messageObj.susiCommData.sessionID = new Date().getTime();
        }
        break;
        case MSG_TYPE.RECONNECT:
        {
            messageObj.susiCommData = {};
            messageObj.susiCommData.commCmd = 125;
            messageObj.susiCommData.handlerName = 'general';
            
            messageObj.susiCommData.response = {};
            messageObj.susiCommData.response.statuscode = 4;
            messageObj.susiCommData.response.msg = 'Reconnect';            
        }
        break;
        case GET_CAPABILITY_REQ:
        {
            messageObj.susiCommData = {};
            messageObj.susiCommData.requestID = 1001;
            messageObj.susiCommData.catalogID = 4;
            messageObj.susiCommData.commCmd = 2051;
            messageObj.susiCommData.handlerName = 'general';
        }
        break;
    }
}

function sendEvent( eventID /* EVENT_ID */, name /*HDD_PMQ"*/ , msg /* JSON Obj */ ){
    //send  EVENT
    var eventMsgObj={};
    eventMsgObj.n = name;
    eventMsgObj.jb = {};
    eventMsgObj.jb = msg;
    // {"n":"service", "evnet":"eJoinServiceSys","data":{"n":"Service System","jb":{}}}
    // {"n":"service", "evnet":"eRegisterService","data":{"n":"HDD_PMQ","jb":{"capability of HDD_PMQ"}}}
    eventEmitterObj.emit(groupName, groupName, WSNEVENTS[eventID].event, eventMsgObj);
}

function addToEndPoint( service_id )
{
    for ( var i = 0; i < appInfo.endpoints.length; i++ )
    {
        //if( service_id == appInfo.endpoints)
    }
}

function addService( service_id /* HDD_PMQ*/ , info_spec /* JSON Obj of capability */ )
{
    // 1. add to appInfo.endpoints
    addToEndPoint( service_id );
    // 2. send "eRegisterService" event to websocket clients
    sendEvent( EVENT_ID.UNREG, service_id, info_spec ); 
}

function removeService( service_id ){
    var msg = {};
    // 1. remove from g_ServiceMap
    g_ServiceMap.remove(service_id);    
    // 2. remove from appInfo.endpoints

    // 3. send "eDeregisterService" event -> websocket   
    sendEvent( EVENT_ID.UNREG, service_id, msg ); 
}

global.service_mqttMessageCallback = function( topic, jsonObj )
{
    //console.log('service  msgCbk topic= ' + topic + 'msg= ' + msg );
    var type = getMsgType(topic,jsonObj);
    var device_id = topic.toString().split('/')[3]; // <Handler Name>: HDD_PMQ

    switch(type)
    {
        case MSG_TYPE.CONNECT:
        {
            advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive CONNECT');

            if( device_id === 'Service') 
            {
                if ( g_ServiceMap.has(device_id) === false ) 
                {
                    var serviceObj = JSON.parse(JSON.stringify(SERVICE_OBJ));
                    serviceObj.status = 0;
                }
                else
                    var serviceObj = g_ServiceMap.get(device_id);
                
                serviceObj.name    = device_id.toString();
                serviceObj.connect = message.toString();    

                g_ServiceMap.set( device_id, serviceObj );      

                /*Send get capability request to WiseSnail*/
                var messageObj = {};
                buildRequestMsg( MSG_TYPE.GET_CAPABILITY_REQ, messageObj );
                sendRequestToWiseSnail( device_id, messageObj);
            }
        }
        break;
        case MSG_TYPE.DISCONNECT:
        {            
            removeService( device_id ); // remove
        }
        break;
        case MSG_TYPE.OS_INFO:
        {
            advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_OS_INFO' );
            if ( g_ServiceMap.has(device_id) === true ) {
                  var serviceObj=g_ServiceMap.get(device_id);
                  if (typeof serviceObj !== 'undefined') {
                    serviceObj.os_info = message.toString();
                    g_ServiceMap.set( device_id, serviceObj );  
                  }
            }
            else{
              advLogWrite(LOG_ERROR, 'receive [MSG_TYPE.OS_INFO]: g_ServiceMap does not exist id = '+ device_id);
            }
        }   
        break;   
        case MSG_TYPE.INFO_SPEC:
        {
            advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive INFO_SPEC');
            var serviceObj = g_ServiceMap.get(device_id);
            if (typeof serviceObj !== 'undefined') {
                 serviceObj.info_spec = message.toString();  
                 g_ServiceMap.set( device_id, serviceObj ); 
                 addService( device_id, message );        
            }
            else
                advLogWrite(LOG_ERROR, '[MSG_TYPE.INFO_SPEC]: g_ServiceMap does not exist id = ' + device_id);
        } 
        break;
        case MSG_TYPE.UNKNOWN:
        default:        
        advLogWrite(LOG_WARN, '[' + device_id + '] MSG_TYPE.UNKNOWN');
        break;        
    }
}

global.service_mqttConnectCallback = function()
{
    console.log('service  mqtt connected !');
}

global.service_mqttDisconnectCallback = function()
{
    console.log('service  mqtt disconnect !');
}

// <4>   ============== <Export> ==============
module.exports = {
  group: groupName,
  routers: routers,
  get: wsnget,
  put: wsnput,
  events: WSNEVENTS,
  addListener: addListener,
  wsclients: wsclients,
  //webCfg: webCfg,
};
//      ============== <Export> ==============






