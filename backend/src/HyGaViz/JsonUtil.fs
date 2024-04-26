(*    
    Copyright (C) 2024 Raven Beutner

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
*)

module JsonUtil 

open FsOmegaLib.JSON
open FsOmegaLib.SAT
open FsOmegaLib.AutomatonSkeleton
open FsOmegaLib.DPA

open TransitionSystem

let rec convertJsonToBooleanExpression (j : Json) = 
    match j |> JSON.lookup "type" |> JSON.getString with 
    | "atom" -> 
        j 
        |> JSON.lookup "atom"
        |> JSON.getNumber
        |> int 
        |> Atom
    | "true" -> True 
    | "false" -> False 
    | "neg" -> 
        j 
        |> JSON.lookup "child" 
        |> convertJsonToBooleanExpression
        |> Neg
    | "and" -> 
        j 
        |> JSON.lookup "childs" 
        |> JSON.getList
        |> List.map convertJsonToBooleanExpression
        |> And
    | "or" -> 
        j 
        |> JSON.lookup "childs"
        |> JSON.getList
        |> List.map convertJsonToBooleanExpression
        |> Or 
    | _ -> raise JsonError

let rec convertBooleanExpressionToJson (e : BooleanExpression<int>) = 
    match e with 
    | Atom x -> 
        [
            ("type", JString "atom");
            ("atom", JNumber (float x))
        ]
        |> Map.ofList
        |> JObject
    | True -> 
        [
            ("type", JString "true")
        ]
        |> Map.ofList
        |> JObject
    | False -> 
        [
            ("type", JString "false")
        ]
        |> Map.ofList
        |> JObject
    | Neg e -> 
        [
            ("type", JString "neg");
            ("child", convertBooleanExpressionToJson e)
        ]
        |> Map.ofList
        |> JObject
    | Or l -> 
        let elemnts = 
            l 
            |> List.map (fun e -> convertBooleanExpressionToJson e)
            |> JList

        [
            ("type", JString "or");
            ("childs", elemnts)
        ]
        |> Map.ofList
        |> JObject

    | And l -> 
        let elemnts = 
            l 
            |> List.map (fun e -> convertBooleanExpressionToJson e)
            |> JList

        [
            ("type", JString "and");
            ("childs", elemnts)
        ]
        |> Map.ofList
        |> JObject

let convertDPAToJson (dpa : DPA<int, string>) = 
    let statesJson = 
        dpa.States
        |> Seq.toList
        |> List.map (fun s -> 

            let edgesJson = 
                dpa.Edges.[s]
                |> List.map (fun (g, t) -> 
                    [
                        ("guard", g |> FsOmegaLib.SAT.convertDNFToBooleanExpression |> convertBooleanExpressionToJson);
                        ("target", JNumber (float t))
                    ]
                    |> Map.ofList 
                    |> JObject  
                    )
                |> JList
            
            [
                ("id", JNumber (float s))
                ("color", JNumber (float dpa.Color.[s]))
                ("edges", edgesJson)
            ]
            |> Map.ofList
            |> JObject
        )
        |> JList

    [
        ("initialState", dpa.InitialState |> float |> JNumber);
        ("aps", dpa.Skeleton.APs |> List.map JString |> JList);
        ("states", statesJson)
    ]
    |> Map.ofList
    |> JObject
    

let convertJsonToDPA (j : Json) = 
    let statesMap = 
        j
        |> JSON.lookup "states"
        |> JSON.getList
        |> List.map (fun x -> 
            let color = x |> JSON.lookup "color" |> JSON.getNumber |> int 
            let id = x |> JSON.lookup "id" |> JSON.getNumber |> int 
            
            let edges = 
                x 
                |> JSON.lookup "edges"
                |> JSON.getList
                |> List.map (fun edge -> 
                    let guard = 
                        edge
                        |> JSON.lookup "guard"
                        |> convertJsonToBooleanExpression
                        |> FsOmegaLib.SAT.convertBooleanExpressionToDNF

                    let target = 
                        edge |> JSON.lookup  "target" |> JSON.getNumber |> int

                    (guard, target)
                )

            id, (color, edges)
            )
        |> Map.ofList

    let initState = 
        j
        |> JSON.lookup "initialState"
        |> JSON.getNumber 
        |> int
    
    let aps = 
        j 
        |> JSON.lookup  "aps"
        |> JSON.getList
        |> List.map JSON.getString

    {
        DPA.Skeleton = 
            {
                AutomatonSkeleton.States = statesMap |> Map.keys |> set 
                APs = aps 
                Edges = statesMap |> Map.map (fun _ x -> snd x)
            }
        InitialState = initState
        Color = statesMap |> Map.map (fun _ x -> fst x)
    }


let convertTransitionSystemToJson (ts : TransitionSystem<string>) = 
    let statesJson = 
        ts.States
        |> Seq.toList
        |> List.map (fun s -> 
            [
                ("id", s |> float |> JNumber)
                ("info", "" |> JString)
                ("label", ts.ApEval.[s] |> Set.toList |> List.map float |> List.map JNumber |> JList)
                ("successors", ts.SuccessorMap.[s] |> Set.toList |> List.map float |> List.map JNumber |> JList)
            ]
            |> Map.ofList
            |> JObject
        )
        |> JList

    [
        ("initialState", ts.InitialState |> float |> JNumber)
        ("aps", ts.APs |> List.map JString |> JList)
        ("states", statesJson)
    ]
    |> Map.ofList
    |> JObject

let convertJsonToTransitionSystem (j : Json) = 

    let statesMap = 
        j
        |> JSON.lookup "states"
        |> JSON.getList
        |> List.map (fun x -> 
            let id = x |> JSON.lookup "id" |> JSON.getNumber |> int 
            
            let apEval = 
                x 
                |> JSON.lookup "label"
                |> JSON.getList
                |> List.map JSON.getNumber
                |> List.map int 
                |> set

            let successors = 
                x 
                |> JSON.lookup "successors"
                |> JSON.getList
                |> List.map JSON.getNumber 
                |> List.map int 
                |> set

            id, (successors, apEval)
            )
        |> Map.ofList

    let initState = 
        j
        |> JSON.lookup "initialState"
        |> JSON.getNumber 
        |> int

    let aps = 
        j
        |> JSON.lookup "aps"
        |> JSON.getList
        |> List.map JSON.getString

    {
        TransitionSystem.States = statesMap |> Map.keys |> set
        InitialState = initState
        APs = aps 
        SuccessorMap = statesMap |> Map.map (fun _ x -> fst x) 
        ApEval = statesMap |> Map.map (fun _ x -> snd x) 
    }
