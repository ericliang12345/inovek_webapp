// ElasticSearch
var elasticsearch = require('elasticsearch');
var g_elsclient = 'undefined';
var g_els_alive = 0;
var g_elsServer = 'undefined';

var init_els = function( elsServer )
{
    console.log('els server ' + elsServer );

    g_elsServer = elsServer;

    g_elsclient = new elasticsearch.Client({
        //host: 'localhost:9200',
        host: elsServer
        //log: 'trace'
      });   

      /*
      g_elsclient = new elasticsearch.Client({
        //host: 'localhost:9200',
        host: elsServer
      });*/      


    elsalive();
}

var elsalive = function()
{
    g_elsclient.ping({
    // ping usually has a 3000ms timeout
    requestTimeout: 1000
  }, function (error) {
    if (error) {
      console.log('elasticsearch cluster is down!');
      g_els_alive = 0;
    } else {
      console.log('elasticsearch ' + g_elsServer +  ' is well');
      g_els_alive = 1;
    }
  });
}

var els_insert = function( _index, _type, _body )
{
    if( g_els_alive === 0 ) return 0;

    var response = g_elsclient.index({
        index:_index,
        type: _type,
        body: _body
    });

    return response;
} 

var els_insert_with_id = function( _index, _type, _id, _body )
{
    if( g_els_alive === 0 ) return 0;

    var response = g_elsclient.index({
        index:_index,
        type: _type,
        id: _id,
        body: _body
    });

    return response;
} 

module.exports = {
    init: init_els,
    insert: els_insert,
    insert_id: els_insert_with_id
};


