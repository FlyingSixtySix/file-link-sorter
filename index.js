const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const config = require('./config');

const urlRegex = /https?:\/\/(?:www\.)?([-\w\d@:%._+~#=]{1,256}\.[\w\d()]{1,6})\b(?:[-\w\d()@:%_+.~#?&/=!]*)/g;

function main () {
  const buffer = {
    unknown: {}
  };
  config.domains.forEach(domain => {
    buffer[domain] = {};
    // Try to open pre-existing output files so we can append to them
    if (!config.overwriteOutput) {
      try {
        // Check to see if there's already output files
        buffer[domain] = JSON.parse(fs.readFileSync(path.join(config.outputDir, domain + '.json'), 'utf8'));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }
  });
  const brokenLinks = [];
  // Count of known and unknown domains
  let knownDomains = 0;
  let unknownDomains = 0;

  try {
    fs.mkdirSync(config.inputDir);
    fs.mkdirSync(config.outputDir);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }

  const inputFiles = fs.readdirSync(config.inputDir);
  for (const inputFile of inputFiles) {
    const file = fs.readFileSync(path.join(config.inputDir, inputFile), 'utf8');
    const matches = [...file.matchAll(urlRegex)];
    console.log(`${inputFile} has ${matches.length} links`);
    for (const [ href, hostname ] of matches) {
      // URL validation
      // Unknown performance impact
      try {
        new URL(href);
      } catch (err) {
        brokenLinks.push({ input: inputFile, href });
        continue;
      }
      // If the domain hostname is in the sorting list
      const fileName = config.includeInputFileExtension ? inputFile : path.basename(inputFile, path.extname(inputFile));
      if (config.domains.includes(hostname)) {
        // If this is a new input file for the domain hostname, init an array
        if (!Array.isArray(buffer[hostname][fileName])) {
          buffer[hostname][fileName] = [];
        }
        // Make sure there are no duplicate entries
        if (!buffer[hostname][fileName].includes(href)) {
          knownDomains++;
          buffer[hostname][fileName].push(href);
        }
      } else {
        // If the domain isn't in the sorting list, put in the unknown array
        if (!Array.isArray(buffer.unknown[fileName])) {
          buffer.unknown[fileName] = [];
        }
        // Make sure there are no duplicate entries
        if (!buffer.unknown[fileName].includes(href)) {
          unknownDomains++;
          buffer.unknown[fileName].push(href);
        }
      }
    }
  }
  console.log(`\nCalculated ${knownDomains} known domains and ${unknownDomains} unknown domains.`);
  for (const { input, href } of brokenLinks) {
    console.error(`\n--- FOUND ${brokenLinks.length} BROKEN LINK(S) ---`);
    console.error(`${input}: ${href}`);
  }
  for (const domain of Object.keys(buffer)) {
    fs.writeFileSync(path.join('output', domain + '.json'), JSON.stringify(buffer[domain], null, 2));
  }
}

// Process the first argument
if (process.argv[2] && process.argv[2].toLowerCase() === 'clean') {
  // Recursively remove the output directory
  try {
    fs.rmdirSync(config.outputDir, { recursive: true });
    console.log('Removed output directory');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return;
} else if (process.argv[2] && process.argv[2].toLowerCase() === 'cleanall') {
  // Recursively remove the input and output directories
  try {
    fs.rmdirSync(config.inputDir, { recursive: true });
    console.log('Removed input directory');
    fs.rmdirSync(config.outputDir, { recursive: true });
    console.log('Removed output directory');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return;
}

main();
