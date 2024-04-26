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

module ProphecyConstruction 

open FsOmegaLib.SAT
open FsOmegaLib.AutomatonSkeleton
open FsOmegaLib.DPA
open FsOmegaLib.NPA

open HyperLTL

type ProphecyVariable = string 

type ExtendedAlphabet<'L> = 
    | NormalAp of 'L * TraceVariable
    | ProphecyVariable of ProphecyVariable

type private ProductState<'T> = 
    | InitialState
    | PositiveDpaState of 'T
    | NegativeDpaState of 'T

/// Note that we offset the prophecy by one step, i.e., construct a NPA for F !(p <-> X proph), as we read the prophecies early
let buildProphecyConstructNegated (prophecyDpa : DPA<int, 'L * TraceVariable>) (pname : ProphecyVariable) = 
    // The AP index of the new ProphecyVariable 
    let indexOfProphecyVariable = prophecyDpa.APs.Length

    let newAps = (prophecyDpa.APs |> List.map NormalAp) @ [ProphecyVariable pname]

    let allStates = 
        Set.union (Set.map PositiveDpaState prophecyDpa.States) (Set.map NegativeDpaState prophecyDpa.States)
        |> Set.add InitialState

    let npa = 
        {
            NPA.Skeleton = 
                {
                    AutomatonSkeleton.States = allStates
                    APs = newAps
                    Edges = 
                        allStates
                        |> Seq.map (fun x -> 
                            let edges = 
                                match x with 
                                | InitialState -> 
                                    [
                                        ([[NL indexOfProphecyVariable]], PositiveDpaState prophecyDpa.InitialState)
                                        ([[PL indexOfProphecyVariable]], NegativeDpaState prophecyDpa.InitialState)
                                        (DNF.trueDNF, InitialState)
                                    ]
                                | PositiveDpaState s -> 
                                    prophecyDpa.Edges.[s]
                                    |> List.map (fun (g, x) -> g, PositiveDpaState x)
                                | NegativeDpaState s -> 
                                    prophecyDpa.Edges.[s]
                                    |> List.map (fun (g, x) -> g, NegativeDpaState x)
                            
                            x, edges
                            )
                        |> Map.ofSeq
                }
            InitialStates = Set.singleton InitialState
            Color = 
                allStates
                |> Seq.map (fun s -> 
                    let c = 
                        match s with 
                        | InitialState -> 1 // The initial state is not accepting, staying there will cause a violation
                        | PositiveDpaState q -> prophecyDpa.Color.[q]
                        | NegativeDpaState q -> prophecyDpa.Color.[q] + 1

                    s, c
                    )
                |> Map.ofSeq
        }

    npa
    |> NPA.convertStatesToInt

let constructNpaDisjunction (autList : list<NPA<int, 'L>>) = 
    let autList = NPA.bringToSameAPs autList

    let npa = 
        {
            NPA.Skeleton = 
                {
                    AutomatonSkeleton.States =
                        autList
                        |> List.mapi (fun i npa -> 
                            npa.States |> Set.map (fun s -> i, s)
                            )
                        |> Set.unionMany
                    APs = autList.[0].APs
                    Edges = 
                        autList
                        |> List.mapi (fun i npa -> 
                            npa.Edges
                            |> Map.toSeq
                            |> Seq.map (fun (s, l) -> 
                                (i, s), l |> List.map (fun (g, t) -> g, (i, t))
                                )
                            )
                        |> Seq.concat
                        |> Map.ofSeq
                }
            InitialStates = 
                autList
                |> List.mapi (fun i npa -> 
                    npa.InitialStates |> Set.map (fun s -> i, s)
                    )
                |> Set.unionMany
            Color = 
                autList
                |> List.mapi (fun i npa -> 
                    npa.Color
                    |> Map.toSeq
                    |> Seq.map (fun (s, c) -> 
                        (i, s), c
                        )
                    )
                |> Seq.concat
                |> Map.ofSeq
        }

    npa
    |> NPA.convertStatesToInt


