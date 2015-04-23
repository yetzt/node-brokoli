# brokoli

Brokoli is a client for [Orion Context Broker](http://catalogue.fiware.org/enablers/publishsubscribe-context-broker-orion-context-broker)
It uses Orion Context Broker as data storage and works around it's stupid design decisions.

## intall

```
npm install brokoli
```

## example

``` javascript

var brokoli = require("brokoli");

var client = brokoli({
	url: "http://user:password@localhost:1026/v1/",
	auth_token: ""
});

// create an entity
client.save(1, {
	bla: "fasel", 
	blub: 1,
	foo: "bar <= baz"
}, function(err, result){
	if (err) return console.log(err);
});

```

## usage

### brokoli(opts)

Create an instance of brokoli. Opts may contain

```javascript
{
	"url": "https://127.0.0.1:1026/v1/",  // base url of orion context broker
	"auth_token": "<auth token>",         // auth token, if needed
	"type": "whatever",                   // global entity type
	"strictssl": true                     // obey/ignore ssl warnings
}
```

### brokoli.save(id, data, fn(err, result))

Save an entity. `id` is an identifier, `data` is a key/value object.

### brokoli.delete(id, fn(err))

Delete an entity by `id`.

### brokoli.get(id, fn(err, entity))

Get an entity by `id`: 

```javascript
{
	"id": "<id>",
	"data": {
		"foo": "bar",
		"bla": "fasel",
		"blub": 1
	}
}
```

### brokoli.fetch(fn(err, entities))

Retrieve all entities: 

```javascript
[{
	"id": "<id>",
	"data": {
		"foo": "bar",
		"bla": "fasel",
		"blub": 1
	}
},{
	...
}]
```
