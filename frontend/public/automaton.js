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

class DetParityAutomaton {

    constructor(automaton){
        this.aps = automaton.aps;
        this.color = this.computeColor(automaton)
        this.nodes = this.computeStates(automaton)
        this.edges = this.computeEdges(automaton);
        this.edge_labels = this.computeEdgeLabels(automaton);
        this.initialState = automaton.initialState;
        this.currentState = automaton.initialState;
        
    } 

    computeColor(automaton){
        var colorlist ={}
        for (var i=0; i < automaton.states.length; i++){
            colorlist[automaton.states[i].id] =automaton.states[i].color
        }
        return colorlist
    }

    computeStates(automaton){
        var statelist =[]
        for (var i=0; i < automaton.states.length; i++){
            statelist.push(automaton.states[i].id)
        }
        return statelist
    }

    computeEdges(automaton){
        //internal representation: edges: {"1": [{... target: "2"},{... target: "3"}] ...} -> automaton_edges[1] = [2,3]
        var automaton_edges = {};
        for (var i in automaton.states){
            var list_of_edges =[];
            for (var j in automaton.states[i].edges){
                list_of_edges.push(automaton.states[i].edges[j].target);
            }
            automaton_edges[automaton.states[i].id] = list_of_edges;
        }
        return automaton_edges;
    }

    computeEdgeLabels(automaton){
        //e.g.: {"guard": {"type": "true"} .....}    -------> automaton_edge_labels[1] ={"type": "true"} 
        //e.g.: {"guard": {"childs": [{"childs": [{"child": {"atom": 0, "type": "atom"}, "type": "neg"}, {"atom": 1, "type": "atom"}], "type": "and"}, {"childs": [{"atom": 0, "type": "atom"}, {"child": {"atom": 1, "type": "atom"}, "type": "neg"}], "type": "and"}], "type": "or"} ....}
        //  -------> automaton_edge_labels[1] = {"childs": [{"childs": [{"child": {"atom": 0, "type": "atom"}, "type": "neg"}, {"atom": 1, "type": "atom"}], "type": "and"}, {"childs": [{"atom": 0, "type": "atom"}, {"child": {"atom": 1, "type": "atom"}, "type": "neg"}], "type": "and"}], "type": "or"}
        var automaton_edge_labels = [];
        for (var i=0; i <  automaton.states.length;i++){
            automaton_edge_labels[automaton.states[i].id] = [];
            for (var j in automaton.states[i].edges){
                automaton_edge_labels[automaton.states[i].id][automaton.states[i].edges[j].target] = automaton.states[i].edges[j].guard;
            }
        }
        return automaton_edge_labels;
    }

    nodeLabeling(node){
        return node;
    }

    nodeColor(node){
        return this.color[node];
    }

    maxColor(){
        var maxcolor = 0
        
        for (let k in this.color) {
            if (maxcolor < this.color[k]){
                maxcolor = this.color[k]
            }
        }
        return maxcolor
    }

    labelingEdges(edgelabel,aps, prophecy){
        //input: {"childs": [{"childs": [{"child": {"atom": 0, "type": "atom"}, "type": "neg"}, {"atom": 1, "type": "atom"}], "type": "and"}, {"childs": [{"atom": 0, "type": "atom"}, {"child": {"atom": 1, "type": "atom"}, "type": "neg"}], "type": "and"}], "type": "or"}
        // output: (!0 & 1) | (0 & !1)
        switch(edgelabel.type){
            case "atom":
                if (aps | prophecy){
                   
                    var label =this.aps[edgelabel.atom].replaceAll("\"", "")
                    var two_parts = label.split("_")
                    if (prophecy){
                        return two_parts[0] + "\u005f" + two_parts[1]
                    }
                    return two_parts[0] + "\u005f{" + two_parts[1] + "}"
                }
                return edgelabel.atom;

            case "true":
                //top:
                return "\u22A4"

            case "false":
                //bottom:
                return "\u22A5"

            case "neg":
                return "\u00AC" +   this.labelingEdges(edgelabel.child,aps, prophecy) ;

            case "or": 
                var OrLabel= "(";
                for (var l in edgelabel.childs){
                    if (OrLabel =="("){
                        OrLabel = OrLabel + this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                    } else{
                        if (aps){
                            OrLabel = OrLabel + "\\lor " + this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                        } else {
                            OrLabel = OrLabel + "\u22C1" + this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                        }
                        
                    }
                }
                OrLabel = OrLabel + ")";
                return  OrLabel;

            case "and":  
                var AndLabel= "(";
                for (var l in edgelabel.childs){
                    if (AndLabel =="("){
                        AndLabel = AndLabel+ this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                    } else{
                        if (aps){
                            AndLabel = AndLabel + "\\land " + this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                        } else {
                            AndLabel = AndLabel + "\u22C0" + this.labelingEdges(edgelabel.childs[l],aps, prophecy);
                        }
                        
                    }
                }
                AndLabel = AndLabel + ")";
                return  AndLabel;
            default:
                alert('Unexpected Symbol in Edges')
        }
    }

    isInitial(node){
        return (node==this.initialState);
    }
    isCurrent(node){
        return (node==this.currentState);
    }

    setCurrent(node){
        this.currentState = node;
    }

    returnJson(){
        //value of verificationTask.dpa
        return {
            "aps": this.aps,
            "initialState": this.initialState,
            "states": this.reconstructStates()
            
        }
    }

    reconstructStates(){
        var states =[]
        for (var i =0; i < this.nodes.length; i++){
            var edge_list = []
            for (var j=0; j < this.edges[this.nodes[i]].length; j++){
                //guard
                edge_list.push({"guard": this.edge_labels[this.nodes[i]][this.edges[this.nodes[i]][j]], "target":this.edges[this.nodes[i]][j]})
            }
            
            states.push({"color": this.color[this.nodes[i]], "edges": edge_list,"id": this.nodes[i]})
        }
        return states

    }

    recomputeInputEdgeJson(){
        var recomputed_edges = {}
        for (var i in this.edges){
            var edge_list = []
            for (var j=0; j < this.edges[i].length; j++){
                //guard
                edge_list.push({"guard": this.edge_labels[i][this.edges[i][j]], "target":this.edges[i][j]})
            }
            recomputed_edges[i]= edge_list;
        }
        return recomputed_edges;
    }
}