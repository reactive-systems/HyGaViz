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

module CommandLineParser

open Util

type ExecutionMode = 
    | ParseTransitionSystem of string
    | ConvertLTLToDPA of string
    | Verify of string

/// The command line parameters given to AutoHyper
type CommandLineArguments = 
    {
        ExecMode : ExecutionMode
    }

/// Parse the list of command line args for AutoHyper
let parseCommandLineArguments (args : list<string>) =

    if args.Length = 0 then 
        raise <| GeneralError ("Must specify which mode to use")
    else 
        match args.[0] with 
        | "--parse-ts" -> 
            if args.Length <> 2 then 
                raise <| GeneralError "--parse-ts must be followed by exactly one argument"
            else 
                {
                    CommandLineArguments.ExecMode = ParseTransitionSystem args.[1]
                }

        | "--translate-ltl" -> 
            if args.Length <> 2 then 
                raise <| GeneralError "--translate-ltl must be followed by exactly one argument"
            else 
                {
                    CommandLineArguments.ExecMode = ConvertLTLToDPA args.[1]
                }

        | "--verify" -> 
            if args.Length <> 2 then 
                raise <| GeneralError "--verify must be followed by exactly one argument"
            else 
                {
                    CommandLineArguments.ExecMode = Verify args.[1]
                }

        | x -> 
            raise <| GeneralError $"Could not parse command line argument: {x}"