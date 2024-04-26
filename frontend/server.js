const express = require('express')
const fs = require('fs')
const path = require('path')
const childProcess = require("child_process");
const app = express()
const port = 8383

app.use(express.static('public'))
app.use(express.json())

const backend_path = '../backend/app/HyGaViz'

// Performs a system call and returns the event
function makeSystemCallAndRespond(systemCallString, res) {
    childProcess.exec(systemCallString, (error, stdout, stderr) => {
        if (error) {
            console.log(`Error during system call: ${error.message}`);
            return res.status(400).send({status: 'fail'})
        }
        if (stderr) {
            console.log(`Stderr is not empty: ${stderr}`);
            return res.status(400).send({status: 'fail'})
        }
        // From here on out, we can assume that the system call succeeded and stdout contains the output of the analyzer

        console.log(`System call was successful: ${stdout}`);

        // Parse the output of the analyzer as JSON
        let jsonResult = null;
        try {
            jsonResult = JSON.parse(stdout)
        } catch(err) {
            console.log(`Output could not be parsed as JSON: ${err.message}`);
            return res.status(400).send({status: 'fail'})
        }

        if (! jsonResult.hasOwnProperty('type')) {
            console.log(`Output does not contain 'type' field`);
            return res.status(400).send({status: 'fail'})
        }

        if (jsonResult['type'] == 'success') {
            if (! jsonResult.hasOwnProperty('result')) {
                console.log(`Output does not contain 'result' field`);
                return res.status(400).send({status: 'fail'})
            }

            result = jsonResult['result']
            res.status(200).json({status: 'OK', result : result})

        } else {
            if (! jsonResult.hasOwnProperty('error')) {
                console.log(`Error Msg in output: ${jsonResult['error']}`);
                return res.status(400).send({status: 'fail', errorMsg: jsonResult['error']})
            }
        }
    })
}

app.post('/renderTS', (req, res) => {
    const {parcel} = req.body
    if (! parcel) {
        return res.status(400).send({status: 'fail'})
    }
    
    var tsPath = path.join(__dirname, 'ts.txt')

    // Write the content to the file and continue working in its callback function
    fs.writeFile(tsPath, parcel, function(err) {
        if(err) {
            console.log(`error when writing to file : ${err}`);
            return res.status(400).send({status: 'fail'})
        }

        var systemCallString = path.join(__dirname, backend_path) + ' --parse-ts ' + tsPath
        return makeSystemCallAndRespond(systemCallString, res)   
    }); 
})

app.post('/renderLTL', (req, res) => {
    const {parcel} = req.body
    if (! parcel) {
        return res.status(400).send({status: 'fail'})
    }
    
    var ltlPath = path.join(__dirname, 'ltl.txt')

    // Write the content to the file and continue working in its callback function
    fs.writeFile(ltlPath, parcel, function(err) {
        if(err) {
            console.log(`error when writing to file : ${err}`);
            return res.status(400).send({status: 'fail'})
        }

        var systemCallString = path.join(__dirname, backend_path) + ' --translate-ltl ' + ltlPath
        return makeSystemCallAndRespond(systemCallString, res)   
    }); 
})

app.post('/verify', (req, res) => {
    const {parcel} = req.body
    if (! parcel) {
        return res.status(400).send({status: 'fail'})
    }
    
    var verificationPath = path.join(__dirname, 'verification_query.txt')

    // Write the content to the file and continue working in its callback function
    fs.writeFile(verificationPath, parcel, function(err) {
        if(err) {
            console.log(`error when writing to file : ${err}`);
            return res.status(400).send({status: 'fail'})
        }

        var systemCallString = path.join(__dirname, backend_path) + ' --verify ' + verificationPath
        return makeSystemCallAndRespond(systemCallString, res)

    }); 
})

app.listen(port, () => {
    console.log(`App listening on port ${port}. Visit http://localhost:${port} to view the page.`)
})
