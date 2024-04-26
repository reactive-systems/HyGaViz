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

module StrategyConstruction

open FsOmegaLib.JSON
open FsOmegaLib.SAT
open FsOmegaLib.DPA

open ParityGameLib.ParityGame

open HyperLTL

open Util
open Util.SolverConfiguration
open TransitionSystem
open ProphecyConstruction
open ParityGameCompiler


let private convertGameStateToJson (g : GameState) = 
    [
        ("systemStates", 
            g.SystemStates 
            |> Map.toList
            |> List.map (fun (pi, i) -> 
                [
                    ("name", JString pi)
                    ("state", JNumber (float i))
                ]
                |> Map.ofList
                |> JObject
            )
            |> JList)
        ("mainDpaState", JNumber (float g.MainDpaState))
    ]
    |> Map.ofList
    |> JObject

let private convertUniversalMoveToJson (m : UniversalMove) = 
    [
        ("systemStates", 
            m.NextUniversalStates
            |> Map.toList
            |> List.map (fun (pi, i) -> 
                [
                    ("name", JString pi)
                    ("state", JNumber (float i))
                ]
                |> Map.ofList
                |> JObject
            )
            |> JList)
        ("prophecyEvaluation", 
            m.ProphecyEvaluation 
            |> Map.toList
            |> List.map (fun (pi, b) -> 
                [
                    ("name", JString pi)
                    ("evaluation", JBool b)
                ]
                |> Map.ofList
                |> JObject
            )
            |> JList)
    ]
    |> Map.ofList
    |> JObject


type UpdateRecipe = 
    {
        GameStateUpdates : Map<UniversalMove,GameState>
        PropertyDpaUpdates : Map<int, int>
        ProphecyDpaUpdates : Map<ProphecyVariable,Map<int,int>>
    }

type VerificationResult = 
    | NotVerified 
    | VerificationSuccess of Map<GameState, UpdateRecipe> * int
    
let convertVerificationResultToJson (v : VerificationResult) = 
    match v with 
    | NotVerified -> 
        [
            ("verificationOutcome", JString "UNSAT")
        ]
        |> Map.ofList
        |> JObject
    | VerificationSuccess (sol, initMainDpa) -> 
        let solJson = 
            sol 
            |> Map.toList
            |> List.map (fun (g, updateRecipe) -> 
                let gStateJson = convertGameStateToJson g 

                let stepRecipeJson = 
                    updateRecipe.GameStateUpdates 
                    |> Map.toList
                    |> List.map (fun (k, v) -> 
                        [
                            ("universalMove", convertUniversalMoveToJson k);
                            ("successorGameState", convertGameStateToJson v);
                        ]
                        |> Map.ofList
                        |> JObject
                        )
                    |> JList

                let propertyRecipeJson = 
                    updateRecipe.PropertyDpaUpdates
                    |> Map.toList
                    |> List.map (fun (s, t) -> 
                        [
                            ("source", JNumber (float s));
                            ("target", JNumber (float t));
                        ]
                        |> Map.ofList
                        |> JObject
                        )
                    |> JList

                let prophecyRecipeJson = 
                    updateRecipe.ProphecyDpaUpdates 
                    |> Map.toList
                    |> List.map (fun (p, v) -> 
                        let mappingList = 
                            v 
                            |> Map.toList
                            |> List.map (fun (s, t) -> 
                                [
                                    ("source", JNumber (float s));
                                    ("target", JNumber (float t));
                                ]
                                |> Map.ofList
                                |> JObject
                                )
                            |> JList

                        [
                            ("prophecyName", JString p);
                            ("transitionList", mappingList);
                        ]
                        |> Map.ofList
                        |> JObject
                        )
                    |> JList
                    
                [
                    ("gameState", gStateJson)
                    ("strategyRules", stepRecipeJson)
                    ("propertyRules", propertyRecipeJson)
                    ("prophecyRules", prophecyRecipeJson)
                ]
                |> Map.ofList
                |> JObject
            )
            |> JList

        [
            ("verificationOutcome", JString "SAT")
            ("strategy", solJson)
            ("initMainDpa", initMainDpa |> float |> JNumber)
        ]
        |> Map.ofList
        |> JObject

        
let private solve (config: SolverConfiguration) (systemMap : Map<TraceVariable, TransitionSystem<string>>) (dpa : DPA<int, string * TraceVariable>) (qp : list<QuantifierType * TraceVariable>) (prophecyMap : Map<ProphecyVariable, DPA<int, string * TraceVariable>>) = 
    let traceVars = 
        qp
        |> List.map snd 

    if (traceVars |> List.distinct |> List.length <> List.length traceVars) then 
        raise <| GeneralError "Some trace variable is used twice in the prefix"

    let k = 
        qp
        |> List.tryFindIndex (fun (q, _) -> q = EXISTS)
        |> Option.defaultValue qp.Length

    qp[k..]
    |> List.iter (fun (q, _) -> 
        if q <> EXISTS then 
            raise <| GeneralError "The formula is no forall^*exists^* formula"
        )

    let universalTraceVariables = qp[0..k-1] |> List.map snd |> set 

    // We compile into a parity game
    let pg, initState = ParityGameCompiler.compileToParityGame config systemMap universalTraceVariables dpa prophecyMap

    let solution = ParityGameLib.ParityGameSolverOink.solveAndComputeStrategyWithOink config.MainPath config.OinkPath pg

    // We have verified the system if the initial states is won by the system (playerZero)
    let isWon = solution.WinnerMap.[initState] = PlayerZero

    if not isWon then 
        NotVerified 
    else  
        let recipe = 
            pg.Properties
            |> Map.keys
            |> Seq.toList
            |> List.choose (fun s -> 
                match s with 
                | ExistentialStage (gameState, universalMove) ->
                    if solution.WinnerMap.[s] = PlayerZero then 
                        // We only care about this state if it is won by PlayerZero 

                        let s' = solution.StrategyMap.[s] // s' is a UpdateStage

                        // s' has a unique successor, we use the strategy to find it
                        let s''  = solution.StrategyMap.[s'] // s'' is a ForallStage

                        match s'' with 
                        | ForallStage gameState' -> 
                            Some (gameState, (universalMove, gameState'))
                        | _ -> failwith "Should not be reachable"
                    else 
                        None
                | _ -> None
                )
            |> List.groupBy fst 
            |> List.map (fun (gamestate, x) -> 
                gamestate, (List.map snd x |> Map.ofList)
            )
            |> Map.ofList

        // For each game state, we add a prophecy for each of the 
        let combinedRecipe = 
            recipe
            |> Map.map (fun gameState gameStateUpdate -> 
                let propertyUpdates = 
                    dpa.States
                    |> Seq.map (fun s -> 
                        // Find the successor state for s in the current gameState
                        let sucState = 
                            dpa.Edges.[s]
                            |> List.find (fun (guard, _) -> 
                                guard
                                |> DNF.eval (fun i -> 
                                    let a, pi = dpa.APs.[i]
                                    let index = systemMap.[pi].APs |> List.findIndex ((=) a)
                                    Set.contains index (systemMap.[pi].ApEval.[gameState.SystemStates.[pi]])
                                ) 
                            )
                            |> snd

                        s, sucState
                    )
                    |> Map.ofSeq

                let prophecyUpdates = 
                    prophecyMap
                    |> Map.map (fun _ dpa -> 
                        dpa.States
                        |> Seq.map (fun s -> 
                            // Find the successor state for s in the current gameState
                            let sucState = 
                                dpa.Edges.[s]
                                |> List.find (fun (guard, _) -> 
                                    guard
                                    |> DNF.eval (fun i -> 
                                        let a, pi = dpa.APs.[i]
                                        let index = systemMap.[pi].APs |> List.findIndex ((=) a)
                                        Set.contains index (systemMap.[pi].ApEval.[gameState.SystemStates.[pi]])
                                    ) 
                                )
                                |> snd

                            s, sucState
                        )
                        |> Map.ofSeq
                        )

                {
                    GameStateUpdates = gameStateUpdate;
                    PropertyDpaUpdates = propertyUpdates
                    ProphecyDpaUpdates =  prophecyUpdates
                }
                )

        let initMainDpaState = 
            match initState with 
            | ForallStage s -> s.MainDpaState
            | _ -> failwith ""

        VerificationSuccess (combinedRecipe, initMainDpaState)

let solveJSON (config: SolverConfiguration) (instanceJson : Json) =
    try 
        let systemMap = 
            instanceJson 
            |> JSON.lookup "systems"
            |> JSON.getList 
            |> List.map (fun x -> 
                let id = x |> JSON.lookup "name" |> JSON.getString
                let system = x |> JSON.lookup "system" |> JsonUtil.convertJsonToTransitionSystem
                id, system
                )
            |> Map.ofList

        let dpa = 
            instanceJson
            |> JSON.lookup "mainDpa"
            |> JsonUtil.convertJsonToDPA
            |> DPA.mapAPs (fun x -> 
                let a = x.Split '_'
                assert(a.Length = 2)
                let ap = a.[0].Trim()
                ap.Substring(1, ap.Length - 2), a.[1]
            )

        let qp = 
            instanceJson
            |> JSON.lookup  "prefix"
            |> JSON.getList
            |> List.map (fun x -> 
                let t = 
                    match x |> JSON.lookup "type" |> JSON.getString with 
                    | "forall" -> FORALL
                    | "exists" -> EXISTS
                    | _ -> raise JsonError
                let name = x |> JSON.lookup "name" |> JSON.getString
                t, name
            )

        let prophecyMap = 
            instanceJson
            |> JSON.lookup  "prophecieDpas"
            |> JSON.getList
            |> List.map (fun x -> 
                let prophecyName = x |> JSON.lookup "name" |> JSON.getString
                let dpa = 
                    x 
                    |> JSON.lookup "dpa" 
                    |> JsonUtil.convertJsonToDPA
                    |> DPA.mapAPs (fun x -> 
                        let a = x.Split '_'
                        assert(a.Length = 2)
                        let ap = a.[0].Trim()
                        ap.Substring(1, ap.Length - 2), a.[1]
                    )

                prophecyName, dpa
            )
            |> Map.ofList

        let res = solve config systemMap dpa qp prophecyMap

        convertVerificationResultToJson res 
    with 
    | JsonError -> raise <| Util.GeneralError $"Could not convert JSON to verification instance"
    