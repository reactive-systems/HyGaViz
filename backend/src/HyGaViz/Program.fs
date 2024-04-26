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

module Program

open System.IO 

open FsOmegaLib.JSON
open FsOmegaLib.DPA
open FsOmegaLib.Operations

open Util
open Util.SolverConfiguration
open CommandLineParser

let parseTransitionSystem filename = 
    let fileContent =   
        try 
            File.ReadAllText filename
        with 
        | _ -> raise <| GeneralError $"Could not open file {filename}"

    let ts =
        match TransitionSystem.Parser.parseTransitionSystem fileContent with 
        | Result.Ok x ->
            x
        | Result.Error err -> raise <| GeneralError $"Could not parse transition system: %s{err}"

    match TransitionSystem.TransitionSystem.findError ts with 
    | None -> ()
    | Some err -> raise <| GeneralError $"Error in the transition system: %s{err}"

    JsonUtil.convertTransitionSystemToJson ts


let convertLtlToDpa (config : SolverConfiguration) filename = 
    let fileContent =   
        try 
            File.ReadAllText filename
        with 
        | _ -> raise <| GeneralError $"Could not open file {filename}"

    let ltl =
        match HyperLTL.Parser.parseIndexedLTL Util.ParserUtil.escapedStringParser fileContent with 
        | Result.Ok x -> x
        | Result.Error err -> raise <| GeneralError $"Error when parsing LTL formula %s{err}" 

    let dpa = 
        match FsOmegaLib.Operations.LTLConversion.convertLTLtoDPA false config.MainPath config.Ltl2tgbaPath ltl with 
        | Success x -> x
        | Fail err -> raise <| GeneralError $"Error when converting LTL to DPA: %s{err.Info}"

    let mappedDpa = 
        dpa |> DPA.mapAPs (fun (x, y) -> "\\\"" + x + "\\\"" + "_" + y)

    JsonUtil.convertDPAToJson mappedDpa

let verify (config: SolverConfiguration) filename =
    let fileContent =   
        try 
            File.ReadAllText filename
        with 
        | _ -> raise <| GeneralError $"Could not open file {filename}"

    let asJson = 
        match FsOmegaLib.JSON.Parser.parseJsonString fileContent with 
        | Result.Ok x -> x
        | Result.Error err ->  raise <| GeneralError $"Could not parse JSON: {err}"

    StrategyConstruction.solveJSON config asJson 

let run args = 
    let config = Util.SolverConfiguration.getConfig()
        
    let cmdArgs =CommandLineParser.parseCommandLineArguments (Array.toList args)

    match cmdArgs.ExecMode with 
    | ParseTransitionSystem filename -> 
        parseTransitionSystem filename
    | ConvertLTLToDPA filename -> 
        convertLtlToDpa config filename
    | Verify filename -> 
        verify config filename


[<EntryPoint>]
let main args =
    let o = 
        try 
            let res = run args 
 
            [
                ("type", JString "success");
                ("result", res )
            ]
            |> Map.ofList
            |> JObject

        with 
        | GeneralError err -> 
            [
                ("type", JString "fail");
                ("error", JString err )
            ]
            |> Map.ofList
            |> JObject
        | e -> 
            reraise()
            [
                ("type", JString "fail");
                ("source", JString "system");
                ("error", JString e.Message )
            ]
            |> Map.ofList
            |> JObject

    let str = JSON.toString o

    printfn $"%s{str}"

    0