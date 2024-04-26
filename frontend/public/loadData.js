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

function initializeIndex(){
    localStorage.clear();
    //initialize systems, dpa, idForSystems
    transition_systems = [];
    transition_system_dict = {};
    idForSystems = 0
    prophecies = {} // {name -> (ltl,automat)}
    prophecyCounter = 0
    dpa = "";

    
    //load example from verTask
    var verTask= JSON.parse(sessionStorage.getItem("verificationTask"));  
    var dpaValue = sessionStorage.getItem("dpa")
    var prophecyFormula = JSON.parse(sessionStorage.getItem("prophecyFormula"))

    
    if (verTask != undefined){
        sessionStorage.clear()

        loadTask(verTask, verTask.systems.length,dpaValue,prophecyFormula)
    
    } else {
        //set systemName value
        updateSystemName()
    }
}

function loadTask(verTask, graphId,dpaValue,prophecyFormula){
    for (var i= 0; i<verTask.systems.length ; i++ ){
        //for each system create new system

        var graph = new System(verTask.systems[i].system,idForSystems,verTask.prefix[i].type == "forall", verTask.prefix[i].name);
        transition_systems.push(verTask.prefix[i].name)
        transition_system_dict[verTask.prefix[i].name] = graph
    }
       // draw DPA
    for (var i=0; i < verTask.prophecieDpas.length;i++){
        addProphecy(verTask.prophecieDpas[i].dpa,prophecyFormula[verTask.prophecieDpas[i].name],verTask.prophecieDpas[i].name)
    }
    addLTL(verTask.mainDpa, dpaValue);
    //store DPA
    sessionStorage.setItem("dpa", dpaValue)

    // drawAllVisSystems
    drawAllVisSystems()
    idForSystems = graphId
    updateSystemName()

}

function quantifierButtonFunctionality(){
    // change quantifier: forall -> exists; exists -> forall
    quantifierButton = document.getElementById("quantifierButtonModal")
    if (quantifierButton.value =="\u2203"){
        quantifierButton.value= "\u2200";
    } else{
        quantifierButton.value = "\u2203";
    }
}

function appendExamples(data) {
    var container = document.getElementById("example_select")
    
     //load to Options
    for (let i = 0; i < data.length; i++) {
        var newOption = new Option(data[i].name,data[i].internalName)
        container.appendChild(newOption)
        //internal examples representation 
        examples[data[i].internalName] = {"systems": data[i].systems, "mainDpa": data[i].mainDpa, "prefix": data[i].prefix, "ltlformula": data[i].ltlformula, "prophecieDpas": data[i].prophecieDpas,"prophecyFormula": data[i].prophecyFormula }
    }

}