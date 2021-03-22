const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const { parseWiki } = require('./routes');

require('./routes');

const delimiter = "=====";

function parseFile (file) {
  let code_age = {};

  let lines = file.toString().split("\n");
  let info_lines = [];
  for (let i = 7; i < lines.length; i++) {
    if (lines[i].includes("days")) {
      info_lines.push(lines[i]);
    }
  }

  for (let line of info_lines) {
    const key = line.split("days")[0];
    const value = line.split("days")[1];
    code_age[parseInt(key)] = parseFloat(value) * 100;
  }

  let keys = Object.keys(code_age);
  keys.sort((a,b) => b - a);

  let old_percentage = 0;
  let weighted_sum = 0;
  for (let i = 0; i < keys.length; i++) {
    weighted_sum += (code_age[keys[i]] - old_percentage) * keys[i];
    old_percentage = code_age[keys[i]];
  }
  weighted_sum /= 100;
  
  // (0, 365 * 2) = (min, max) - the limits of weighted sum;
  const two_years = 365 * 2;
  weighted_sum = Math.min(weighted_sum, two_years);
  const final_score = 100 * weighted_sum / two_years;
  return 100 - final_score;

}


function getResults(file) {
  if (file === undefined) {
    return;
  }

  let result = [];
  const file_bites = file.toString().split(delimiter);
  for (const file of file_bites) {
    if (file.length > delimiter.length) {
      result.push(parseFile(file));
    }
  }

  let sum = 0;
  for (let i = 0; i < result.length; i++) {
    sum += result[i];
  }
  return { "code-age" : sum / result.length};
}


const myGetFile = async (options) => {
    options.fileName = "code-age.txt";
    const file = await garie_plugin.utils.helpers.getNewestFile(options);
    return getResults(file);
}

const myGetData = async (item) => {
  const { url } = item.url_settings;
  return new Promise(async (resolve, reject) => {
    try {
        const { components } = item.url_settings;
        if (components.length < 1) {
          return;
        }
        const { reportDir } = item;

        const options = { script: path.join(__dirname, './script.sh'),
          url: url,
          reportDir: reportDir,
          params: [ delimiter, ...components ],
          callback: myGetFile
        }
        data = await garie_plugin.utils.helpers.executeScript(options);
        resolve(data);
    } catch (err) {
        console.log(`Failed to get data for ${url}`, err);
        reject(`Failed to get data for ${url}`);
    }
  });
};



console.log("Start");

const main = async () => {
  const url_map = await parseWiki();
  config.urls = [];

  for (const item of url_map) {
    const obj = {
      url: item.url,
      plugins: {
        "code-age": {
          components: item.components,
          repo: item.repo
        }
      }
    };
    config.urls.push(obj);
  }

  try{
    const { app } = await garie_plugin.init({
      getData: myGetData,
      db_name:'code-age',
      plugin_name:'code-age',
      report_folder_name:'code-age-results',
      app_root: path.join(__dirname, '..'),
      config:config,
      onDemand: true
    });
    app.listen(3000, () => {
      console.log('Application listening on port 3000');
    });
  }
  catch(err){
    console.log(err);
  }
}

if (process.env.ENV !== 'test') {
  main();
}
