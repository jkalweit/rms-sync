"use strict"

var id = (id, context) => {
    context = context || document;
    return context.getElementById(id);
};

function getProperty(obj, path) {
    return getPropertyHelper(obj, path.split('.'));
}

function getPropertyHelper(obj, split) {
    if(split.length === 1) return obj[split[0]];	
    return getPropertyHelper(obj[split[0]], split.slice(1, split.length));
}

function inject(template, data) {

    template = template.replace(/checked="{{([\w\.]*)}}"/g, function(m, key) {
        return getProperty(data, key) ? 'checked' : '';
    });


    return template.replace(/{{([\w\.]*)}}/g, function(m, key) {
        return getProperty(data, key);
    });
}

function hasChanged(syncnode1, syncnode2) {
    if((syncnode1 && !syncnode2) || (!syncnode1 && syncnode2)) return true;  
    return syncnode1.lastModified !== syncnode2.lastModified;
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
        var clone = document.importNode(this.template.content, true);
        var forloops = clone.querySelectorAll('for');
        for(var i = 0; i < forloops.length; i++) {
            var df = document.createDocumentFragment();
            var loopElem = forloops[i];
            var loopAttrib = loopElem.getAttribute('loop');
            var matches = /([\w]*),\s([\w]*)\sin\s([\w\.]*)/.exec(loopAttrib);
            var items = getProperty(this.data, matches[3]);
            var arr = toArray(items);
            console.log('items', arr);
            arr.forEach((item) => {
                var loopClone = document.importNode(loopElem, true);
                //var looped = inject(forloops[i].innerHtml, item);
                console.log('loopClone', inject(loopClone.innerHTML, item));
                df.innerHTML += inject(loopClone.innerHTML, item);
            });
            console.log('df', df.innerHTML);
            //clone.replaceChild(clone, df);
        }
        console.log('forloops', forloops); 
        this.innerHTML = '';
        this.appendChild(clone);
        var html = this.innerHTML;
        html = inject(html, this.data);
        this.innerHTML = html;
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
    if(!syncnode1 && !syncnode2) return false;
    if(syncnode1 && !syncnode2 || !syncnode1 && syncnode2) return true;
	return syncnode1.lastModified !== syncnode2.lastModified;
}



function updateViews(parent, views, ctor, items, itemsArr) {
    itemsArr = itemsArr || toArray(items);
    itemsArr.forEach((item) => {
        var view  = views[item.key];
        if(!view) {
            view = new ctor();
            views[item.key] = view;
            parent.appendChild(view.node);
        }
        view.update(item);
    });
    Object.keys(views).forEach((key) => {
        var view = views[key];
        if(!items[view.data.key]) {
            parent.removeChild(view.node);
            delete views[view.data.key];
        }
    });
}








function el(name, opts) {
    opts = opts || {};
    var elem = document.createElement(name);
    if(opts.className) elem.className = opts.className;
    if(opts.innerHTML) elem.innerHTML = opts.innerHTML;
    if(opts.type) elem.type = opts.type;
    if(opts.value) elem.value = opts.value;
    if(opts.events) {
        Object.keys(opts.events).forEach((key) => {
            elem.addEventListener(key, opts.events[key]);
        });
    }
    if(opts.style) {
        Object.keys(opts.style).forEach((key) => {
            elem.style[key] = opts.style[key];
        });
    }
    if(opts.parent) opts.parent.appendChild(elem);
    return elem;
}


class SyncView {
    update(data) {
         if(hasChanged(this.data, data)) {
            this.data = data;
            this.render();
        }
    }
}



//    function group(arr, prop, groupVals) {
//        var groups = {};
//        groupVals.forEach(function (groupVal) {
//            var group = [];
//            arr.forEach(function (item) {
//                if (item[prop] === groupVal) {
//                    group.push(item);
//                }
//            });
//            groups[groupVal] = group;
//        });
//        return groups;
//    }

//    Utils.group = group;
//    function formatCurrency(value, precision) {
//        if (precision === void 0) { precision = 2; }
//        var number = (typeof value === 'string') ? parseInt(value) : value;
//        return number.toFixed(precision);
//    }
//    Utils.formatCurrency = formatCurrency;
//    function roundToTwo(num) {
//        return +(Math.round((num.toString() + 'e+2')) + "e-2");
//    }
//    Utils.roundToTwo = roundToTwo;
//    function snapToGrid(val, grid) {
//        var offset = val % grid;
//        if (offset < (grid / 2))
//            return val - offset;
//        else
//            return val + (grid - offset);
//    }
//    Utils.snapToGrid = snapToGrid;
//    function formatDateFromKey(key) {
//        //var date = Date.parse(key);
//        //console.log('date2', date.toString(1));
//    }
//    Utils.formatDateFromKey = formatDateFromKey;
//    function arrayContains(list, value) {
//        for (var i = 0; i < list.length; ++i) {
//            if (list[i] === value)
//                return true;
//        }
//        return false;
//    }
//    Utils.arrayContains = arrayContains;
//    function mutableCopy(obj) {
//        return JSON.parse(JSON.stringify(obj));
//    }
//    Utils.mutableCopy = mutableCopy;
