/*
    Copyright (C) 2024

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

class VerificationTask{
     constructor(systemdic, universalSystems, existentialSystems,dpa, strategy, state, numberOfuniversallyQuantified, updated, networks, automatonNetwork,position,prophecyTracker, mainDPAstate, prophecyDPAs){
        this.systemdic= systemdic; 
        this.universalSystems = universalSystems
        this.existentialSystems = existentialSystems
        this.dpa = dpa; 

        this.strategy = strategy; 
        //to remember the state before updating universally quantified systems 
        this.state = state; 
        //to remember which universally quantified systems are already updated
        this.updated = updated

        this.numberOfuniversallyQuantified = numberOfuniversallyQuantified,
        //networks for systems
        this.networks = networks;
        //network for DPA
        this.automatonNetwork = automatonNetwork;
        this.position = position; //wie Position übertragen
        this.mainDpaState = mainDPAstate;
        //prophecy map einführen
        this.prophecyTracker =prophecyTracker;
        this.mainDPAtracker ={0: mainDPAstate}
        
        this.prophecyDPAs = prophecyDPAs // Object: name -> dpa
        this.nonEmptyStates = this.setUpNonEmptyStates() //Obj: name -> {dpa: nonEmptystate(dpa), negdpa: nonEmptyStates(neg dpa)}


        this.prophecyStateTracker = this.prophecyInitials()

        
        for (const [key, value] of Object.entries(prophecyDPAs)) {
            var neg = this.negateDPA(value)
        }
        
       var nextStrategyEntry = this.findStrategyEntry();
       this.updateDPA(nextStrategyEntry);

    }

    setUpNonEmptyStates(){
        var nonEmptyStates = {}
        for (const [key, value] of Object.entries(this.prophecyDPAs)) {
            var neg = this.negateDPA(value)
            nonEmptyStates[key] = {
                dpa: this.nonEmptyStateExistential(value),
                negdpa: this.nonEmptyStateExistential(neg)
            }
        }
        return nonEmptyStates
    }

    prophecyInitials(){
        var initialStatesProphecies ={}
        initialStatesProphecies[0] ={} //pos -> {dpa: {initial}, negdpa:{}} 
       
        for (const [key, value] of Object.entries(this.prophecyDPAs)) {
            initialStatesProphecies[0][key] ={   
                dpa: new Set(), //[value.initialState]
                negdpa: new Set() //[value.initialState]
            }          
        }
        return initialStatesProphecies
    }

    updateProphecy(strategyEntry){
        this.prophecyStateTracker[this.position+1]={}
        for (const [key,value] of Object.entries(this.prophecyTracker)){
            var dpaSet = new Set(Array.from(this.prophecyStateTracker[this.position][key].dpa))
            var negdpaSet = new Set(Array.from(this.prophecyStateTracker[this.position][key].negdpa))
            
            if (value==1){
                //  put initial in dpa
                dpaSet.add(this.prophecyDPAs[key].initialState)
            } else if(value ==2){
                negdpaSet.add(this.prophecyDPAs[key].initialState)
            } else{
                alert("Problem: at least one Prophecy was not updated!")
            }
            var nextdpaSet = new Set()
            var nextnegdpaSet = new Set()
            dpaSet.forEach(entry => {
                for (var i=0; i < strategyEntry.prophecyRules.length; i++){
                    if (strategyEntry.prophecyRules[i].prophecyName == key){
                        //update
                        var found=false
                        var newEntry
                        for (var j=0; j < strategyEntry.prophecyRules[i].transitionList.length; j++){
                            if (strategyEntry.prophecyRules[i].transitionList[j].source==entry){
                                found=true
                                newEntry=strategyEntry.prophecyRules[i].transitionList[j].target
                                break;
                            }
                        }
                        if (found){
                            nextdpaSet.add(newEntry)
                            break;
                        }
                        
                    }
                }
                
               
            })

            negdpaSet.forEach(entry => {
                for (var i=0; i < strategyEntry.prophecyRules.length; i++){
                    if (strategyEntry.prophecyRules[i].prophecyName == key){
                        //update
                        var found=false
                        var newEntry
                        for (var j=0; j < strategyEntry.prophecyRules[i].transitionList.length; j++){
                            if (strategyEntry.prophecyRules[i].transitionList[j].source==entry){
                                found=true
                                newEntry=strategyEntry.prophecyRules[i].transitionList[j].target
                                break;
                            }
                        }
                        if (found){
                            nextnegdpaSet.add(newEntry)
                            break;
                        }
                        
                    }
                }
            })


            
            var recordAbsenseViolation = true
            var violatingProphecyModal = document.getElementById("violatingProphecyModal")
            nextdpaSet.forEach(entry => {
                if (!(this.nonEmptyStates[key].dpa.has(entry))){
                    violatingProphecyModal.style.display = "block";
                    //alert("Behaviour violates previously chosen prophecy behaviour")
                    recordAbsenseViolation = false
                    
                }
                if (nextnegdpaSet.has(entry)){
                    violatingProphecyModal.style.display = "block";
                    recordAbsenseViolation = false
                }
                
            })
            nextnegdpaSet.forEach(entry => {
                if (!(this.nonEmptyStates[key].negdpa.has(entry))){
                    violatingProphecyModal.style.display = "block";
                    //alert("Behaviour violates previously chosen prophecy behaviour")
                    recordAbsenseViolation = false
                }

                if (nextdpaSet.has(entry)){
                    violatingProphecyModal.style.display = "block";
                    recordAbsenseViolation = false
                }
            })
           
            this.prophecyStateTracker[this.position+1][key] ={dpa: nextdpaSet, negdpa: nextnegdpaSet}
            return recordAbsenseViolation 
        }
        return true
        
    }

    nonEmptyStateExistential(dpa){
        //compute the even colors
        var evenColors =  new Set()
        for (var i=0; i < dpa.states.length; i++){
            if (dpa.states[i].color % 2 == 0){
                evenColors.add(dpa.states[i].color)
            }
        }

        //find states with accepting selfloop
        var statesWithAcceptingSelfloop = new Set()
        evenColors.forEach(color => {
            
            (this.acceptingLoopColor(color,dpa)).forEach(entry => statesWithAcceptingSelfloop.add(entry))
        })
        var statesWithAcceptingSelfloop = Array.from(statesWithAcceptingSelfloop)
        
        //reach pairs
        var reachPairs = Array.from(this.reachablePairs (dpa.states))

        var result = new Set()
        
        for (var i=0; i < dpa.states.length;i++){
            
            for (var j=0; j < statesWithAcceptingSelfloop.length; j++){
                var arr = [dpa.states[i].id,statesWithAcceptingSelfloop[j].id]
                if (reachPairs.some(entry => 
                    Array.isArray(entry) &&
                    Array.isArray(arr) &&
                    entry.length == arr.length &&
                    entry.every((val,index) => val==arr[index])
                    ))
                {
                    result.add(dpa.states[i].id)
                    
                    break;
                }
            }
        }
        return result

    }

    acceptingLoopColor (col, dpa){
        var statesOfSmallerCol = []
        
        for (var i =0; i < dpa.states.length;i++){
            if ( dpa.states[i].color <= col){
                statesOfSmallerCol.push(dpa.states[i])
            }
        }
        
        var reachPairs = this.reachablePairs(statesOfSmallerCol)
        
        var winningStates = new Set()
       
        var reachPairs = Array.from(reachPairs)
        for (var i=0; i < dpa.states.length; i++){
            var arr =[dpa.states[i].id,dpa.states[i].id]
            
            if (dpa.states[i].color == col & reachPairs.some(entry => 
                Array.isArray(entry) &&
                Array.isArray(arr) &&
                entry.length == arr.length &&
                entry.every((val,index) => val==arr[index])
                )){ 
                
                winningStates.add(dpa.states[i])
            }
        }
        return winningStates
    }

    reachablePairs(states){
        //reachable pairs
        var next = []
        
        //ids of states
        var statesIDs = new Set() 
        states.forEach(state => statesIDs.add(state.id));

        states.forEach(
            state => 
            state.edges.forEach(
                entry => 
                {
                    if (statesIDs.has(entry.target)){ 
                        next.push([state.id,entry.target])
                    }
                }
            )
        )

        states.forEach(
            entry_i =>
            states.forEach(
                entry_j =>
                states.forEach(
                    entry_k =>
                    {
                        var arr1 = [entry_i.id, entry_k.id]
                        var arr2 = [entry_k.id, entry_j.id]
                        var arr3 = [entry_i.id, entry_j.id]
                       

                        if (next.some(entry => entry.every((val,index) => val==arr1[index])) 
                        && next.some(entry =>entry.every((val,index) => val==arr2[index])) 
                        && next.every(entry => (entry.some((val,index) => val!=arr3[index])))  
                                ){
                            next.push([entry_i.id, entry_j.id])
                        }
                    }
                )
            )
        )

        return new Set(next)
    }

    negateDPA(dpa){
        var newDPA = structuredClone(dpa)
        newDPA.states.forEach(state => state.color = state.color+1);
        return newDPA
    }

    systemsLeft(){
         //check how many are not updated yet
         var counter = 0;
         for (var i in this.updated){
            //if one value in updated is false: no update possible -> return false
            if (!this.updated[i]){
                counter++;
            }
        }
        return counter

    }

    propheciesLeft(){
        //check how many prophecies are not updated yet
        var counter =0;
        for (var name in this.prophecyTracker){
            if (this.prophecyTracker[name]==0){
                counter++
            }
        }
        return counter
    }

    async resetUserInput(){
        //set updated to false
        for (var i=0; i < this.universalSystems.length ;i++){
            this.updated[this.universalSystems[i]]=false;
        }  
       
        //reset prophecyTracker 
        for (var name in this.prophecyTracker){
            //reset prophecy Tracker
            this.prophecyTracker[name]=0

            //reset colors of buttons
            var buttonTrue = document.getElementById("buttonTrue" + name)
            buttonTrue.className ="whitebutton green-detailbutton smallbutton fa-solid fa-check"
            var buttonFalse = document.getElementById("buttonFalse" + name)
            buttonFalse.className = "whitebutton red-detailbutton smallbutton fa-solid fa-xmark"
        }

        //set Timeout: color borders of universallyQuantified system back to blue
        const children_of_all = document.getElementById("systemsUniversal").children
       
        setTimeout(function(){
        for (var j=0; j < children_of_all.length; j++){
            children_of_all[j].style.border ="2px solid #4c8ff4" 
        }},500)
    }

    checkUpdateExist(){
        return (this.propheciesLeft() + this.systemsLeft()==0)
    }

    async updateCompleteState(){
        //find matching strategry entry
        var strategyEntry = this.findStrategyEntry();
        
        //update dpa
        this.updateDPA(strategyEntry);
        var strategyRule = this.findStrategyRule(strategyEntry)

        this.updateMainDPAState(strategyRule) 

        await this.updateExistSystems(strategyRule);
       
        //update state
        this.updateStateStatus();

        //update DPA because of new entry
        var nextStrategyEntry = this.findStrategyEntry();
        this.updateDPA(nextStrategyEntry);
        if (this.updateProphecy(nextStrategyEntry)){
            //add row to tracking table
            this.position ++;
            addRowToTable(true)
            addRowToTable(false)
            //reset track of updated systems
            this.resetUserInput();

            this.mainDPAtracker[this.position]= this.mainDpaState
        }
    }

    findStrategyRule(strategyEntry){
        var strategyRules = strategyEntry.strategyRules
        for (var i=0; i <strategyRules.length; i++){
            var entry = strategyRules[i]
            var matchingEntry = true
            for (var j=0; j < entry.universalMove.prophecyEvaluation.length; j++){
               
                if ((this.prophecyTracker[entry.universalMove.prophecyEvaluation[j].name]==2)== entry.universalMove.prophecyEvaluation[j].evaluation){
                    matchingEntry = false
                    break
                } 
            }
            if (matchingEntry){
                for (var j=0; j < entry.universalMove.systemStates.length; j++){
                   
                    if (this.systemdic[entry.universalMove.systemStates[j].name].currentState!= entry.universalMove.systemStates[j].state){
                        matchingEntry=false
                        break
                    }
                   
                }
            }
            if (matchingEntry){
                return entry
            } 
        }
        alert("no rule found")

    }

    updateMainDPAState(strategyRule){
        this.mainDpaState = strategyRule.successorGameState.mainDpaState
    }
    updateDPA(strategyEntry){
        //update internal representation
        for (var i=0; i < strategyEntry.propertyRules.length;i++){
            if (strategyEntry.propertyRules[i].source==this.dpa.currentState){
                this.dpa.setCurrent(strategyEntry.propertyRules[i].target);
                break;
            }
        }
    
       //automaton network
       updateVisAutomaton(this.automatonNetwork,this.dpa); 
    }

    findStrategyEntry(){
        this.countStrategyEntry()

        for (var i in this.strategy){
            //check if dpa is matching
            
            if (this.mainDpaState == this.strategy[i].gameState.mainDpaState){

                var matching = true;
                //check if the state is matching
                for (var j in this.strategy[i].gameState.systemStates){
                  
                    if (this.state[this.strategy[i].gameState.systemStates[j].name] != this.strategy[i].gameState.systemStates[j].state){
                        matching = false; 
                    }
                }
                // if it is matching: return the strategy entry
                if (matching){
                    
                    return this.strategy[i];
                }  
            }
        }
    }

    countStrategyEntry(){
        for (var i in this.strategy){
            var counterForStrategyEntries =0
            //check if dpa is matching
            if (this.mainDpaState == this.strategy[i].gameState.mainDpaState){

                var matching = true;
                //check if the state is matching
                for (var j in this.strategy[i].gameState.systemStates){
                    if (this.state[this.strategy[i].gameState.systemStates[j].name] != this.strategy[i].gameState.systemStates[j].state){
                        matching = false; 
                    }
                }
                // if it is matching: return the strategy entry
                if (matching){
                    counterForStrategyEntries++
                }  
            }
        }
        if (counterForStrategyEntries>1){
            alert("too many entries: " + counterForStrategyEntries)
        }
        return this.countStrategyEntry
    }

    async updateExistSystems(strategyRule){

        // find the corresponding entry matching the updates on the universial systems in the responselist
        for (var i=0; i < strategyRule.successorGameState.systemStates.length; i++){
            var name = strategyRule.successorGameState.systemStates[i].name
            this.systemdic[name].update(strategyRule.successorGameState.systemStates[i].state);
            updateVisSystem(await this.networks[name],this.systemdic[name])
        }
    }

    findNextStrategyEntry(strategyRule){
        for (var i in this.strategy){
            if (strategyRule.successorGameState.mainDpaState == this.strategy[i].gameState.mainDpaState){

                var matching = true;
                //check if the state is matching
                for (var j in this.strategy[i].gameState.systemStates){
                    
                    if (this.strategy[i].gameState.systemStates[j].name != strategyRule.successorGameState.systemStates[j].name){
                        alert("entry order of systems does not match")
                    }
                    if (strategyRule.successorGameState.systemStates[j].state != this.strategy[i].gameState.systemStates[j].state){
                        matching = false; 
                    }
                }
                // if it is matching: return the strategy entry
                if (matching){
                    return this.strategy[i];
                }  
            }
        }

    }

    async highlightExistSystems(strategyRule, value,valueEdge){
        //update all existential networks
        for (var k=0; k< strategyRule.successorGameState.systemStates.length; k++){   

            var name = strategyRule.successorGameState.systemStates[k].name
            var netw = await this.networks[name]
            //update node
            
            if (this.existentialSystems.includes(strategyRule.successorGameState.systemStates[k].name)){
                netw.$('#' + strategyRule.successorGameState.systemStates[k].state).classes(value);

                var current= this.systemdic[name].currentState
                var next =strategyRule.successorGameState.systemStates[k].state

                if (current==next){
                    netw.$('#' + current + 'to' + next).classes(valueEdge + ' loop');
                } else{
                    netw.$('#' + current + 'to' + next).classes(valueEdge);
                }
            }
        }                    
    }

    updateStateStatus(){
        for (var i in this.systemdic){
            this.state[i] = this.systemdic[i].currentState;
        }
    }
}
 