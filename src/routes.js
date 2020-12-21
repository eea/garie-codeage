var Redmine = require('node-redmine');

var hostname = process.env.WIKI_SERVER;
var config = {
    apiKey: process.env.WIKI_APIKEY
}

var redmine = new Redmine(hostname, config);

var dump_obj = function(project) {
    console.log('Dumping project:');
    for (var item in project) {
      console.log('  ' + item + ': ' + JSON.stringify(project[item]));
    }
  };



function get_all_wiki_pages() {
    let all_wiki_pages = [];
    return new Promise( (resolve, reject) => {
        redmine.wiki_by_project_id(process.env.WIKI_PROJECT, async (err, data) => {
            if (err) reject(err);
        
            for (var i in data.wiki_pages) {
                all_wiki_pages.push(data.wiki_pages[i]);                
            }
            resolve(all_wiki_pages);
            
        });
    } )
    
    
}

function get_pages_map(all_wiki_pages) {
    const pages_map = {};

    for (let i = 0; i < all_wiki_pages.length; i++) {
        if ( all_wiki_pages[i].parent !== undefined && 
             all_wiki_pages[i].parent.title === process.env.WIKI_PAGE) {
            pages_map[all_wiki_pages[i].title] = [];
        }
    }

    for (let key in pages_map) {
        for (let i = 0; i < all_wiki_pages.length; i++) {
            if (all_wiki_pages[i].parent !== undefined && 
                all_wiki_pages[i].parent.title === key) {
                pages_map[key].push(all_wiki_pages[i].title);
            }
        }
    }
    return pages_map;
}

function get_page_content(page) {
    return new Promise( (resolve, reject) => {
        redmine.wiki_by_title(process.env.WIKI_PROJECT, page, {}, function(err, data) {
            if (err) {
                resolve({page: ""});
                return;
            }
            resolve({page : data.wiki_page});
        });
    });
}


function get_wiki_content(pages_map) {
    const promises = [];
    for (let key in pages_map) {
        for (let page of pages_map[key]) {
            promises.push(get_page_content(page));
        }
    }

    return Promise.all(promises);
}



function structure_content(content, page) {
    let detailed_content = {};
    detailed_content.page = page;
    detailed_content.services = []; // lista de {service location : deployment repo}
    detailed_content.components = [];
    
    const lines = content.toString().split('\n');
    let services = [];
    let repos = [];
    for (let line of lines) {
        if (line.includes('Service location') && !line.includes('Test') ) {
            const tokens = line.split(': ');
            if (tokens.length > 1) {
                const elements = tokens[1].split(' ');
                if (!elements[0].includes('http')) {
                    break;
                }
                services.push(elements[0]);
            } else {
                if (tokens[0].includes('http')) {
                    services.push(tokens[0]);
                }
            }
            
        }
        if (line.includes('DeploymentRepoURL') && !line.includes('generated')) {
            if (line.includes('github')) {
                const tokens = line.split(' ');
                for (let token of tokens) {
                    // doar repo-urile de github
                    if (token.includes('github')) {
                        repos.push(token);
                        break;
                    } 
                }
            }
            else {
                repos.push('N/A');
            }            
        }
        
        if (lines.includes("Access management and permissions")) {
            break;
        }
    }

    for (let i = 0; i < services.length; i++) {
        detailed_content.services.push( { service: services[i], repo : repos[i] } );
    }
    
    let components = false;
    for (let line of lines) {
        if (line.includes('Components and source code')) {
            components = true;
        }
        if (components === true) {
            if (line.includes('github')) {
                const tokens = line.split(" | ");
                if (tokens.length > 1 && tokens[1].includes("Source code")) {
                    const repo = tokens[1].replace('"Source code":', '');
                    detailed_content.components.push({ name : tokens[0].split(':')[0], repo});
                }
            }
        }
    }
    return detailed_content;
   
}


function structure_by_page(content_list) {
    let url_map = [];

    for (const item of content_list) {
        const repos = [];
        for (const element of item.components) {
            repos.push(element.repo);
        }
        for (const element of item.services) {
            const service = {
                url: element.service,
                repo: element.repo,
                components: repos
            };
            url_map.push(service);
        }
    }
    return url_map;
}

async function parseWiki() {
    const all_wiki_pages = await get_all_wiki_pages();
    const pages_map = get_pages_map(all_wiki_pages);

    const content = await get_wiki_content(pages_map);
    let content_list = [];
    for (let key of content) {
        if (key.page.text !== undefined && key.page.title !== undefined) {
            content_list.push(structure_content(key.page.text, key.page.title));
        }
    }
    return structure_by_page(content_list);

}

module.exports = {
    parseWiki
}
  