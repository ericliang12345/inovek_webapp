var advlog = require('../apps/log_mgt/AdvJSLog.js');
var STATUS = require('./statusCode.js').STATUS_CODE;

global.getAllEndpoint = function( _ep ) // ["mgt", "api-gw"] => [{n:mgt},{n:api-gw}]
{
    var res = [];
    for( var i = 0; i < _ep.length; i ++ )
    {
        var name = {};
        name.n = _ep[i];
        res.push(name);
    }
    return res;
}


global.getListRESTful = function( uri, outObj , eEndPoints )
{    
    var path = uri.replace(/^list/g,'');
    var ret = STATUS.NOT_FOUND;
    
    advLogWrite( LOG_DEBUG, 'getListRESTful uri = ' + path );

    if ( path === '' || path === '/' || path === "/e" ){
        var data = {};
        //data.list = {};
        //data.list.e = getAllEndpoint( eEndPoints ); 
        data.e = getAllEndpoint( eEndPoints ); 
        outObj.ret = JSON.stringify(data);
        ret = STATUS.OK;
    }
    return ret;    
}

var findResourcebyName = function( srcObj, name )
{
    //console.log('src len'+ srcObj['e'].length);
    var data = 'undefined';
    for( var i=0; i < srcObj.length; i++ )
    {
        //console.log('name '+ srcObj['e'][i]['n']);
        if( name === srcObj[i]['n'] )
        {
            return JSON.stringify(srcObj[i]);
        }
    }
    return;
}

global.queryAdvJSONbyPath = function( uri, _cap)
{
    var layer = uri.split('/');
    var tmp = _cap;

    for(var i=0;i<layer.length;i++)
    {
        if( typeof tmp[layer[i]] !== 'undefined' )
        {
            tmp = tmp[layer[i]];
            if( i === layer.length-1 )
            {
                //advLogWrite( LOG_DEBUG, 'result '+ JSON.stringify(tmp) );
                return JSON.stringify(tmp);
            }
        }
        else
        {       
            if(i==layer.length-1 )
            {
                if( layer[i-1] === 'e')
                {
                    // find in array
                    //advLogWrite( LOG_DEBUG, 'Not match layer= '+ layer[i] + '  ' + JSON.stringify(tmp)); 
                    if( layer[i] !== '')
                        return findResourcebyName( tmp, layer[i] );                
                    else
                        return JSON.stringify(tmp); 
                
                }                                                
            }
            else
            {
                //advLogWrite( LOG_DEBUG, 'Not match layer= '+ layer[i] + '  ' + JSON.stringify(tmp));     
            }
        }
    }
    return;
}