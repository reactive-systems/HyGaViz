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

module Util 

open System.IO
open System.Collections.Generic

open FsOmegaLib.JSON

exception GeneralError of string

let dictToMap (d : Dictionary<'Key, 'Value>) = 
    d 
    |> Seq.map (fun x -> x.Key, x.Value)
    |> Map.ofSeq

let rec cartesianProduct (LL: list<seq<'a>>) =
    match LL with
    | [] -> Seq.singleton []
    | L :: Ls ->
        seq {
            for x in L do
                for xs in cartesianProduct Ls -> x :: xs
        }

/// Given a map A -> set<B> compute all possible maps A -> B that are obtained by picking some element from that set for each key in A
let cartesianProductMap (m : Map<'A, Set<'B>>) =
    let keysAsList = Seq.toList m.Keys

    keysAsList
    |> Seq.toList
    |> List.map (fun x -> m.[x] |> seq)
    |> cartesianProduct
    |> Seq.map (fun x -> 
        List.zip keysAsList x
        |> Map
        )

let mergeMaps (map1) map2 = 
    Seq.append (Map.toSeq map1) (Map.toSeq map2)
    |> Map.ofSeq



/// Parser for variables used in HyperLTL specifications
module ParserUtil = 
    open FParsec

    /// Parser that parses everything between two '"'
    let escapedStringParser : Parser<string, unit> =
        let escapedCharParser : Parser<string, unit> =  
            anyOf "\"\\/bfnrt"
            |>> fun x -> 
                match x with
                | 'b' -> "\b"
                | 'f' -> "\u000C"
                | 'n' -> "\n"
                | 'r' -> "\r"
                | 't' -> "\t"
                | c   -> string c

        between
            (pchar '"')
            (pchar '"')
            (stringsSepBy (manySatisfy (fun c -> c <> '"' && c <> '\\')) (pstring "\\" >>. escapedCharParser))


module SolverConfiguration = 

    type SolverConfiguration = 
        {
            MainPath: string
            Ltl2tgbaPath: string
            AutfiltPath: string
            OinkPath: string
        }

    let private parseConfigFile (s : string) =
        match FsOmegaLib.JSON.Parser.parseJsonString s with 
        | Result.Error err -> raise <| GeneralError $"Could not parse config file: %s{err}"
        | Result.Ok x -> 
            {
                MainPath = "./"
                Ltl2tgbaPath = 
                    (JSON.tryLookup "ltl2tgba" x)
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "No field 'ltl2tgba' found")
                    |> JSON.tryGetString
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "Field 'ltl2tgba' must contain a string")
                AutfiltPath = 
                    (JSON.tryLookup "autfilt" x)
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "No field 'autfilt' found")
                    |> JSON.tryGetString
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "Field 'autfilt' must contain a string")
                OinkPath =
                    (JSON.tryLookup "oink" x)
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "No field 'oink' found")
                    |> JSON.tryGetString
                    |> Option.defaultWith (fun _ -> raise <| GeneralError "Field 'oink' must contain a string")
            }

    let getConfig() = 
        // By convention the paths.json file is located in the same directory as the executable
        let configPath = 
            System.IO.Path.Join [|System.IO.Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location); "paths.json"|]
                        
        // Check if the path to the config file is valid , i.e., the file exists
        if System.IO.FileInfo(configPath).Exists |> not then 
            raise <| GeneralError "The paths.json file does not exist in the same directory as the executable"            
        
        // Parse the config File
        let configContent = 
            try
                File.ReadAllText configPath
            with 
                | _ -> 
                    raise <| GeneralError "Could not open paths.json file"

        let solverConfig = parseConfigFile configContent

        if System.IO.FileInfo(solverConfig.OinkPath).Exists |> not then 
            raise <| GeneralError "The given path to the spot's autfilt is incorrect"

        if System.IO.FileInfo(solverConfig.Ltl2tgbaPath).Exists |> not then 
            raise <| GeneralError "The given path to the spot's ltl2tgba is incorrect"

        if System.IO.FileInfo(solverConfig.AutfiltPath).Exists |> not then 
            raise <| GeneralError "The given path to the spot's autfilt is incorrect"

        solverConfig