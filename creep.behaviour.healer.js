var behaviour = new Creep.Behaviour('healer');
behaviour.run = function(creep) {
    if( creep.room.situation.invasion && (!creep.action || creep.action.name != 'healing') )
        Creep.action.healing.assign(creep);
    else {
        if( !creep.flag ) {
            let flag = FlagDir.find(FLAG_COLOR.invade, creep.pos, false);
            if( flag ){
                if( Creep.action.travelling.assign(creep, flag) )
                    Population.registerCreepFlag(creep, flag);
            }
        }
    }
    Creep.Behaviour.prototype.run.call(this, creep);
};
behaviour.nextAction = function(creep){ 
    let priority = [
        healing, 
        guarding, 
        idle
    ];
    for(var iAction = 0; iAction < priority.length; iAction++) {
        var action = priority[iAction];
        if(action.isValidAction(creep) && 
            action.isAddableAction(creep) && 
            action.assign(creep)) {
                return;
        }
    }
}
module.exports = behaviour;