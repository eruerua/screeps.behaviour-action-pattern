let action = new Creep.Action('reallocating');
module.exports = action;
action.maxPerTarget = 1;
action.maxPerAction = 1;
// get<containerType>State functions return a positive value when they need filling, a negative value when they need emptying, and 0 when "close enough"
/*
action.terminalNeeds = function(terminal, resourceType){
    var ret = 0;
    if (!terminal || !terminal.room.memory.resources) return 0;
    let terminalData = terminal.room.memory.resources.terminal[0];
    // look up resource and calculate needs
    let order = null;
    if (terminalData) order = terminalData.orders.find((o)=>{return o.type==resourceType;});
    if (!order) order = { orderAmount: 0, orderRemaining: 0, storeAmount: 0 };
    let loadTarget = order.orderRemaining + order.storeAmount + ((resourceType == RESOURCE_ENERGY) ? TERMINAL_ENERGY : 0);
    let unloadTarget = order.orderAmount + order.storeAmount + ((resourceType == RESOURCE_ENERGY) ? TERMINAL_ENERGY : 0);
    let store = terminal.store[resourceType]||0;
    if (store < loadTarget) ret = Math.min(loadTarget-store,terminal.storeCapacity-terminal.sum);
    else if (store > unloadTarget*1.05) ret = unloadTarget-store;
    return ret;
};
action.storageNeeds = function(storage, resourceType){
    var ret = 0;
    if (!storage || !storage.room.memory.resources) return 0;

    let storageData = storage.room.memory.resources.storage[0];
    // look up resource and calculate needs
    let order = null;
    if (storageData) order = storageData.orders.find((o)=>{return o.type==resourceType;});
    if (!order) order = { orderAmount: 0, orderRemaining: 0, storeAmount: 0 };
    let rcl = storage.room.controller.level;
    let loadTarget = order.orderRemaining + order.storeAmount + ((resourceType == RESOURCE_ENERGY) ? MIN_STORAGE_ENERGY[rcl] : MAX_STORAGE_MINERAL);
    // storage always wants energy
    let unloadTarget = (resourceType == RESOURCE_ENERGY) ? (storage.storeCapacity-storage.sum)+storage.store.energy : order.orderAmount + order.storeAmount + MAX_STORAGE_MINERAL;
    let store = storage.store[resourceType]||0;
    if (store < loadTarget) ret = Math.min(loadTarget-store,storage.storeCapacity-storage.sum);
    else if (store > unloadTarget*1.05) ret = unloadTarget-store;
    return ret;
};
action.containerNeeds = function(container, resourceType){
    if (!container || !container.room.memory.resources) return 0;

    // look up resource and calculate needs
    let containerData = container.room.memory.resources.container.find( (s) => s.id == container.id );
    if (containerData) {
        let order = containerData.orders.find((o)=>{return o.type==resourceType;});
        if (order) {
            let loadTarget = order.orderRemaining + order.storeAmount;
            let unloadTarget = order.orderAmount + order.storeAmount;
            let store = container.store[resourceType] || 0;
            if (store < loadTarget) return Math.min(loadTarget-store,container.storeCapacity-container.sum);
            if (store > unloadTarget*1.05) return unloadTarget-store;
        }
    }
    return 0;
};
action.labNeeds = function(lab, resourceType){
    if (!lab || !lab.room.memory.resources) return 0;
    let loadTarget = 0;
    let unloadTarget = 0;

    // look up resource and calculate needs
    let containerData = lab.room.memory.resources.lab.find( (s) => s.id == lab.id );
    if (containerData) {
        let order = containerData.orders.find((o)=>{return o.type==resourceType;});
        if (order) {
            loadTarget = order.orderRemaining + order.storeAmount;
            unloadTarget = order.orderAmount + order.storeAmount;
        }
    }
    let store = 0;
    let space = 0;
    if (resourceType == RESOURCE_ENERGY) {
        store = lab.energy;
        space = lab.energyCapacity-lab.energy;
    } else {
        store = lab.mineralType == resourceType ? lab.mineralAmount : 0;
        space = lab.mineralCapacity-lab.mineralAmount;
    }
    // lab requires precise loading
    if (store < loadTarget) return Math.min(loadTarget-store,space);
    if (store > unloadTarget) return unloadTarget-store;
    return 0;
};
*/
action.getLabOrder = function(lab) {
    if (!lab) return null;
    var order = null;
    let room = lab.room;
    if (!room.memory || !room.memory.resources) return null;

    let data = room.memory.resources.lab.find( (s) => s.id == lab.id );
    if (data) {
        let orders = data.orders;
        for (var i=0;i<orders.length;i++) {
            if (orders[i].type != RESOURCE_ENERGY &&
                    (orders[i].orderRemaining > 0 ||
                    orders[i].storeAmount > 0)) {
                order = orders[i];
                break;
            }
        }
    }

    return order;
};
action.findNeeding = function(room, resourceType, amountMin, structureId){
    if (!amountMin) amountMin = 1;
//    if (!RESOURCES_ALL.find((r)=>{r==resourceType;})) return ERR_INVALID_ARGS;

    let data = room.memory;
    if (data) {
        if (data.labs.length > 0) {
            for (var i=0;i<data.labs.length;i++) {
                let d = data.labs[i];
                let lab = Game.getObjectById(d.id);
                var amount = 0;
                if (lab) amount = lab.getNeeds(resourceType);
                if (amount >= amountMin && (lab.mineralAmount == 0 || lab.mineralType == resourceType || resourceType == RESOURCE_ENERGY) && d.id != structureId)
                    return { structure: lab, amount: amount};
            }
        }
        if (data.container.length > 0) {
            for (var i=0;i<data.container.length;i++) {
                let d = data.container[i];
                let container = Game.getObjectById(d.id);
                var amount = 0;
                if (container) amount = container.getNeeds(resourceType);
                if (amount >= amountMin && d.id != structureId) return { structure: container, amount: amount };
            }
        }
    }
    let terminal = room.terminal;
    if (terminal) {
        let amount = terminal.getNeeds(resourceType);
        if (amount >= amountMin && terminal.id != structureId) return { structure: terminal, amount: amount };
    }
    let storage = room.storage;
    if (storage) {
        let amount = storage.getNeeds(resourceType);
        if (amount >= amountMin && storage.id != structureId) return { structure: storage, amount: amount };
    }

    // no specific needs found ... check for overflow availability
    if (storage && (resourceType == RESOURCE_ENERGY || resourceType == RESOURCE_POWER) && storage.storeCapacity-storage.sum > amountMin)
        return { structure: storage, amount: 0 };
    if (terminal && resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER && terminal.storeCapacity-terminal.sum > amountMin)
        return { structure: terminal, amount: 0 };

    // no destination found
    return null;
};
action.newTargetLab = function(creep) {
    let room = creep.room;
    let data = room.memory;
    // check labs for needs and make sure to empty the lab before filling
    if (data && data.labs && data.labs.length > 0) {
        for (var i=0;i<data.labs.length;i++) {
            let d = data.labs[i];
            let lab = Game.getObjectById(d.id);
            if (!lab) continue;
            var amount = 0;
            if (lab.mineralAmount > 0) {
                amount = lab.getNeeds(lab.mineralType);
                if (amount < 0) {
                    // lab has extra resource to be taken elsewhere
                    var needing;
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: lab.id, resourceType: lab.mineralType, needs: amount });
                    needing = this.findNeeding(room,lab.mineralType);
                    if (needing) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: needing.structure.id, resourceType: lab.mineralType, targetNeeds: needing.amount });
                        return lab;
                    }
                }
                if (amount > 0) {
                    // lab needs more resource so find a lower priority container with some
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: lab.id, resourceType: lab.mineralType, needs: amount });
                    if (room.storage.store[lab.mineralType]) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: lab.mineralType, targetNeeds: room.storage.store[lab.mineralType] });
                        return room.storage;
                    }
                    if (room.terminal.store[lab.mineralType]) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: lab.mineralType, targetNeeds: room.terminal.store[lab.mineralType] });
                        return room.terminal;
                    }
                    let ret = room.findContainerWith(lab.mineralType);
                    if (ret) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: ret.structure.id, resourceType: lab.mineralType, targetNeeds: ret.amount });
                        return ret.structure;
                    }
                    if (ROOM_TRADING && !(room.mineralType == RESOURCE_ENERGY || room.mineralType == lab.mineralType)) {
                        if (DEBUG) logSystem(room.name, `${creep.name} started a room order of ${amount} ${mineralType} for structure ${lab.id}`);
                        room.placeRoomOrder(lab.id,lab.mineralType,amount);
                    }
                }
            } else {
                // lab is empty so check and fill order
                let order = this.getLabOrder(lab);
                let resourceType = null;
                if (order) {
                    // found an order
                    resourceType = order.type;
                    var amount = order.orderRemaining+order.storeAmount;
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: lab.id, resourceType: resourceType, needs: amount });
                    if (room.storage.store[resourceType]) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: resourceType, targetNeeds: room.storage.store[resourceType] });
                        return room.storage;
                    }
                    if (room.terminal.store[resourceType]) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: resourceType, targetNeeds: room.terminal.store[resourceType] });
                        return room.terminal;
                    }
                    let ret = room.findContainerWith(resourceType);
                    if (ret) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: ret.structure.id, resourceType: resourceType, targetNeeds: ret.amount });
                        return ret.structure;
                    }
                    if (ROOM_TRADING && !(room.mineralType == RESOURCE_ENERGY || room.mineralType == resourceType)) {
                        if (DEBUG) logSystem(room.name, `${creep.name} started a room order of ${amount} ${mineralType} for structure ${lab.id}`);
                        room.placeRoomOrder(lab.id,resourceType,order.orderRemaining);
                    }
                }
            }
            amount = lab.getNeeds(RESOURCE_ENERGY);
            if (amount < 0) {
                // lab has extra energy (I guess ...)
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: lab.id, resourceType: RESOURCE_ENERGY, needs: amount });
                var needing = this.findNeeding(room, RESOURCE_ENERGY);
                if (needing) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: needing.structure.id, resourceType: RESOURCE_ENERGY, targetNeeds: needing.amount });
                    return lab;
                }
            }
            if (amount > 0) {
                // lab needs energy so find a lower priority container with some
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: lab.id, resourceType: RESOURCE_ENERGY, needs: amount });
                if (room.storage.store[RESOURCE_ENERGY]) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: RESOURCE_ENERGY, targetNeeds: room.storage.store[RESOURCE_ENERGY] });
                    return room.storage;
                }
                if (room.terminal.store[RESOURCE_ENERGY]) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: RESOURCE_ENERGY, targetNeeds: room.terminal.store[RESOURCE_ENERGY] });
                    return room.terminal;
                }
                let ret = room.findContainerWith(RESOURCE_ENERGY);
                if (ret) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: ret.structure.id, resourceType: RESOURCE_ENERGY, targetNeeds: ret.amount });
                    return ret.structure;
                }
            }
        }
    }
    return null;
};
action.newTargetContainer = function(creep) {
    let room = creep.room;
    let data = room.memory;
    // check containers for needs
    if (data.container && data.container.length > 0) {
        for (var i=0;i<data.container.length;i++) {
            let d = data.container[i];
            let container = Game.getObjectById(d.id);
            if (container) {
                // check contents for excess
                for(var resource in container.store) {
                    var needs = container.getNeeds(resource);
                    if (resource && needs < 0) {
                        // container has extra resource
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: container.id, resourceType: resource, needs: needs });
                        var needing = this.findNeeding(room, resource);
                        if (needing) {
                            if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: needing.structure.id, resourceType: resource, targetNeeds: needing.amount });
                            return container;
                        }
                    }
                }
                // check orders for needs
                if (room.memory.resources) {
                    let containerData = room.memory.resources.container.find( (s) => s.id == d.id );
                    if (containerData) {
                        let orders = containerData.orders;
                        for (var j=0;j<orders.length;j++) {
                            let type = orders[j].type;
                            let amount = container.getNeeds(type);
                            if (amount > 0) {
                                // found a needed resource so check lower priority containers
                                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: container.id, resourceType: resource, needs: amount });
                                if (room.storage && room.storage.store[type]) {
                                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: resource, targetNeeds: room.storage.store[resource] });
                                    return room.storage;
                                }
                                if (room.terminal && room.terminal.store[type]) {
                                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: resource, targetNeeds: room.terminal.store[resource] });
                                    return room.terminal;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return null;
};
action.newTargetTerminal = function(creep) {
    let room = creep.room;
    let data = room.memory;
    // check terminal for needs
    let terminal = creep.room.terminal;
    if (terminal) {
        // check for excess
        for (var resource in terminal.store) {
            // terminal only has too much energy or power
//                    if (resource && (resource == RESOURCE_ENERGY || resource == RESOURCE_POWER)) {
                let amount = -terminal.getNeeds(resource);
                if (amount > 0) {
                    // excess resource found
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: terminal.id, resourceType: resource, needs: -amount });
                    let dest = this.findNeeding(room, resource, 1, terminal.id);
                    if (dest && dest.structure.id != terminal.id) {
                        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: dest.structure.id, resourceType: resource, targetNeeds: dest.amount });
                        return terminal;
                    }
                }
//                    }
        };
        // check orders
        if (room.memory.resources && room.memory.resources.terminal[0]) {
            let orders = room.memory.resources.terminal[0].orders;
            let type = null;
            let amount = 0;
            for (var i=0;i<orders.length;i++) {
                type = orders[i].type;
                amount = terminal.getNeeds(type);
                if (amount > 0) break;
            }
            if (amount == 0) {
                type = RESOURCE_ENERGY;
                amount = terminal.getNeeds(type);
            }
            if (amount > 0) {
                // found a needed resource so check lower priority containers
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: terminal.id, resourceType: type, needs: amount });
                if (room.storage.store[type]) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: type, targetNeeds: room.terminal.store[type] });
                    return room.storage;
                }
            }
        }
    }
    return null;
};
action.newTargetStorage = function(creep) {
    let room = creep.room;
    let data = room.memory;
    // check storage for needs
    let storage = creep.room.storage;
    if (storage) {
        // check for excess to overflow back to terminal
        for (var resource in storage.store) {
            let amount = -storage.getNeeds(resource);
            if (resource && amount > 0) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: storage.id, resourceType: resource, needs: -amount });
                let dest = this.findNeeding(room, resource, 1, storage.id);
                if (dest) {
                    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: dest.structure.id, resourceType: resource, targetNeeds: dest.amount });
                    return storage;
                }
            }
        };
        // storage is lowest priority so has nowhere local to request resources from
    }
    return null;
};
action.isValidAction = function(creep){
    return true;
};
action.isValidTarget = function(target){
    return true;
};
action.isAddableAction = function(creep){
    let pop = creep.room.population;
    return creep.sum == 0 &&(!pop || !pop.actionCount[this.name] || pop.actionCount[this.name] < this.maxPerAction);
};
action.isAddableTarget = function(target){
    return true;
};
action.newTarget = function(creep){
    let room = creep.room;
    if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name });
    var target = null;
    if( creep.sum == 0) {
        let data = room.memory;
        if (data) {
            target = this.newTargetLab(creep);
            if (target === null) target = this.newTargetContainer(creep);
            if (target === null) target = this.newTargetTerminal(creep);
            if (target === null) target = this.newTargetStorage(creep);
        }
        return target;
    }
    else {
        // find destination for carried resource
        let resourceType = Object.keys(creep.carry)[0];
        var needing = this.findNeeding(room, resourceType);
        if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: needing.structure.id, resourceType: resource, targetNeeds: needing.amount });
        return Game.getObjectById(needing.structure.id);
    }
};
action.isValidStructureType = function(target) {
    let type = target.structureType;
    return type == STRUCTURE_STORAGE || type == STRUCTURE_TERMINAL || type == STRUCTURE_CONTAINER || type == STRUCTURE_LAB;
};
action.cancelAction = function(creep) {
    delete creep.data.actionName;
    delete creep.data.targetId;
    creep.action = null;
    creep.target = null;
    delete creep.data.path;
};
action.loadResource = function(creep, target, resource, amount) {
    let room = creep.room;
    let workResult = creep.withdraw(target, resource, Math.min(amount,creep.carryCapacity-creep.sum));
    return workResult;
};
action.assignDropOff = function(creep, resource) {
    let data = this.findNeeding(creep.room, resource);
    if (data) {
        this.assign(creep, data.structure);
    }
    delete creep.data.path;
};
action.work = function(creep) {
    let target = creep.target;
    let type = target.structureType;
    let room = creep.room;
    let storage = room.storage;
    let terminal = room.terminal;
    var workResult = null;
    var resource = null;
    var amount = 0;

    if (creep.sum == 0 && type == STRUCTURE_LAB) {
        // load up from the lab
        amount = -target.getNeeds(RESOURCE_ENERGY);
        if (amount > 0) resource = RESOURCE_ENERGY;
        if (!resource) {
            amount = -target.getNeeds(target.mineralType)
            if (amount > 0) resource = target.mineralType;
        }
        if (resource) {
            workResult = this.loadResource(creep, target, resource, amount);
            this.assignDropOff(creep, resource);
        } else this.cancelAction(creep);
    } else if (creep.sum == 0 && type == STRUCTURE_CONTAINER) {
        // identify resource and load up from store
        for (var res in target.store) {
            amount = -target.getNeeds(res);
            if (amount > 0) { resource = res; break; }
        }
        if (resource) {
            workResult = this.loadResource(creep, target, resource, amount);
            this.assignDropOff(creep, resource);
        } else this.cancelAction(creep);
    } else if (creep.sum == 0 && type == STRUCTURE_TERMINAL) {
        // identify resource and load up from store
        for (var res in target.store) {
            if (res) {
                let dat = this.findNeeding(room, res);
                if (dat && dat.structure.id == target.id) dat = null;
                if (dat) {
                    if (DEBUG_LOGISTICS) console.log(creep,target,"found need for",dat.amount,res,"in",dat.structure);
                    amount = dat.amount;
                }
                //if (!amount) amount = -this.terminalNeeds(target, res);
                if (amount > 0) {
                    resource = res;
                    break;
                } else if (storage && dat && dat.structure.structureType == STRUCTURE_STORAGE && res == RESOURCE_ENERGY) {
                    amount = storage.storeCapacity-storage.sum;
                    resource = res;
                    break;
                }
            }
        }
        if (resource) {
            amount = Math.min(amount,target.store[resource]||0,creep.carryCapacity-creep.sum);
            if (DEBUG_LOGISTICS) console.log(creep,"picking up", amount, resource, "from terminal");
            workResult = this.loadResource(creep, target, resource, amount);
            this.assignDropOff(creep, resource);
        } else this.cancelAction(creep);
    } else if (creep.sum == 0 && type == STRUCTURE_STORAGE) {
        // check for other container's needs and local excess
        for (var res in target.store) {
            if (res) {
                let dat = this.findNeeding(room, res);
                if (dat && dat.structure.id == target.id) dat = null;
                if (dat) {
                    if (DEBUG_LOGISTICS) console.log(creep,target,"found need for",dat.amount,res,"in",dat.structure);
                    amount = dat.amount;
                }
                //if (!amount) amount = -this.storageNeeds(target, res);
                if (amount > 0) {
                    resource = res;
                    break;
                } else if (terminal && dat && dat.structure.structureType == STRUCTURE_TERMINAL && res != RESOURCE_ENERGY && res != RESOURCE_POWER) {
                    amount = terminal.storeCapacity-terminal.sum;
                    resource = res;
                    break;
                }
            }
        }
        if (resource) {
            amount = Math.min(amount,target.store[resource]||0,creep.carryCapacity-creep.sum);
            if (DEBUG_LOGISTICS) console.log(creep,"picking up", amount, resource, "from storage");
            workResult = this.loadResource(creep, target, resource, amount);
            this.assignDropOff(creep, resource);
        } else this.cancelAction(creep);
    } else if (type == STRUCTURE_LAB) {
        // drop off at lab
        amount = target.getNeeds(RESOURCE_ENERGY);
        if (amount > 0 && (creep.carry.energy||0) > 0) {
            resource = RESOURCE_ENERGY;
        } else {
            let order = this.getLabOrder(target);
            if (order) resource = order.type;
            amount = target.getNeeds(resource);
            if (!(amount > 0 && (creep.carry[resource]||0) > 0)) {
                resource = null;
            }
        }
        amount = Math.min(amount,creep.carry[resource]||0);
        if (resource) workResult = creep.transfer(target, resource, amount);

        if ((creep.carry[resource]||0) > amount) {
            this.assignDropOff(creep, resource);
        } else {
            this.cancelAction(creep);
        }
    } else if (type == STRUCTURE_CONTAINER) {
        // drop off at store
        for (var res in creep.carry) {
            amount = target.getNeeds(res);
            if (amount > 0) {
                resource = res;
                break;
            }
        }
        amount = Math.min(amount,creep.carry[resource]||0);
        if (resource) workResult = creep.transfer(target, resource, amount);

        if ((creep.carry[resource]||0) > amount) {
            this.assignDropOff(creep, resource);
        } else {
            this.cancelAction(creep);
        }
    } else if (type == STRUCTURE_TERMINAL) {
        // drop off at store
        for (var res in creep.carry) {
            amount = target.getNeeds(res);
            if (amount > 0) {
                resource = res;
                break;
            } else if (res != RESOURCE_ENERGY && res != RESOURCE_POWER) {
                resource = res;
                amount = target.storeCapacity-target.sum;
                break;
            }
        }
        amount = Math.min(amount,creep.carry[resource]||0);
        if (resource) workResult = creep.transfer(target, resource, amount);

        if ((creep.carry[resource]||0) > amount) {
            this.assignDropOff(creep, resource);
        } else {
            this.cancelAction(creep);
        }
    } else if (type == STRUCTURE_STORAGE) {
        // drop off at store
        for (var res in creep.carry) {
            amount = target.getNeeds(res);
            if (amount > 0) {
                resource = res;
                break;
            }
        }
        amount = Math.min(amount,creep.carry[resource]||0);
        if (resource) workResult = creep.transfer(target, resource, amount);

        if ((creep.carry[resource]||0) > amount) {
            this.assignDropOff(creep, resource);
        } else {
            this.cancelAction(creep);
        }
    } else {
        this.cancelAction(creep);
    }
    if (workResult == OK && creep.sum > 0) {
        // update order
        let data = null;
        if (room.memory.resources) data = room.memory.resources[target.structureType].find((s)=>s.id==target.id);
        if (data) {
            let order = data.orders.find(o=>o.type==resource);
            if (order && order.orderRemaining > 0) {
                order.orderRemaining -= amount;
            }
        }
    }
    return workResult;
};
action.onAssignment = function(creep, target) {
    if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(8660), SAY_PUBLIC);
};
