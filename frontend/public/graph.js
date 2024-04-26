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

class System {
    constructor(graphjson, id,universallyQuantified, name){
        this.aps = graphjson.aps;
        this.nodes = this.computeNodes(graphjson); //with their labels
        this.edges = this.computeEdges(graphjson);
        this.initialState = graphjson.initialState;
        this.currentState = graphjson.initialState;
        this.universallyQuantified = universallyQuantified;
        this.id = id;
        this.name = name;
        idForSystems++
    }
    

    computeNodes(ts){
        //input: {...,"states": {"0": {"info": "", "label": [false, false], "successors": [1]}, "1": {"info": "", "label": [false, true], "successors": [0, 1]}}}, ...}
        //output: nodes = {0: [false, false], 1: [false, true]}
        //information about aps
        var nodes ={};
        for (var node in ts.states){
            //nodes[i] = ts.states[i].label;
            nodes[ts.states[node].id] = ts.states[node].label;
        }
        return nodes;
    }

    computeEdges(ts){
        // //input: {...,"states": {"0": {"info": "", "label": [false, false], "successors": [1]}, "1": {"info": "", "label": [false, true], "successors": [0, 1]}}}, ...}
        //output: nodes = {0: [1], 1: [0, 1]}
        //information about successors
        var edges={};
        for (var node in ts.states){
            //edges[node] = ts.states[node].successors; 
            edges[ts.states[node].id] = ts.states[node].successors; 
        }
        return edges;
    }

    nodeLabeling(i){
        //information written in node
        
        var labeling = "{"
        
        for (var j in this.nodes[i]){
            //check the labels for the nodes, if label is true: -> state it in labeling
            
                if (labeling=="{"){
                    labeling += this.aps[this.nodes[i][j]];
                } else{
                    labeling +="," + this.aps[this.nodes[i][j]];
                }

        }
        labeling =  i + ": "+  labeling + "}";
        return  labeling;
    }

    isInitial(node){
        return (this.initialState==node)
    }

    isCurrent(node){
        return (this.currentState==node) 
    }
    setCurrent(node){
        this.currentState = node
    }

    isReachable(node){
        //true if node is reachable from current State, else false
        for (var k in this.edges[this.currentState]){
            if (this.edges[this.currentState][k]==node){
                return true;
            }
        }
        return false;
    }

    update(node){
        //update currentState if possible + return if it was possible
        if (this.isReachable(node)){
            this.currentState = node;
            return true;
        }
        return false;
    }
    
    
    returnJson(){
        //value of verificationTask.systems[i]
        return {
            "aps": this.aps,
            "initialState": this.initialState,
            "states": this.recomputeStates()
        }
    }

    recomputeStates(){
        //needed for this.returnJson()
        var recomputed_states =[]
        for (var node in this.nodes){
            recomputed_states.push({"id": parseInt(node), "info": "", "label": this.nodes[node], "successors": this.edges[node]})
        }
        return recomputed_states
    }

    returnUserInput(){
        //user input, loaded to "Input Field for Systems"
        var output = 'aps';
        for (var i=0; i < this.aps.length; i++){
            output += ' "' + this.aps[i] + '"' 
        }
        output += '\ninit ' + this.initialState + '\n'
        
        for (var i in this.nodes){
            output += '\nState: ' + i + ' {' 
            
            for (var j in this.nodes[i]){
                output +=this.nodes[i][j]
               
                if (j < this.nodes[i].length -1){
                    output +=' '
                } 
            }
            output += '}\n' 
            for (var j in this.edges[i]){
                output += this.edges[i][j] +' '
            }
            output += '\n' 
        }
        return output
    }
}