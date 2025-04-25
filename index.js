var path = require("path")
var defaultConfig = require("./config")
var _ = require("lodash")

var sharp = require("sharp")

var Promise = require("bluebird")
var request = require("superagent")

var fs = require("fs")
fs = Promise.promisifyAll(fs, {suffix:"WithPromise"})

var execAsync = Promise.promisifyAll(require('child_process')).execAsync


/**

Variation of the index script that downloads the images to be able to process them before storing them on aws S3

**/


//List valid pictures that belong to validation steps
const listPicturesToProcess = async function(config, from = 0, pics=[]) {
	const queryParams = {
		picture_id : config.picture_ids
	}
	console.log("list pictures", from, queryParams)
	return request.get((config.api_urls[config.account_id] || config.api_url) + "/picture")
		.query (queryParams)
		.set("offset", from)
		.set("Authorization", "Bearer " + (config.tokens[config.account_id] || config.token))
		.set("account_id", config.account_id)
		.type("json")
		.then(res => {
			var resPics = res.body
			console.log("resPics", from, resPics.length, resPics[0])
			if(resPics.length == 0) {
				return pics
			} else {
				pics = pics.concat(resPics)
				//return pics
				//We iterate through pagination to get more pictures
				return Promise.delay(250).then(() => listPicturesToProcess(config, from + resPics.length, pics))
			}
		})
}

const getPictureAsBlob = async function(config, picture) {
	var res = await request.get((config.api_urls[config.account_id] || config.api_url) + "/picture/" + picture.picture_id + "/download")
									.set('Authorization', "Bearer " + (config.tokens[config.account_id] || config.token))
									.set("account_id", config.account_id)
									.responseType('blob')
	return res.body
}

var upload = async function(config, files, path) {
	var url = (config.api_urls[config.account_id] || config.api_url) + '/production/' + config.bench_root_id + '/bench/' + config.target_bench_id + '/upload'

	console.log("send", url, path )
	let agent = request.post(url)
.timeout({
    response: 150000,  // Wait 5 seconds for the server to start sending,
    deadline: 600000, // but allow 1 minute for the file to finish loading.
  })
									.set('Authorization', "Bearer " + (config.tokens[config.account_id] || config.token))
									.set("account_id", config.account_id)
									.field('wait', true)
									.field("path", path)
	if(config.transfer_id) {
		agent.field("transfer_id", config.transfer_id)
	}

	_.forEach(files, pic => {
		agent.attach('file', pic.path, pic.name)
	})
	const res = await agent
	
	return res.body
}

var enhance = async function(pic, processCode, config) {
	var input = await getPictureAsBlob(config, pic)
	if(processCode == "GREYSCALE") {
		return await sharp(input).greyscale().toBuffer();
	} else {
		//Do whatever
		return await sharp(input).greyscale().toBuffer();
	}
}


const setTag = async (config, picture, tags) => {
    console.log('send ' +(config.api_urls[config.account_id] || config.api_url) + '/picture/' + picture.picture_id + '/tag')
    const res = await request.put((config.api_urls[config.account_id] || config.api_url) + '/picture/' + picture.picture_id + '/tag')
        .set('Authorization', "Bearer " + (config.tokens[config.account_id] || config.token))
        .send(tags).catch(e => ({}))
    return res.body
}

var processes = {}

var process = async function({account_id, src_bench_id, process_id, target_bench_id, refs, transfer_id, provision_code, upload_url, picture_ids}) {
	if(picture_ids) {
		doProcess({account_id, src_bench_id, process_id, target_bench_id, refs, transfer_id, provision_code, upload_url, picture_ids})	
			.then(() => processes[process_id] = "DONE")
			.catch(e => {
				console.error("error processing", upload_url, provision_code, picture_ids, e)
				processes[process_id] = "KO"
			})
		if(process_id) {
			processes[process_id] = processes[process_id] || "RUNNING"
		}
	}
	return Promise.resolve(processes[process_id])
}


var doProcess = async function({account_id, src_bench_id, process_id, target_bench_id, refs, transfer_id, provision_code, upload_url, picture_ids}) {

	if(picture_ids.length == 0) {
		console.log("no pictures")
		return
	}
	
	var config = _.defaults({}, defaultConfig) 
	if(config["token_" + account_id ]) {
		config.token = config["token_"] + account_id
	}
	config.account_id = account_id
	config.refs = refs
	config.transfer_id = transfer_id
	config.picture_ids = picture_ids

	var pics = await listPicturesToProcess(config)

	for(var pic of pics) {
		pic.folder = pic.path.split("/").slice(1, -1).join("/")
	}

	await Promise.mapSeries(_.toArray(_.groupBy(pics, "folder")), async picsForFolder => {
		const folder = picsForFolder[0].folder


		var index = 0
		console.log("folder", folder, picsForFolder.length)
		await Promise.mapSeries(_.chunk(picsForFolder, 10), async pics => {
			var files = []
			await Promise.mapSeries(pics, async pic => {
				pic.smalltext = pic.smalltext
				console.log("download", pic.smalltext)
				
				try {
					var blob = await enhance(pic, provision_code, config)

					files.push({
						path : blob,
						name : pic.smalltext
					})
				} catch(e) {
					console.error("error processing, we continue without it", e)
					await setTag(config, pic, {"err_process":true } )
				}
				
			})
			
			var conf = _.defaults({
				bench_root_id: pics[0].bench_root_id,
				target_bench_id : pics[0].bench_id + 1,
			}, config)

			await upload(conf, files, "/" + pics[0].folder)
			
		})
	})


}

//test()


module.exports = process
