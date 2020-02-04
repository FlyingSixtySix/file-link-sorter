# file-link-scraper
Sorts all URLs found in `input/` files to their corresponding output domain `.json` (configured in `config.json`), or to `unknown.json`.

## Running
1. Copy `config.json.example` to `config.json`
2. Configure to your liking (see below for explanation)
3. Supply input files to the configured input directory
4. Run `node .`

## Configuring
- `inputDir` (string) - The input directory
- `outputDir` (string) - The output directory
- `includeInputFileExtension` (boolean) - Whether to include the extension in the output filename keys (e.g. `"fileName.json": [ ... ]` or `"fileName": []`)
- `overwriteOutput` (boolean) - Whether to overwrite files in the specified output directory; this does not automatically clean files removed from the domain list
- `domains` (string array) - The domains to sort by; each entry will have its own output file (e.g. `dropbox.com.json`, `discord.gg.json`, `mega.nz.json`); files that do not match these domains will be put in `unknown.json`

## Cleaning
There are two subcommands for cleaning:
- `clean` - Recursively removes the configured output directory
- `cleanall` - Recursively removes the configured input AND output directories

## License
ISC