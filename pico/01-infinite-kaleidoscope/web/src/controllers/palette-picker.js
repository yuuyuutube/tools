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
  const options = palettes.map((palette) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'palette-option';
    option.setAttribute('role', 'option');
    option.tabIndex = -1;

    const swatches = document.createElement('span');
    swatches.className = 'swatches';
    swatches.setAttribute('aria-hidden', 'true');
    paintSwatches(swatches, palette.colors);
    const name = document.createElement('span');
    name.textContent = palette.name;
    const check = document.createElementNS(svgNamespace, 'svg');
    check.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNamespace, 'use');
    use.setAttribute('href', './icons.svg#check');
    check.append(use);

    option.append(swatches, name, check);
    option.addEventListener('click', () => {
      onSelect(palette.id);
      close(true);
    });
    return option;
  });
  list.append(...options);

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

  return {
    close,
    select(id) {
      selectedIndex = palettes.findIndex((palette) => palette.id === id);
      const palette = palettes[selectedIndex];
      if (current) paintSwatches(current, palette.colors);
      toggle.setAttribute('aria-label', label + ': ' + palette.name);
      toggle.dataset.tooltip = palette.name;
      options.forEach((option, index) => {
        option.setAttribute('aria-selected', index === selectedIndex);
      });
    },
  };
}
