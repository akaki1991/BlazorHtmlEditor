let editors = {};
let dotNetRefs = {};

export function initializeEditor(editorId, showToolbar, dotNetRef) {
    // Store the .NET reference for callbacks
    dotNetRefs[editorId] = dotNetRef;

    // Configure toolbar based on parameter
    const toolbarOptions = showToolbar ? [
        ['bold', 'italic', 'underline'],
        [{ 
            'header': [1, 2, 3, false]
        }],
        ['link', 'image'],
        ['table']
    ] : false;

    // Initialize Quill editor
    const quill = new Quill(`#${editorId}`, {
        theme: 'snow',
        modules: {
            toolbar: {
                container: toolbarOptions,
                handlers: {
                    'link': function(value) {
                        if (value) {
                            const url = prompt('Enter the URL:');
                            if (url) {
                                const range = this.quill.getSelection();
                                if (range) {
                                    // Ensure the URL has a protocol
                                    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') 
                                        ? url 
                                        : `https://${url}`;
                                    
                                    // Apply the link format
                                    this.quill.format('link', formattedUrl);
                                    
                                    // Ensure the link is clickable by adding target="_blank"
                                    const linkElement = this.quill.root.querySelector(`a[href="${formattedUrl}"]`);
                                    if (linkElement) {
                                        linkElement.setAttribute('target', '_blank');
                                        linkElement.setAttribute('rel', 'noopener noreferrer');
                                    }
                                }
                            }
                        } else {
                            this.quill.format('link', false);
                        }
                    },
                    'table': function() {
                        const range = this.quill.getSelection();
                        if (range) {
                            const tableHTML = `
                            <table border="1" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">
                                <thead>
                                    <tr>
                                        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;">Header 1</th>
                                        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;">Header 2</th>
                                        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;">Header 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 1</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 2</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 3</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 4</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 5</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">Cell 6</td>
                                    </tr>
                                </tbody>
                            </table>`;

                            this.quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
                        }
                    }
                }
            }
        },
        placeholder: 'Start writing your HTML content...'
    });

    // Customize header labels
    const headerPicker = quill.getModule('toolbar').container.querySelector('.ql-header');
    if (headerPicker) {
        const options = headerPicker.querySelector('.ql-picker-options');
        if (options) {
            const items = options.querySelectorAll('.ql-picker-item');
            items.forEach(item => {
                const value = item.getAttribute('data-value');
                if (value === '1') item.textContent = 'Heading 1';
                else if (value === '2') item.textContent = 'Heading 2';
                else if (value === '3') item.textContent = 'Heading 3';
                else if (value === 'false') item.textContent = 'Normal';
            });
        }
    }

    // Add click handler for links
    quill.root.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
            e.preventDefault();
            window.open(link.href, '_blank', 'noopener,noreferrer');
        }
    });

    // Store editor instance
    editors[editorId] = quill;

    // Set up content change listener
    quill.on('text-change', function (delta, oldDelta, source) {
        if (source === 'user') {
            const htmlContent = quill.root.innerHTML;
            dotNetRef.invokeMethodAsync('OnContentChanged', htmlContent);
        }
    });

    // Add intellisense support (bonus feature)
    addIntellisenseSupport(quill);
}

export function setContent(editorId, content) {
    const editor = editors[editorId];
    if (editor && content) {
        editor.root.innerHTML = content;
    }
}

export function insertText(editorId, text) {
    const editor = editors[editorId];
    if (editor) {
        const selection = editor.getSelection();
        const index = selection ? selection.index : editor.getLength();
        editor.insertText(index, text);
        editor.setSelection(index + text.length);
    }
}

export function destroyEditor(editorId) {
    if (editors[editorId]) {
        delete editors[editorId];
        delete dotNetRefs[editorId];
    }
}

// Bonus: Basic intellisense support
function addIntellisenseSupport(quill) {
    const htmlTags = [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
        'form', 'input', 'button', 'select', 'option', 'textarea',
        'nav', 'header', 'footer', 'section', 'article', 'aside'
    ];

    quill.keyboard.addBinding({
        key: '<',
        handler: function (range, context) {
            // Insert the < character
            quill.insertText(range.index, '<');

            // Create autocomplete suggestions
            setTimeout(() => {
                showAutoComplete(quill, range.index + 1, htmlTags);
            }, 10);

            return false;
        }
    });
}

function showAutoComplete(quill, index, suggestions) {
    // This is a basic implementation - in a full version you'd want
    // a more sophisticated autocomplete UI
    const text = quill.getText(index, 10);
    const match = text.match(/^([a-zA-Z]*)/);

    if (match && match[1]) {
        const partial = match[1].toLowerCase();
        const matches = suggestions.filter(tag =>
            tag.toLowerCase().startsWith(partial)
        );

        if (matches.length > 0) {
            // For simplicity, auto-complete with the first match
            const completion = matches[0].substring(partial.length);
            quill.insertText(index + partial.length, completion + '>');
        }
    }
}

// Helper function for getting bounding rectangles
window.getBoundingClientRect = function (element) {
    return element.getBoundingClientRect();
};