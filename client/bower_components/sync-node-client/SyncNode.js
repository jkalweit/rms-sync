/// <reference path="./typings/tsd.d.ts" />
"use strict";
var SyncNode;
(function (SyncNode_1) {
    var idCounterForDebugging = 0;
    var SyncNode = (function () {
        function SyncNode(obj, lastModified, excludeProp) {
            var _this = this;
            obj = obj || {};
            SyncNode.addNE(this, '__syncNodeId', idCounterForDebugging++);
            lastModified = lastModified || obj['lastModified'] || new Date(0).toISOString(); // default to a really old lastModified, Date(0).
            //console.log('exclude: ', excludeProp, 'keys', Object.keys(obj));
            Object.keys(obj).forEach(function (propName) {
                if (propName === excludeProp || propName === 'lastModified') {
                    //console.log('skipping prop: ', propName);
                    return; // skip this prop.
                }
                //console.log('adding prop: ', propName);
                var prop = obj[propName];
                if (typeof prop === 'object') {
                    var className = prop.constructor.toString().match(/\w+/g)[1];
                    //console.log('ClassName: ' + className, propName);
                    if (className !== 'SyncNode') {
                        prop = new SyncNode(prop, prop.lastModified || lastModified);
                    }
                    else {
                    }
                    SyncNode.addNE(prop, 'onUpdated', SyncNode.createOnUpdated(_this, propName));
                    SyncNode.addNE(prop, 'parent', _this);
                }
                SyncNode.addImmutable(_this, propName, prop);
            });
            delete this.lastModified;
            SyncNode.addImmutableButConfigurable(this, 'lastModified', lastModified);
            SyncNode.addNE(this, 'set', SyncNode.createSetter(this));
            SyncNode.addNE(this, 'remove', SyncNode.createRemover(this));
        }
        SyncNode.prototype.merge = function (update) {
            var _this = this;
            //console.log('merge: ', update);
            if (typeof update !== 'object') {
                var message = 'WARNING: passed a non-object to merge.';
                console.log(message);
                //Log.error('SyncNode', message);
                return;
            }
            if (this.lastModified > update.lastModified) {
                var message = '****WARNING*****: local version is NEWER than server version.' + this.lastModified + ' ' + update.lastModified;
                console.log(message);
            }
            var current = this;
            Object.keys(update).forEach(function (key) {
                if (key === 'lastModified') {
                    delete current.lastModified;
                    SyncNode.addImmutableButConfigurable(current, 'lastModified', update['lastModified']);
                }
                else if (key === '__remove') {
                    current.remove(update[key]);
                }
                else {
                    var nextNode = _this[key];
                    if (!nextNode || typeof update[key] !== 'object') {
                        current = current.set(key, update[key]).parentImmutable;
                    }
                    else {
                        nextNode.merge(update[key]);
                    }
                }
            });
        };
        // static copyPropsImmutable(copyFrom: Object, copyTo: SyncNode, lastModified: string, excludeProp?: string) {
        //     Object.keys(copyFrom).forEach((name: string) => {
        //
        //         if (name === excludeProp) return; // skip this prop.
        //
        //         var prop = copyFrom[name];
        //         if (typeof prop === 'object') {
        //             var className = prop.constructor.toString().match(/\w+/g)[1];
        //             console.log('ClassName: ' + className);
        //             if (className !== 'SyncNode') {
        //                 prop = new SyncNode(prop, prop.lastModified || lastModified);
        //                 console.log('herrrrrre2')
        //                 SyncNode.addNE(prop, 'onUpdated', SyncNode.createOnUpdated(copyTo, name));
        //             } else {
        //                 console.log('herrrrrre        1')
        //             }
        //         }
        //
        //         SyncNode.addImmutable(copyTo, name, prop);
        //     });
        // }
        SyncNode.createOnUpdated = function (target, propName) {
            var onUpdated = function (updated, action, path, merge) {
                var replaceWithMe = new SyncNode(target, updated.lastModified, propName);
                //console.log('CreateOnUpdated: updated: ', updated);
                //console.log('CreateOnUpdated: replaceWithMe: ', replaceWithMe);
                SyncNode.addImmutable(replaceWithMe, propName, updated);
                SyncNode.addNE(updated, 'onUpdated', SyncNode.createOnUpdated(replaceWithMe, propName));
                SyncNode.addNE(updated, 'parent', replaceWithMe);
                //console.log('Doing update!', propName, target, updated, replaceWithMe);
                var newPath = propName + (path ? '.' + path : '');
                var newMerge = { lastModified: replaceWithMe.lastModified };
                newMerge[propName] = merge;
                target.onUpdated(replaceWithMe, action, newPath, newMerge);
                return replaceWithMe;
            };
            return onUpdated;
        };
        SyncNode.createSetter = function (target) {
            var set = function (propName, value) {
                if (target[propName] !== value) {
                    //console.log('Setting propName: ', propName);
                    var replaceWithMe = new SyncNode(target, new Date().toISOString(), propName);
                    if (typeof value === 'object') {
                        var className = value.constructor.toString().match(/\w+/g)[1];
                        if (className !== 'SyncNode') {
                            value = new SyncNode(value, value.lastModified || new Date().toISOString());
                            SyncNode.addNE(value, 'onUpdated', SyncNode.createOnUpdated(replaceWithMe, propName));
                            SyncNode.addNE(value, 'parent', replaceWithMe);
                        }
                    }
                    SyncNode.addImmutable(replaceWithMe, propName, value);
                    var merge = { lastModified: replaceWithMe.lastModified };
                    merge[propName] = value;
                    target.onUpdated(replaceWithMe, 'set', propName, merge);
                    return { value: value, parentImmutable: replaceWithMe };
                }
                return { value: value, parentImmutable: target };
            };
            return set;
        };
        SyncNode.createRemover = function (target) {
            var remover = function (propName) {
                //console.log('doing remove on ', prop, target);
                if (!target.hasOwnProperty(propName))
                    return target;
                var replaceWithMe = new SyncNode(target, new Date().toISOString(), propName);
                //console.log('replaceWithMe: ', prop, target, replaceWithMe);
                target.onUpdated(replaceWithMe, 'remove', propName, { __remove: propName }); // notify old listeners
                return replaceWithMe;
            };
            return remover;
        };
        SyncNode.addNE = function (obj, propName, value) {
            Object.defineProperty(obj, propName, {
                enumerable: false,
                configurable: true,
                writable: true,
                value: value
            });
        };
        SyncNode.addImmutable = function (obj, propName, value) {
            Object.defineProperty(obj, propName, {
                enumerable: true,
                configurable: false,
                writable: false,
                value: value
            });
        };
        SyncNode.addImmutableButConfigurable = function (obj, propName, value) {
            Object.defineProperty(obj, propName, {
                enumerable: true,
                configurable: true,
                writable: false,
                value: value
            });
        };
        return SyncNode;
    })();
    SyncNode_1.SyncNode = SyncNode;
})(SyncNode || (SyncNode = {}));
//# sourceMappingURL=SyncNode.js.map