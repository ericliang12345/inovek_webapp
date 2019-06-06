
var groupName = 'xxx';
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
    reg_websocket();
}

// Initial UI Layout and view style by W/H
function init_view()
{
    console.log( groupName + ' init_view');

    document.getElementById('logo').style.top = '100px'; 
    document.getElementById('logo').style.width = '500px'; 
    
}

// Get Data by RESTful API & register websocket by group
function init_data_binding()
{    
    console.log( groupName + ' init_data_binding');       
}

// To handler websocket event to UI display 
function data_event_handle( evt )
{
    console.log( groupName + ' data_event_handle');    
}

function reg_websocket()
{
    console.log( groupName + ' reg_websocket');           
}

// To handler UI event 
function ui_event_handle( )
{
    console.log( groupName + ' ui_event_handle');          
}




