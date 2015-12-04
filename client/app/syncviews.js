"use strict"

var id = (id, context) => {
    context = context || document;
    return context.getElementById(id);
};


function inject(template, data) {
    return template.replace(/{(\w*)}/g, function(m, key) {
        return data.hasOwnProperty(key) ? data[key] : "";
    });
}


function createElement(name) {

    var proto = Object.create(HTMLElement.prototype);
    proto.template = id(name);

    proto.attachedCallback = function() {
        this.refreshUI();
    };

    proto.update = function(data) {
        // Check immutable data for equality
        if (this.data.lastModified !== data.lastModified) {
            console.log('          Data is different!', data);
            this.data = data;
            this.refreshUI();
        }
    }

    proto.refreshUI = function() {
	var html = this.template.innerHTML;
	html = inject(html, this.data);
	this.innerHTML = html;

	//var frag = document.createDocumentFragment();

	//var elem = document.createElement('div');
	//elem.innerHTML = html;

	//while(elem.childNodes[0]) {
	//	frag.appendChild(elem.childNodes[0]);
	//}
	
	//this.innerHTML = '';
	//this.appendChild(document.importNode(frag, true));	

	//var clone = document.importNode(this.template.content, true);
	//clone.innerHTML = inject(clone, this.data);	
	//this.shadow.innerHTML = '';
	//this.shadow.appendChild(clone);	


	//var scripts = this.shadow.querySelector("script");
	//console.log('scripts', scripts);
	//console.log('scripts.length', scripts.length);
	//eval(scripts.text);
	//for(var i = 0; i < scripts.length; i++) {
//		console.log('here');	
//		eval(scripts[i].text);
//		console.log('evaled', scripts[i].text);	
//	}
    }

    var ctor = document.registerElement(name, {
        prototype: proto
    });

    return function(data) {
        var element = new ctor();
        element.data = data;
        return element;
    };
}


function populateList(container, factory, views, items, itemsArray) {
    itemsArray = itemsArray || Utils.toArray(items);
    itemsArray.forEach((item) => {
	var view = views[item.key];
	if(!view) {
	    view = factory(item);
	    views[item.key] = view;
	    container.appendChild(view);
	} else {
	    view.update(item);
	}
    });

    // remove unused views
    toArray(views).forEach((view) => {
	if(!items[view.data.key]) {
	    container.removeChild(view);
	    delete views[view.data.key];
	}
    });
}




function toArray(obj) {
    var result = [];
    Object.keys(obj).forEach(function(key) {
        if (key !== 'lastModified') {
            result.push(obj[key]);
        }
    });
    return result;
}


var reloader = io();
reloader.on('connect', () => {
//    console.log('connected')
});
reloader.on('reload', function() {
    console.log('               reload!!!!');
    location.reload();
});


this.db = null;
var sync = new SyncNodeSocket.SyncNodeSocket('data', {});

var views = {
    todos: {}
};


window.onload = () => {

    if(this.onloaded) {
	 this.onloaded();
    }

    sync.onUpdated((updated) => {
        this.db = updated;
        if (this.onupdated) this.onupdated();
    });

}


function param(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return (false);
}

function hasChanged(syncnode1, syncnode2) {
    	if(syncnode1 && !syncnode2 || !syncnode1 && syncnode2) return true;
	return syncnode1.lastModified !== syncnode2.lastModified;
}
