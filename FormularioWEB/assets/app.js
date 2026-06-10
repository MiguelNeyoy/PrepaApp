(function () {
  var catalogos = window.PORTAL_CATALOGOS || { carreras: [] };
  var customSelects = [];
  var nivel = document.getElementById('nivel_id');
  var facultad = document.getElementById('facultad_codigo');
  var carrera = document.getElementById('carrera_id');

  function selectLabel(select) {
    if (!select || select.selectedIndex < 0) return '';
    return select.options[select.selectedIndex].textContent || '';
  }

  function closeAll(except) {
    customSelects.forEach(function (item) {
      if (item !== except) {
        item.root.classList.remove('is-open');
      }
    });
  }

  function buildCustomSelect(select) {
    if (!select || select.getAttribute('data-enhanced') === 'true') return null;

    select.setAttribute('data-enhanced', 'true');
    select.classList.add('native-select');

    var root = document.createElement('div');
    root.className = 'custom-select';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-select-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');

    var value = document.createElement('div');
    value.className = 'custom-select-value';

    var chevron = document.createElement('div');
    chevron.className = 'custom-select-chevron';
    chevron.textContent = 'v';

    button.appendChild(value);
    button.appendChild(chevron);

    var menu = document.createElement('div');
    menu.className = 'custom-select-menu';

    var search = document.createElement('input');
    search.type = 'search';
    search.className = 'custom-select-search';
    search.placeholder = 'Buscar...';
    search.setAttribute('autocomplete', 'off');

    var list = document.createElement('div');
    list.className = 'custom-select-list';
    list.setAttribute('role', 'listbox');

    menu.appendChild(search);
    menu.appendChild(list);
    root.appendChild(button);
    root.appendChild(menu);

    select.parentNode.insertBefore(root, select.nextSibling);

    var instance = {
      select: select,
      root: root,
      button: button,
      value: value,
      search: search,
      list: list
    };
    customSelects.push(instance);

    button.addEventListener('click', function () {
      var open = !root.classList.contains('is-open');
      closeAll(instance);
      root.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        search.value = '';
        renderCustomOptions(instance);
        window.setTimeout(function () { search.focus(); }, 0);
      }
    });

    search.addEventListener('input', function () {
      renderCustomOptions(instance);
    });

    select.addEventListener('change', function () {
      syncCustomSelect(select);
    });

    syncCustomSelect(select);
    return instance;
  }

  function renderCustomOptions(instance) {
    var select = instance.select;
    var query = instance.search.value.toLowerCase();
    instance.list.innerHTML = '';

    Array.prototype.forEach.call(select.options, function (option) {
      var label = option.textContent || '';
      if (query && label.toLowerCase().indexOf(query) === -1) return;

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'custom-select-option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
      item.textContent = label;

      if (option.value === '') {
        item.classList.add('is-placeholder');
      }

      item.addEventListener('click', function () {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        instance.root.classList.remove('is-open');
        instance.button.setAttribute('aria-expanded', 'false');
      });

      instance.list.appendChild(item);
    });

    if (!instance.list.children.length) {
      var empty = document.createElement('div');
      empty.className = 'custom-select-empty';
      empty.textContent = 'Sin resultados';
      instance.list.appendChild(empty);
    }
  }

  function syncCustomSelect(select) {
    customSelects.forEach(function (instance) {
      if (instance.select !== select) return;
      var label = selectLabel(select);
      instance.value.textContent = label || 'Seleccionar...';
      instance.value.classList.toggle('is-placeholder', !select.value);
      renderCustomOptions(instance);
    });
  }

  function syncAllCustomSelects() {
    customSelects.forEach(function (instance) {
      syncCustomSelect(instance.select);
    });
  }

  function clearCarreras(message) {
    carrera.innerHTML = '';
    var option = document.createElement('option');
    option.value = '';
    option.textContent = message;
    carrera.appendChild(option);
  }

  function renderCarreras() {
    if (!nivel || !facultad || !carrera) return;
    var nivelId = nivel.value;
    var facultadCodigo = facultad.value;
    var selected = carrera.getAttribute('data-selected') || '';

    if (!nivelId || !facultadCodigo) {
      clearCarreras('Selecciona nivel y facultad primero');
      syncAllCustomSelects();
      return;
    }

    var carreras = (catalogos.carreras || []).filter(function (item) {
      return String(item.nivel_id) === nivelId && String(item.facultad_codigo) === facultadCodigo;
    });

    clearCarreras(carreras.length ? 'Seleccionar carrera' : 'No hay carreras disponibles');
    carreras.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.nombre;
      if (selected && selected === String(item.id)) {
        option.selected = true;
      }
      carrera.appendChild(option);
    });

    syncAllCustomSelects();
  }

  function formatGeneration(input) {
    var digits = input.value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) {
      input.value = digits.slice(0, 4) + '-' + digits.slice(4);
    } else {
      input.value = digits;
    }
  }

  function formatMatricula(input) {
    var digits = input.value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 7) {
      input.value = digits.slice(0, 7) + '-' + digits.slice(7);
    } else {
      input.value = digits;
    }
  }

  function formatDigitsOnly(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 20);
  }

  Array.prototype.forEach.call(document.querySelectorAll('select'), function (select) {
    buildCustomSelect(select);
  });

  if (nivel && facultad && carrera) {
    nivel.addEventListener('change', function () {
      carrera.setAttribute('data-selected', '');
      renderCarreras();
    });
    facultad.addEventListener('change', function () {
      carrera.setAttribute('data-selected', '');
      renderCarreras();
    });
    renderCarreras();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.generation'), function (input) {
    input.addEventListener('input', function () {
      formatGeneration(input);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.matricula'), function (input) {
    formatMatricula(input);
    input.addEventListener('input', function () {
      formatMatricula(input);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.digits-only'), function (input) {
    formatDigitsOnly(input);
    input.addEventListener('input', function () {
      formatDigitsOnly(input);
    });
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    var inside = customSelects.some(function (instance) {
      return instance.root.contains(target);
    });
    if (!inside) {
      closeAll(null);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAll(null);
    }
  });
})();
