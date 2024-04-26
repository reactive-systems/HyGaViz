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

async function renderProphecy(container, ltlFormula, name) {

    var cardHeader = await buildCardHeaderForSystems(container)
    var title = document.createElement("li");
    title.className = "cardTitle"
    prophecyCounter = prophecyCounter+1
    if (parent.location != "verify.html"){
        title.innerHTML = name +": $" + buildMathLTL(ltlFormula)  +"$";
        MathJax.Hub.Queue(["Typeset",MathJax.Hub,  title]);
    }
    
    await cardHeader.appendChild(title)
}

async function renderLTLAutomaton(container, detParAutomaton, ltl,ltlFormula) {
    console.log('======== Draw LTL Automaton ===============')    
    console.log({container, detParAutomaton, ltl,ltlFormula})
    var data = buildVisAutomaton(detParAutomaton)
   
    var cy = cytoscape({
        container: await container,
        elements: data,
        style: [
            {
                selector: 'edge',
                style: {
                    'label': function (ele) {
                        console.log("edge drawing?");
                        return ele.data()['label']
                    },
                    'width': 3,
                    'line-color': 'black',
                    'target-arrow-color': '#666',
                    
                    // there are far more options for this property here: http://js.cytoscape.org/#style/edge-arrow
                    'target-arrow-shape': 'triangle', 
                    'edge-text-rotation': "autorotate",
                    "curve-style": "bezier",
                    'text-valign': "bottom",
                    'arrow-scale': 1.5,
                   
                    //'text-margin-y': '100pt',
                    //"color": "#000",
                    //"text-outline-color": "#000",
                    //"text-outline-width": 0,
                    'font-size':18,
                    //'font-weight':'bold',
                    // https://stackoverflow.com/questions/58136352/cytoscape-js-position-label-text-on-top-of-edge
                    "text-background-opacity": 1,
                    "color": "#fff",
                    "text-background-color": "#999",
                    'text-background-padding':'2px',
                    'text-background-shape':'round-rectangle'
                }
            },
            {
                selector: '.loop',
                style: {
                  'loop-direction':/* '0deg', */function (ele) {
                    return  ele.data()['degree']+ 'deg'
                },
                  'loop-sweep': '60deg',
                }
            },
            {   
                selector: 'node',
                style: {
                    'background-color': //"#f3f6f4",

                    function (ele) {
                        if (ele.data()['is_active']) {
                            // Is selected, draw a boarder around the node
                            return '#94dd5c' //'#EEB422'//'#FFC125' //"#ffd600" //"#94dd5c" //"#ffd600"//"#94dd5c"//"#6ab139"
                        } else {
                            return "#f3f6f4" //"#FFB90F"//"#e4831d"//"#9fc2f7"
                        }
                    },
                    'border-color': 'data(color)',
                    //'background-color': 'data(color)', <-> war vorher
                    'label': function (ele) {return ele.data()['label']},
                    //"data(label)", // here you can label the nodes 
                    'color': 'black',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'shape': "circle",
                    'font-size':20,
                    'font-weight': 'bold',
                    'border-width': 7,
                    'height': 50, //neu
                    'width': 50, //neu
                    
                }
            },
            {  selector: '.highlight',
                style: {
                    'background-color': "#ffd600", //"#9fc2f7"
                }
        
            },
            {  selector: '.highlighting',
                style: {
                    'background-color': "#black", //"#9fc2f7"
                }
        
            },
          
        ],
        layout: {
            name : 'circle'
        }
      });

    cy.userZoomingEnabled(false);
    cy.autolock(true );
    cy.userPanningEnabled(false)

    createSpecialLayoutFeaturesDPA(cy)

    return cy
}


async function renderDPA(container, detParAutomaton, ltl,ltlFormula) {
    var cy = renderLTLAutomaton(container, detParAutomaton, ltl,ltlFormula)
    buildFormula(ltlFormula)
    
    dpa = detParAutomaton
    return cy
} 

async function buildFormula(ltlFormula){
    var formula ="$" + buildMathLTL(ltlFormula) + "$"
    document.getElementById("tableDPATitle").innerHTML = "Formula: " +formula
    MathJax.Hub.Queue(["Typeset",await MathJax.Hub,   document.getElementById("tableDPATitle")]);
}

function buildMathLTL(formula){
    formula = formula.trim()
    switch(formula.charAt(0)){
        case "G":
            return "\\square" + buildMathLTL(formula.substr(1, formula.length - 1));

        case "F":
            return "\\diamondsuit" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "X":
                return "\\bigcirc" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "U":
                return "U" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "(":
            return "(" + buildMathLTL(formula.substr(1, formula.length - 1))
        case ")":
            return ")" + buildMathLTL(formula.substr(1, formula.length - 1))

        case " ":
            return buildMathLTL(formula.substr(1, formula.length - 1));
        case "":
            return ""
        case "1":
            return "1"

        case "!":
                return "\\neg" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "0":
            return "0"
        case "&":
            return "\\land" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "|":
            return "\\lor" + buildMathLTL(formula.substr(1, formula.length - 1));
        case "-":
            if (formula.charAt(1)==">"){
                return "\\rightarrow" + buildMathLTL(formula.substr(2, formula.length - 1));
            }
        case "<":
                if (formula.charAt(1)=="-" & formula.charAt(2)==">"){
                    return "\\leftrightarrow" + buildMathLTL(formula.substr(3, formula.length - 1));
                }
        default:
            var words = formula.split("&").join(' ').split("|").join(' ').split("-").join(' ').split("<").join(' ').split(")").join(' ').split(" ")

            var words_used = words[0];
            
            var splitted_ap = words_used.split("_")
            
            if (splitted_ap.length ==2){
                splitted_ap[0] = splitted_ap[0].replaceAll("\"", "")
                return  ' ' +splitted_ap[0] + "_{" + splitted_ap[1]+"} "+  buildMathLTL(formula.substr(words[0].length, formula.length - 1));
            }
            return   buildMathLTL(formula.substr(words[0].length, formula.length - 1));
    }
}




function buildVisAutomaton(automaton){
    //to directly build the Vis Automaton based on the internal DPA representation

    max_color = automaton.maxColor()

    min_green = {r:11, g:122, b:41} // The color of 
    max_green = {r:123, g:225, b:65}

    min_red = {r:228, g:99, b:29}
    max_red = {r:228, g:99, b:29}

    function get_color(aut_color) {
        // Get the color in the automaton and return the RGB color
        intval = aut_color / max_color

        if (aut_color % 2 == 0) {
            // Even color, display in green
            colorVal = (prop) => Math.round(min_green[prop]* intval  + max_green[prop] * (1 - intval) );
        } else {
            // Odd color, display in green
            colorVal = (prop) => Math.round(min_red[prop] * intval+ max_red[prop] * (1 - intval) );
        }
        if (aut_color ==0){
            colorVal = (prop) => Math.round(min_green[prop] * (1));
        }
        c = 'rgb(' + colorVal('r') + ',' + colorVal('g') + ',' + colorVal('b') + ')'
        
        return c
      }

    //build nodes
    nodes= Object.keys(automaton.nodes)
        .map(function (x) {
            aut_color = automaton.nodeColor(x) 
            color = get_color(aut_color) // Calculate the color based on the color in the DPA
            is_active = automaton.isCurrent(x)
            label = automaton.nodeLabeling(x)
            return {data:{id: x, label: label, color: color, aut_color: aut_color, is_active: is_active}}; 
        });


    var rotationValue = 360 /  nodes.length
    var rotationDic = {}
    var counter = 0
    
    for (var i=0; i < nodes.length; i++){
        rotationDic[nodes[i].data.id] = counter * rotationValue;

        counter ++;
    }

    //build edges
    edgesPerNode = Object.keys(automaton.edges)
        .map (function (x) {
            return automaton.edges[x].map (function(y) {
                if (x==y){
                    return {data:{id : x+ 'to' + y,source: x, target: y, label: automaton.labelingEdges(automaton.edge_labels[x][y],false, false),  showUplabel: automaton.labelingEdges(automaton.edge_labels[x][y],true, false), showUplabel2: automaton.labelingEdges(automaton.edge_labels[x][y],false, true), current: automaton.isCurrent(x), degree:rotationDic[x]}, classes:'loop'}
                }else{
                return {data:{id : x+ 'to' + y,source: x, target: y, label: automaton.labelingEdges(automaton.edge_labels[x][y],false, false), showUplabel: automaton.labelingEdges(automaton.edge_labels[x][y],true, false), showUplabel2: automaton.labelingEdges(automaton.edge_labels[x][y],false, true), current: automaton.isCurrent(x),}}
                }
            });  
        });
    var edges = [].concat.apply([], edgesPerNode)

    data = [].concat.apply(nodes, edges)
   
    return data 
}

function updateVisAutomaton(netw, automaton){
    netw.autolock(false);
    var data = buildVisAutomaton(automaton);
    netw.elements().remove()
    netw.add(data)
    var layout = netw.elements().layout({
        name: 'circle'
      });
      
    layout.run();
    netw.autolock(true)
    createSpecialLayoutFeaturesDPA(netw,)
}


function createSpecialLayoutFeaturesDPA(cy){
    // Add a popper to display text when hovering over node
    // https://stackoverflow.com/questions/54547927/show-and-hide-node-info-on-mouseover-in-cytoscape
    //cy.ready(function() {
    cy.nodes().forEach(function(ele) {
        let ref = ele.popperRef(); // used only for positioning

        ele.tippy = tippy(ref, { // tippy options:
            'content': () => {
                let content = document.createElement('div');

                content.style = 'font-size:20px;';
    
                content.innerHTML = 'Color:' + ele.data()['aut_color'];
        
                return content;
                },
            'trigger': 'manual' // probably want manual mode
        });
    });

    cy.edges().forEach(function(ele) {
        let ref = ele.popperRef(); // used only for positioning

        ele.tippy = tippy(ref, { // tippy options:
            'content': () => {
                let content = document.createElement('div');

                content.style = 'font-size:20px;';
                
                //content.innerHTML = ele.data()['label'];
                content.innerHTML ="$"+ ele.data()['showUplabel'] + "$";
                MathJax.Hub.Queue(["Typeset",MathJax.Hub,  content]);
                return content;
                },
            'trigger': 'manual' // probably want manual mode
        });
    });

    //cy.elements().unbind('mouseover');
    cy.on('mouseover', 'node', (event) => event.target.tippy.show());
    cy.on('mouseover', 'edge', (event) => event.target.tippy.show());

    //cy.elements().unbind('mouseout');
    cy.on('mouseout', 'node', (event) => event.target.tippy.hide());
    cy.on('mouseout', 'edge', (event) => event.target.tippy.hide());
}
