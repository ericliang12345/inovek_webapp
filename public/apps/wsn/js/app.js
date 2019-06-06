
var groupName = 'WSNManage';
var uriPrefix = '../../restapi/'+groupName+'/';
var webPrefix = 'ws://' + location.host +'/';

// Entry point of this web app
function start( param ) {
    console.log( groupName + ' start');     

    // 1. init UI layout
    init_view();
    // 2. get init data and binding UI commonpent
    init_data_binding();
    // 3. reg websocket event
    // reg_websocket();
}

// Initial UI Layout and view style by W/H
function init_view()
{
    console.log( groupName + ' init_view');    
    document.getElementById('wsn_table').style.top = '60px'; 
    document.getElementById('wsn_table').style.left = '20px';   
    document.getElementById('wsn_table').style.width = "98%";    
}

// Get Data by RESTful API & register websocket by group
function init_data_binding()
{
    
    console.log( groupName + ' init_data_binding');   

    var xhttp = new XMLHttpRequest();

    // Synchronous 
    // xhttp.open("GET", uriPrefix+'SenHub/AllSenHubList', false); 
    // xhttp.send(null);
    // if (xhttp.status === 200) {
    //     var msgsublist = JSON.parse(xhttp.responseText)
    //     console.log(msgsublist);
    // }

    $('table').append('<tbody id="0007305A3A750CCA"></tbody>');
    $('table tbody[id="0007305A3A750CCA"]').append('<tr class="senhub_odd" id="gw0007305A3A750CCA">'+
                                                   '<td data-toggle="collapse" data-target="#node0007305A3A750CCA" id="DeviceName">Ethernet_0CCA</td>'+
                                                   '<td id="DeviceId">0007305A3A750CCA</td>'+
                                                   '<td id=Info></td>'+
                                                   '<td id="Config"><button id="ConfigBtn"><i class="fas fa-toolbox" style="color:rgb(8, 58, 122);font-size:25px""></i></button></td>'+
                                                   '</tr>');
    $('table tbody[id="0007305A3A750CCA"] tr[id="gw0007305A3A750CCA"] td[id="Info"]').append('Name: Ethernet<br> Version: 1.0.0<br>');


    $('table').append('<tbody id="node0007305A3A750CCA" class="collapse"></tbody>');
    $('table tbody[id="node0007305A3A750CCA"]').append('<tr id="0017000E4C000011">'+
                                                       '<td id="DeviceName">SenHub1_0011</td>'+
                                                       '<td id="DeviceId">0017000E4C000011</td>'+
                                                       '<td id="Info">mac: 0017000E4C000011<br>type: SenHub</td>'+
                                                       '<td><button id="ConfigBtn"><i class="fas fa-toolbox" style="color:rgb(8, 58, 122);font-size:25px"></i></button></td>'+
                                                       '</tr>');

    // Asynchronous
    // xhttp.open("GET", uriPrefix+'Connectivity/IoTGW', true); 
    // xhttp.onreadystatechange = function() {
    //     if (this.readyState == 4 && this.status == 200) {
    //         var msg = {};
    //         var result = [];
    //         var temp_data = [];
    //         // msg = JSON.parse('{"EoLinkReceiver":{"000700000500425E":{"Info":{"e":[{"n":"SenHubList","sv":""},{"n":"Neighbor","sv":""},{"n":"Name","sv":"EoLinkReceiver"},{"n":"Health","v":100},{"n":"sw","sv":"1.2.1.12"},{"n":"reset","bv":false}],"bn":"Info"},"bn":"000700000500425E","ver":1},"bn":"EoLinkReceiver"},"Ethernet":{"0007888888888788":{"Info":{"e":[{"n":"SenHubList","sv":""},{"n":"Neighbor","sv":""},{"n":"Name","sv":"Ethernet"}],"bn":"Info"},"bn":"0007888888888788","ver":1},"bn":"Ethernet"}}');
        
    //         msg = JSON.parse(this.responseText);  
    //         console.log(msg);

    //         Object.keys(msg).forEach(function(DevKey) {
    //             Object.keys(msg[DevKey]).forEach(function(DIdKey){
    //                 if(DIdKey != 'bn'){
    //                     $('table').append('<tbody id="'+DIdKey+'"></tbody>');
    //                     $('table tbody[id="'+DIdKey+'"]').append('<tr class="senhub_odd" id="gw'+DIdKey+'"><td data-toggle="collapse" data-target="#node'+DIdKey+
    //                     '" id="DeviceName">'+DevKey+'</td><td id="DeviceId">'+DIdKey+'</td><td id=Info></td><td id="Config"><button id="ConfigBtn">'+
    //                     '<i class="fas fa-toolbox" style="color:rgb(8, 58, 122);font-size:25px""></i></button></td>');
    //                     console.log(DevKey+','+DIdKey)
    //                     for(var i=0 ;i < msg[DevKey][DIdKey]['Info']['e'].length ;i++){  
    //                         switch(msg[DevKey][DIdKey]['Info']['e'][i].n){
    //                             case "sw":
    //                             case "Name":
    //                                 $('table tbody[id="'+DIdKey+'"] tr[id="gw'+DIdKey+'"] td[id="Info"]').append(msg[DevKey][DIdKey]['Info']['e'][i].n+
    //                                                                                                             ": "+msg[DevKey][DIdKey]['Info']['e'][i].sv+"<br>");                              
    //                                 console.log(msg[DevKey][DIdKey]['Info']['e'][i].n);
    //                                 break;

    //                             case "SenHubList":
    //                                 if(msg[DevKey][DIdKey]['Info']['e'][i].sv.length > 0)
    //                                 $('table').append('<tbody id="node'+DIdKey+'" class="collapse"></tbody>');
    //                                 get_Sen_Hub(msg[DevKey][DIdKey]['Info']['e'][i].sv,'node'+DIdKey);
    //                                 break;

    //                             default:
    //                                 break;
    //                         }  
    //                     }
    //                 }

    //             });
    //         });       
    //     }
    // };

    // xhttp.onerror = function (e) {
    //     console.error(xhttp.statusText);
    // };

    // xhttp.send();
     
}

function get_Sen_Hub(dev_data, tbody_id)
{
    var xhttp = [];
    console.log("get_Sen_Hub1");
    console.log(tbody_id);
    var temp_senhub = dev_data.split(",");
        
    for(var index in temp_senhub)
    {              
        xhttp[index] = new XMLHttpRequest();
        xhttp[index].open("GET", uriPrefix+'SenHub/'+temp_senhub[index]+'/DevInfo', true);
        xhttp[index].onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                var msg = {};                                 
                // var msg = JSON.parse('{"devID":"0017000E4C000011","hostname":"SenHub1","sn":"0017000E4C000011","mac":"0017000E4C000011","version":"SNAIL.x86.1.1.00.5006c5aa","type":"SenHub","product":"","manufacture":"","status":"1","commCmd":1,"requestID":30002,"agentID":"0017000E4C000011","handlerName":"general","sendTS":160636520}');
                msg = JSON.parse(this.responseText);
                $('table tbody[id="'+tbody_id+'"]').append('<tr id="'+msg.agentID+'"><td id="DeviceName">'+msg.hostname+'</td><td id="DeviceId">'+msg.agentID+'</td>'
                                                    +'<td id="Info">mac: '+msg.mac+'<br>type: '+msg.type+'</td>'+
                                                    '<td><button id="ConfigBtn"><i class="fas fa-toolbox" style="color:rgb(8, 58, 122);font-size:25px"></i></button></td>');
                console.log(msg);
            }
        };      
        xhttp[index].onerror = function (e) {
            console.error(xhttp[index].statusText);
        };    
        xhttp[index].send();     
    }
}

// To handler websocket event to UI display 
function data_event_handle( evt )
{
    var msg=JSON.parse(evt.data);
    console.log( groupName + ' data_event_handle ' + evt.data);
    console.log( groupName + ' msg ' + JSON.stringify(msg.data.SenHub.SenData));
}

function reg_websocket()
{
    console.log( groupName + ' reg_websocket'); 
    var wsUri = webPrefix+groupName;
    websocket = new WebSocket(wsUri);
    websocket.onmessage = function(evt) {
        data_event_handle(evt)
    };

    /*
    websocket.onopen = function(evt) { 
        //onOpen(evt)
    };
    websocket.onclose = function(evt) {
         //onClose(evt)
    };
    websocket.onerror = function(evt) {
        //onError(evt)
        console.log('error'+evt);
    };*/       

       
}

// To handler UI event 
function ui_event_handle( )
{
    console.log( groupName + ' ui_event_handle');  
}




