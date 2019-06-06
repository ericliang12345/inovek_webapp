
var STATUS = require('../../inc/statusCode.js').STATUS_CODE;
var advlog = require('../log_mgt/AdvJSLog.js');
var servicemgr = require('../service/service_mgr.js');
var api_utility = require('../../inc/api-gw_utility.js');
var Uuid = require('node-uuid');
var Mqtt = require('mqtt');
var HashMap = require('hashmap').HashMap;
const EventEmitter = require('events');
var eventEmitterObj = new EventEmitter();
var genHtmlEventObj = new EventEmitter();
var EVENT = require('./html_event.js');
var VgwMap = new HashMap();
var ServiceMap = new HashMap();
var SensorHubMap = new HashMap();
var ConnectivityMap = new HashMap();
var MqttPublishMap = new HashMap();
var RESTFulArrayValueMap = new HashMap();
var gHostConnectivity;
//
const TIMEOUT = 30000; // 30 seconds
const HEART_BEAT_TIMEOUT = 60000; // 60 seconds
const HEART_BEAT_CHECK_INTERVAL = 5000; //5 seconds
const groupName = 'WSNManage';
var routers = [{"path":"*","action":"GET,PUT"}];


var g_mVersion = "1.0.5";
var g_mDescription = "WSN is a manager of Wireless Sensor Netowkr"
var g_Mgt = {info:{e:[{n:'version',sv:g_mVersion,asm:'r'},{n:'description',sv:g_mDescription,asm:'r'}]}};

var g_eEndPoints = ["mgt", "Connectivity", "SenHub"]; // dynamic service endpoint list

var webCfg = {Group:[],Name:'Service'};

var Client = 'undefined';

// Define Event Type for auto update by websocket  
var WSNEVENTS = [{"event":"eConnectivity_Capability"},
                 {"event":"eConnectivity_UpdateData"},
                 {"event":"eSenHub_Connected"},
                 {"event":"eSenHub_Disconnect"},
                 {"event":"eSenHub_Capability"},
                 {"event":"eSenHub_UpdateData"}];
				 
var GET_RESULT ={"Net":{"e": [{"n":"Health","v":86}],"bn":"Net"}};

var wsclients = [];


require('getmac').getMac(function(err,macAddress){
  if (err)  throw err;

  advLogWrite(LOG_INFO, '-----------------------------');
  advLogWrite(LOG_INFO, 'getMac: ' + macAddress); 
  
  if( process.env.MAC != undefined )	
   var mac = process.env.MAC.replace(/[:-]/g,'') || macAddress.toString().replace(/[:-]/g,'');
  else
   var mac = macAddress.toString().replace(/[:-]/g,'');

  gHostConnectivity = '0007' + mac;
  advLogWrite(LOG_INFO, 'gHostConnectivity = ' + gHostConnectivity );
  Client = Mqtt.connect('mqtt://172.22.12.175');
//Client = Mqtt.connect('mqtt://127.0.0.1');
//Client  = Mqtt.connect('mqtt://advigw-mqtt-bus');  
  Client.on('connect', mqttConnectCallback );
  Client.on('message', mqttMessageCallback);
  Client.on('offline', mqttDisconnectCallback);  
});


Client.queueQoSZero = false;

const MSG_TYPE = { 
                   ERROR: -1, 
		   UNKNOWN: 0,
                   VGW_CONNECT: 1, 
		   VGW_OS_INFO: 2, 
		   VGW_INFO_SPEC: 3, 
	           VGW_WILLMESSAGE: 4,
                   VGW_DISCONNECT: 5, 
		   VGW_INFO: 6,
                   SENSORHUB_CONNECT: 7, 
		   SENSORHUB_DISCONNECT: 8, 
		   SENSORHUB_INFO_SPEC: 9, 
		   SENSORHUB_INFO: 10,
                   SENSORHUB_SET_RESPONSE: 11,   
                   CONNECTIVITY_SET_RESPONSE: 12,
                   VGW_HEART_BEAT:13,
                   VGW_GET_CAPABILITY_REQUEST:14,   
                   VGW_RECONNECT:15,
                   VGW_QUERY_HEART_BEAT_VALUE_REQUEST:16,   
                   VGW_QUERY_HEART_BEAT_VALUE_RESPONSE:17,
                   VGW_CHANGE_HEART_BEAT_VALUE_REQUEST:18,
                   VGW_CHANGE_HEART_BEAT_VALUE_RESPONSE:19,
                   VGW_SERVICE_CONNECT: 20
		 };
				 
const OS_TYPE = { 
                  NONE_IP_BASE: 'NONE_IP_BASE', 
		  IP_BASE: 'IP_BASE'
		};

const URI_TYPE = { 
  MGT:       0,        // < Group>/mgt
  LIST:   1000,        // <Group>/list  
  CONNECTIVITY: 1, 
  SENSORHUB: 2,

};

const DATATYPE = {
                  UNKNOWN: 0, 
                  CONNECTIVITY_INFOSPEC: 1, 
		  CONNECTIVITY_INFO: 2,
		  CONNECTIVITY_CAPABILITY: 3,
                  SENSORHUB_ALL_LIST: 4,
                  SENSORHUB_CONNECT_INFO: 5,
                  SENSORHUB_INFOSPEC_INFO: 6,
                  SENSORHUB_INFO: 7,
                  SENSOR_DATA: 9
		};
				
const DEVICE_OBJ = { 
                     vgw_id: 'null', 
                     conn_id: 'null',
                     conn_type: 'null',
                     connect: 'null', 
                     os_info: 'null', 
                     dev_info_spec: 'null',  
                     dev_info: 'null',
                     dev_capability: 'null',
                     dev_full_info: 'null',
                     dev_last_hb_time: 0,
                   };
const RESTFUL_VAL_TYPE = {
                           ERROR: -1,
                           SUCCESS:0, 
                           ARRAY: 1,
                           ARRAY_ELEMENT: 2,
                           READ_ONLY: 3
                         }; 



function addHostConnectivity(){

  advLogWrite(LOG_INFO, '[addHostConnectivity] gHostConnectivity = ' + gHostConnectivity );
  /* copy DEVICE_OBJ object as vgw objcect */
  var connObj = JSON.parse(JSON.stringify(DEVICE_OBJ));

  /*create infoSpec object*/
  var infoSpecObj = {};
  infoSpecObj.Info = {};
  infoSpecObj.Info.e = [];
  infoSpecObj.Info.e.push({n:'SenHubList', sv:'',asm:'r'});
  infoSpecObj.Info.e.push({n:'Neighbor', sv:'',asm:'r'});
  infoSpecObj.Info.e.push({n:'Name', sv:'Ethernet',asm:'r'});
  infoSpecObj.Info.bn = 'Info';
  infoSpecObj.bn = gHostConnectivity;
  infoSpecObj.ver = 1;

  // <DataLog>
  // {"Info":{"e":[{"n":"Name","sv":"Ethernet","asm":"r"}],"bn":"Info"},"bn":"0007000BAB838404","ver":1}
  //appendDataLog(infoSpecObj); 
  appendDataLog(infoSpecObj); // Ethernet uses "API-GW" as root of data source
  // {"Info":{"e":[{"n":"Name","sv":"Ethernet","asm":"r"}],"bn":"Info"},"bn":"0007000BAB838404","ver":1,"dataFlow":"0007000BAB838404/API-GW","seq":"1_1530251504961"}

  advDataflowWrite( 'Capability', infoSpecObj.seq, infoSpecObj.dataFlow, '' );

  /*create deviceinfo object*/
  var keyStr = '';
  var devinfoObj = JSON.parse(JSON.stringify(infoSpecObj));
  buildFullInfoObj(true, keyStr, devinfoObj);
 

  connObj.conn_id = gHostConnectivity;
  connObj.conn_type = 'Ethernet';
  connObj.dev_info_spec = JSON.stringify(infoSpecObj);
  connObj.dev_info = JSON.stringify(devinfoObj);

  var keyStr = '';
  var fullInfoObj = JSON.parse(JSON.stringify(infoSpecObj));
  buildFullInfoObj(false, keyStr, fullInfoObj);
  connObj.dev_full_info = JSON.stringify(fullInfoObj);

  ConnectivityMap.set(gHostConnectivity, connObj );
  
  //send generate html event ( IP-base connectivity)                   
  var rootRESTful = 'IoTGW/' + connObj.conn_type + '/' + gHostConnectivity; 
  genHtmlEventObj.emit(groupName, EVENT.eConnectivity_GenHtml, rootRESTful,connObj.dev_full_info);

}

var lastTime= new Date().getTime();
setInterval(function () {
  var currentTime = new Date().getTime();
  var diffTime = (currentTime - lastTime);
  advLogWrite(LOG_TRACE, '[Check HeartBeat] Wakeup to check... diffTime= ' + diffTime + ' ms'); //eric mark
  lastTime = currentTime;
  //
  VgwMap.forEach(function(obj, key) {

    if ( obj.dev_last_hb_time > 0 ){
      var devDiffTime = currentTime - obj.dev_last_hb_time;
      advLogWrite(LOG_TRACE, '[Check HeartBeat][' + key + ']: diffTime = ' + devDiffTime + ' ms'); // eric mark
      if ( devDiffTime > HEART_BEAT_TIMEOUT * 3 ){
        advLogWrite(LOG_TRACE, '[Check HeartBeat][' + key + ']: HeartBeat timeout');
        removeVGW( key );
        return;
      }
      //
    }
  });

} , HEART_BEAT_CHECK_INTERVAL);

var mqttConnectCallback =  function () {
  advLogWrite(LOG_INFO, '[wisesnail_msgmgr] Mqtt connected !!!!');

  addHostConnectivity();

  Client.subscribe('/cagent/admin/+/notify');
  Client.subscribe('/cagent/admin/+/agentinfoack');
  Client.subscribe('/cagent/admin/+/willmessage');
  Client.subscribe('/cagent/admin/+/agentactionreq');
  Client.subscribe('/cagent/admin/+/deviceinfo'); 

  service_mqttConnectCallback(); // <service>
   
}

var mqttDisconnectCallback = function() {
	advLogWrite(LOG_INFO, '[wisesnail_msgmgr] Mqtt disconnected !!!');

  removeAllVGW();

  service_mqttDisconnectCallback(); // <service>
}

var mqttMessageCallback = function (topic, message){
  // message is Buffer 
/*
  advLogWrite(LOG_DEBUG, '--------------------------------------------------------------');
  advLogWrite(LOG_DEBUG, 'topic=' + topic.toString() );
  advLogWrite(LOG_DEBUG, 'msg=' + message.toString());
*/
  try {
      var re = /\0/g;
      var msg = message.toString().replace(re, '');
      var jsonObj = JSON.parse(msg);
  } catch (e) {
      advLogWrite(LOG_ERROR, '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error(e);
      return;
  }
  


  var msg_type = getMsgType(topic, jsonObj);
  var device_id = topic.toString().split('/')[3];
  
  
  switch(msg_type){
    case MSG_TYPE.VGW_HEART_BEAT:
      {
        //advLogWrite(LOG_TRACE, '[' + device_id + ']' + ': receive VGW_HEART_BEAT');  eric mark
        //dev_last_hb_time
        if ( doesVGWNeedReConnect(device_id) === true ) {
          //Send Re-connect
          advLogWrite(LOG_DEBUG, '['+ device_id +'] send Re-connect');
          var messageObj = {};
          buildRequestMessageObj( MSG_TYPE.VGW_RECONNECT, messageObj);
          sendRequestToWiseSnail( device_id, messageObj);
        }
        else{
          if ( VgwMap.has(device_id) === true ) {
            advLogWrite(LOG_TRACE, '[' + device_id + '] Update last heart beat time');
            var vgw = VgwMap.get(device_id);
            vgw.dev_last_hb_time = new Date().getTime();
            VgwMap.set(device_id, vgw );     
          }   
        }

        break;
      }
    case MSG_TYPE.VGW_CONNECT:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_CONNECT');
          removeVGW( device_id );
         
          if ( VgwMap.has(device_id) === false ) {
              //copy DEVICE_OBJ object as vgw objcect
              var vgw = JSON.parse(JSON.stringify(DEVICE_OBJ));
          }
          else{
             var vgw = VgwMap.get(device_id);
          }
              
          vgw.connect = message.toString();            
          vgw.vgw_id = device_id.toString();
          VgwMap.set(device_id, vgw );        
          /*Send get capability request to WiseSnail*/

          var messageObj = {};
          buildRequestMessageObj( MSG_TYPE.VGW_GET_CAPABILITY_REQUEST, messageObj);
          sendRequestToWiseSnail( device_id, messageObj);

          //genHtmlEventObj.emit(groupName, EVENT.eConnectivity_Capability, '1111111');

          break;
      }
    case MSG_TYPE.VGW_SERVICE_CONNECT:
    {
      advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_SERVICE_CONNECT');

      if ( ServiceMap.has(device_id) === false ) {
        ServiceMap.set(device_id, device_id );    
      }  
      break;
    }
    case MSG_TYPE.VGW_DISCONNECT:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_DISCONNECT');
          removeVGW( device_id );
          break;        
      }      
    case MSG_TYPE.VGW_OS_INFO:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_OS_INFO, IP=' + jsonObj.susiCommData.osInfo.IP);
          if ( VgwMap.has(device_id) === true ) {
                var vgw=VgwMap.get(device_id);
                if (typeof vgw !== 'undefined') {
                  vgw.os_info = message.toString();
                }
          }
          else{
            advLogWrite(LOG_ERROR, 'receive [MSG_TYPE.VGW_OS_INFO]: VgwMap does not exist id = ' + device_id );
          }
          
          break;
      }
    case MSG_TYPE.VGW_INFO_SPEC:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_INFO_SPEC');
          if ( VgwMap.has(device_id) === true ) {
                var vgw = VgwMap.get(device_id);
                if (typeof vgw !== 'undefined') {
                  vgw.dev_info_spec = message.toString();
                  //add ConnectivityMap here
                    var infoObj=jsonObj.susiCommData.infoSpec.IoTGW;
                    //advLogWrite(LOG_DEBUG, '[ConnectivityMapUpdate] Start-------------------------------------------------');
                    connectivityMapUpdate(MSG_TYPE.VGW_INFO_SPEC, device_id , vgw.os_info, 0, 'null', infoObj); 
                    //advLogWrite(LOG_DEBUG, '[ConnectivityMapUpdate] End---------------------------------------------------');                  
                }
          }
          else{
              advLogWrite(LOG_ERROR, '[MSG_TYPE.VGW_INFO_SPEC]: VgwMap does not exist id = ' + device_id);
          }
          //
          sendTotalConnectivityCapabilityEvent();
          break;
      }
    case MSG_TYPE.VGW_INFO:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_INFO');
          if ( VgwMap.has(device_id) === true ) {
                var vgw=VgwMap.get(device_id);
                if (typeof vgw !== 'undefined') {
                  vgw.dev_info = message.toString();
                  var infoObj=jsonObj.susiCommData.data.IoTGW;
                  //advLogWrite(LOG_DEBUG, '[ConnectivityMapUpdate] Start-------------------------------------------------');
                  connectivityMapUpdate(MSG_TYPE.VGW_INFO, device_id , vgw.os_info, 0, 'null', infoObj); 
                  //advLogWrite(LOG_DEBUG, '[ConnectivityMapUpdate] End---------------------------------------------------');   
                }
          }
          else{
              advLogWrite(LOG_ERROR, '[MSG_TYPE.VGW_INFO]: VgwMap does not exist id = ' + device_id );
          }  
          break;
      }
    case MSG_TYPE.VGW_WILLMESSAGE:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive VGW_WILLMESSAGE');
          removeVGW( device_id );
          break;
      }
    case MSG_TYPE.CONNECTIVITY_SET_RESPONSE:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive CONNECTIVITY_SET_RESPONSE');
          var sessionID = jsonObj.susiCommData.sessionID ;
          var sessionObj = MqttPublishMap.get(sessionID);

          if ( typeof sessionObj !== 'undefined' ){
                updateDevFullInfo( URI_TYPE.CONNECTIVITY, sessionObj, jsonObj);
          }

          if ( jsonObj.susiCommData.sensorInfoList.e[0].StatusCode === STATUS.OK){
            var resMsg = sessionObj.data;     
            sessionObj.callback(sessionObj.res, STATUS.OK, resMsg);
          }
          else{
            var resMsg = '';
            sessionObj.callback(sessionObj.res, STATUS.NOT_ACCEPTABLE, resMsg);
          }

          MqttPublishMap.remove(sessionID);
          break;
      }
    case MSG_TYPE.SENSORHUB_CONNECT:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive SENSORHUB_CONNECT');
          sensorHubMapUpdate(MSG_TYPE.SENSORHUB_CONNECT, device_id, message.toString());
          // snend Get Capability
          var messageObj = {};
          buildRequestMessageObj( MSG_TYPE.VGW_GET_CAPABILITY_REQUEST, messageObj );
          sendRequestToWiseSnail( device_id, messageObj );
          break;
      }
    case MSG_TYPE.SENSORHUB_DISCONNECT:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive SENSORHUB_DISCONNECT');
          if ( SensorHubMap.has(device_id) === true ) {
            var sensorhub = SensorHubMap.get(device_id);
            sensorhub.connect = message.toString();
            var osType = getOSType( sensorhub.os_info );
            SensorHubMap.remove(device_id);
            if( osType === OS_TYPE.IP_BASE )
                sendIPBaseConnectivityInfoEvent();
          }
	  break;
      }      
    case MSG_TYPE.SENSORHUB_INFO_SPEC:
      {
          advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive SENSORHUB_INFO_SPEC');
         sensorHubMapUpdate(MSG_TYPE.SENSORHUB_INFO_SPEC, device_id, message.toString());
         break;
      }
    case MSG_TYPE.SENSORHUB_INFO:
      {    
        advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': SENSORHUB_INFO');
        sensorHubMapUpdate(MSG_TYPE.SENSORHUB_INFO, device_id, message.toString());
        break;
      }
    case MSG_TYPE.SENSORHUB_SET_RESPONSE:
      {
        advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': receive SENSORHUB_SET_RESPONSE');
        var sessionID = jsonObj.susiCommData.sessionID ;
        var sessionObj = MqttPublishMap.get(sessionID);

        if ( typeof sessionObj !== 'undefined' ){
          updateDevFullInfo( URI_TYPE.SENSORHUB, sessionObj, jsonObj);
        }

        if ( jsonObj.susiCommData.sensorInfoList.e[0].StatusCode === STATUS.OK){
          var resMsg = sessionObj.data;
          sessionObj.callback(sessionObj.res, STATUS.OK, resMsg);
        }
        else{
          var resMsg = '';
          sessionObj.callback(sessionObj.res, STATUS.NOT_ACCEPTABLE, resMsg);
        }

        MqttPublishMap.remove(sessionID);
        break;
      }
    case MSG_TYPE.VGW_QUERY_HEART_BEAT_VALUE_RESPONSE:
      {
        advLogWrite(LOG_TRACE, '[' + device_id + ']' + ': receive VGW_QUERY_HEART_BEAT_VALUE_RESPONSE');
        advLogWrite(LOG_TRACE, 'HeartBeat rate = ' + jsonObj.susiCommData.heartbeatrate); 
        break;
      }
    case MSG_TYPE.VGW_CHANGE_HEART_BEAT_VALUE_RESPONSE:
      {
        advLogWrite(LOG_TRACE, '[' + device_id + ']' + ': receive VGW_CHANGE_HEART_BEAT_VALUE_RESPONSE');
        advLogWrite(LOG_TRACE, 'HeartBeat change result = ' + jsonObj.susiCommData.result); 
        break;
      }
    case MSG_TYPE.UNKNOWN:
      advLogWrite(LOG_WARN, '[' + device_id + ']MSG_TYPE.UNKNOWN');
      break;
    default:
      advLogWrite(LOG_WARN, '[' + device_id + '] unknown message');
      break;
  }

  service_mqttMessageCallback( topic, jsonObj ); // <service>
// advLogWrite(LOG_DEBUG, '--------------------------------------------------------------');  
}

// true: need to send ReConnect
// false: do not send ReConnect
function doesVGWNeedReConnect( deviceID ){

 if ( VgwMap.has(deviceID) === false ) {
   advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] Cannot find ' + deviceID ); // eric mark
   if( ServiceMap.has(deviceID) == true ) return false;

   return true;
 }

 var vgw = VgwMap.get(deviceID);
 if ( typeof vgw === 'undefined' ){
    advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] ' + deviceID + ' data undefined' );
   return true;
 }

 if ( vgw.vgw_id === 'null'  || vgw.connect === 'null' || vgw.os_info === 'null' ){
 /*
   advLogWrite(LOG_DEBUG, '---------------------' );
   advLogWrite(LOG_DEBUG, 'vgw.vgw_id = ' + vgw.vgw_id );
   advLogWrite(LOG_DEBUG, 'vgw.connect = ' + vgw.connect );
   advLogWrite(LOG_DEBUG, 'vgw.os_info = ' + vgw.os_info );
   advLogWrite(LOG_DEBUG, '---------------------' );
 */
   advLogWrite(LOG_INFO, '[doesVGWNeedReConnect] ' + deviceID + ' data corrupted' );
   return true;
 }

 var connectivityCount = 0;

 ConnectivityMap.forEach(function(obj, key) {
   if ( vgw.vgw_id === obj.vgw_id ){
     advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] ConnectivityMap key = ' + key); // eric mark
     connectivityCount ++;
   }
 });

 if ( connectivityCount === 0 ){
    advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] connectivity info not found');
   return true;
 }

 var sensorHubCount = 0;
 SensorHubMap.forEach(function(obj, key) {
   //advLogWrite(LOG_DEBUG, 'key = ' + key); 
   if ( vgw.vgw_id === obj.vgw_id ){
     if ( obj.dev_info_spec === 'null' ){
        advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] sensor hub = ' + key + ', dev_info_spec = ' + obj.dev_info_spec );
       sensorHubCount ++;
       return true;
     }
   }
 }); 
 
 if ( sensorHubCount !== 0){
   advLogWrite(LOG_WARN, '[doesVGWNeedReConnect] sensor hub info spec is null');
   return true;
 }
 advLogWrite(LOG_DEBUG, '[doesVGWNeedReConnect] ' + deviceID + ' data OK' );
 return false;
}

function buildRequestMessageObj( requestType, messageObj){

  if ( requestType === MSG_TYPE.VGW_CHANGE_HEART_BEAT_VALUE_REQUEST){
    messageObj.susiCommData = {};
    messageObj.susiCommData.commCmd = 129;
    messageObj.susiCommData.handlerName = 'general';
    messageObj.susiCommData.heartbeatrate = HEART_BEAT_TIMEOUT/1000;
    messageObj.susiCommData.sessionID = new Date().getTime();
  }

  if ( requestType === MSG_TYPE.VGW_QUERY_HEART_BEAT_VALUE_REQUEST){
    messageObj.susiCommData = {};
    messageObj.susiCommData.commCmd = 127;
    messageObj.susiCommData.handlerName = 'general';
    messageObj.susiCommData.sessionID = new Date().getTime();
  }

  if ( requestType === MSG_TYPE.VGW_RECONNECT ){
    messageObj.susiCommData = {};
    messageObj.susiCommData.commCmd = 125;
    messageObj.susiCommData.handlerName = 'general';
    
    messageObj.susiCommData.response = {};
    messageObj.susiCommData.response.statuscode = 4;
    messageObj.susiCommData.response.msg = 'Reconnect';

  }

  if ( requestType === MSG_TYPE.VGW_GET_CAPABILITY_REQUEST ){
    messageObj.susiCommData = {};
    messageObj.susiCommData.requestID = 1001;
    messageObj.susiCommData.catalogID = 4;
    messageObj.susiCommData.commCmd = 2051;
    messageObj.susiCommData.handlerName = 'general';
  }
}

global.sendRequestToWiseSnail = function( deviceID, messageObj ){
  
  var topic = '/cagent/admin/' + deviceID + '/agentcallbackreq';
  var message = JSON.stringify(messageObj);
  Client.publish(topic, message);
}

function updateDevFullInfo( uriType, sessionObj, responsJsonObj ){
/*
  advLogWrite(LOG_DEBUG, '-----------');
  advLogWrite(LOG_DEBUG, 'Response RESTful path == ' + responsJsonObj.susiCommData.sensorInfoList.e[0].n);
  advLogWrite(LOG_DEBUG, 'SET RESPONSE: sessionObj.path = ' + sessionObj.uri + ', sessionObj.data = ' + sessionObj.data);
  advLogWrite(LOG_DEBUG, '-----------');
*/
  var dataObj = JSON.parse(sessionObj.data);
  var restObj = {};
  //create RESTful array value object
  restObj.path = responsJsonObj.susiCommData.sensorInfoList.e[0].n.replace(/^\//g,'');
  if (uriType === URI_TYPE.CONNECTIVITY){
    var device_id = sessionObj.uri.split('/')[3];
    var objMap = ConnectivityMap;
  }

  if (uriType === URI_TYPE.SENSORHUB){
    var device_id = sessionObj.uri.split('/')[1];
    var objMap = SensorHubMap;
    restObj.path = 'SenHub/' + restObj.path;
  }

  Object.keys(dataObj).forEach(function(key) {
    restObj.valKey = key;
    restObj.val = dataObj[key];
    //advLogWrite(LOG_DEBUG, 'key = ' + key + ', val= ' + dataObj[key]);
  });

  var mapID = device_id + '/' + restObj.path;
  advLogWrite(LOG_DEBUG, 'SET RESPONSE: mapID = ' + mapID);
  RESTFulArrayValueMap.set( mapID, restObj);

  /*set object to RESTful array value Map*/
  advLogWrite(LOG_DEBUG, 'restObj.path = ' + restObj.path + ', restObj.valKey= ' + restObj.valKey + ', restObj.val= ' + restObj.val);

  if ( objMap.has(device_id) === true ) {
    var deviceObj = objMap.get(device_id);
    var keyStr = '';
    var fullInfoObj = JSON.parse(deviceObj.dev_full_info);
    advLogWrite(LOG_DEBUG, 'deviceObj.dev_full_info =' + deviceObj.dev_full_info);

    setRESTFulArrayValueMapToJsonObj( device_id, keyStr, fullInfoObj);
    deviceObj.dev_full_info = JSON.stringify(fullInfoObj);
    advLogWrite(LOG_DEBUG, 'SET RESPONSE: deviceObj.dev_full_info = ' + deviceObj.dev_full_info);

  }

}

function getObjKeyValue( jsonObj, outObj){

  for (key in jsonObj) {
      if (jsonObj.hasOwnProperty(key)) {
          if ( outObj.is_n_sv_format === true ){
            if ( jsonObj[key] === outObj.key ){
              //advLogWrite(LOG_DEBUG, 'key =======>' + key + ', keyVal=======>' + jsonObj[key]);
              //advLogWrite(LOG_DEBUG, 'key =======>' + 'sv' + ', keyVal=======>' + jsonObj['sv']);     
              if ( typeof jsonObj['sv'] === 'object'){ 
                outObj.result = JSON.stringify(jsonObj['sv']);
              }
              else{
                outObj.result = jsonObj['sv'];
              }
              return;
            }
          }
          else {
            if ( key === outObj.key ){
              //advLogWrite(LOG_DEBUG, 'key =======>' + key + ', keyVal=======>' + jsonObj[key]);
              if ( typeof jsonObj[key] === 'object'){ 
                outObj.result = JSON.stringify(jsonObj[key]);
              }
              else{
                outObj.result = jsonObj[key];
              }
              return;
            }
          }
      }
   }
 //
  for (key in jsonObj) {
      if (jsonObj.hasOwnProperty(key)) {
          //advLogWrite(LOG_DEBUG, key + " ===> " + jsonObj[key] + " ,type = " + typeof jsonObj[key]);
          if (typeof jsonObj[key] === 'object' ){
              getObjKeyValue( jsonObj[key], outObj);
          }
      }
   }

   return;  
}

function getDeviceCapability( devInfoSpecObj, devInfoObj ){
                  
  for ( var i=0 ; i < devInfoSpecObj['Info']['e'].length ; i++){
    if ( typeof devInfoSpecObj['Info']['e'][i].v !== 'undefined' && devInfoObj['Info']['e'][i].v !== 'undefined' ){
      devInfoSpecObj['Info']['e'][i].v =  devInfoObj['Info']['e'][i].v;
      //advLogWrite(LOG_DEBUG, 'v..devInfoSpecObj.e['+ i +'].n = ' +  JSON.stringify(devInfoSpecObj['Info']['e'][i]['n']));
    }
                     
    if ( typeof devInfoSpecObj['Info']['e'][i].sv !== 'undefined' && devInfoObj['Info']['e'][i].sv !== 'undefined' ){
      devInfoSpecObj['Info']['e'][i].sv =  devInfoObj['Info']['e'][i].sv;
      //advLogWrite(LOG_DEBUG, 'sv..devInfoSpecObj.e['+ i +'].n = ' +  JSON.stringify(devInfoSpecObj['Info']['e'][i]['n']));
    } 
                     
    if ( typeof devInfoSpecObj['Info']['e'][i].bv !== 'undefined' && devInfoObj['Info']['e'][i].bv !== 'undefined' ){
      devInfoSpecObj['Info']['e'][i].bv =  devInfoObj['Info']['e'][i].bv;
      //advLogWrite(LOG_DEBUG, 'bv..devInfoSpecObj.e['+ i +'].n = ' +  JSON.stringify(devInfoSpecObj['Info']['e'][i]['n']));
    }                        
                      
    //advLogWrite(LOG_DEBUG, 'devInfoSpecObj.e['+ i +'] = ' +  JSON.stringify(devInfoSpecObj['Info']['e'][i]));
  }  
  
}



function connectivityMapUpdate( messageType, vgw_id, osInfo, layer, connType, infoObj){
  
  //advLogWrite(LOG_DEBUG, 'Start-------------------------------------------------');
  layer++;
  for (key in infoObj) {
      if (infoObj.hasOwnProperty(key)) {
          //advLogWrite(LOG_DEBUG, 'layer=' + layer + 'key =====================' + key);
          if ( key === 'bn' ){
              if ( layer === 2 ){
                connType = infoObj[key];
                //advLogWrite(LOG_DEBUG, 'layer=' + layer + 'connType =====================' + connType);
              }
              if ( layer === 3 ){
                 //advLogWrite(LOG_DEBUG, 'messageType =' + messageType + ', [layer] :' + layer + ', connType='+ connType +', infoObj[' + key +']=======>' + infoObj[key] );
                 var gwInfoReady = 0;
                 var device_id=infoObj[key];
                 if ( ConnectivityMap.has(device_id) === false ) {
                   //copy DEVICE_OBJ object as vgw objcect
                   var connectivity = JSON.parse(JSON.stringify(DEVICE_OBJ));
                 }
                 else{
                   var connectivity = ConnectivityMap.get(device_id);
                   gwInfoReady = 1;
                 }
                
                 if ( messageType === MSG_TYPE.VGW_INFO_SPEC ){ 
                   connectivity.vgw_id    = vgw_id;
                   connectivity.os_info   = osInfo;
                   connectivity.conn_id   = device_id; 
                   connectivity.conn_type = connType;
                   //{"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1}
                   appendDataLog(infoObj); // <DataLog> Bt/API-GW -> <NET_ID>/API-GW>
                   // {"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1,"dataFlow":"0007000E4CAB1232/API-GW","seq":"2_1530252638454"}

                   advDataflowWrite( 'Capability', infoObj.seq, infoObj.dataFlow, '' );

                   connectivity.dev_info_spec = JSON.stringify(infoObj);

                   var keyStr = '';
                   var fullInfoObj = JSON.parse(connectivity.dev_info_spec);
                   buildFullInfoObj(false, keyStr, fullInfoObj);
                   connectivity.dev_full_info = JSON.stringify(fullInfoObj);

                   
                   if ( getOSType( connectivity.os_info ) === OS_TYPE.NONE_IP_BASE ){
                     /* send generate html event */
                     var rootRESTful = 'IoTGW/' + connType + '/' + device_id; 
                     //genHtmlEventObj.emit(groupName, EVENT.eConnectivity_GenHtml, rootRESTful,connectivity.dev_full_info);
                   }

                   //advLogWrite(LOG_DEBUG, '-----------');
                   //advLogWrite(LOG_DEBUG, 'connectivity.dev_full_info ==== ' + connectivity.dev_full_info);
                   //advLogWrite(LOG_DEBUG, '-----------');

                 }
                   
                if ( messageType === MSG_TYPE.VGW_INFO ) {
          
                  if( gwInfoReady == 0 ) 
                  {
                    advLogWrite(LOG_ERROR, 'gw infosepc is not ready');
                    return;
                  }
					   
                   var tmpInfoSpecObj = JSON.parse(connectivity.dev_info_spec);
                   getDeviceCapability(tmpInfoSpecObj, infoObj);
                   //{"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1}
                   appendDataLog( infoObj ); // <DataLog> Bt/API-GW -> <NetID>/API-GW>
                   // {"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1,"dataFlow":"0007000E4CAB1232/API-GW","seq":"2_1530252638454"}

                   advDataflowWrite( 'Report', infoObj.seq, infoObj.dataFlow, '' );

                   connectivity.dev_info = JSON.stringify(infoObj);
                   connectivity.dev_capability = JSON.stringify(tmpInfoSpecObj);
                  
                    
                   //
                   var keyStr = '';
                   var partialInfoObj = JSON.parse(connectivity.dev_info);
                   var fullInfoObj = JSON.parse(connectivity.dev_full_info);
                   convertJsonObjToRESTFulArrayValueMap(device_id, keyStr, partialInfoObj);
                   
                   var keyStr = '';
                   setRESTFulArrayValueMapToJsonObj( device_id, keyStr, fullInfoObj);
                   connectivity.dev_full_info = JSON.stringify(fullInfoObj);

                   /*create message obj for event*/

                   if ( getOSType( connectivity.os_info ) === OS_TYPE.NONE_IP_BASE ){
                     var eventMsgObj={};
                     eventMsgObj.IoTGW = {};
                     //{"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1}
                     appendDataLog( eventMsgObj.IoTGW ); // <DataLog>       
                     // {"Info":{"e":[{"n":"SenHubList","sv":"0017000E4C000011","asm":"r"},{"n":"Name","sv":"Bt","asm":"r"}],"bn":"Info"},"bn":"0007000E4CAB1232","ver":1,"dataFlow":"0007000E4CAB1232/API-GW","seq":"2_1530252638454"}              
                     append_opTS(eventMsgObj.IoTGW); // <opTS>

                     eventMsgObj.IoTGW[connType]={}; 
                     eventMsgObj.IoTGW[connType][device_id]={};
                     eventMsgObj.IoTGW[connType][device_id]= JSON.parse(connectivity.dev_info);
                     eventMsgObj.IoTGW[connType].bn = connType;
                     eventMsgObj.IoTGW.ver = 1;
                     eventEmitterObj.emit(groupName, groupName, WSNEVENTS[1].event, eventMsgObj); 
                   }
                   /*
                   advLogWrite(LOG_DEBUG, '-----------');
                   advLogWrite(LOG_DEBUG, 'UPDATE: connectivity.dev_full_info ==== ' + connectivity.dev_full_info);
                   advLogWrite(LOG_DEBUG, '-----------');
                   */

                 }
                 
                 //advLogWrite(LOG_DEBUG, '[' + device_id + ']' + ': update ConnectivityMap key pairs');
                 ConnectivityMap.set(device_id, connectivity );                
                 return;
              }
               
          }
      }
   }
 //
  for (key in infoObj) {
      if (infoObj.hasOwnProperty(key)) {
          //advLogWrite(LOG_DEBUG, key + " ===> " + jsonObj[key] + " ,type = " + typeof jsonObj[key]);
          if (typeof infoObj[key] === 'object' ){
              connectivityMapUpdate(messageType, vgw_id, osInfo, layer, connType, infoObj[key]);
          }
      }
   }  
  
   layer--;
   return;    
}

// "opTS": {"$date": 1510044371815},    
function append_opTS( msg )
{
  if( typeof msg === 'undefined') return -1;

  // dataFlow
  if( typeof msg.opTS === 'undefined')
  {
      msg.opTS = {};
      msg.opTS.$date = getMSTime();
  }else{
    if( typeof msg.ver === 'undefined' )
      msg.opTS.$date = getMSTime();
    else if ( msg.ver === 1 )
      msg.opTS.$date = getMSTime();
  }
  return 0;
}

function sensorHubMapUpdate(messageType, device_id, message){
          
  //advLogWrite(LOG_DEBUG, 'message ===== ' + message);
  ConnectivityMap.forEach(function(obj, key) {
    //advLogWrite(LOG_DEBUG, 'obj.dev_info = ' + obj.dev_info);
    var infoObj = JSON.parse ( obj.dev_info );
    var outObj = {
                  key:'SenHubList',
                  is_n_sv_format: true, 
                  result:''
                 };
    getObjKeyValue(infoObj, outObj);
    var sensorHubList = outObj.result.split(',');
    for (var i=0 ; i < sensorHubList.length ; i++){
      if(sensorHubList[i] === device_id){
        //advLogWrite(LOG_DEBUG, 'sensorHub(' + device_id + '): conn_id=' + obj.conn_id + ', vgw_id=' + obj.vgw_id  );
        if ( SensorHubMap.has(device_id) === false ) {
          var sensorhub = JSON.parse(JSON.stringify(DEVICE_OBJ));
        }
        else{
          var sensorhub = SensorHubMap.get(device_id);
        }
        sensorhub.vgw_id = obj.vgw_id;
        sensorhub.os_info = obj.os_info;
        sensorhub.conn_id = obj.conn_id;
        sensorhub.conn_type = obj.conn_type;
        if ( MSG_TYPE.SENSORHUB_CONNECT === messageType){
          sensorhub.connect = message;
          var eventMsgObj = JSON.parse(message);
          var wsnEvent = WSNEVENTS[3].event; //eSenHub_Disconnect
          if ( eventMsgObj.susiCommData.status === 1 || eventMsgObj.susiCommData.status === '1' ){
            wsnEvent = WSNEVENTS[2].event; //eSenHub_Connected
          }
   
          eventEmitterObj.emit(groupName, groupName, wsnEvent, eventMsgObj);
        }

        if ( MSG_TYPE.SENSORHUB_INFO_SPEC === messageType){
          message = message.replace(/[\u0000-\u0019]+/g,""); // eric add to remove not viewable syntax 

	        var keyStr = '';
          var fullInfoObj = JSON.parse(message);
          
          // <DataLog>
          //{"SenData":{"e":[{"n":"GPIO2","u":"","bv":false,"min":false,"max":true,"asm":"r","type":"b"}],"bn":"SenData"},"Info":{"e":[],"bn":"Info"},"Net":{"e":[],"bn":"Net"},"Action":{"e":[],"bn":"Action"},"ver":1}

          appendDataLog( fullInfoObj.susiCommData.infoSpec.SenHub ); // <SenHubID>/API-GW

          append_opTS(fullInfoObj.susiCommData.infoSpec.SenHub); // < opTS >

          //{"SenData":{"e":[{"n":"GPIO2","u":"","bv":false,"min":false,"max":true,"asm":"r","type":"b"}],"bn":"SenData"},"Info":{"e":[],"bn":"Info"},"Net":{"e":[],"bn":"Net"},"Action":{"e":[],"bn":"Action"},"ver":1,"dataFlow":"<DevID>/<NetType>/API-GW","seq":"9_1530257498095"}
          advDataflowWrite('Capability', fullInfoObj.susiCommData.infoSpec.SenHub.seq, fullInfoObj.susiCommData.infoSpec.SenHub.dataFlow, '' );
          sensorhub.dev_info_spec = JSON.stringify(fullInfoObj); // append data log msg          
          //sensorhub.dev_info_spec = message;

          var eventMsgObj = JSON.parse(JSON.stringify(fullInfoObj.susiCommData.infoSpec));

          buildFullInfoObj(false, keyStr, fullInfoObj);
	        sensorhub.dev_full_info = JSON.stringify(fullInfoObj.susiCommData.infoSpec);
          //advLogWrite(LOG_DEBUG, '-----------');
          //advLogWrite(LOG_DEBUG, 'sensorhub.dev_full_info ==== ' + sensorhub.dev_full_info);
          eventMsgObj.agentID = device_id;
          eventEmitterObj.emit(groupName, groupName, WSNEVENTS[4].event, eventMsgObj);

          /* send generate html event */
          if ( getOSType( sensorhub.os_info ) === OS_TYPE.NONE_IP_BASE ){
            var rootRESTful = 'SenHub/' + obj.conn_type + '/' + device_id + '/' + sensorhub.conn_id; 
          }
          else{
            var connectivityObj = ConnectivityMap.get(gHostConnectivity);
            var rootRESTful = 'SenHub/' + connectivityObj.conn_type + '/' + device_id + '/' + gHostConnectivity; 
          }
          genHtmlEventObj.emit(groupName, EVENT.eSensorHub_GenHtml, rootRESTful, sensorhub.dev_full_info);
          //
          //advLogWrite(LOG_DEBUG, '-----------');
        }        
        if ( MSG_TYPE.SENSORHUB_INFO === messageType){ 
	        var keyStr = '';
          var partialInfoObj = JSON.parse(message);         
          var fullInfoObj    = JSON.parse(sensorhub.dev_full_info);

          if( typeof fullInfoObj === 'undefined' ) return;

          // <DataLog>
          // {"SenData":{"e":[{"n":"GPIO2","bv":false}],"bn":"SenData"},"Info":{"e":[],"bn":"Info"},"Net":{"e":[],"bn":"Net"},"Action":{"e":[],"bn":"Action"},"ver":1}
          var prefixePath = device_id + '/' + sensorhub.conn_type;
          appendDataLog( partialInfoObj.susiCommData.data.SenHub ); // <SenHubID>/API-GW       
          append_opTS( partialInfoObj.susiCommData.data.SenHub ); // < opTS >
   
          //{"SenData":{"e":[{"n":"GPIO2","bv":false}],"bn":"SenData"},"Info":{"e":[],"bn":"Info"},"Net":{"e":[],"bn":"Net"},"Action":{"e":[],"bn":"Action"},"ver":1,"dataFlow":"<DevID>/<NetType>/API-GW","seq":"13_1530258505588"}
          advDataflowWrite('Report', partialInfoObj.susiCommData.data.SenHub.seq, partialInfoObj.susiCommData.data.SenHub.dataFlow, '' );

          try{
            if( typeof fullInfoObj.SenHub != 'undefined')
            {
              fullInfoObj.SenHub.dataFlow = partialInfoObj.susiCommData.data.SenHub.dataFlow;
              fullInfoObj.SenHub.seq = partialInfoObj.susiCommData.data.SenHub.seq;
              fullInfoObj.SenHub.opTS = partialInfoObj.susiCommData.data.SenHub.opTS;
            }
          }catch(e){
            advLogWrite( LOG_ERROR, 'fullInfoObj.SenHub is null'  );
            return;
          }
          sensorhub.dev_info = JSON.stringify(partialInfoObj); // append data log msg
          //sensorhub.dev_info = message;          


          convertJsonObjToRESTFulArrayValueMap(device_id, keyStr, partialInfoObj.susiCommData.data);

	        var keyStr = '';
	        setRESTFulArrayValueMapToJsonObj( device_id, keyStr, fullInfoObj); 
	        sensorhub.dev_full_info = JSON.stringify(fullInfoObj);
          //advLogWrite(LOG_DEBUG, '-----------');
          //advLogWrite(LOG_DEBUG, 'UPDATE: sensorhub.dev_full_info ==== ' + sensorhub.dev_full_info);
          //advLogWrite(LOG_DEBUG, 'WSNEVENTS  ==== ' + WSNEVENTS[5].event);
          var eventMsgObj = partialInfoObj.susiCommData.data;
          eventMsgObj.agentID = device_id;
          eventMsgObj.sendTS = partialInfoObj.susiCommData.sendTS;
/*
          advLogWrite(LOG_DEBUG, '============================================');
          advLogWrite(LOG_DEBUG, 'eventMsg = ' + JSON.stringify(eventMsgObj));
          advLogWrite(LOG_DEBUG, '============================================');
*/
          eventEmitterObj.emit(groupName, groupName, WSNEVENTS[5].event, eventMsgObj);
          //advLogWrite(LOG_DEBUG, '-----------');
            
          /*
	          RESTFulArrayValueMap.forEach(function(obj, key) {
            advLogWrite(LOG_DEBUG, 'UPDATE: key = '+ key + ', restPath = ' + obj.path + ', restPath val = ' + obj.val);
          });
          */
        }            
        
        SensorHubMap.set(device_id, sensorhub );

        if ( MSG_TYPE.SENSORHUB_CONNECT === messageType){
          /**/
          if ( getOSType( sensorhub.os_info ) === OS_TYPE.IP_BASE ){
            
            sendIPBaseConnectivityInfoEvent();

          }

        }        
        return;
      }
    }
  });
               
}

function sendTotalConnectivityCapabilityEvent(){
  //send total connectivity capability EVENT
  var totalCapability = getIoTGWConnectivityCapability( DATATYPE.CONNECTIVITY_INFOSPEC );
  var eventMsgObj = JSON.parse(totalCapability);
  eventEmitterObj.emit(groupName, groupName, WSNEVENTS[0].event, eventMsgObj);
}

function sendIPBaseConnectivityInfoEvent(){

  var connectivityObj = ConnectivityMap.get(gHostConnectivity);
  var connType = connectivityObj.conn_type;
  var deviceID = connectivityObj.conn_id;
  var connectivityInfo = buildIPBaseConnectivityInfo();

  var eventMsgObj={};
  eventMsgObj.IoTGW = {};
  appendDataLog(eventMsgObj.IoTGW); // <DataLog> Ethernet uses "API-GW" as root of data source
  append_opTS(eventMsgObj.IoTGW); // <opTS>

  advDataflowWrite( 'Capability', eventMsgObj.IoTGW.seq, eventMsgObj.IoTGW.dataFlow, '' ); 

  eventMsgObj.IoTGW[connType]={};
  eventMsgObj.IoTGW[connType][deviceID]={};
  eventMsgObj.IoTGW[connType][deviceID]= JSON.parse(connectivityInfo);
  eventMsgObj.IoTGW[connType].bn = connType;
  eventMsgObj.IoTGW.ver = 1;
  eventEmitterObj.emit(groupName, groupName, WSNEVENTS[1].event, eventMsgObj);

}


function getMsgType(topic, jsonObj){
  
    var topic_arr = topic.toString().split('/');
    //console.log('=======> topic_arr[4] =' + topic_arr[4]);
  
    if ( topic_arr[4] === 'notify'){
      return MSG_TYPE.VGW_HEART_BEAT;
    }

    if ( topic_arr[4] === 'agentinfoack'){
        //console.log('jsonObj.susiCommData.type =' + jsonObj.susiCommData.type + ',jsonObj.susiCommData.commCmd ='  + jsonObj.susiCommData.commCmd);
        if ( jsonObj.susiCommData.type === 'IoTGW' && 
             jsonObj.susiCommData.commCmd === 1 ){
             if ( jsonObj.susiCommData.status === 1){
                 return MSG_TYPE.VGW_CONNECT;
             }
             if ( jsonObj.susiCommData.status === 0){
                 return MSG_TYPE.VGW_DISCONNECT;
             }
        }
      
        if ( jsonObj.susiCommData.type === 'SenHub' && 
             jsonObj.susiCommData.commCmd === 1 ){
             if ( jsonObj.susiCommData.status === '1' || jsonObj.susiCommData.status === 1){
                 return MSG_TYPE.SENSORHUB_CONNECT;
             }
             if ( jsonObj.susiCommData.status === '0' || jsonObj.susiCommData.status === 0){
                 return MSG_TYPE.SENSORHUB_DISCONNECT;
             }
        }   

        if( jsonObj.susiCommData.type !== 'undefined' )
          return MSG_TYPE.VGW_SERVICE_CONNECT;
    }
  
    if ( topic_arr[4] === 'agentactionreq'){
        if ( jsonObj.susiCommData.commCmd === 116 ){
            return MSG_TYPE.VGW_OS_INFO;
        }
      
        if ( jsonObj.susiCommData.commCmd === 2052 ){
            if ( typeof jsonObj.susiCommData.infoSpec.IoTGW !== 'undefined' ){
                return MSG_TYPE.VGW_INFO_SPEC;
            }  
          
            if ( typeof jsonObj.susiCommData.infoSpec.SenHub !== 'undefined' ){
                return MSG_TYPE.SENSORHUB_INFO_SPEC;
            }  
        }
       
        if ( jsonObj.susiCommData.commCmd === 526 ){
            if ( jsonObj.susiCommData.handlerName === 'SenHub' ){
                return MSG_TYPE.SENSORHUB_SET_RESPONSE;
            }

            if ( jsonObj.susiCommData.handlerName === 'IoTGW' ){
                return MSG_TYPE.CONNECTIVITY_SET_RESPONSE;
            }
        }
  
        if ( jsonObj.susiCommData.commCmd === 128 ){
          return MSG_TYPE.VGW_QUERY_HEART_BEAT_VALUE_RESPONSE;
        }

        if ( jsonObj.susiCommData.commCmd === 130 ){
          return MSG_TYPE.VGW_CHANGE_HEART_BEAT_VALUE_RESPONSE;
        }
 
    }
  
    if ( topic_arr[4] === 'deviceinfo'){   
        if ( jsonObj.susiCommData.commCmd === 2055 ){
            if ( typeof jsonObj.susiCommData.data.IoTGW !== 'undefined' ){
                return MSG_TYPE.VGW_INFO;
            }  
          
            if ( typeof jsonObj.susiCommData.data.SenHub !== 'undefined' ){
                return MSG_TYPE.SENSORHUB_INFO;
            }          
          
        }       
    }  
  
    if ( topic_arr[4] === 'willmessage'){
        return MSG_TYPE.VGW_WILLMESSAGE;
    }
    
    
    return MSG_TYPE.UNKNOWN;
}

function getStatusFromMsg( connectMsg ){
  
  //console.log('connectMsg = ' + connectMsg);
  try {
      var msgObj = JSON.parse(connectMsg.toString());
      var status = msgObj.susiCommData.status;
      if ( status === 1 || status === '1' ){
        return 'on';
      }    
  } catch (e) {
      return 'off';
  }   
  
  return 'off';
}


function getOSType( osInfo ){

  //console.log('[getOSType]osInfo = ' + osInfo);
  if ( typeof osInfo === 'undefined' || osInfo === 'null' ){
    return 'null';
  }
 
  try {
      var os_info_obj = JSON.parse( osInfo );
  } catch (e) {
      console.error(e);
      return 'null';
  }  
  
  if ( is_ip_valid( os_info_obj.susiCommData.osInfo.IP) === true ){
    //console.log('osInfo : ' + OS_TYPE.IP_BASE);
    return OS_TYPE.IP_BASE;
  }
  else{
    //console.log('osInfo : ' + OS_TYPE.NONE_IP_BASE);
    return OS_TYPE.NONE_IP_BASE;
  }  
  
  return 'null';
  
}

function removeVGW( vgw_id ){

    advLogWrite(LOG_INFO, '['+ vgw_id + '] removeVGW');
    //console.log('--------------------------------------------------------------');
  
    //if ( getOSType(vgw_id) == OS_TYPE.NONE_IP_BASE){
    var osType;
      //console.log('Show all VgwMap. count= ' + VgwMap.count());
      VgwMap.forEach(function(obj, key) {
        //console.log('key = ' + key); 
        if ( vgw_id === key ){
          //console.log('VgwMap.remove() key = ' + key);
          osType = getOSType(obj.os_info);
          VgwMap.remove(key);
        }
      });
/*     
      console.log('Show all VgwMap. count= ' + VgwMap.count());
      console.log('--------------------------------------------------------------');    
      console.log('Show all ConnectivityMap. count= ' + ConnectivityMap.count());
*/
      ConnectivityMap.forEach(function(obj, key) {
        //console.log('key = ' + key); 
        if ( vgw_id === obj.vgw_id ){
/*
           console.log('ConnectivityMap.remove() key = ' + key);

           console.log('----');
           console.log('vgw_id = ' + obj.vgw_id);
           console.log('conn_id = ' + obj.conn_id);
           console.log('conn_type = ' + obj.conn_type);
           console.log('os info = \n' + obj.os_info);
           console.log('conn dev_info_spec = \n' + obj.dev_info_spec);
           console.log('conn dev_info = \n' + obj.dev_info);
           console.log('conn dev_capability = \n' + obj.dev_capability);
           //console.log('conn_type = ' + obj.conn_type);
           console.log('----');
*/
           ConnectivityMap.remove(key);

           /* send delete html event */
           var rootRESTful = 'IoTGW/' + obj.conn_type + '/' + key; 
           genHtmlEventObj.emit(groupName, EVENT.eConnectivity_DelHtml, rootRESTful, '');
        }
      });
/*     
      console.log('Show all ConnectivityMap. count= ' + ConnectivityMap.count());
      console.log('--------------------------------------------------------------');
      console.log('Show all SensorHubMap. count= ' + SensorHubMap.count());
*/
      SensorHubMap.forEach(function(obj, key) {
        //console.log('key = ' + key); 
        if ( vgw_id === obj.vgw_id ){
/*
           console.log('SensorHubMap.remove() key = ' + key);
           
           console.log('----');
           console.log('vgw_id = ' + obj.vgw_id);
           console.log('conn_id = ' + obj.conn_id);
           console.log('conn_type = ' + obj.conn_type);
           console.log('os info = \n' + obj.os_info);
           console.log('sensorhub connect = \n' + obj.connect);
           console.log('sensorhub dev_info_spec = \n' + obj.dev_info_spec);
           console.log('sensorhub dev_info = \n' + obj.dev_info);
           //console.log('conn_type = ' + obj.conn_type);
           console.log('----');
           */
           SensorHubMap.remove(key);
           /* send delete html event */
           var rootRESTful = 'SenHub/' + obj.conn_type + '/' + key + '/' + obj.conn_id; 
           genHtmlEventObj.emit(groupName, EVENT.eSensorHub_DelHtml, rootRESTful, '');
        }
      });     
      //console.log('Show all SensorHubMap. count= ' + SensorHubMap.count());
    //}
    //console.log('--------------------------------------------------------------');  

    if ( osType === OS_TYPE.NONE_IP_BASE){
      //send total connectivity capability EVENT
      sendTotalConnectivityCapabilityEvent();
    }

    if ( osType === OS_TYPE.IP_BASE){
      sendIPBaseConnectivityInfoEvent();
    }

}

function removeAllVGW( ) 
{
   VgwMap.forEach( function( obj, key) {
	removeVGW( key );
   });
}



function is_ip_valid( ip ){
  
  //console.log( '[is_ip_valid] ip = ' + ip);
  var ip_arr=ip.split('.');
  //console.log( 'ip_arr.length = ' + ip_arr.length);
  if (ip_arr.length !== 4 ){
      return false;
  }
  
  if ( (ip_arr[0] >= 0 && ip_arr[0] < 256) &&
       (ip_arr[1] >= 0 && ip_arr[1] < 256) &&
       (ip_arr[2] >= 0 && ip_arr[2] < 256) &&
       (ip_arr[3] >= 0 && ip_arr[3] < 256)){
      return true;      
  }
  
  return false;
}

function listRESTFulObj( apiPath, keyStr, jsonObj, outputObj ){
/*
  if ( apiPath === '/' ){
    //console.log( 'apiPath =======>' + apiPath + ', KeyVal=======>' + JSON.stringify(jsonObj));
    outputObj.ret = JSON.stringify(jsonObj);
    return;
  }
*/
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      //var jsonKeyStr = keyStr + '/' + key ;
      //if ( apiPath === jsonKeyStr || apiPath === jsonKeyStr + '/' ){
      if ( jsonObj[key] !== 'object'){
         console.log( 'keyStr =======>' + keyStr + ', jsonKeyVal=======>' + JSON.stringify(jsonObj[key]));
        //outputObj.ret = JSON.stringify(jsonObj[key]);
      }
    }
  }
  //
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      if (typeof jsonObj[key] === 'object' ){
        listRESTFulObj( apiPath, keyStr + '/' + key, jsonObj[key], outputObj);
      }
    }
  }

  return;

}


function setRESTFulArrayValueMapToJsonObj( deviceID, keyStr, jsonObj){
  
  var regexArrayPath = new RegExp('e\/[0-9]+\/n\/?$');
	
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      var jsonKeyStr = keyStr + '/' + key ; 
      if ( typeof jsonObj[key] !==  'object' ){
	if ( regexArrayPath.test(jsonKeyStr) ){
	  var restPath = jsonKeyStr.replace(/e\/[0-9]+\/n\/?$/g,jsonObj[key]);
 	
	  restPath = restPath.replace(/^\//g,'');
          var mapID = deviceID + '/' + restPath;
	  var restObj = RESTFulArrayValueMap.get(mapID);
	  if ( typeof restObj !== 'undefined'){
	    //console.log( '[setRESTFulArrayValueMapToJsonObj]jsonKeyStr =======>' + jsonKeyStr + ', jsonKeyVal=======>' + JSON.stringify(jsonObj[key]));	  
            jsonObj[restObj.valKey] = restObj.val;
            RESTFulArrayValueMap.remove(mapID);
            //console.log( 'RESTFulArrayValueMap.count() = ' + RESTFulArrayValueMap.count());
	  }
	}
        
      }
    }
  }
  //
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      if (typeof jsonObj[key] === 'object' ){
        setRESTFulArrayValueMapToJsonObj( deviceID, keyStr + '/' + key, jsonObj[key]);
      }
    }
  }  
	
  return;  

}


function buildFullInfoObj( removeASMkey, keyStr, jsonObj){
  
  var regexArrayPath = new RegExp('e\/[0-9]+\/[A-Z a-z 0-9]+\/?$');
  var regexArrayOKPath = new RegExp('e\/[0-9]+\/(n|v|sv|bv|asm)\/?$');
  var regexArrayASMPath = new RegExp('e\/[0-9]+\/asm\/?$');
	
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      var jsonKeyStr = keyStr + '/' + key ;
      //console.log( '[buildFullInfoObj]jsonKeyStr =======>' + jsonKeyStr + ', jsonKeyVal=======>' + JSON.stringify(jsonObj[key]));
      if ( regexArrayPath.test(jsonKeyStr) ){
	if (regexArrayOKPath.test(jsonKeyStr) === false ){
          //console.log('delete ' + jsonKeyStr);
          delete jsonObj[key];
	}

	if (regexArrayASMPath.test(jsonKeyStr) === true ){
          if ( removeASMkey === true ){
            delete jsonObj[key];
          }
	}

      }
    }
  }
  //
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      if (typeof jsonObj[key] === 'object' ){
	//outputObj[key] = {};
        buildFullInfoObj( removeASMkey, keyStr + '/' + key, jsonObj[key]);
      }
    }
  }  
	
  return;  

}


function convertJsonObjToRESTFulArrayValueMap( deviceID, keyStr, jsonObj ){
  
  var regexArrayPath = new RegExp('e\/[0-9]+\/n\/?$');
	
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      var jsonKeyStr = keyStr + '/' + key ; 
      if ( typeof jsonObj[key] !==  'object' ){
	if ( regexArrayPath.test(jsonKeyStr) ){
          //console.log( '[convertJsonObjToRESTFulArrayValueMap]jsonKeyStr =======>' + jsonKeyStr + ', jsonKeyVal=======>' + JSON.stringify(jsonObj[key]));
	  var restPath = jsonKeyStr.replace(/e\/[0-9]+\/n\/?$/g,jsonObj[key]);
          var restPathValue;
          var restPathValueKey;
          if ( typeof jsonObj['v'] !== 'undefined' ){
            restPathValue = jsonObj['v'];
 	    restPathValueKey = 'v';
	  }
          if ( typeof jsonObj['sv'] !== 'undefined' ){
            restPathValue = jsonObj['sv']; 
            restPathValueKey = 'sv';
	  }	
          if ( typeof jsonObj['bv'] !== 'undefined' ){
            restPathValue = jsonObj['bv'];
	    restPathValueKey = 'bv';	  
	  }		
	  
	  var restObj = {};
          restObj.path = restPath.replace(/^\//g,'');
	  restObj.val = restPathValue;
          restObj.valKey = restPathValueKey;
	  //outputObj.push(restObj);
          //console.log('mapID = ' + deviceID + '/' + restObj.path );
	  RESTFulArrayValueMap.set(deviceID + '/' + restObj.path, restObj);
          //console.log('restObj.path = ' + restObj.path + ', restObj.val = ' + restObj.val + ', restObj.valKey = ' + restObj.valKey);
	}
        
      }
    }
  }
  //
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      if (typeof jsonObj[key] === 'object' ){
        convertJsonObjToRESTFulArrayValueMap( deviceID, keyStr + '/' + key, jsonObj[key]);
      }
    }
  }  
	
  return;  

}


function getRESTFulValue( apiPath, keyStr, jsonObj, outputObj ){
  
  if ( apiPath === '/' ){
    //console.log( 'apiPath =======>' + apiPath + ', KeyVal=======>' + JSON.stringify(jsonObj));
    outputObj.ret = JSON.stringify(jsonObj);
    return;
  } 
 
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      var jsonKeyStr = keyStr + '/' + key ; 
      if ( apiPath === jsonKeyStr || apiPath === jsonKeyStr + '/' ){
        //console.log( 'jsonKeyStr =======>' + jsonKeyStr + ', jsonKeyVal=======>' + JSON.stringify(jsonObj[key]));
        outputObj.ret = JSON.stringify(jsonObj[key]);
      }
    }
  }
  //
  for (key in jsonObj) {
    if (jsonObj.hasOwnProperty(key)) {
      if (typeof jsonObj[key] === 'object' ){
        getRESTFulValue( apiPath, keyStr + '/' + key, jsonObj[key], outputObj);
      }
    }
  }  
	
  return;  

}

function getIoTGWConnectivityCapability( dataType ){
  
  //console.log('getTotalConnectivityCapability');
  IoTGWCapability = {};
  IoTGWCapability.IoTGW = {};

  /*Add NONE_IP_BASE  connectivity*/
  ConnectivityMap.forEach(function(obj, key) {
   
    if ( getOSType( obj.os_info ) !== OS_TYPE.NONE_IP_BASE ){
      return;
    } 
    
    //console.log('----');
    //console.log('key = ' + key); 
    //console.log('conn dev_capability = \n' + obj.dev_capability);
    var connectivityName = obj.conn_id;
    var connectivityType = obj.conn_type;
    
    if ( typeof IoTGWCapability.IoTGW[connectivityType] === 'undefined' ){
      IoTGWCapability.IoTGW[connectivityType] = {};
    }      
    if ( typeof IoTGWCapability.IoTGW[connectivityType][connectivityName] === 'undefined' ){
      IoTGWCapability.IoTGW[connectivityType][connectivityName] = {};
    } 
    IoTGWCapability.IoTGW[connectivityType]['bn'] = connectivityType;
        
    switch (dataType){
      case DATATYPE.CONNECTIVITY_INFOSPEC:
      {
        IoTGWCapability.IoTGW[connectivityType][connectivityName] = JSON.parse(obj.dev_info_spec);
        break;
      }
      case DATATYPE.CONNECTIVITY_INFO:
      {
        var keyStr = '';
        var infoObj = JSON.parse(obj.dev_full_info);
        buildFullInfoObj(true, keyStr, infoObj);
        IoTGWCapability.IoTGW[connectivityType][connectivityName] = infoObj;
        break;
      }
      case DATATYPE.CONNECTIVITY_CAPABILITY:
      {
        var keyStr = '';
        var infoObj = JSON.parse(obj.dev_full_info);
        buildFullInfoObj(false, keyStr, infoObj);
        IoTGWCapability.IoTGW[connectivityType][connectivityName] = infoObj;
        break;
      }
      default:
      {
        break;
      }
    }
    //console.log('----');

  });       

  
  /*Add IP_BASE  connectivity*/
  var obj = ConnectivityMap.get(gHostConnectivity);

  if ( typeof obj !== 'undefined' ){ 
    var connectivityName = obj.conn_id;
    var connectivityType = obj.conn_type;

    if ( typeof IoTGWCapability.IoTGW[connectivityType] === 'undefined' ){
      IoTGWCapability.IoTGW[connectivityType] = {};
    }      
    if ( typeof IoTGWCapability.IoTGW[connectivityType][connectivityName] === 'undefined' ){
      IoTGWCapability.IoTGW[connectivityType][connectivityName] = {};
    } 
    IoTGWCapability.IoTGW[connectivityType]['bn'] = connectivityType;

    switch (dataType){
      case DATATYPE.CONNECTIVITY_INFOSPEC:
      {
        IoTGWCapability.IoTGW[connectivityType][connectivityName] = JSON.parse(obj.dev_info_spec);
        break;
      }
      case DATATYPE.CONNECTIVITY_INFO:
      {
        var connectivityInfo = buildIPBaseConnectivityInfo();
/*
        console.log('*****************************************');
        console.log('[getIoTGWConnectivityCapability] connectivityInfo =' + connectivityInfo);
        console.log('*****************************************');
*/
        IoTGWCapability.IoTGW[connectivityType][connectivityName] = JSON.parse(connectivityInfo);
        break;
      }
      default:
      {
        break;
      }
    }
  }
  return JSON.stringify(IoTGWCapability);
}

function buildIPBaseConnectivityInfo(){

  var obj = ConnectivityMap.get(gHostConnectivity);
  var keyStr = '';
  var devinfoObj = JSON.parse(obj.dev_info);

  var sensorHubAllList = '';
  SensorHubMap.forEach(function(obj, key) {
    if ( getOSType(obj.os_info ) === OS_TYPE.IP_BASE ){
      if ( sensorHubAllList.length !== 0){
        sensorHubAllList += ',';
      }
      sensorHubAllList += key;
    }
  });

  devinfoObj['Info']['e'][0]['sv'] = sensorHubAllList;
  devinfoObj['Info']['e'][1]['sv'] = sensorHubAllList;
/*
  console.log('*****************************************');
  console.log('[buildIPBaseConnectivityInfo] devinfoObj =' + JSON.stringify(devinfoObj));
  console.log('*****************************************');
*/
  return JSON.stringify(devinfoObj);
}

function getUriType( uri ){

  var uriList = uri.split('/');
  var category = uriList[0];

  if ( category === 'Connectivity' ){
    return URI_TYPE.CONNECTIVITY ;
  }
  else if ( category === 'SenHub' ){
    return URI_TYPE.SENSORHUB ;
  }
  else if ( category === 'list' )
  return URI_TYPE.LIST ;
  else if ( category === g_eEndPoints[URI_TYPE.MGT] || typeof category === 'undefined' )
  return URI_TYPE.MGT ;  

  return 'null';
}

 
function getRESTfulArrayValue( isAsm, path, jsonData, outObj ){
  
  var newPath = path.replace(/\/([A-Z a-z 0-9_]*)\/?$/g,'/e/');
  var pathPattern = path.replace(/\/([A-Z a-z 0-9_]*)\/?$/g,'/');
  var keyName = path.replace(pathPattern, '');
  keyName = keyName.replace(/\//g, '');
  var i=0;
  var InfoPath;
  var tmpValueObj;

  //console.log('============== newPath = ' + newPath);
  //console.log('============== pathPattern = ' + pathPattern);
  //console.log('============== keyName = ' + keyName);

    do{
        tmpValue = {};
        keyStr = '' ;
        InfoPath = newPath + i;
        //console.log('InfoPath  = ' + InfoPath);
        getRESTFulValue(InfoPath, keyStr, jsonData, tmpValue);
        //console.log('tmpValue.ret = ' + tmpValue.ret);

        if ( typeof tmpValue.ret !== 'undefined' ){
          tmpValueObj = JSON.parse(tmpValue.ret);
          if ( tmpValueObj.n === keyName ){
            if ( typeof tmpValueObj.v !== 'undefined'){
              var result = { v:tmpValueObj.v };
              outObj.ret = JSON.stringify(result);
            }
            if ( typeof tmpValueObj.sv !== 'undefined'){
              var result = { sv:tmpValueObj.sv };
              outObj.ret = JSON.stringify(result);
            }
            if ( typeof tmpValueObj.bv !== 'undefined'){
              var result = { bv:tmpValueObj.bv };
              outObj.ret = JSON.stringify(result);
            }
            if ( isAsm === true ){
              //console.log('tmpValue.asm = ' + tmpValueObj.asm );
              //get access rigth
              outObj.ret = tmpValueObj.asm;
            }
             
            return 0;
          }
        }
        i++;
    } while ( typeof tmpValue.ret !== 'undefined' );

    return -1;
}

function getConnectivityRESTful( uri, outObj ){

  var path = uri.replace(/^Connectivity/g,'');
  var tmpValue;
  var capability;
  var jsonData;
  var keyStr;

  /* ex: RESTful API path: Connectivity/ */
  if ( path === '' || path === '/' ){
    capability = getIoTGWConnectivityCapability( DATATYPE.CONNECTIVITY_INFOSPEC );
    jsonData = JSON.parse(capability);
    keyStr = '';
    getRESTFulValue('/', keyStr, jsonData, outObj);
    return RESTFUL_VAL_TYPE.SUCCESS;
  }

  tmpValue = {};
  capability = getIoTGWConnectivityCapability( DATATYPE.CONNECTIVITY_INFO );
  jsonData = JSON.parse(capability);
  keyStr = '';
  getRESTFulValue(path, keyStr, jsonData, tmpValue);
  //console.log('=============== tmpValue.ret = ' + tmpValue.ret);
  
  if ( typeof tmpValue.ret !== 'undefined' ){
    outObj.ret = tmpValue.ret;
    return RESTFUL_VAL_TYPE.SUCCESS;
  }
  else{
    if ( getRESTfulArrayValue(false, path, jsonData, outObj) === 0){
      var capability = getIoTGWConnectivityCapability( DATATYPE.CONNECTIVITY_CAPABILITY );
      var jsonData = JSON.parse(capability);
      var asmObj = {};
      asmObj.ret = {};
      getRESTfulArrayValue(true, path, jsonData, asmObj);
      console.log('=============== asmObj.ret = ' + asmObj.ret);
      if ( asmObj.ret === 'w' || asmObj.ret === 'rw' || asmObj.ret === 'wr' ){
        return RESTFUL_VAL_TYPE.ARRAY_ELEMENT ;
      }

      return RESTFUL_VAL_TYPE.READ_ONLY;
    }
  }

  return RESTFUL_VAL_TYPE.ERROR;

}

function getSensorHubRESTful(uri, outObj){

  var path = uri.replace(/\/$/g,'');
  var pathArray = path.split('/');
  var deviceID = pathArray[1];

  //console.log('[getSensorHubRESTful] path = ' + path + ', pathArray length = ' + pathArray.length);
  var regexAllSenHubList = new RegExp('\/AllSenHubList\/?$');
  var regexDevInfo = new RegExp('\/DevInfo\/?$');

  /* SenHub/AllSenHubList */
  if ( pathArray.length === 2 && regexAllSenHubList.test(path) ){

    //console.log('DATATYPE.SENSORHUB_ALL_LIST ===============');
    var sensorHubAllListObj = {};
    sensorHubAllListObj.n = 'AllSenHubList';
    sensorHubAllListObj.sv = '';

    var sensorHubAllList = '';
    SensorHubMap.forEach(function(obj, key) {
      if ( sensorHubAllList.length !== 0){
        sensorHubAllList += ',';
      }
      sensorHubAllList += key;
    });
    sensorHubAllListObj.sv = sensorHubAllList;
    outObj.ret = JSON.stringify(sensorHubAllListObj);
    return RESTFUL_VAL_TYPE.SUCCESS;
  }

  /* SenHub/<deviceID> */
  if ( pathArray.length === 2 ){
    //console.log('DATATYPE.SENSORHUB_INFOSPEC_INFO ===============');
    if ( SensorHubMap.has(deviceID) === true ){
      var sensorHub = SensorHubMap.get(deviceID);
      if (typeof sensorHub !== 'undefined') {
        var devInfoObj = JSON.parse(sensorHub.dev_info_spec);
	      if( devInfoObj == undefined ) {
		      console.log('[getSensorHubRESTful] Error senhub info spce is not ready.');
		      return RESTFUL_VAL_TYPE.ERROR;
        }
        outObj.ret = JSON.stringify(devInfoObj.susiCommData.infoSpec);
        return RESTFUL_VAL_TYPE.SUCCESS;
      }
    }
  }

  /* SenHub/<deviceID>/DevInfo */
  if ( pathArray.length === 3 && regexDevInfo.test(path) ){
    
    //console.log('DATATYPE.SENSORHUB_CONNECT_INFO ===============');
    if ( SensorHubMap.has(deviceID) === true ){
      var sensorHub = SensorHubMap.get(deviceID);
      if (typeof sensorHub !== 'undefined') {
        var devInfoObj = JSON.parse(sensorHub.connect);
        outObj.ret = JSON.stringify(devInfoObj.susiCommData);
        return RESTFUL_VAL_TYPE.SUCCESS;
      }
    }

  }

  /**/
  if ( pathArray[2] === 'SenHub' ){

    //console.log('DATATYPE.SENSORHUB_INFO ===============');
    var pathPattern = pathArray[0] + '/' + pathArray[1] + '/' + pathArray[2];
    var newPath = path.replace(pathPattern,'');
    if ( newPath === '' ){
      newPath = '/';
    }
    //console.log('[getSensorHubRESTful] newPath = ' + newPath );
    
    if ( SensorHubMap.has(deviceID) === true ){
      var sensorHub = SensorHubMap.get(deviceID);
      if (typeof sensorHub !== 'undefined') {
        var devInfoObj = JSON.parse(sensorHub.dev_full_info);
        buildFullInfoObj(true, keyStr, devInfoObj);
        //var devInfoObj = JSON.parse(sensorHub.dev_full_info);
        var tmpValue = {};
        var jsonData = devInfoObj.SenHub;
        var keyStr = '';
        getRESTFulValue(newPath, keyStr, jsonData, tmpValue);
        //console.log('=============== tmpValue.ret = ' + tmpValue.ret);

        if ( typeof tmpValue.ret !== 'undefined' ){
          outObj.ret = tmpValue.ret;
          return RESTFUL_VAL_TYPE.SUCCESS;
        }
        else{
          if ( getRESTfulArrayValue(false, newPath, jsonData, outObj) === 0){
            var devInfoObj = JSON.parse(sensorHub.dev_full_info);
            buildFullInfoObj(false, keyStr, devInfoObj);
            var tmpValue = {};
            var jsonData = devInfoObj.SenHub;
            var keyStr = '';
            var asmObj={};
            asmObj.ret = {};
            getRESTfulArrayValue(true, newPath, jsonData, asmObj);
            console.log('=============== asmObj.ret = ' + asmObj.ret);
            if ( asmObj.ret === 'w' || asmObj.ret === 'rw' || asmObj.ret === 'wr' ){
              return RESTFUL_VAL_TYPE.ARRAY_ELEMENT ;
            }
            
            return RESTFUL_VAL_TYPE.READ_ONLY;
          }
        }

      }
    }
  }


  return RESTFUL_VAL_TYPE.ERROR;

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

var wsnget = function( uri, inParam, outData ) {
   
  //advLogWrite(LOG_DEBUG, 'uri = ' + uri);
  console.log('uri = ' + uri);
  var uriType = getUriType ( uri );

  switch( uriType ){
    case URI_TYPE.LIST:
    {        
      advLogWrite(LOG_DEBUG,'URI_TYPE.LIST ===============');          
      getListRESTful( uri, outData, g_eEndPoints );
      break;
    }    
    case URI_TYPE.MGT:
    {
      advLogWrite(LOG_DEBUG,'URI_TYPE.MGT ===============');
      getMgtRESTful( uri, outData );
      break;
    }    
    case URI_TYPE.CONNECTIVITY:
    {

      if ( getConnectivityRESTful(uri, outData) === RESTFUL_VAL_TYPE.ERROR ){
        advLogWrite(LOG_ERROR, 'get ' + uri + ' fail !!!');
      }

      break;
    }
    case URI_TYPE.SENSORHUB:
    {
      advLogWrite(LOG_DEBUG, 'URI_TYPE.SENSORHUB ===============');
      if ( getSensorHubRESTful(uri, outData) === RESTFUL_VAL_TYPE.ERROR ){
        advLogWrite(LOG_ERROR, 'get ' + uri + ' fail !!!');
      }
      break;
    }
    default:
    {
      break;
    }
  }
      
  advLogWrite(LOG_DEBUG, '-----------------------------------------');
  advLogWrite(LOG_DEBUG, outData.ret);
  advLogWrite(LOG_DEBUG, '-----------------------------------------'); 
 
  var code = STATUS.NOT_FOUND;
  
  if ( typeof outData.ret !== 'undefined' ){
    outData.ret = outData.ret.toString();
    code = STATUS.OK;
  }

  return code;
}

var wsnput = function( path, data, res, callback ) {
  
  advLogWrite(LOG_DEBUG, 'wsnput uri ==== ' + path);
  advLogWrite(LOG_DEBUG, 'wsnput data ==== ' + JSON.stringify(data));
  //
  var code = STATUS.OK;
  var uri = path;
  var outData = {};
  outData.ret ={};
  var uriType = getUriType ( uri );

  switch( uriType ){
    case URI_TYPE.CONNECTIVITY:
    {
      advLogWrite(LOG_DEBUG, '[wsnput] URI_TYPE.CONNECTIVITY ===============');
      var ret = getConnectivityRESTful(uri, outData);

      if ( ret === RESTFUL_VAL_TYPE.READ_ONLY ){
        callback(res, STATUS.METHOD_NOT_ALLOWED, '{"sv":"Read Only"}');
        code = STATUS.METHOD_NOT_ALLOWED;
        advLogWrite(LOG_ERROR, '[wsnput] return STATUS.METHOD_NOT_ALLOWED ===============');
        return code;
      }

      if ( ret !== RESTFUL_VAL_TYPE.ARRAY_ELEMENT ){
        advLogWrite(LOG_ERROR, '[wsnput] connectivity: ' + uri + ' is not array element !!!');
        callback(res, STATUS.BAD_REQUEST, '{"sv":"Bad Request"}');
        code = STATUS.BAD_REQUEST;
        advLogWrite(LOG_ERROR, '[wsnput] return STATUS.BAD_REQUEST ===============');
        return code;
      }

      break;
    }
    case URI_TYPE.SENSORHUB:
    {
      advLogWrite(LOG_DEBUG, '[wsnput] URI_TYPE.SENSORHUB ===============');
      var ret = getSensorHubRESTful(uri, outData);
 
      if ( ret === RESTFUL_VAL_TYPE.READ_ONLY ){
        callback(res, STATUS.METHOD_NOT_ALLOWED, '{"sv":"Read Only"}');
        code = STATUS.METHOD_NOT_ALLOWED;
        advLogWrite(LOG_ERROR, '[wsnput] return STATUS.METHOD_NOT_ALLOWED ===============');
        return code;
      }

      if ( ret !== RESTFUL_VAL_TYPE.ARRAY_ELEMENT ){
        advLogWrite(LOG_ERROR, '[wsnput] sensor hub: ' + uri + ' is not array element !!!');
        callback(res, STATUS.BAD_REQUEST, '{"sv":"Bad Request"}');
        code = STATUS.BAD_REQUEST;
        advLogWrite(LOG_ERROR, '[wsnput] return STATUS.BAD_REQUEST ===============');
        return code;
      }
      advLogWrite(LOG_DEBUG, '[wsnput] outData.ret ===============', outData.ret);
      break;
    }
    default:
    {
      break;
    }
  }
  //
  var sessionID = Uuid.v4().replace(/-/g,'');
  var uriType = getUriType ( path );

  var sessionObj = {};
  sessionObj.uriType = uriType;
  sessionObj.callback = callback;
  sessionObj.uri = path;
  sessionObj.res = res;
  sessionObj.data = JSON.stringify(data);
  MqttPublishMap.set(sessionID, sessionObj);


  var setMsgObj = {};
  setMsgObj.susiCommData = {};
  setMsgObj.susiCommData.sensorIDList = {};
  setMsgObj.susiCommData.sensorIDList.e = [];
  setMsgObj.susiCommData.sessionID = sessionID;
  setMsgObj.susiCommData.commCmd = 525;
  setMsgObj.susiCommData.requestID = 0;
  setMsgObj.susiCommData.sendTS = new Date().getTime();

  switch( uriType ){
    case URI_TYPE.CONNECTIVITY:
    {
      advLogWrite(LOG_DEBUG, 'wsnput URI_TYPE.CONNECTIVITY');
      var deviceID = path.split('/')[3];
      advLogWrite(LOG_DEBUG, 'deviceID = ' + deviceID);
      var connectivity = ConnectivityMap.get(deviceID);
      if ( typeof connectivity === 'undefined'){
        advLogWrite(LOG_ERROR, 'connectivity.vgw_id = ' + connectivity.vgw_id + 'not found connectivity');       
        break;
      }
      var deviceID = connectivity.vgw_id;
      var topic = '/cagent/admin/'+ deviceID + '/agentcallbackreq';
      //var pathPattern = 'Connectivity/';
      var RESTfulPath = path.replace(/^Connectivity/g,'');
      var setData = JSON.parse(JSON.stringify(data));
      advLogWrite(LOG_DEBUG, 'RESTful path = ' + RESTfulPath);

      setData.n = RESTfulPath;
      setMsgObj.susiCommData.sensorIDList.e.push(setData);
      setMsgObj.susiCommData.agentID = deviceID;
      setMsgObj.susiCommData.handlerName = 'IoTGW';

      break;
    }
    case URI_TYPE.SENSORHUB:
    {
      advLogWrite(LOG_DEBUG, 'wsnput URI_TYPE.SENSORHUB');
      var deviceID = path.split('/')[1];
      var topic = '/cagent/admin/'+ deviceID + '/agentcallbackreq';
      var pathPattern = 'SenHub/' + deviceID + '/';
      var RESTfulPath = path.replace(pathPattern,'');
      var setData = JSON.parse(JSON.stringify(data));
      /*RESTful path ex: SenHub/Info/Name */
      advLogWrite(LOG_DEBUG, 'RESTful path = ' + RESTfulPath);

      setData.n = RESTfulPath; 
      setMsgObj.susiCommData.sensorIDList.e.push(setData);
      setMsgObj.susiCommData.agentID = deviceID;
      setMsgObj.susiCommData.handlerName = 'SenHub';

      break;
    }
    default:
    {
      break;
    }
  }

  /**/
  var message = JSON.stringify(setMsgObj);
  advLogWrite(LOG_DEBUG, '--------------------------------------------------------------');
  advLogWrite(LOG_DEBUG, 'publish SET message to ' + deviceID);
  advLogWrite(LOG_DEBUG, 'message = ' + message);
  advLogWrite(LOG_DEBUG, '--------------------------------------------------------------');

  Client.publish(topic, message);

  /*set timeout*/
  //var timeout = 30000;
  setTimeout(function () {
    advLogWrite(LOG_INFO, '[Timeout] session ID ===' + sessionID );
    if ( MqttPublishMap.has(sessionID) === true){
      var sessionObj = MqttPublishMap.get(sessionID);
      if ( typeof sessionObj !== 'undefined' ){
        sessionObj.callback(sessionObj.res, STATUS.NOT_ACCEPTABLE, '');
        MqttPublishMap.remove(sessionID);
        advLogWrite(LOG_INFO, '[Timeout] MqttPublishMap.count() =' + MqttPublishMap.count())
      }
    }
  } , TIMEOUT, sessionID);

  code = STATUS.OK;
  return code;
}


var addListener = function( userFn )
{
    if( userFn !== undefined )
        eventEmitterObj.addListener(groupName,userFn);
}

var addGenHtmlListener = function( userFn )
{
    if( userFn !== undefined )
        genHtmlEventObj.addListener(groupName,userFn);
}


module.exports = {
  group: groupName,
  routers: routers,
  get: wsnget,
  put: wsnput,
  events: WSNEVENTS,
  addListener: addListener,
  addGenHtmlListener: addGenHtmlListener,
  wsclients: wsclients,  
};



