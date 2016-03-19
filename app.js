var fs = require('fs');
var Hackpad = require('hackpad');
var to_markdown = require('to-markdown');
var east_asian = require('east-asian-width');

// Load configuration files
var settings = {};
try {
    settings = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (e) {
    console.error('Config file (API key and secret) missing.');
    throw e;
}

var hackpad = new Hackpad(settings.client_id, settings.secret, { site: 'ntusa' });

function fetch(pad_id, callback) {
    hackpad.export(pad_id, '', 'html', function(e, data) {
        if (e) {
            console.log('Cannot acquire pad #' + pad_id);
        } else {
            callback(data);
        }
    });
}

function convert(data) {
    // Preprocess Hackpad soup
    var data = data.replace(/(<a href=[^>]+)\/>/gi, '$1>')
                   .replace(/<a href=[^>]+>\s*<\/a>/gi, '')
                   .replace(/<\/?u>/gi, '')
                   .replace(/(&nbsp;)+/g, ' ')

    // Convert to Markdown
    var text = to_markdown(data, {
        converters: [
            {
                filter: function(node) {
                    return node.nodeName == 'UL' && (/none/i.test(node.style.listStyle));
                },
                replacement: function(content, node) {
                    function _parse(node, indent_level) {
                        var buf = '';
                        for (var index = 0; index < node.childNodes.length; index++) {
                            var i = node.childNodes[index];
                            if (i.nodeName == '#text') {
                                var content = node.textContent.trim();
                                if (content) {
                                    buf += (' '.repeat(indent_level) + content + '\n');
                                }
                            } else {
                                buf += _parse(i, indent_level + 4);
                            }
                        }
                        return buf;
                    }

                    return _parse(node, 0);
                }
            },
            {
                filter: function(node) {
                    return node.nodeName == 'UL' && (/comment/i.test(node.className));
                },
                replacement: function(content, node) {
                    return '// ' + node.textContent;
                }
            },
            {
                filter: function(node) {
                    return node.nodeName == 'A' && node.textContent == node.href;
                },
                replacement: function(content, node) {
                    return node.textContent;
                }
            },
            {
                filter: function(node) {
                    return node.nodeName == 'A' && node.href.startsWith('/');
                },
                replacement: function(content, node) {
                    var href = node.href.replace(/^\/[A-Za-z0-9\-]+--/g, 'https://ntusa.hackpad.com/');
                    return `[${node.textContent}](${href})`;
                }
            }
        ]
    });

    // Postprocess
    text = text.replace(/    /g, '  ')
               .replace(/   /g, ' ')
               .replace(/^\*\*(.+)\*\*$/gm, '【$1】')

    return text;
}

function wrap(text) {
    // Hard-wrap
    var buffer = '';
    var start_index = 0, length = 0;
    var indent = 0, has_indent = false;
    for (var i = 0; i < text.length; i++) {
        var char = text.codePointAt(i);
        var width = east_asian.cjk_char_width(char);
        if (char == 0x0a) { // Line break
            // Start a new line
            buffer += text.substring(start_index, i+1);
            start_index = i + 1;
            length = 0;

            // Reset indent
            indent = 0;
            has_indent = false;
        } else if ((length + width) >= 70) { // Manual wrapping
            // Start a new line
            buffer += text.substring(start_index, i+1) + '\n';
            start_index = i + 1;

            // Append indent
            if (indent > 0)
                buffer += ' '.repeat(indent + 2)
            length = indent + 2;
        } else {
            // Calculate indent
            if (!has_indent)
                if (char == 0x20)
                    indent++;
                else
                    has_indent = true;

            length += width;
        }
    }

    return buffer;
}

function export_file(pad_id) {
    fetch(pad_id, function(data) {
        if (data) {
            var text = convert(data);
            var wrapped_text = wrap(text);
            fs.writeFile('pads/' + pad_id + '.md', wrapped_text);
        }
    });
}

process.argv.slice(2).forEach(function(val, i, array) {
    if (/[A-Za-z0-9]{10,}/gi.test(val))
        export_file(val);
});

module.exports = {
    fetch: fetch,
    convert: convert,
    wrap: wrap,
    export_file: export_file
};
