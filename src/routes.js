var Redmine = require('node-redmine');




function getAllWikiPages(redmine, config_wiki) {
    let all_wiki_pages = [];
    return new Promise( (resolve, reject) => {
        redmine.wiki_by_project_id(config_wiki.WIKI_PROJECT, async (err, data) => {
            if (err) reject(err);
        
            for (let page of data.wiki_pages) {
                all_wiki_pages.push(page);                
            }
            resolve(all_wiki_pages);
            
        });
    } )
    
    
}

function orderTitles(all_wiki_pages, config_wiki) {
    const titles_dict = {};

    for (let i = 0; i < all_wiki_pages.length; i++) {
        if ( all_wiki_pages[i].parent !== undefined && 
             all_wiki_pages[i].parent.title === config_wiki.WIKI_PAGE) {
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

function getPageContent(page, redmine, config_wiki) {
    return new Promise( (resolve, reject) => {
        redmine.wiki_by_title(config_wiki.WIKI_PROJECT, page, {}, function(err, data) {
            if (err) {
                resolve({page: ""});
                return;
            }
            resolve({page : data.wiki_page});
        });
    });
}


function getWikiContent(titles_dict, redmine, config_wiki) {
    const promises = [];
    for (let key in titles_dict) {
        for (let page of titles_dict[key]) {
            promises.push(getPageContent(page, redmine, config_wiki));
        }
    }

    return Promise.all(promises);
}



function structureContent(content, page) {
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

async function parseWiki(config_wiki) {
    const hostname = config_wiki.WIKI_SERVER;
    const config = {
        apiKey: config_wiki.WIKI_APIKEY
    }

    const redmine = new Redmine(hostname, config);

    const all_wiki_pages = await getAllWikiPages(redmine, config_wiki);
    const titles_dict = orderTitles(all_wiki_pages, config_wiki);

    const content = await getWikiContent(titles_dict, redmine, config_wiki);
    let content_list = [];
    for (let key of content) {
        if (key.page.text !== undefined && key.page.title !== undefined) {
            content_list.push(structureContent(key.page.text, key.page.title));
        }
    }
    return structureByPage(content_list);

}

module.exports = {
    parseWiki
}
  