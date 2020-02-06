const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const config = require('./config');

const urlRegex = /https?:\/\/(?:www\.)?([-\w\d@:%._+~#=]{1,256}\.[\w\d()]{1,6})\b(?:[-\w\d()@:%_+.~#?&/=!]*)/g;

function walk (dir) {
  let res = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat != null && stat.isDirectory()) {
      res = res.concat(walk(filePath));
    } else {
      res.push(filePath);
    }
  }
  return res;
}

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
  // Count of already-existing domains
  let existingDomains = 0;

  // For some reason, the input and output dir creations have to be in their
  // own try/catch blocks - otherwise the output dir wouldn't be created
  try {
    fs.mkdirSync(config.inputDir);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }

  try {
    fs.mkdirSync(config.outputDir);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }

  const inputFiles = walk(config.inputDir); // fs.readdirSync(config.inputDir);
  for (const inputFile of inputFiles) {
    const file = fs.readFileSync(inputFile, 'utf8');
    const matches = [...file.matchAll(urlRegex)];
    console.log(`${inputFile} has ${matches.length} links`);
    for (let [ href, hostname ] of matches) {
      href = href.replace(/\/$/, '');
      // URL validation
      // Unknown performance impact
      let url;
      try {
        url = new URL(href);
      } catch (err) {
        brokenLinks.push({ input: inputFile, href: url.href });
        continue;
      }
      // If the domain hostname is in the sorting list
      const fileName = config.includeInputFileExtension ? inputFile : path.basename(inputFile, path.extname(inputFile));
      const generalDomain = config.domains.find(domain => hostname.includes(domain));
      if (generalDomain != null) {
        // If this is a new input file for the domain hostname, init an array
        if (!Array.isArray(buffer[generalDomain][fileName])) {
          buffer[generalDomain][fileName] = [];
        }
        // Make sure there are no duplicate entries
        if (!buffer[generalDomain][fileName].includes(url.href)) {
          knownDomains++;
          buffer[generalDomain][fileName].push(url.href);
        } else {
          existingDomains++;
        }
      } else {
        // If the domain isn't in the sorting list, put in the unknown array
        if (!Array.isArray(buffer.unknown[fileName])) {
          buffer.unknown[fileName] = [];
        }
        // Make sure there are no duplicate entries
        if (!buffer.unknown[fileName].includes(url.href)) {
          unknownDomains++;
          buffer.unknown[fileName].push(url.href);
        } else {
          existingDomains++;
        }
      }
    }
  }
  console.log(`\nCalculated ${knownDomains} known domains, ${unknownDomains} unknown domains, and ${existingDomains} already existing domains.`);
  for (const { input, href } of brokenLinks) {
    console.error(`\n--- FOUND ${brokenLinks.length} BROKEN LINK(S) ---`);
    console.error(`${input}: ${href}`);
  }
  for (const domain of Object.keys(buffer)) {
    fs.writeFileSync(path.join(config.outputDir, domain + '.json'), JSON.stringify(buffer[domain], null, 2));
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
