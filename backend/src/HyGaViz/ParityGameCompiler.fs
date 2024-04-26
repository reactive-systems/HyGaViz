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

module ParityGameCompiler

open System.Collections.Generic

open FsOmegaLib.SAT
open FsOmegaLib.DPA
open FsOmegaLib.NPA
open FsOmegaLib.Operations

open ParityGameLib.ParityGame

open Util
open Util.SolverConfiguration
open TransitionSystem
open HyperLTL
open ProphecyConstruction


type GameState = 
    {
        SystemStates : Map<TraceVariable, int>
        MainDpaState : int
    }

/// Type that represents the decision made by the \forall player
type UniversalMove = 
    {
        NextUniversalStates : Map<TraceVariable, int>
        ProphecyEvaluation : Map<ProphecyVariable, bool> 
    }

/// Type that represents the decision made by the \exists player
type ExistentialMove = 
    {
        NextExistentialStates : Map<TraceVariable, int>
    }

type ParityGameState =  
    | ForallStage of GameState
    | ExistentialStage of GameState * UniversalMove
    | UpdateStage of GameState * UniversalMove * ExistentialMove


let private constructProphecyDpa (config: SolverConfiguration) (aut : DPA<int, 'L * TraceVariable>) (prophecyMap : Map<ProphecyVariable, DPA<int, 'L * TraceVariable>>) = 
    if Map.isEmpty prophecyMap then 
        aut 
        |> DPA.mapAPs ExtendedAlphabet.NormalAp
    else 
        let mappedAut = 
            {
                NPA.Skeleton = aut.Skeleton
                InitialStates = Set.singleton aut.InitialState
                Color = aut.Color
            }
            |> NPA.mapAPs ExtendedAlphabet.NormalAp

        let prophecyAutomata = 
            prophecyMap
            |> Map.toList
            |> List.map (fun (p, dpa) -> 
                ProphecyConstruction.buildProphecyConstructNegated dpa p
                )

        let disjunctiveNpa = ProphecyConstruction.constructNpaDisjunction (mappedAut :: prophecyAutomata)
        
        let mainDpa = 
            match FsOmegaLib.Operations.AutomatonConversions.convertToDPA false config.MainPath config.AutfiltPath Effort.LOW disjunctiveNpa with 
            | Success x -> x
            | Fail err -> raise <| GeneralError $"Error when converting NPA to DPA: %s{err.Info}"

        mainDpa


/// Given a list of systems, and a DPA compile to a parity game
let compileToParityGame<'L when 'L : comparison> (config : SolverConfiguration) (systemMap :  Map<TraceVariable, TransitionSystem<'L>>) (universalTraceVariables : Set<TraceVariable>) (aut : DPA<int, 'L * TraceVariable>) (prophecyMap : Map<ProphecyVariable, DPA<int, 'L * TraceVariable>>) = 
    
    let allTraceVariables = 
        aut.APs
        |> List.map snd 
        |> set

    allTraceVariables
    |> Set.iter (fun pi -> 
        if Map.containsKey pi systemMap |> not then 
            raise <| GeneralError $"Trace variable %s{pi} is used in the formula but no system for %s{pi} is given"
        )

    // We only consider the variables that are actually used in the formula
    let universalTraceVariables = Set.intersect universalTraceVariables allTraceVariables

    prophecyMap
    |> Map.iter (fun p dpa -> 
        dpa.APs
        |> List.map snd 
        |> List.iter (fun pi -> 
            if Set.contains pi universalTraceVariables |> not then 
                raise <| GeneralError $"Prophecy %s{p} uses trace variable %s{pi} which is not quantified universally. Prophecies may only refer to universally quantified traces that are also used in the LTL body."
        )
        )

    // Compute the DPA that includes all prophecies
    let mainDpa = constructProphecyDpa config aut prophecyMap

    let initialState = 
        {
            GameState.SystemStates =   
                systemMap 
                |> Map.map (fun _ x -> x.InitialState)
            MainDpaState = mainDpa.InitialState
        }
        |> ForallStage

    let visited = new HashSet<_>(Seq.singleton initialState)

    let queue = new Queue<_>(Seq.singleton initialState)

    let propertyDict = new Dictionary<_,_>()

    while queue.Count <> 0 do 
        let s = queue.Dequeue() 
        let sucs, _, p, c = 
            match s with 
            | ForallStage (gameState) -> 
                let possibleNextUniversalStates = 
                    gameState.SystemStates
                    |> Map.filter (fun pi _ -> Set.contains pi universalTraceVariables)
                    |> Map.map (fun pi s -> 
                        systemMap.[pi].SuccessorMap.[s]
                        )
                    |> Util.cartesianProductMap
                    |> Seq.toList

                let possibleProphecyEvaluations = 
                    prophecyMap
                    |> Map.map (fun _ _ -> [true; false] |> set)
                    |> Util.cartesianProductMap
                    |> Seq.toList

                let sucs = 
                    List.allPairs possibleNextUniversalStates possibleProphecyEvaluations
                    |> List.map (fun (nextUniversalStates, prophecyEval) -> 
                        ExistentialStage (gameState, {UniversalMove.NextUniversalStates = nextUniversalStates; ProphecyEvaluation = prophecyEval})
                        )

                let info = $"ForallStage: %A{gameState}"
                
                // This state is controlled by the adversay
                sucs, info, PlayerOne, mainDpa.Color.[gameState.MainDpaState]
            
            | ExistentialStage (gameState, universalMove) -> 
                let possibleNextExistentialStates = 
                    gameState.SystemStates
                    |> Map.filter (fun pi _ -> Set.contains pi universalTraceVariables|> not)
                    |> Map.map (fun pi s -> 
                        systemMap.[pi].SuccessorMap.[s]
                        )
                    |> Util.cartesianProductMap
                    |> Seq.toList

                
                let sucs = 
                    possibleNextExistentialStates
                    |> List.map (fun nextExistentialStates -> 
                        UpdateStage (gameState, universalMove, {ExistentialMove.NextExistentialStates = nextExistentialStates})
                        )

                let info = $"ExistentialStage: %A{gameState}, %A{universalMove}"
                
                // This state is controlled by the system player
                sucs, info, PlayerZero, mainDpa.Color.[gameState.MainDpaState]
            
            | UpdateStage (gameState, universalMove, existentialMove) -> 
                let nextMainDpaState = 
                    mainDpa.Edges.[gameState.MainDpaState]
                    |> List.find (fun (guard, _) -> 
                        guard
                        |> DNF.eval (fun i -> 
                            match mainDpa.APs.[i] with 
                            | NormalAp (ap, pi) -> 
                                let index = systemMap.[pi].APs |> List.findIndex ((=) ap)
                                Set.contains index (systemMap.[pi].ApEval.[gameState.SystemStates.[pi]])
                            | ProphecyVariable p -> 
                                universalMove.ProphecyEvaluation.[p]
                            
                        ) 
                    )
                    |> snd

                let nextGameState = 
                    {
                        GameState.SystemStates = 
                            Util.mergeMaps universalMove.NextUniversalStates existentialMove.NextExistentialStates
                        MainDpaState = nextMainDpaState
                    }

                let sucs = ForallStage nextGameState |> List.singleton

                let info = $"UpdateStage: %A{gameState}, %A{universalMove}, %A{existentialMove}"

                sucs, info, PlayerZero, mainDpa.Color.[gameState.MainDpaState] // Color and player does not really matter here

        propertyDict.Add(s, (set sucs, p, c))
        
        // Add to the queue if this is a new state
        for s' in sucs do 
            if visited.Contains s' |> not then 
                visited.Add s' |> ignore 
                queue.Enqueue s'
         

    { ParityGame.Properties = Util.dictToMap propertyDict }, initialState