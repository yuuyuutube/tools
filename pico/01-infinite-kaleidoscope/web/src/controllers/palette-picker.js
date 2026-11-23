const svgNamespace = 'http://www.w3.org/2000/svg';

function paintSwatches(container, colors) {
  container.replaceChildren(...colors.map((color) => {
    const swatch = document.createElement('span');
    swatch.style.backgroundColor = color;
    return swatch;
  }));
}

export function createPalettePicker(root, palettes, onSelect, onOpen, label = 'Color palette') {
  const toggle = root.querySelector('button');
  const list = root.querySelector('[role="listbox"]');
  const current = toggle.querySelector('.swatches');
  let selectedIndex = 0;
  let options;
  let entries;
  let activeLabel;
  function setOptions(next, nextLabel = label) {
    close();
    entries = next;
    activeLabel = nextLabel;
    selectedIndex = 0;
    list.setAttribute('aria-label', activeLabel);
    options = next.map(makeOption);
    list.replaceChildren(...options);
    select(next[0].id);
  }

  function makeOption(palette) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'palette-option';
    option.setAttribute('role', 'option');
    option.tabIndex = -1;

    const swatches = document.createElement('span');
    swatches.className = 'swatches';
    swatches.setAttribute('aria-hidden', 'true');
    if (palette.colors) paintSwatches(swatches, palette.colors);
    const name = document.createElement('span');
    name.textContent = palette.name;
    const check = document.createElementNS(svgNamespace, 'svg');
    check.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNamespace, 'use');
    use.setAttribute('href', './icons.svg#check');
    check.append(use);

    if (palette.colors) option.append(swatches);
    else option.classList.add('name-only-option');
    option.append(name, check);
    option.addEventListener('click', () => {
      onSelect(palette.id);
      close(true);
    });
    return option;
  }

  function open() {
    onOpen();
    list.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    options[selectedIndex].focus();
  }

  function close(returnFocus = false) {
    if (list.hidden) return;
    list.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (list.hidden) open();
    else close(true);
  });
  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open();
  });
  list.addEventListener('keydown', (event) => {
    const index = options.indexOf(event.target);
    let next;
    if (event.key === 'Escape') close(true);
    else if (event.key === 'ArrowDown') next = Math.min(index + 1, options.length - 1);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    if (next !== undefined) options[next].focus();
  });
  root.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !root.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) close();
  });

  function select(id) {
    selectedIndex = entries.findIndex((entry) => entry.id === id);
    const selected = entries[selectedIndex];
    if (current) paintSwatches(current, selected.colors);
    toggle.setAttribute('aria-label', activeLabel + ': ' + selected.name);
    toggle.dataset.tooltip = selected.name;
    options.forEach((option, index) => {
      option.setAttribute('aria-selected', index === selectedIndex);
    });
  }

  setOptions(palettes);
  return { close, select, setOptions };
}
