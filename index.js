#!/usr/bin/env node

// node modules
var url = require("url");

// npm modules
var request = require("request");
var debug = require("debug")("brokoli");

function brokoli(conf){

	// ensure new instance of brokoli
	if (!(this instanceof brokoli)) return new brokoli(conf);
	
	// keep config
	this.conf = conf;
	
	// set default type
	if (!this.conf.hasOwnProperty("type") || ((typeof this.conf.type) !== "string") || this.conf.type === "") this.conf.type = "default";

	// default ssl handling
	if (!this.conf.hasOwnProperty("strictssl") || this.conf.strictssl !== false) this.conf.strictssl = true;
	
	// default user agent
	if (!this.conf.hasOwnProperty("user_agent") || ((typeof this.conf.user_agent) !== "string") || this.conf.user_agent === "") this.conf.user_agent = "Brokoli/"+(require("./package.json").version)+" (+https://www.npmjs.com/package/brokoli) node.js/"+process.version+" ("+process.platform+"; "+process.arch+")";
	
	return this;
};

// generic request interface
brokoli.prototype.request = function(opts, fn){
	debug("[request] %s %s", (opts.method||"GET"), opts.path)
	var self = this;
	var req = {
		method: (opts.method || "GET"),
		url: url.resolve(self.conf.url, opts.path),
		json: true,
		strictSSL: self.conf.strictssl,
		headers: {
			"X-Auth-Token": self.conf.auth_token,
			"Content-Type": "application/json",
			"Accept": "application/json",
			"User-agent": self.conf.user_agent
		}
	};
	if (opts.data) req.body = opts.data;	
	request(req, function(err, resp, data){
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("Unexpected Status Code: "+resp.statusCode));
		return fn(null, data);
	});
	return this;
};

// encode data to prevent using illegal characters, sync
brokoli.prototype._enc = function(v){
	return new Buffer(JSON.stringify(v)).toString("hex");
};

// decode encoded data, sync
brokoli.prototype._dec = function(v){
	return JSON.parse(new Buffer(v, "hex"));
};

// convert objet to attributes, sync
brokoli.prototype._toattr = function(data){
	var self = this;
	var attr = [];
	Object.keys(data).forEach(function(k){
		switch (typeof data[k]) {
			case "string": attr.push({name: k, type: 'string', value: self._enc(data[k])}); break;
			case "number": attr.push({name: k, type: 'number', value: data[k].toString()}); break;
			case "object": attr.push({name: k, type: 'object', value: self._enc(data[k])}); break;
			case "boolean": attr.push({name: k, type: 'boolean', value: data[k].toString()}); break;
			default: debug("[_todata] unrecognized data type_ %s", (typeof data[k])); break;
		};
	});
	return attr;
};

// convert attributes to object, sync
brokoli.prototype._todata = function(attr){
	var self = this;
	var data = {};
	attr.forEach(function(a){
		switch (a.type) {
			case "string": data[a.name] = self._dec(a.value); break;
			case "object": data[a.name] = self._dec(a.value); break;
			case "number": data[a.name] = parseFloat(a.value); break;
			case "boolean": data[a.name] = (a.value === "true"); break;
		}
	});
	return data;
};

// create/update an entity
brokoli.prototype.save = function(id, data, fn){
	var self = this;
	self.request({
		path: "contextEntities/type/"+self.conf.type+"/id/"+self.conf.type+":"+id,
		method: "POST",
		data: {attributes: self._toattr(data)}
	}, fn);
	return this;
};

// delete an entity
brokoli.prototype.delete = function(id, fn){
	var self = this;
	self.request({
		path: "contextEntities/type/"+self.conf.type+"/id/"+self.conf.type+":"+id+"",
		method: "DELETE"
	}, function(err, result){
		if (err) return fn(err);
		if (result.code !== "200") return debug("[delete] error: %s", result.details) || fn(new Error(result.reasonPhrase));
		fn(null);
	});
	return this;
};

// get an entity
brokoli.prototype.get = function(id, fn){
	var self = this;
	self.request({
		path: "contextEntities/type/"+self.conf.type+"/id/"+self.conf.type+":"+id+""
	}, function(err, result){
		if (err) return fn(err);
		if (result.statusCode.code !== "200") return debug("[fetch] invalid element %s: %s", result.contextElement.id, result.statusCode.details) || fn(new Error(result.statusCode.reasonPhrase));
		fn(null, {
			id: result.contextElement.id.split(/:/g).pop(),
			data: self._todata(result.contextElement.attributes)
		});
	});
	return this;
};

// get all entities
brokoli.prototype.fetch = function(fn){
	var self = this;
	self.request({
		path: "contextEntityTypes/"+self.conf.type,
	}, function(err, result){
		if (err) return fn(err);
		if (result.hasOwnProperty("errorCode") && result.errorCode.code === "404") return fn(null, []);
		if (result.hasOwnProperty("errorCode")) return fn(new Error(result.errorCode.reasonPhrase));

		// compile result
		var data = [];
		result.contextResponses.map(function(e){
			if (e.statusCode.code !== "200") return debug("[fetch] invalid element %s: %s", e.contextElement.id, e.statusCode.details);
			data.push({
				id: e.contextElement.id.split(/:/g).pop(),
				data: self._todata(e.contextElement.attributes)
			});
		});
		fn(null, data);
	});
	return this;
};

// export
module.exports = brokoli;
