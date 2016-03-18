var fs = require('fs');
var Hackpad = require('hackpad');
var to_markdown = require('to-markdown');

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
            fs.writeFile(padId + '.md', marked_data);
        }
    });
}

module.exports = fetch;
