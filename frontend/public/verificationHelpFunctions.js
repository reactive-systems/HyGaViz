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

function numberOfuniversallyQuantified(verTask){
    //count number of all Quantified Systems of verification Task
    var numberuniversallyQuantified = 0;
    for (var i in verTask.prefix){
        if (verTask.prefix[i].type == "forall"){
            numberuniversallyQuantified++;
        }
    }
    return numberuniversallyQuantified
}

function buildInternalStrategy(ver){
    //give internal strategy
    var strategy = {};
    for (i in ver.strategy){
        
        strategy[i] = ver.strategy[i];
    } 
    return strategy;
}

function computeSystem(verTask){
    var systems = {}; //  Dic: stores the systems: name -> system
    var universalSystems = []; //names of uni systems
    var existentialSystems = []; //names of existential systems
    var networks = {}; // dic: name -> cy object
    var initialStateOfVer = {}; //dic: name -> initial state
    var numberuniversallyQuantified = numberOfuniversallyQuantified(verTask);

    for (var i in verTask.prefix){

        var universallyQuantified = (verTask.prefix[i].type=="forall")

        var system=undefined;
        for (var j in verTask.systems){
           
            if (verTask.systems[j].name==verTask.prefix[i].name){
                system = verTask.systems[j]
            }
        }

        if (system==undefined){
           
            alert("Problem: system not found in list")
        } else{

            var graph = new System(system.system, i, universallyQuantified, verTask.prefix[i].name);
            systems[verTask.prefix[i].name] = graph; 

            //set initialStateOfVer
            initialStateOfVer[verTask.prefix[i].name] = graph.initialState;

            if (verTask.prefix[i].type=="forall"){
                universalSystems.push(verTask.prefix[i].name)
            } else{
                existentialSystems.push(verTask.prefix[i].name)
            }

            var divForNewSystem = computeNewSystemDiv(universallyQuantified)
        
            networks[verTask.prefix[i].name] = renderSystemVerification( divForNewSystem, graph, universallyQuantified, verTask.prefix[i].name); //networks
        }
    }

     //set justifyContent -> deal with overflow
    var elements = document.getElementsByClassName("systemContainer")
    
    for (var i =0; i <elements.length; i++) {
        
        if (elements[i].scrollWidth > elements[i].clientWidth +1){
            elements[i].style.justifyContent = "start";
        } 
    }
    
    return {
        systems, 
        universalSystems,
        existentialSystems,
        networks,
        numberuniversallyQuantified,
        initialStateOfVer
    }
}

function computeNewSystemDiv(universallyQuantified){
    var nextSystem = document.createElement("div");
    nextSystem.className = "quantifiedSys";
    if (universallyQuantified) {
        nextSystem.className = "quantifiedSys universallyQuantifiedSys";
    } 
        // Append the new graph
        appendSystemToDiv(universallyQuantified,nextSystem)
    return nextSystem
}

function appendSystemToDiv(universallyQuantified,graph){
    // append to universal oder existential graph div
    if (universallyQuantified){
        document.getElementById("systemsUniversal").appendChild(graph); 
    } else{
        document.getElementById("systemsExistential").appendChild(graph); 
    }
}

function create_table(verificationTask){
    var table = document.createElement('table');
    table.id = "trackingTable"
    //create first row
    create_legend_table_values(verificationTask,table)
    document.getElementById("table_div").appendChild(table)
}

function create_table_modal(verificationTask){
    var table = document.createElement('table');
    table.id = "trackingTableModal"
    create_legend_table_values(verificationTask,table)
    document.getElementById("contentViolatingProphcyModal").append(table)

}

async function create_legend_table_values(verificationTask,table){
    var tr = document.createElement('tr');
    var values = ["Jump to", "Pos.", "DPA"]
    //create return columns: return to, position, DPA
    for (var i=0; i < 3; i++){
        tr.appendChild( document.createElement('th') );
        tr.cells[i].appendChild( document.createTextNode(values[i]) )
    }
    //create colums for systems
    for (var i = 0; i < verificationTask.universalSystems.length; i++) {
       
        tr.appendChild( document.createElement('th') );
        tr.cells[i+3].appendChild( document.createTextNode(verificationTask.universalSystems[i]))
    }
    var counter=0
    for (const [key, value] of Object.entries(verificationTask.prophecyTracker)){
        tr.appendChild( document.createElement('th') );
        tr.cells[counter+3+verificationTask.universalSystems.length].appendChild(  document.createTextNode(key))
        counter++
    }
  
    for (var i = 0; i < verificationTask.existentialSystems.length; i++) {
       
        tr.appendChild( document.createElement('th') );
        tr.cells[i + 3 + Object.keys(verificationTask.prophecyTracker).length+verificationTask.universalSystems.length].appendChild( document.createTextNode(verificationTask.existentialSystems[i]))
    }
   
    table.appendChild(tr);
}


function addRowToTable(modal){
    //load Task, table, position
    var verificationTask = verificationT
    var table
    if (modal){
        table = document.getElementById("trackingTableModal")
    } else{
        table= document.getElementById("trackingTable")
    }
    var position =verificationTask.position

   //build button
    var jumpBackButton = buildJumpBackButton(position,table, verificationTask)

    //build Row
    var row = computeRowValues(verificationTask,jumpBackButton)

    //append row
    table.appendChild(row);

}

function buildJumpBackButton(position,table,verificationTask){
    var jumpBackButton = document.createElement("button");

    jumpBackButton.className = "whitebutton blue-detailbutton smallestbutton";
    /* jumpBackButton.innerHTML = " "; */
    var icon = document.createElement("div")
    icon.className = "fa-solid fa-rotate-left"
    jumpBackButton.appendChild(icon)

    jumpBackButton.onclick =function() {
        jumpBackButtonFunction(verificationTask,table,position)  

        //hide modal:
        var violatingProphecyModal = document.getElementById("violatingProphecyModal")
        violatingProphecyModal.style.display = "none";
    };
    return jumpBackButton

}

async function jumpBackButtonFunction(verificationTask,table,position){
    length = table.rows.length
    //update automaton
    verificationTask.dpa.setCurrent(table.rows[position+1].cells[2].innerHTML)
    updateVisAutomaton(verificationTask.automatonNetwork, verificationTask.dpa)

    verificationTask.mainDpaState = verificationTask.mainDPAtracker[position]

    for (i in Object.keys(verificationTask.mainDPAtracker)){
        if (i>position){
            delete verificationTask.mainDPAtracker[i]
    }
    }

    //update universal quantified systems
    for (var i = 0; i < verificationTask.universalSystems.length; i++) {
        verificationTask.systemdic[verificationTask.universalSystems[i]].setCurrent(table.rows[position+1].cells[i+3].innerHTML)
        updateVisSystem(await verificationTask.networks[verificationTask.universalSystems[i]], verificationTask.systemdic[verificationTask.universalSystems[i]])
    }
    
    //update existentially quantified systems
    for (var i = 0; i < verificationTask.existentialSystems.length; i++) {
        verificationTask.systemdic[verificationTask.existentialSystems[i]].setCurrent(table.rows[position+1].cells[i+3+ Object.keys(verificationTask.prophecyTracker).length+verificationTask.universalSystems.length].innerHTML)
        updateVisSystem(await verificationTask.networks[verificationTask.existentialSystems[i]], verificationTask.systemdic[verificationTask.existentialSystems[i]])
    }

     //update stateStatues
     verificationTask.updateStateStatus()
     //remove table entrys
     
    var tableModal = document.getElementById("trackingTableModal")
    var tableInformation = document.getElementById("trackingTable")
    for (var i=position+2; i<length;i++){
        tableInformation.deleteRow(position+2) 
        tableModal.deleteRow(position+2) 
    }

     //reset userInput
     verificationTask.resetUserInput()
     //reset position
     verificationTask.position = position;
}

function computeRowValues(verificationTask,jumpBackButton){
    var tr = document.createElement('tr');
    var values = [jumpBackButton,document.createTextNode(verificationTask.position),document.createTextNode(verificationTask.dpa.currentState)]
    //set jump back button + value for position + value for DPA state
    for (var i =0; i<3;i++){
        tr.appendChild( document.createElement('td') );
        tr.cells[i].appendChild(values[i])
    }
   
    // set values for universal systems
    for (var i = 0; i < verificationTask.universalSystems.length; i++) {
        
        tr.appendChild( document.createElement('td') );
        tr.cells[i+3].appendChild( document.createTextNode(verificationTask.state[verificationTask.universalSystems[i]]) )
    }
    
    var counter=0
    for (var i in verificationTask.prophecyTracker){
        tr.appendChild( document.createElement('td') );
       
        if (verificationTask.prophecyTracker[i]==0){
            tr.cells[(counter+3+ Object.keys(verificationTask.universalSystems).length)].appendChild( document.createTextNode("-") )
        } else if(verificationTask.prophecyTracker[i]==1){
            var element = document.createElement("div")
            element.className = "fa-solid fa-check"
            tr.cells[(counter+3+ Object.keys(verificationTask.universalSystems).length)].appendChild(element) 
        } else if(verificationTask.prophecyTracker[i]==2){
            var element = document.createElement("div")
            element.className = "fa-solid fa-xmark"
            tr.cells[(counter+3+ Object.keys(verificationTask.universalSystems).length)].appendChild(element) 
        }
        
        counter++
    }

    //set values for existential systems
    for (var i = 0; i < verificationTask.existentialSystems.length; i++) {
       
        tr.appendChild( document.createElement('td') );
        tr.cells[i+3+Object.keys(verificationTask.prophecyTracker).length+Object.keys(verificationTask.universalSystems).length].appendChild( document.createTextNode(verificationTask.state[verificationTask.existentialSystems[i]]) )
    }
    return tr
}

async function setUpVerify(){
    //load verification Task
    const verTask= JSON.parse(sessionStorage.getItem("verificationTask")); 
    
    //load Strategy
    const ver = JSON.parse(sessionStorage.getItem("verificationStrategy")); 
    var prophecyFormula = JSON.parse(sessionStorage.getItem("prophecyFormula"))
    var ltlFormula =sessionStorage.getItem("dpa"); 
  
    var prophecyTracker = {} //value: 0 - not assigned, 1 - true selected, 2 - false selected
    
    // load DPA
    if (verTask != undefined & ver!= undefined){
        // load DPA
        var automatonNetwork = await addLTL(verTask.mainDpa,ltlFormula)
        //load systems, etc
        //var {systems, networks, numberuniversallyQuantified,initialStateOfVer} = computeSystems(verTask)
        var {systems, universalSystems, existentialSystems, networks, numberuniversallyQuantified,initialStateOfVer} = computeSystem(verTask)
        var strategy = buildInternalStrategy(ver);


        //build Verification Task
        var updated = {}
        //add initial values for tracking systems
        for (var i=0; i < universalSystems.length; i++){
            updated[universalSystems[i]]=false;
        } 

        if (verTask.prophecieDpas.length > 0){
            document.getElementById("prophecyDiv").style.display = 'inline';
        }
        //add prophecy values for tracking systems
        var prophecyDPAs = {}
        for (var i=0; i < verTask.prophecieDpas.length;i++){
            prophecyTracker[verTask.prophecieDpas[i].name] =0 // value: not assigned
            addVerifyProphecy(verTask.prophecieDpas[i].dpa,prophecyFormula[verTask.prophecieDpas[i].name],verTask.prophecieDpas[i].name, prophecyTracker)
            prophecyDPAs[verTask.prophecieDpas[i].name] = verTask.prophecieDpas[i].dpa
        }


        verificationT = new VerificationTask(systems, universalSystems, existentialSystems,dpa, strategy, initialStateOfVer, numberuniversallyQuantified, updated, networks, automatonNetwork,0, prophecyTracker, ver.initMainDpa, prophecyDPAs);

        create_table(verificationT)
        create_table_modal(verificationT)
        addRowToTable(false)
        addRowToTable(true)
        
    } else {
        alert("Nothing to verify")
    }
}

