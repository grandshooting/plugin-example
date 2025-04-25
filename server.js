const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const defaultConfig = require("./config")
const process = require("./index")
const _ = require("lodash")

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '500mb', extended: true}));

app.use('/plugin_example/tmp', express.static('tmp'));


app.get('/', function (req, res) {
  res.send('Hi!')
})

app.post('/plugin_example/submit_images', function (req, res) {
  console.log("we are called to process images", req.body)
  var config = _.defaults({}, 
  	{account_id:req.body.account_id, picture_ids:req.body.picture_ids, provision_code:req.body.parameter, process_id: req.body.process_id
  		, transfer_id : req.body.transfer_id, upload_url : req.body.target_url}
	,  
  	defaultConfig)
  process(config)
    .then(status => res.send(status))
    .catch(e => {
      console.log("failed", req.body, e)
      res.status(500).send("failed " +  e && e.message)
    })
  
})

app.listen(4247, function () {
  console.log('started on port 4247!')
})
