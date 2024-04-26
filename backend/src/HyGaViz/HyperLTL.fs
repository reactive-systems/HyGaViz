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

module HyperLTL 

open FsOmegaLib.LTL

type TraceVariable = string 

type QuantifierType = 
    | FORALL
    | EXISTS 

type HyperLTL<'L when 'L: comparison> = 
    {
        QuantifierPrefix : list<QuantifierType * TraceVariable>
        LTLMatrix : LTL<'L * TraceVariable>
    }

module Parser = 
    open FParsec

    let traceVarParser = 
        many1Chars (letter <|> digit)

    let parseIndexedLTL atomParser (s: string) = 
        let ap : Parser<'T * string, unit>= 
            atomParser .>> pchar '_' .>>. traceVarParser

        let full = spaces >>. (FsOmegaLib.LTL.Parser.ltlParser ap) .>> spaces .>> eof
        match run full s with
            | Success (res, _, _) -> Result.Ok res
            | Failure (err, _, _) -> Result.Error err