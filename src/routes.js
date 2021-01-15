var Redmine = require('node-redmine');

var hostname = process.env.WIKI_SERVER;
var config = {
    apiKey: process.env.WIKI_APIKEY
}

var redmine = new Redmine(hostname, config);

function getAllWikiPages() {
    let all_wiki_pages = [];
    return new Promise( (resolve, reject) => {
        redmine.wiki_by_project_id(process.env.WIKI_PROJECT, async (err, data) => {
            if (err) reject(err);
        
            for (let page of data.wiki_pages) {
                all_wiki_pages.push(page);                
            }
            resolve(all_wiki_pages);
            
        });
    } )
    
    
}

function orderTitles(all_wiki_pages) {
    const titles_dict = {};

    for (let i = 0; i < all_wiki_pages.length; i++) {
        if ( all_wiki_pages[i].parent !== undefined && 
             all_wiki_pages[i].parent.title === process.env.WIKI_PAGE) {
            titles_dict[all_wiki_pages[i].title] = [];
        }
    }

    for (let key in titles_dict) {
        for (let i = 0; i < all_wiki_pages.length; i++) {
            if (all_wiki_pages[i].parent !== undefined && 
                all_wiki_pages[i].parent.title === key) {
                titles_dict[key].push(all_wiki_pages[i].title);
            }
        }
    }
    return titles_dict;
}

function getPageContent(page) {
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


function getWikiContent(titles_dict) {
    const promises = [];
    for (let key in titles_dict) {
        for (let page of titles_dict[key]) {
            promises.push(getPageContent(page));
        }
    }

    return Promise.all(promises);
}



function structureContent(content, page) {
    let detailed_content = {};
    detailed_content.page = page;
    detailed_content.services = []; // list element: {service location : deployment repo}
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
                    // keep just github repos
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


function structureByPage(content_list) {
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
    let content_list = [];
    try {
        const all_wiki_pages = await getAllWikiPages();
        const titles_dict = orderTitles(all_wiki_pages);
        const content = await getWikiContent(titles_dict);

        for (let key of content) {
            if (key.page.text !== undefined && key.page.title !== undefined) {
                content_list.push(structureContent(key.page.text, key.page.title));
            }
        }
    } catch(err) {
        console.log(`Error while parsing wiki pages ${err}`);
    }
    return structureByPage(content_list);

}

module.exports = {
    parseWiki
}
  