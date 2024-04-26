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

const baseUrl = 'http://localhost:8383/'

async function sendSystem(_) {
    if (load){
        var ts = await parseTs()

        addSystem(ts) 
    } else{
        
        //update quantifier
        var universalQuantifier = (document.getElementById("quantifierButtonModal").value=="\u2200")
        //redraw Automaton
        if (!transition_systems.includes(document.getElementById("systemName").value.trim()) || transition_system_dict[document.getElementById("systemName").value.trim()].id==updateSystem.id){
            redrawSystem(updateSystem,document.getElementById("systemName").value.trim(),universalQuantifier)
            
            load = true
            createSystemButton = document.getElementById("create_system")
            createSystemButton.innerHTML = "Create new system"
            //close modal
            closeSystemModal()
        } else {
            
            alert ("name already used")
        }
    }
}

async function sendProphecy(){
    var value = document.getElementById("LTLFieldProphecies").value

    var {aut,ltlFormula} = await parseLTL(value)
    const inputFieldSystem = document.getElementById("inputField") 
   
    //process automaton json
    addProphecy(aut, ltlFormula,"P" + (prophecyCounter+1)) //inputFieldSystem.value 
}


async function addProphecy(aut,ltlFormula,name){
    var detParAutomaton = new DetParityAutomaton(aut); 
   
    if (prophecies[name]==undefined){
        prophecies[name]={"ltl":ltlFormula, "dpa":detParAutomaton}
    
        drawProphecy(detParAutomaton, aut, ltlFormula, name)
        closePropheciesmodal()
        //close modal
   
    } else {
        alert ("already prophecy with this name")
    }
    
}    

function addVerifyProphecy(aut,ltlFormula,name,prophecyTracker){
    var detParAutomaton = new DetParityAutomaton(aut); 
    prophecies[name]={"ltl":ltlFormula, "dpa":detParAutomaton}
    buildVerProphecy(ltlFormula, name, prophecyTracker)
}

async function buildVerProphecy(ltlFormula,name, prophecyTracker){

    var prophecy_div = document.createElement("div");
    prophecy_div.className = "quantifiedSys prophecySys"

    var cardHeader = await buildCardHeaderForSystems(prophecy_div)
    var title = document.createElement("li");
    title.className = "cardTitle"

    title.innerHTML = name+": $" + buildMathLTL(ltlFormula)  +"$";
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,  title]);

    await cardHeader.appendChild(title)
    

    var buttonTrue= document.createElement("button")
    buttonTrue.className = "whitebutton green-detailbutton smallbutton fa-solid fa-check"
    //buttonTrue.innerHTML = "true"
    buttonTrue.id ="buttonTrue" + name

    var buttonFalse= document.createElement("button")
    buttonFalse.className = "whitebutton red-detailbutton smallbutton fa-solid fa-xmark"

    buttonFalse.id ="buttonFalse" + name

    buttonTrue.onclick = function() {
        if (prophecyTracker[name]!=1){
            buttonTrue.className = "whitebutton green-permanentbutton smallbutton fa-solid fa-check"
            buttonFalse.className = "whitebutton red-detailbutton smallbutton fa-solid fa-xmark"
            prophecyTracker[name] = 1

            //update verification Task
            if (verificationT.checkUpdateExist()){
                //update existentially quantified Systems + internal representations
                verificationT.updateCompleteState();
                
            }
        } 
    }

    buttonTrue.onmouseenter = function(){
        if (verificationT.systemsLeft()==0 & verificationT.propheciesLeft()==1 & prophecyTracker[name]==0){
            //find Strategy
            var strategyEntry = verificationT.findStrategyEntry()

            //findRule
            verificationT.prophecyTracker[name]=1
            var strategyRule = verificationT.findStrategyRule(strategyEntry)

            //find next StrategyEntry for DPA
            var nextStrategyEntry = verificationT.findNextStrategyEntry(strategyRule)
            //highlight dpa
            for (var i=0; i < nextStrategyEntry.propertyRules.length;i++){
                if (nextStrategyEntry.propertyRules[i].source==verificationT.dpa.currentState){
                    verificationT.automatonNetwork.$('#' + nextStrategyEntry.propertyRules[i].target).classes('highlight');
                    break;
                }
            }
            
            //highlight other systems
            verificationT.highlightExistSystems(strategyRule, 'highlight', 'highlightedge')
            verificationT.prophecyTracker[name]=0
        }
    }

    buttonTrue.onmouseleave = function(){
        if (verificationT.systemsLeft()==0 & verificationT.propheciesLeft()==1 & prophecyTracker[name]==0){
            //find Strategy
            var strategyEntry = verificationT.findStrategyEntry()

            //findRule
            verificationT.prophecyTracker[name]=1
            var strategyRule = verificationT.findStrategyRule(strategyEntry)

            //find next StrategyEntry for DPA
            var nextStrategyEntry = verificationT.findNextStrategyEntry(strategyRule)
            //highlight dpa
            for (var i=0; i < nextStrategyEntry.propertyRules.length;i++){
                if (nextStrategyEntry.propertyRules[i].source==verificationT.dpa.currentState){
                    verificationT.automatonNetwork.$('#' + nextStrategyEntry.propertyRules[i].target).classes('');
                    break;
                }
            }
            
            //highlight other systems
            verificationT.highlightExistSystems(strategyRule, '', '')
            verificationT.prophecyTracker[name]=0

        }
    }

    buttonFalse.onclick = function() {
        if (prophecyTracker[name] != 2){
            buttonFalse.className = "whitebutton red-permanentbutton smallbutton fa-solid fa-xmark"
            buttonTrue.className = "whitebutton green-detailbutton smallbutton fa-solid fa-check"
            prophecyTracker[name] = 2

            //update verification Task
            if (verificationT.checkUpdateExist()){
                //update existentially quantified Systems + internal representations
                verificationT.updateCompleteState();
            }
        } 
        
    }

    buttonFalse.onmouseenter = function(){
        if (verificationT.systemsLeft()==0 & verificationT.propheciesLeft()==1 & prophecyTracker[name]==0){
            //find Strategy
            var strategyEntry = verificationT.findStrategyEntry()

            //findRule
            verificationT.prophecyTracker[name]=2
            var strategyRule = verificationT.findStrategyRule(strategyEntry)

            //find next StrategyEntry for DPA
            var nextStrategyEntry = verificationT.findNextStrategyEntry(strategyRule)
            //highlight dpa
            for (var i=0; i < nextStrategyEntry.propertyRules.length;i++){
                if (nextStrategyEntry.propertyRules[i].source==verificationT.dpa.currentState){
                    verificationT.automatonNetwork.$('#' + nextStrategyEntry.propertyRules[i].target).classes('highlight');
                    break;
                }
            }
            
            //highlight other systems
            verificationT.highlightExistSystems(strategyRule, 'highlight', 'highlightedge')
            verificationT.prophecyTracker[name]=0
        }
    }

    buttonFalse.onmouseleave = function(){
        if (verificationT.systemsLeft()==0 & verificationT.propheciesLeft()==1 & prophecyTracker[name]==0){
            
            //find Strategy
            var strategyEntry = verificationT.findStrategyEntry()

            //findRule
            verificationT.prophecyTracker[name]=2
            var strategyRule = verificationT.findStrategyRule(strategyEntry)

            //find next StrategyEntry for DPA
            var nextStrategyEntry = verificationT.findNextStrategyEntry(strategyRule)
            
            //highlight dpa
            for (var i=0; i < nextStrategyEntry.propertyRules.length;i++){
                if (nextStrategyEntry.propertyRules[i].source==verificationT.dpa.currentState){
                    verificationT.automatonNetwork.$('#' + nextStrategyEntry.propertyRules[i].target).classes('');
                    break;
                }
            }

            //highlight other systems
            verificationT.highlightExistSystems(strategyRule, '', '')
            verificationT.prophecyTracker[name]=0

        }
    }
    
    var centerButtonDiv = document.createElement("div");
    centerButtonDiv.className = "centerButtonDiv"
    centerButtonDiv.appendChild(buttonTrue)
    centerButtonDiv.appendChild(buttonFalse)
    prophecy_div.appendChild(centerButtonDiv)

    prophecyCounter = prophecyCounter+1
    document.getElementById("prophecies").appendChild(prophecy_div);
}

function drawProphecy(detParAutomaton, aut, ltlFormula,name){
    var prophecy_div = document.createElement("div");
    prophecy_div.className = "proph"

    renderProphecy(prophecy_div, ltlFormula, name)
    document.getElementById("prophecies").appendChild(prophecy_div);
}

async function parseTs(){
    const inputFieldSystem = document.getElementById("inputField") 
    if (inputFieldSystem.value == '') { return }
    const res = await fetch(baseUrl + 'renderTS', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify ({
            parcel: inputFieldSystem.value
        })
    })

    const jsonResult = await res.json()

    console.log(`Result: ${jsonResult}`)

    if (! jsonResult.hasOwnProperty('status')) {
        alert('Unexpected Response from Backend')
        return 
    }

    if (jsonResult.status == 'fail') {
        if (jsonResult.hasOwnProperty('error')) {
            alert('Error: ' + jsonResult.error)
        } else {
            alert('Failure')
        }
    } else if (jsonResult.status == 'OK') {
        if (! jsonResult.hasOwnProperty('result')) {
            return
        }
        ts = jsonResult.result

        console.log("Received System: ", ts)

       return ts
    } else {
        alert('Unexpected Response from Backend')
    }
}

async function addSystem(ts){
    console.log("Received System: ", ts)
    //create graph
    var quantifierModal = document.getElementById("quantifierButtonModal")
  
    var universalQuantifier = (quantifierModal.value=="\u2200")
    
    if (!transition_systems.includes(document.getElementById("systemName").value.trim())){
        var graph = new System(ts,idForSystems,universalQuantifier, document.getElementById("systemName").value.trim());
        transition_systems.push(document.getElementById("systemName").value.trim());
        transition_system_dict[document.getElementById("systemName").value.trim()] = graph
    
        //draw graph
        drawSystem(graph, document.getElementById("systemName").value)
        closeSystemModal()
    } else {
        alert ("name used for another system")
    }
   
}

function drawSystem(graph, name){
    //create graph div
    var system_div = document.createElement("div");
    system_div.className = "quantifiedSys"

    //to visjs
    renderSystem(system_div, graph,name);

    //append to graphs div
    document.getElementById("graphs").appendChild(system_div);
}


async function sendLTL(_) {
    //automaton json from backend

    var {aut,ltlFormula} = await parseLTL(document.getElementById("LTLField").value)
    
    //close modal
    closeDPAmodal()
    await resetLTL();
    //process automaton json
    addLTL(aut, ltlFormula)
}

async function addLTL(aut,ltlFormula){
    var detParAutomaton = new DetParityAutomaton(aut); 
    dpa = detParAutomaton

    sessionStorage.setItem("dpa",ltlFormula);
    
    var automatonNetwork = renderDPA(document.getElementById('LTLautomaton'),dpa, aut, ltlFormula)
   
    return automatonNetwork
}




async function parseLTL(inputValue) {
    if (inputValue == '') { return }

    const res = await fetch(baseUrl + 'renderLTL', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify ({
            parcel: inputValue
        })
    })

    const jsonResult = await res.json()

    if (! jsonResult.hasOwnProperty('status')) {
        alert('Unexpected Response from Backend')
        return 
    }

    if (jsonResult.status == 'fail') {
        if (jsonResult.hasOwnProperty('error')) {
            alert('Error: ' + jsonResult.error)
        } else {
            alert('Failure')
        }
    } else if (jsonResult['status'] == 'OK') {
        if (! jsonResult.hasOwnProperty('result')) {
            return
        }
        aut = jsonResult.result
        ltlFormula = inputValue
        return {aut,ltlFormula}
        
        
    } else {
        alert('Unexpected Response from Backend')
    }
}

async function sendVerificationStrategy(_) {
    //build prefix array
    var quantor = [];
    var graphs = []
    for (var i=0; i < transition_systems.length; i++){
        
        //if (transition_systems[i].universallyQuantified){
        if (transition_system_dict[transition_systems[i]].universallyQuantified){
            quantor.push({"type":"forall", "name": transition_systems[i]})          
        } else{
            quantor.push({"type":"exists", "name": transition_systems[i]})
        }   
        graphs.push({"name": transition_systems[i],"system": transition_system_dict[transition_systems[i]].returnJson()})
    }

    var prophecyFormula = {}
    var prophecyAutomaton = []
    var counter =0
    for (var i in prophecies){
        
        var entry = prophecies[i]
        prophecyAutomaton[counter]= {"name": i,"dpa": entry.dpa.returnJson()}
        prophecyFormula[i]= entry.ltl
        counter++;
    }
    sessionStorage.setItem("prophecyFormula", JSON.stringify(prophecyFormula));

    //state Verification Task
    var verificationTask= {
        "systems": graphs, 
        "mainDpa": dpa.returnJson(), 
        "prefix": quantor, 
        "prophecieDpas": prophecyAutomaton};

    
    //store verification task
    sessionStorage.setItem("verificationTask", JSON.stringify(verificationTask));

    //set to backend
    if (verificationTask == '') {alert('Verification Task empty');return }
    const res = await fetch(baseUrl + 'verify', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify ({
            parcel: JSON.stringify(verificationTask)
        })
    })

    const jsonResult = await res.json()

    if (! jsonResult.hasOwnProperty('status')) {
        alert('Unexpected Response from Backend')
        return 
    }
    
    if (jsonResult.status == 'fail') {
        if (jsonResult.hasOwnProperty('error')) {
            alert('Error: ' + jsonResult.error)
        } else {
            alert('Failure')
        }
    } else if (jsonResult.status == 'OK') {
        if (! jsonResult.hasOwnProperty('result')) {
            alert('no property result')
            return
        }
        if (jsonResult.result.verificationOutcome == "notVerified"){
            alert('not verified')
        } else if (jsonResult.result.verificationOutcome == "UNSAT"){    
            alert('unsatisfiable')
        }
        else {
            var verificationStrategy = jsonResult.result

            //store verification strategy
            sessionStorage.setItem("verificationStrategy", JSON.stringify(verificationStrategy));

            parent.location = "verify.html"
        }

    } else {
        alert('Unexpected Response from Backend')
    }
}
async function resetSystems(_) {
    resetSystemDiv();
    //reset internal values
    transition_systems = [];
    transition_system_dict = {};
    idForSystems=0
    updateSystemName()
}


async function resetSystemDiv(){
    //remove visualisation
    let element = document.getElementById("graphs");
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
async function resetProphecies(){
    let element = document.getElementById("prophecies");

    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    prophecies = {}
    prophecyCounter = 0
}



async function resetLTL(_) {
    dpa = "";
    document.getElementById("tableDPATitle").innerHTML = "Formula"

    var element = document.getElementById("LTLautomaton");
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    //remove Table + values
    var element = document.getElementById("tableDPA");
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    //reset values
    document.getElementById("explainationTableDPA").style.display = 'none';
    document.getElementById("LTLformula").innerHTML = ""
    
}

async function removeSystem(x){
    var position_to_remove = 0;
    var found = false;
    //search for id of graph in list
    for (var i=0; i < transition_systems.length; i++){
        
        if (transition_system_dict[transition_systems[i]].id==x){
            position_to_remove = i;
            found = true;
            break;
        }
    }
    // if found, remove from internal representation
    if (found){
        delete transition_system_dict[transition_systems[position_to_remove]]
        transition_systems.splice(position_to_remove,1)
    }
    //redraw all graphs
    redrawAllVisSystems()
}

async function redrawAllVisSystems(){
    //reset graph div
    resetSystemDiv()
    //draw graphs
    drawAllVisSystems()
}

function drawAllVisSystems(){
    //draw all views
    for (var i=0; i< transition_systems.length; i++){
        drawSystem(transition_system_dict[transition_systems[i]],transition_systems[i])
    }
}

async function moveSystem(x,left){
    //find position to move graph to
    var position_to_move = 0;
    for (var i=0; i < transition_systems.length; i++){
        if (transition_system_dict[transition_systems[i]].id==x){
            position_to_move = i;
            break;
        }
    }
    //check if it moving is possible
    var changeable =false
    if (left){
        //mark position to change graph with
        next =position_to_move-1;
        if (position_to_move >0){
            //to move to left: position must be greater than 0
            changeable = true;
        }
    } else{
        //mark position to change graph with
        next =position_to_move+1;
        if (position_to_move < transition_systems.length-1){
            //to move to left: position must be smaller than length of array
            changeable = true;
        }
    }

    //change values if possible
    if (changeable){
        var tmp = transition_systems[position_to_move]
        transition_systems[position_to_move]=transition_systems[next]
        transition_systems[next] = tmp
        redrawAllVisSystems()
    }
}

async function redrawSystem(oldSystem,name,quantifier){
    var ts = await parseTs()
    //generate new graph
    newSystem = new System(ts,oldSystem.id ,quantifier, name);
    idForSystems--;

    
    var positionToRedraw = 0;
    var found = false;
    //find position of old graph
    for (var i=0; i < transition_systems.length; i++){
        
        if (transition_system_dict[transition_systems[i]].id==oldSystem.id){
            positionToRedraw = i;
            found = true;
            break;
        }
    }

    if (found){
        delete transition_system_dict[transition_systems[positionToRedraw]]
        // replace old graph with new graph
         transition_systems[positionToRedraw] = name
         transition_system_dict[transition_systems[positionToRedraw]] = newSystem
    } else{
        alert('error, graph not found'+ graph)
    }
    //update the view
    redrawAllVisSystems()
}

function modifyExample(){
    parent.location = "index.html"
}

function newVerificationTask(){
    sessionStorage.clear()
    parent.location = "index.html"
}

