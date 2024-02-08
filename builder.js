import { nextTick, ref, watch } from 'https://esm.sh/vue@3/dist/vue.esm-browser.prod.js';
import autosize from 'https://esm.sh/autosize@6.0.1';
import Tribute from 'https://esm.sh/gh/zurb/tribute@252ec344a7';

document.getElementById('bricks-builder-iframe').addEventListener('load', function () {
    const bricksIframe = this;

    const vueGlobalProp = document.querySelector('.brx-body').__vue_app__.config.globalProperties;
    const vueGlobalPropIframe = bricksIframe.contentDocument.querySelector('.brx-body').__vue_app__.config.globalProperties;

    const textInput = document.createElement('textarea');
    textInput.classList.add('yos-brx-plain-classes-input');
    textInput.setAttribute('rows', '1');
    textInput.setAttribute('spellcheck', 'false');

    const visibleElementPanel = ref(false);
    const activeElementId = ref(null);

    let hit = null; // highlight any text except spaces and new lines

    autosize(textInput);

    let autocompleteItems = [];

    wp.hooks.addAction('yos-brx-plain-classes-autocomplete-items-refresh', 'yos_brx_plain_classes', () => {
        // wp hook filters. {value, color?, fontWeight?, namespace?}[]
        autocompleteItems = wp.hooks.applyFilters('yos-brx-plain-classes-autocomplete-items', [], textInput.value);
    });

    wp.hooks.doAction('yos-brx-plain-classes-autocomplete-items-refresh');

    const tribute = new Tribute({
        containerClass: 'yos-brx-plain-classes-tribute-container',

        autocompleteMode: true,

        // Limits the number of items in the menu
        menuItemLimit: 25,

        noMatchTemplate: '',

        values: async function (text, cb) {
            const filters = await wp.hooks.applyFilters('yos-brx-plain-classes-autocomplete-items-query', autocompleteItems, text);
            cb(filters);
        },

        lookup: 'value',

        itemClass: 'class-item',

        // template
        menuItemTemplate: function (item) {
            let customStyle = '';

            if (item.original.color !== undefined) {
                customStyle += `background-color: ${item.original.color};`;
            }

            if (item.original.fontWeight !== undefined) {
                customStyle += `font-weight: ${item.original.fontWeight};`;
            }

            return `
                <span class="class-name" data-tribute-class-name="${item.original.value}">${item.string}</span>
                <span class="class-hint" style="${customStyle}"></span>
            `;
        },
    });

    tribute.setMenuContainer = function (el) {
        this.menuContainer = el;
    };

    const tributeEventCallbackOrigFn = tribute.events.callbacks;

    tribute.events.callbacks = function () {
        return {
            ...tributeEventCallbackOrigFn.call(this),
            up: (e, el) => {
                // navigate up ul
                if (this.tribute.isActive && this.tribute.current.filteredItems) {
                    e.preventDefault();
                    e.stopPropagation();
                    let count = this.tribute.current.filteredItems.length,
                        selected = this.tribute.menuSelected;

                    if (count > selected && selected > 0) {
                        this.tribute.menuSelected--;
                        this.setActiveLi();
                    } else if (selected === 0) {
                        this.tribute.menuSelected = count - 1;
                        this.setActiveLi();
                        this.tribute.menu.scrollTop = this.tribute.menu.scrollHeight;
                    }
                    previewTributeEventCallbackUpDown();
                }
            },
            down: (e, el) => {
                // navigate down ul
                if (this.tribute.isActive && this.tribute.current.filteredItems) {
                    e.preventDefault();
                    e.stopPropagation();
                    let count = this.tribute.current.filteredItems.length - 1,
                        selected = this.tribute.menuSelected;

                    if (count > selected) {
                        this.tribute.menuSelected++;
                        this.setActiveLi();
                    } else if (count === selected) {
                        this.tribute.menuSelected = 0;
                        this.setActiveLi();
                        this.tribute.menu.scrollTop = 0;
                    }
                    previewTributeEventCallbackUpDown();
                }
            },
        };
    };

    tribute.attach(textInput);

    const observer = new MutationObserver(function (mutations) {

        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes') {
                if (mutation.target.id === 'bricks-panel-element' && mutation.attributeName === 'style') {
                    if (mutation.target.style.display !== 'none') {
                        visibleElementPanel.value = true;
                    } else {
                        visibleElementPanel.value = false;
                    }
                } else if ('placeholder' === mutation.attributeName && 'INPUT' === mutation.target.tagName && mutation.target.classList.contains('placeholder')) {
                    activeElementId.value = vueGlobalProp.$_activeElement.value.id;
                }
            } else if (mutation.type === 'childList') {
                if (mutation.addedNodes.length > 0) {

                    if (mutation.target.id === 'bricks-panel-sticky' && mutation.addedNodes[0].id === 'bricks-panel-element-classes') {
                        activeElementId.value = vueGlobalProp.$_activeElement.value.id;
                    } else if (mutation.target.dataset && mutation.target.dataset.controlkey === '_cssClasses' && mutation.addedNodes[0].childNodes.length > 0) {
                        document.querySelector('#_cssClasses').addEventListener('input', function (e) {
                            nextTick(() => {
                                textInput.value = e.target.value;
                                onTextInputChanges();
                            });
                        });
                    }
                }
            }
        });
    });

    observer.observe(document.getElementById('bricks-panel-element'), {
        subtree: true,
        attributes: true,
        childList: true,
    });

    watch([activeElementId, visibleElementPanel], (newVal, oldVal) => {
        if (newVal[0] !== oldVal[0]) {
            nextTick(() => {
                textInput.value = vueGlobalProp.$_activeElement.value.settings._cssClasses || '';
                onTextInputChanges();
            });
        }

        if (newVal[0] && newVal[1]) {
            nextTick(() => {
                const panelElementClassesEl = document.querySelector('#bricks-panel-element-classes');
                if (panelElementClassesEl.querySelector('.yos-brx-plain-classes-input') === null) {
                    panelElementClassesEl.appendChild(textInput);
                    hit = new HighlightInTextarea(textInput, {
                        highlight: [
                            {
                                highlight: /(?<=\s|^)(?:(?!\s).)+(?=\s|$)/g,
                                className: 'word',
                            },
                            {
                                highlight: /(?<=\s)\s/g,
                                className: 'multispace',
                                blank: true,
                            },
                        ],
                    });

                }
            });
        }
    });

    textInput.addEventListener('input', function (e) {
        vueGlobalProp.$_activeElement.value.settings._cssClasses = e.target.value;
    });

    function onTextInputChanges() {
        nextTick(() => {
            try {
                hit.handleInput();
            } catch (error) { }
            autosize.update(textInput);
            // tribute.setMenuContainer(document.querySelector('div.hit-container'));
            tribute.hideMenu();
        });
    };

    const observerAutocomplete = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    const className = node.querySelector('.class-name').dataset.tributeClassName;

                    node.addEventListener('mouseenter', (e) => {
                        previewAddClass(className);
                    });

                    node.addEventListener('mouseleave', (e) => {
                        previewResetClass();
                    });

                    node.addEventListener('click', (e) => {
                        previewResetClass();
                    });
                });
            }
        });
    });

    let menuAutocompleteItemeEl = null;

    textInput.addEventListener('tribute-active-true', function (e) {
        if (menuAutocompleteItemeEl === null) {
            menuAutocompleteItemeEl = document.querySelector('.yos-brx-plain-classes-tribute-container>ul');
        }
        nextTick(() => {
            if (menuAutocompleteItemeEl) {
                observerAutocomplete.observe(menuAutocompleteItemeEl, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        });
    });

    function previewAddClass(className) {
        const elementNode = vueGlobalPropIframe.$_getElementNode(vueGlobalPropIframe.$_activeElement.value);
        elementNode.classList.add(className);
    }

    function previewResetClass() {
        const activeEl = vueGlobalPropIframe.$_activeElement.value;
        const elementNode = vueGlobalPropIframe.$_getElementNode(activeEl);
        const elementClasses = vueGlobalPropIframe.$_getElementClasses(activeEl);
        elementNode.classList.value = elementClasses.join(' ');
    }

    function previewTributeEventCallbackUpDown() {
        let li = tribute.menu.querySelector('li.highlight>span.class-name');
        const activeEl = vueGlobalPropIframe.$_activeElement.value;
        const elementNode = vueGlobalPropIframe.$_getElementNode(activeEl);
        const elementClasses = vueGlobalPropIframe.$_getElementClasses(activeEl);
        elementNode.classList.value = elementClasses.join(' ') + ' ' + li.dataset.tributeClassName;
    }
});

// @source: https://esm.sh/highlight-in-textarea@1.1.0/src/highlight-in-textarea.js?raw
function HighlightInTextarea(el, config) {
    this.init(el, config);
};

HighlightInTextarea.instance = function (el, config) {
    return new HighlightInTextarea(el, config);
};

HighlightInTextarea.prototype = {
    ID: 'hit',

    init: function (el, config) {

        if (typeof el === 'string') {
            this.el = document.querySelector(el);
        } else {
            this.el = el;
        }

        if (this.getType(config) === 'custom') {
            this.highlight = config;
            this.generate();
        } else {
            console.error('valid config object not provided');
        }
    },

    // returns identifier strings that aren't necessarily "real" JavaScript types
    getType: function (instance) {
        let type = typeof instance;
        if (!instance) {
            return 'falsey';
        } else if (Array.isArray(instance)) {
            if (instance.length === 2 && typeof instance[0] === 'number' &&
                typeof instance[1] === 'number') {
                return 'range';
            } else {
                return 'array';
            }
        } else if (type === 'object') {
            if (instance instanceof RegExp) {
                return 'regexp';
            } else if (instance.hasOwnProperty('highlight')) {
                return 'custom';
            }
        } else if (type === 'function' || type === 'string') {
            return type;
        }

        return 'other';
    },

    generate: function () {
        this.el.classList.add(this.ID + '-input', this.ID + '-content');

        this.el.addEventListener('input', this.handleInput.bind(this));
        this.el.addEventListener('scroll', this.handleScroll.bind(this));

        this.highlights = document.createElement('div');
        this.highlights.classList.add(this.ID + '-highlights',
            this.ID + '-content');

        this.backdrop = document.createElement('div');
        this.backdrop.classList.add(this.ID + '-backdrop');
        this.backdrop.append(this.highlights);

        this.container = document.createElement('div');
        this.container.classList.add(this.ID + '-container');
        this.el.parentNode.insertBefore(this.container, this.el.nextSibling);

        this.container.append(this.backdrop);
        this.container.append(this.el); // moves el into container

        this.container.addEventListener('scroll',
            this.blockContainerScroll.bind(this));

        // trigger input event to highlight any existing input
        this.handleInput();
    },

    handleInput: function () {
        let input = this.el.value;
        let ranges = this.getRanges(input, this.highlight);
        let unstaggeredRanges = this.removeStaggeredRanges(ranges);
        let boundaries = this.getBoundaries(unstaggeredRanges);
        this.renderMarks(boundaries);
    },

    getRanges: function (input, highlight) {
        let type = this.getType(highlight);
        switch (type) {
            case 'array':
                return this.getArrayRanges(input, highlight);
            case 'function':
                return this.getFunctionRanges(input, highlight);
            case 'regexp':
                return this.getRegExpRanges(input, highlight);
            case 'string':
                return this.getStringRanges(input, highlight);
            case 'range':
                return this.getRangeRanges(input, highlight);
            case 'custom':
                return this.getCustomRanges(input, highlight);
            default:
                if (!highlight) {
                    // do nothing for falsey values
                    return [];
                } else {
                    console.error('unrecognized highlight type');
                }
        }
    },

    getArrayRanges: function (input, arr) {
        let ranges = arr.map(this.getRanges.bind(this, input));
        return Array.prototype.concat.apply([], ranges);
    },

    getFunctionRanges: function (input, func) {
        return this.getRanges(input, func(input));
    },

    getRegExpRanges: function (input, regex) {
        let ranges = [];
        let match;
        while (match = regex.exec(input), match !== null) {
            ranges.push([match.index, match.index + match[0].length]);
            if (!regex.global) {
                // non-global regexes do not increase lastIndex, causing an infinite loop,
                // but we can just break manually after the first match
                break;
            }
        }
        return ranges;
    },

    getStringRanges: function (input, str) {
        let ranges = [];
        let inputLower = input.toLowerCase();
        let strLower = str.toLowerCase();
        let index = 0;
        while (index = inputLower.indexOf(strLower, index), index !== -1) {
            ranges.push([index, index + strLower.length]);
            index += strLower.length;
        }
        return ranges;
    },

    getRangeRanges: function (input, range) {
        return [range];
    },

    getCustomRanges: function (input, custom) {
        let ranges = this.getRanges(input, custom.highlight);
        if (custom.className) {
            ranges.forEach(function (range) {
                // persist class name as a property of the array
                if (range.className) {
                    range.className = custom.className + ' ' + range.className;
                } else {
                    range.className = custom.className;
                }
            });
        }
        if (custom.blank) {
            ranges.forEach(function (range) {
                range.blank = custom.blank;
            });
        }

        return ranges;
    },

    // prevent staggered overlaps (clean nesting is fine)
    removeStaggeredRanges: function (ranges) {
        let unstaggeredRanges = [];
        ranges.forEach(function (range) {
            let isStaggered = unstaggeredRanges.some(function (unstaggeredRange) {
                let isStartInside = range[0] > unstaggeredRange[0] && range[0] <
                    unstaggeredRange[1];
                let isStopInside = range[1] > unstaggeredRange[0] && range[1] <
                    unstaggeredRange[1];
                return isStartInside !== isStopInside; // xor
            });
            if (!isStaggered) {
                unstaggeredRanges.push(range);
            }
        });
        return unstaggeredRanges;
    },

    getBoundaries: function (ranges) {
        let boundaries = [];
        ranges.forEach(function (range) {
            boundaries.push({
                type: 'start',
                index: range[0],
                className: range.className,
                blank: range.blank,
            });
            boundaries.push({
                type: 'stop',
                index: range[1],
            });
        });

        this.sortBoundaries(boundaries);
        return boundaries;
    },

    sortBoundaries: function (boundaries) {
        // backwards sort (since marks are inserted right to left)
        boundaries.sort(function (a, b) {
            if (a.index !== b.index) {
                return b.index - a.index;
            } else if (a.type === 'stop' && b.type === 'start') {
                return 1;
            } else if (a.type === 'start' && b.type === 'stop') {
                return -1;
            } else {
                return 0;
            }
        });
    },

    renderMarks: function (boundaries) {
        let input = this.el.value;
        boundaries.forEach(function (boundary, index) {
            let markup;
            if (boundary.type === 'start') {
                markup = '{{hit-mark-start|' + index + '}}';
            } else {
                markup = '{{hit-mark-stop}}';
            }
            input = input.slice(0, boundary.index) + markup + input.slice(boundary.index);
        });

        // this keeps scrolling aligned when input ends with a newline
        input = input.replace(/\n({{hit-mark-stop}})?$/, '\n\n$1');

        // encode HTML entities
        input = input.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // replace start tokens with opening <mark> tags with class name
        input = input.replace(/{{hit-mark-start\|(\d+)}}/g,
            function (match, subMatch) {
                const className = boundaries[+subMatch].className;
                if (className) {
                    return '<mark class="' + className + '">';
                } else {
                    return '<mark>';
                }
            });

        // replace stop tokens with closing </mark> tags
        input = input.replace(/{{hit-mark-stop}}/g, '</mark>');

        input += '<mark class="placeholder"> ⚡ </mark>';

        this.highlights.innerHTML = input;
    },

    handleScroll: function () {
        this.backdrop.scrollTop = this.el.scrollTop;

        // Chrome and Safari won't break long strings of spaces, which can cause
        // horizontal scrolling, this compensates by shifting highlights by the
        // horizontally scrolled amount to keep things aligned
        let scrollLeft = this.el.scrollLeft;

        if (scrollLeft > 0) {
            this.backdrop.style.transform = 'translateX(' + -scrollLeft + 'px)';
        } else {
            this.backdrop.style.transform = '';
        }
    },

    // in Chrome, page up/down in the textarea will shift stuff within the
    // container (despite the CSS), this immediately reverts the shift
    blockContainerScroll: function () {
        this.container.scrollLeft = 0;
    },

    destroy: function () {
        this.container.parentElement.replaceChild(this.el, this.container);
        this.el.classList.remove(this.ID + '-content', this.ID + '-input');
    },
};