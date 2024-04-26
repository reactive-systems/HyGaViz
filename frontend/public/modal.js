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

function closeExamplemodal(){
    var modalExample = document.getElementById("loadExampleModal");
    modalExample.style.display = "none";
}
function closeDPAmodal(){
    var modalDPA = document.getElementById("modalDPA");
    modalDPA.style.display = "none";
}
function closePropheciesmodal(){
    var modalProphecies = document.getElementById("modalProphecies");
    modalProphecies.style.display = "none";

}

function closeSystemModal(){
    var modalSystems = document.getElementById("modalSystems");
    load = true;
    createSystemButton = document.getElementById("create_system")
    createSystemButton.innerHTML = "Create new system"
    updateSystemName()
    modalSystems.style.display = "none";
}

function loadExampleFromModal(){
    //reset DPA + systems --> idForSystems set to 0
    resetLTL()
    resetSystems()
    resetProphecies()

    //close modal
    closeExamplemodal();

    setTimeout(function(){
        // load selected example
        var verTask=document.getElementById("example_select").value
        loadTask(examples[verTask], examples[verTask].systems.length, examples[verTask].ltlformula, examples[verTask].prophecyFormula)
    },100)
 }

 function initializeModals(){

    //different modals
    var modal = document.getElementById("loadExampleModal");
    var modalDPA = document.getElementById("modalDPA");
    var modalSystems = document.getElementById("modalSystems");
    var modalProphecies = document.getElementById("modalProphecies");

    // Get the button that opens the modal
    var btn = document.getElementById("loadExampleButton");
    var btnDPA = document.getElementById("dpaModalButton");
    var btnSystems = document.getElementById("systemsModalButton");
    var btnProphecies = document.getElementById("propheciesModalButton")
    
    
    // Get the <span> element that closes the modal
    var span = document.getElementById("loadExampleClose");
    var spanDPA = document.getElementById("closeDPA"); 
    var spanSystems = document.getElementById("closeSystems");
    var spanProphecies = document.getElementById("closeProphecies")
    
    // When the user clicks the button, open the modal 
    btn.onclick = function() {
        modal.style.display = "block";
    }
    btnDPA.onclick = function() {
        var valueOfLTLField = sessionStorage.getItem("dpa")

        if (valueOfLTLField != undefined & valueOfLTLField != "null"){
            document.getElementById("LTLField").value = valueOfLTLField
        }
        modalDPA.style.display = "block";
    }
    btnSystems.onclick = function() {
        modalSystems.style.display = "block";
    }
    btnProphecies.onclick = function() {
        modalProphecies.style.display = "block";
    }
    
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
    spanDPA.onclick = function() {
        modalDPA.style.display = "none";
    }
    spanSystems.onclick = function() {
        closeSystemModal()
    }
    spanProphecies.onclick = function() {
        modalProphecies.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == modalDPA) {
            modalDPA.style.display = "none";
        }
        if (event.target == modalSystems) {
            closeSystemModal()
        } 
        if (event.target == modalProphecies) {
            modalProphecies.style.display = "none";
        }
    } 
}