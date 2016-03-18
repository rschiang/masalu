var fs = require('fs');
var Hackpad = require('hackpad');
var to_markdown = require('to-markdown');
var east_asian = require('east-asian-width');

// Load configuration files
var settings = {};
fs.readFile('config.json', 'utf8', function(e, data) {
    if (e) {
        console.log('Config file (API key and secret) missing.');
    } else {
        settings = JSON.parse(data);
    }
});

function fetch(padId) {
    var hackpad = new Hackpad(settings.client_id, settings.secret, { site: 'ntusa' });
    hackpad.export(padId, '', 'html', function(e, data) {
        if (e) {
            console.log('Cannot acquire pad #' + padId);
        } else {
            var marked_data = to_markdown(data);
            var buffer = '';
            var start_index = 0, length = 0;
            for (var i = 0; i < marked_data.length; i++) {
                var char = marked_data.codePointAt(i);
                var width = east_asian.cjk_char_width(char);
                if (char == 10 || (length + width) >= 70) { // Line break or wrapping
                    buffer += marked_data.substring(start_index, char == 10 ? i : i+1) + '\n';
                    start_index = i + 1;
                    length = 0;
                } else {
                    length += width;
                }
            }

            fs.writeFile(padId + '.md', buffer);
        }
    });
}

module.exports = fetch;
