let action = new Creep.Action('withdrawing');
module.exports = action;
action.isValidAction = function(creep){
    return (
        creep.room.storage &&
        creep.room.storage.store.energy > 0  &&
        creep.data.creepType != 'privateer' &&
        creep.sum < creep.carryCapacity &&
        (!creep.room.conserveForDefense || creep.room.relativeEnergyAvailable < 0.8)
    );
};
action.isValidTarget = function(target){
    return ( (target != null) && (target.store != null) && (target.store.energy > 0) );
};
action.newTarget = function(creep){
    return creep.room.storage;
};
action.work = function(creep){
    return creep.withdraw(creep.target, RESOURCE_ENERGY);
};
action.onAssignment = function(creep, target) {
    //if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(9738), SAY_PUBLIC);
    if( SAY_ASSIGNMENT ) creep.say(ACTION_SAY.WITHDRAWING, SAY_PUBLIC);
};
action.debounce = function(creep, outflowActions, thisArg) {
    if (creep.data.lastAction === 'storing' && creep.data.lastTarget === creep.room.storage.id) {
        // cycle detected
        const dummyCreep = {};
        for (let key in creep) {
            dummyCreep[key] = creep[key];
        }
        for (let key in dummyCreep.carry) {
            dummyCreep.carry[key] = 0;
        }
        dummyCreep.carry[RESOURCE_ENERGY] = dummyCreep.carryCapacity; // assume we get a full load of energy
        return _.some(outflowActions, a => a.name !== 'storing' && a.isValidAction(dummyCreep) && a.isAddableAction(dummyCreep) && a.newTarget(creep));
    }
    return true;
};
