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

module TransitionSystem

type TransitionSystem<'L when 'L : comparison> = 
    {
        States : Set<int>
        InitialState : int
        APs : list<'L>
        SuccessorMap : Map<int, Set<int>>
        ApEval : Map<int, Set<int>>
    }
    
module TransitionSystem = 


    exception private FoundError of string

    let findError (ts : TransitionSystem<'L>) = 
        try 
            if Set.contains ts.InitialState ts.States |> not then 
                raise <| FoundError $"The initial state is not contained in the set of all states"

            ts.States
            |> Seq.iter (fun s -> 
                if Map.containsKey s ts.SuccessorMap |> not then 
                    raise <| FoundError $"No successors for state %i{s}"

                if Map.containsKey s ts.ApEval |> not then 
                    raise <| FoundError $"No AP evaluation for state %i{s}"

                ts.SuccessorMap.[s]
                |> Seq.iter (fun s' -> 
                    if Set.contains s' ts.States |> not then
                        raise <| FoundError $"State %i{s'} is listed as a successor of state %i{s}, but not defined as a state"
                    )

                ts.ApEval.[s]
                |> Seq.iter (fun i -> 
                    if i < 0 || i >= ts.APs.Length then 
                        raise <| FoundError $"State %i{s} lists AP-Index %i{i} which is out of bounds"
                    )
            )

            None 
        with 
        | FoundError err -> Some err


module Parser = 
    open FParsec 

    let private commentParser =
        (skipString "--" .>> restOfLine false)

    let private ws = spaces .>> sepEndBy commentParser spaces

    /// Parser for the AP evaluation at a given node
    let private apsatParser = 
        skipChar '{' >>. ws >>. many (pint32 .>> ws)  .>> ws .>> skipChar '}'
        |>> set

    /// Parser for a single state in the system
    let private stateParser = 
        pstring "State:" >>. ws >>.
            pipe3
                (pint32 .>> ws)
                (apsatParser .>> ws)
                (many (pint32 .>> ws))
                (fun id ap sucs -> (id, (set sucs, ap)))

    /// Parser for the body of a transition system
    let private bodyParser = 
        ws >>. many (stateParser .>> ws)
        |>> Map.ofList

    /// Parser for the entire transition system
    let private transitionSystemParser = 
        pipe3
            (ws >>. skipString "aps" >>. ws >>. many1 (Util.ParserUtil.escapedStringParser .>> ws))
            (ws >>. skipString "init" >>. ws >>. pint32)
            (bodyParser)
            (fun aps init step -> 
                {
                    TransitionSystem.States = step |> Map.keys |> set
                    InitialState = init
                    APs = aps
                    SuccessorMap = step |> Map.map (fun _ x -> fst x)
                    ApEval = step |> Map.map (fun _ x -> snd x)
                }
            )
    
    /// Given a string s, parse s into a transition system
    let parseTransitionSystem (s: string) =
        let full = transitionSystemParser .>> ws .>> eof
        let res = run full s
        match res with
            | Success (res, _, _) -> Result.Ok res
            | Failure (err, _, _) -> Result.Error err