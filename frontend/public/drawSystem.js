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

async function renderSystem(container, graph,name) {
    //build dependent on internal graph representation
    var data = buildVisSystem(graph);

    //build Header
    buildHeaderForSystems(container, graph,true,name)

    //build systemContainer
    buildCySystem(container,graph,data)
    //build Vis Network
    updateSystemName()
}

async function buildCySystem(container,graph,data){
    var systemContainer = await buildSystemContainer(container, graph)
    
    var cy = cytoscape({
        container: document.getElementById(systemContainer),
        elements: data,
        style: [
            {
                selector: 'edge',
                style: {
                    //'label': function (ele) {return ele.data()['label']},
                    'width': 3,
                    'line-color':  function (ele) {
                        if (ele.data()['current']) {
                            // Is selected, mark edge in green, else blue
                            return "#6ab139"
                        } else {
                            return "#4c8ff4"
                        }
                    },
                    'target-arrow-color': function (ele) {
                        if (ele.data()['current']) {
                            // Is selected, mark edge in green, else blue
                            return "#6ab139"
                        } else {
                            return "#4c8ff4"
                        }
                    },
                    

                    'target-arrow-shape': 'triangle', // there are far more options for this property here: http://js.cytoscape.org/#style/edge-arrow
                    'edge-text-rotation': "autorotate",
                    "curve-style": "bezier",
                    'text-valign': "bottom",
                    //'lineColor': 'data(color)',
                    //'text-margin-y': '100pt',
                    //"color": "#000",
                    //"text-outline-color": "#000",
                    //"text-outline-width": 0,
                    'font-size':15,
                    //'font-weight':'bold',
                    // https://stackoverflow.com/questions/58136352/cytoscape-js-position-label-text-on-top-of-edge
                    "text-background-opacity": 1,
                    "color": "#fff",
                    "text-background-color": "#999",
                    'text-background-padding':'2px',
                    'text-background-shape':'round-rectangle',
                    'arrow-scale': 1.5,  
                },
            },
            {
                selector: '.loop',
                style: {
                  'loop-direction':/* '0deg', */function (ele) {
                    return  ele.data()['degree']+ 'deg'
                },
                  'loop-sweep': '45deg'
                }
            },
            {   
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': function (ele) {return ele.data()['label']},
                    'color': 'black',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'shape': "circle",
                    'border-color': 'data(bordercolor)',
                    'border-width': 2,
                    'height': 55,
                    'font-size':18,
                    'width': 55,
                    
                }
            },
            {  selector: '.highlight',
                style: {
                    'background-color': "#ffd600",
                    'border-color': "#fdb402",
                }
        
            },

            {  selector: '.highlightedge',
            style: {
                'line-color': "#fdb402",
                'target-arrow-color':  "#fdb402",
            }
    
        },
          
        ],
        layout: {
            name : 'circle',
            nodeDimensionsIncludeLabels: true,
        }
    });
    cy.userPanningEnabled(false)
    cy.userZoomingEnabled( false );
    cy.autolock( true );
    return cy
}

function updateSystemName(){
    var systemName = document.getElementById("systemName")
    systemName.value = String.fromCharCode(65+parseInt(idForSystems))
}

async function buildSystemContainer(container,graph){
    //build new square div for graph
    var systemContainer = document.createElement('div');
    systemContainer.className = "systemContainerSquareDiv"
    systemContainer.id = "systemContainerSquare" + graph.id
    container.appendChild(systemContainer)
    
    return systemContainer.id
}

function buildVisSystem(graph){
    //to directly build the VisSystem based on the internal graph representation

    //build nodes
    nodes= Object.keys(graph.nodes)
        .map(function (x) {
            if (graph.isCurrent(x)){

                //current nodes marked in green
                return {data: {id: x, label: graph.nodeLabeling(x), color: "#94dd5c", bordercolor:"#6ab139"}};
            }
            //marked in blue
            return {data: {id: x, label: graph.nodeLabeling(x), color: "#9fc2f7", bordercolor:"#4c8ff4"}};
        });

    //edges Per Node

    var rotationValue = 360 /  nodes.length
    var rotationDic = {}
    var counter = 0
    for (var i=0; i < nodes.length; i++){
        rotationDic[nodes[i].data.id] = counter * rotationValue;

        counter ++;
    }

    edgesPerNode = Object.keys(graph.edges)
        .map (function (x) {
            return graph.edges[x].map (function(y) { 
                if (x==y){
                    
                    return {data:{id: x+ 'to' + y,source: x, target: y, current: graph.isCurrent(x), degree:rotationDic[x]}, classes:'loop' }
                } else{
                    return {data:{id: x+ 'to' + y,source: x, target: y, current: graph.isCurrent(x)} }
                }
                
            });  
        });


    var edges = [].concat.apply([], edgesPerNode)
    var data = [].concat.apply(nodes, edges)
    return data
}

async function renderSystemVerification(container, graph, universallyQuantified, name){
    var data = buildVisSystem(graph);

    buildHeaderForSystems(container, graph,false,name)

    //action on click, if universally quantified
     var cy =await buildCySystem(container,graph,data)
    if (universallyQuantified){

        //action on click
        cy.on('tap', 'node', function (event) {
                // check that this system/graph it is not updated yet
                if (verificationT.updated[name]==false){
                    
                    //update graph if possible
                if  (graph.update(event.target.id())){
                        //update Vis System
                        updateVisSystem(cy,graph)

                        container.style.border=" 2px solid #209a02"
                        verificationT.updated[name]=true; 

                        //check if the existentially quantified Systems need to be updated
                        if (verificationT.checkUpdateExist()){

                            //update existentially quantified Systems + internal representations
                            verificationT.updateCompleteState();

                        }
                }
            }
        });

        cy.on('tap', 'edge', function (event) {
            var target =cy.$('#'+ event.target.id()).data()['target'];
            var source = cy.$('#'+ event.target.id()).data()['source'];
                
                // check that this system/graph it is not updated yet
                if (verificationT.updated[name]==false){
                    
                    //update graph if possible
                if  (graph.currentState == source){
                    graph.update(target)
                        
                        //update Vis System
                        updateVisSystem(cy,graph)
                        
                        container.style.border=" 2px solid #209a02"
                        verificationT.updated[name]=true; 

                        //check if the existentially quantified Systems need to be updated
                        if (verificationT.checkUpdateExist()){
                            //update existentially quantified Systems + internal representations
                            verificationT.updateCompleteState();
                        }
                }
            }
            
        });
    }
  
    cy.on('mouseover', 'node',  async function (event) {
        if (universallyQuantified & verificationT.systemsLeft()==1 & verificationT.propheciesLeft()==0){
            
            if (verificationT.updated[name]==false){
                //if (verificationT.updated[graph.id]==false){
 
                if  (graph.isReachable(event.target.id())){

                        //generate strategy
                        var strategyEntry = verificationT.findStrategyEntry()

                        var target = event.target.id();
                        var source = graph.currentState;
                        
                        //highlight hovered node
                        cy.$('#'+ event.target.id()).classes('highlight');
                        
                        //highlight edge
                        if (graph.currentState == event.target.id()){
                            cy.$('#'+ graph.currentState + 'to' +event.target.id() ).classes('loop highlightedge');
                        }else{
                            cy.$('#'+ graph.currentState + 'to' +event.target.id() ).classes('highlightedge');
                        }

                        //update currentState internally to find correct strategyRule
                        verificationT.systemdic[name].currentState = target
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
                        verificationT.systemdic[name].currentState = source

                    }
                }
        }
    })

    cy.on('mouseover', 'edge',  async function (event) {
        if (universallyQuantified & verificationT.systemsLeft()==1 & verificationT.propheciesLeft()==0){

            
            var target = cy.$('#'+ event.target.id()).data()['target'];
            var source = cy.$('#'+ event.target.id()).data()['source'];
            if (verificationT.updated[name]==false){
 
                if  (graph.currentState == source ){
                        var strategyEntry = verificationT.findStrategyEntry()

                        //update currentState internally to find correct strategyRule
                        verificationT.systemdic[name].currentState = target

                        var strategyRule = verificationT.findStrategyRule(strategyEntry)

                        //highlight hovered node
                        cy.$('#'+ target).classes('highlight');

                        //highlight hovered edge
                        if (source==target){
                            cy.$('#'+ source + 'to' +target ).classes('loop highlightedge');
                        }else{
                            cy.$('#'+ source + 'to' +target).classes('highlightedge');
                        }

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

                       //reset current state to source
                       verificationT.systemdic[name].currentState = source
                    }
                }     
        }
    })
       
    cy.on('mouseout', 'node', function (event) {
        if (universallyQuantified & verificationT.systemsLeft()==1 & verificationT.propheciesLeft()==0){
           if (verificationT.updated[name]==false){
                if  (graph.isReachable(event.target.id())){
                    var strategyEntry = verificationT.findStrategyEntry()
                    //reset graph
                    cy.$('#'+ event.target.id()).classes('');

                    //reset edge
                    if (graph.currentState == event.target.id()){
                        
                        cy.$('#'+ graph.currentState + 'to' +event.target.id() ).classes('loop');
                    }else{
                        cy.$('#'+ graph.currentState + 'to' +event.target.id() ).classes('');
                    }

                    var target = event.target.id();
                    var source = graph.currentState;
                    //update currentState internally to find correct strategyRule
                    verificationT.systemdic[name].currentState = target
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

                    //reset other systems
                    verificationT.highlightExistSystems(strategyRule, '', '')
                    verificationT.systemdic[name].currentState = source
                    
                }
            }
        }
    })

    cy.on('mouseout', 'edge', function (event) {

        if (universallyQuantified & verificationT.systemsLeft()==1 & verificationT.propheciesLeft()==0){

           if (verificationT.updated[name]==false){
                var target =cy.$('#'+ event.target.id()).data()['target'];
                var source = cy.$('#'+ event.target.id()).data()['source'];
                if  (graph.currentState == source ){
                    var strategyEntry = verificationT.findStrategyEntry()

                    //update currentState internally to find correct strategyRule
                    verificationT.systemdic[name].currentState = target
                    
                    var strategyRule = verificationT.findStrategyRule(strategyEntry)
                    //reset graph
                    cy.$('#'+ target).classes('');
                    
                    //reset edge
                    if (source == target){
                        cy.$('#'+ event.target.id()).classes('loop');
                    }else{
                        cy.$('#'+ event.target.id()).classes('');
                    }

                    //find next StrategyEntry for DPA
                    var nextStrategyEntry = verificationT.findNextStrategyEntry(strategyRule)
                    //reset dpa
                    for (var i=0; i < nextStrategyEntry.propertyRules.length;i++){
                        if (nextStrategyEntry.propertyRules[i].source==verificationT.dpa.currentState){
                            verificationT.automatonNetwork.$('#' + nextStrategyEntry.propertyRules[i].target).classes('');
                            break;
                        }
                    }
                    
                    //reset other systems
                    verificationT.highlightExistSystems(strategyRule, '', '')

                    //reset current state to source
                    verificationT.systemdic[name].currentState = source
                }
            }
        }
    })
      
    return cy;
}

// redraw Vis System based on internal graph representation
async function updateVisSystem(cy, graph){
    
    await cy
    //update data
    cy.autolock(false);
    var data = buildVisSystem(graph);
    cy.elements().remove()
    cy.add(data)
    var layout = await cy.elements().layout({
        name: 'circle',
        nodeDimensionsIncludeLabels: true,
      });
      
    layout.run();
    var options = {
        nodeDimensionsIncludeLabels: true // boolean which changes whether label dimensions are included when calculating node dimensions, default true
      };
      
    var dims = cy.nodes().first().layoutDimensions( options );
    //set data + redraw
    cy.autolock(true);
}


/* Buttons */
function buildQuantifierButton(container, graph, clickable){
    // create button
    var quantifierButton = document.createElement("button");
    quantifierButton.className = "whitebutton blue-detailbutton smallerbutton quantifierbutton";
    quantifierButton.id = "buttonQuanfier" + graph.id
    
    //set value of button
    if (graph.universallyQuantified){
        quantifierButton.innerHTML= "&forall;";
    } else{
        quantifierButton.innerHTML = "&exist;";
    }
    quantifierButton.title ="Quantifier"
    //if clickable: alternate between forall and exist
    if (clickable){
        quantifierButton.title ="Choose Quantifier"
        quantifierButton.onclick = function() {
            if (quantifierButton.innerHTML =="∃"){
                quantifierButton.innerHTML= "&forall;";
                graph.universallyQuantified = true;
            } 
            else{
                quantifierButton.innerHTML = "&exist;";
                graph.universallyQuantified = false;
            }
        };
    }
    //append to container
    container.appendChild(quantifierButton)
}

function buildRemoveButton(container,graph){
    // create button
    var removeButton = document.createElement("button");
    removeButton.id = "buttonRemove" + graph.id
    removeButton.className = "whitebutton red-detailbutton smallerbutton fa-solid fa-trash-can";
    removeButton.title ="Remove system"
    //functionality
    removeButton.onclick = function() {
        removeSystem(graph.id)
    }
    //append to container
    container.appendChild(removeButton)
}

function buildMoveButton(container,graph, left){
     // create button
    var moveButton = document.createElement("button");
    moveButton.id = "buttonMove" + graph.id + "left" + left
    
    //specific symbol of button
    if (left){
        moveButton.className = "whitebutton blue-detailbutton smallerbutton fa-solid fa-arrow-left";
        moveButton.title ="Move system to the left"
    } else{
        moveButton.className = "whitebutton blue-detailbutton smallerbutton fa-solid fa-arrow-right";
        moveButton.title ="Move system to the right"
    }
    //functionality
    moveButton.onclick = function() {
        moveSystem(graph.id,left)
    }
    //append to container
    container.appendChild(moveButton)
}


function buildUpdateButton(container,graph){
    // create button
    var updateButton = document.createElement("button");
    updateButton.id = "buttonUpdate" + graph.id 
    updateButton.className = "whitebutton blue-detailbutton smallerbutton fa fa-pencil" ;
    updateButton.title ="Update system"

    //functionality
    updateButton.onclick = function() { 
        //show system modal
        var modalSystems = document.getElementById("modalSystems");
        modalSystems.style.display = "block";
        
        //show matching input to graph
        var inputField = document.getElementById("inputField")
        inputField.value = graph.returnUserInput()
        //load matching name
        var systemName = document.getElementById("systemName")
        
        var found = false
        var systemValue

        for (var i=0; i < transition_systems.length; i++){
            if (transition_system_dict[transition_systems[i]]==graph){
                found=true
                systemValue = transition_systems[i]
            }
        }
        if (found){
            systemName.value = systemValue
        } else{
            alert ("System not found")
        }

        //load quantifier 
        var quantifierButtonModal = document.getElementById("quantifierButtonModal")
        if (graph.universallyQuantified){
            quantifierButtonModal.value = "\u2200"
        } else {
            quantifierButtonModal.value = "\u2203"
        }

        //set state
        load = false

        //global variable used to update corresponding graph
        updateSystem = graph

        //change button description
        var createSystemButton = document.getElementById("create_system")
        createSystemButton.innerHTML = "Save"
    }

    //append to container
    container.appendChild(updateButton)
}


function buildHeaderForSystems(container, graph,modifyingMode,name){
    //build cardHeader div
    var cardHeader= buildCardHeaderForSystems(container)

    // build Title
    buildCardTitleForSystems(cardHeader,name)
    
    //append button, modifying Mode describes whether the quantor can be choosen or is fix
    buildQuantifierButton(cardHeader,graph,modifyingMode)
    if (modifyingMode){
        buildUpdateButton(cardHeader,graph)
        buildMoveButton(cardHeader,graph,true)
        buildMoveButton(cardHeader,graph,false)
        buildRemoveButton(cardHeader,graph)
    }
}

function buildCardHeaderForSystems(cont, prophecy){
    //create cardHeader Div
    var cardHeader = document.createElement("div");
    if (prophecy){
        cardHeader.className = "card-header" // prophecy-header"
    }else{
        cardHeader.className = "card-header"
    }
    cont.appendChild(cardHeader)

    return cardHeader
}

function buildCardTitleForSystems(cont,name){
    //create title div
    var title = document.createElement("li");
    title.className = "cardTitle"

    //set value
    title.innerHTML = "System: " +name ;
    cont.appendChild(title)

}