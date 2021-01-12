
# Garie code-age plugin

<p align="center">
  <p align="center">Tool to measure the code age of an internal site with the help of an external tool.<p>
</p>

## Overview of garie-code-age

Garie-code-age was developed as a plugin for the [Garie](https://github.com/boyney123/garie) Architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-code-age` is a plugin that generates and stores code age data into `InfluxDB`.

`Garie-code-age` can also be run outside the `Garie` environment and run as standalone.

If your interested in an out the box solution that supports multiple performance tools like `securityheaders`, `google-speed-insight` and `lighthouse` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-code-age` standalone you can find out how below.

## Getting Started

### Prerequisites

-   Docker installed

### Running garie-code-age

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone https://github.com/eea/garie-codeage
```

Next setup your config. Be sure that `config.json` doesn't have any websites added to the list of urls, as the 'urls' field will be filled by the plugin.

Once you finished edited your config, lets setup our environment.

```sh
docker-compose up
```

This will build your copy of `garie-code-age` and run the application.

On start, garie-code-age will start to parse the internal wiki pages to create a map between the existing websites  and their github repos, which will ultimately be passsed to `config.json` so as to measure their code age.

### Computing the code-age

Garie-code-age uses an external tool, [Hercules](https://github.com/src-d/hercules), that offers a report on the age of the lines of code. It analyzes github repos by looking at the commit history and shows the ratio of survived lines of code through certain milestones (measured in days).

For example: (92.7536% of the total lines of code are older than 30 days)

```sh
Ratio of survived lines
30 days                  0.927536
60 days                  0.922440
90 days                  0.912247
240 days                 0.907151
360 days                 0.907151
390 days                 0.850130
420 days                 0.824211
450 days                 0.824211
```

Therefore we compute a weighted sum (the difference between 'milestones' multiplied by the number of days) that will ultimately give us an idea of the code age, more specifically an average of the age of a code line. We consider the age limit to be two years (meaning that anything older than two years will remain at two years). The final score is a float between 0 and 100. A score of 0 means a very 'young' code, while a score of 100 means a very 'old' code and hardly updated (as nothing has changed for at least 2 years).

For the example above:

```sh
weighted_sum = (82.4211 - 0) * 450 + (82.4211 - 82.4211) * 420 + (85.0130 - 82.4211) * 390 + (90.7151 - 85.0130) * 360 ...
weighted_sum /= 100
weighted_sum = Math.min(weighted_sum, two_years)
score = 100 * weighted_sum / two_years
```

This score is than added to the respective website in the database. 


## Variables
- WIKI_APIKEY - access key to parse wiki
- WIKI_SERVER - https://taskman.devel4cph.eea.europa.eu/
- WIKI_PAGE - Applications
- WIKI_PROJECT - infrastructure

