(function () {
  'use strict';

  const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwy0Ha0qbJjRBAHSyXrnrpZjsqLj2s__M5s44EfCY7yusrHkNuBx6GLqH506X3GABN4/exec',
    SHEET_ID: '1ToHqHBcKRMVL7t6Ud2gdiqC9PX6OVDKGnp7fLoE5pjw'
  };
  const form = document.getElementById('f');
  const input = document.getElementById('curp');
  const count = document.getElementById('count');
  const errorMessage = document.getElementById('curp-err');
  const button = document.getElementById('go');
  const out = document.getElementById('out');
  const curpPattern = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
  let activeRequest = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function value(data) {
    return data == null || String(data).trim() === '' ? 'Sin dato' : String(data).trim();
  }

  function normalize(rows) {
    if (!Array.isArray(rows)) throw new Error('Resultados inválidos.');
    return rows.map(function (row) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('Constancia inválida.');
      }
      return {
        folio: value(row.folio), nombre: value(row.nombre),
        curso: value(row.curso), url: value(row.url)
      };
    });
  }

  async function fetchResults(curp, signal) {
    const query = "select B,F,J,N where I contains '" + curp + "'";
    const url = CONFIG.APPS_SCRIPT_URL
      ? CONFIG.APPS_SCRIPT_URL + '?curp=' + encodeURIComponent(curp)
      : 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID +
        '/gviz/tq?tqx=out:json&tq=' + encodeURIComponent(query);
    const response = await fetch(url, { method: 'GET', signal: signal });
    if (!response.ok) throw new Error('Error HTTP ' + response.status);
    if (CONFIG.APPS_SCRIPT_URL) {
      const json = await response.json();
      if (!json || json.ok !== true) {
        throw new Error(json && json.error ? String(json.error) : 'Respuesta inválida.');
      }
      return normalize(json.resultados);
    }
    const text = (await response.text()).trim();
    const start = text.indexOf('(');
    if (start < 0 || !text.endsWith(');')) throw new Error('Respuesta inválida.');
    const json = JSON.parse(text.slice(start + 1, -2));
    if (!json || json.status !== 'ok' || !json.table || !Array.isArray(json.table.rows)) {
      throw new Error('Respuesta de Google Visualization inválida.');
    }
    return normalize(json.table.rows.map(function (row) {
      if (!row || !Array.isArray(row.c)) throw new Error('Fila inválida.');
      const cells = row.c;
      return {
        folio: cells[0] && cells[0].v, nombre: cells[1] && cells[1].v,
        curso: cells[2] && cells[2].v, url: cells[3] && cells[3].v
      };
    }));
  }

  function safeUrl(raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === 'https:' &&
          (url.host === 'drive.google.com' || url.host === 'docs.google.com')) return url.href;
    } catch (_) {
      // Una URL ausente o inválida indica que la constancia sigue en emisión.
    }
    return null;
  }

  function renderResults(rows) {
    const card = element('div', 'card fade');
    const head = element('div', 'res-head');
    const title = element('h2', '', rows.length === 1
      ? '1 constancia encontrada' : rows.length + ' constancias encontradas');
    title.setAttribute('tabindex', '-1');
    head.append(title, element('span', 'who', 'A nombre de ' + rows[0].nombre));
    const list = element('ul', 'list');
    rows.forEach(function (row) {
      const url = safeUrl(row.url);
      const item = element('li', 'item');
      const meta = element('div', 'meta');
      meta.append(element('span', 'folio', 'Folio ' + row.folio),
        element('span', 'chip ' + (url ? 'ok' : 'wait'), url ? 'Disponible' : 'En emisión'));
      const act = element('div', 'act');
      if (url) {
        const link = element('a', 'link-btn', 'Ver constancia ');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const arrow = element('span', '', '↗');
        arrow.setAttribute('aria-hidden', 'true');
        link.append(arrow, element('span', 'sr', '(se abre en otra pestaña)'));
        act.append(link);
      } else {
        act.append(element('span', 'pending', 'Estará disponible al concluir la emisión.'));
      }
      item.append(element('h3', '', row.curso), meta, act);
      list.append(item);
    });
    card.append(head, list);
    out.replaceChildren(card);
    return title;
  }

  function renderEmpty() {
    const card = element('div', 'card empty fade');
    const title = element('h2', '', 'No encontramos constancias con esta CURP');
    title.setAttribute('tabindex', '-1');
    const list = element('ul');
    list.append(element('li', '', 'Revisa que la CURP sea la misma que registraste al inscribirte.'),
      element('li', '', 'Si el curso terminó hace poco, la constancia puede seguir en proceso.'));
    const contactItem = element('li', '', 'Si el problema continúa, escribe al CRECE desde la página de ');
    const link = element('a', '', 'contacto');
    link.href = 'https://dep.edu.mx/contacto.html';
    contactItem.append(link, document.createTextNode(' con tu nombre y el curso.'));
    list.append(contactItem);
    card.append(title, list);
    out.replaceChildren(card);
    return title;
  }

  function renderError() {
    const alert = element('div', 'alert fade');
    alert.setAttribute('role', 'alert');
    const paragraph = element('p');
    paragraph.append(element('strong', '', 'No pudimos conectar con el registro de constancias.'),
      document.createTextNode(' Revisa tu conexión e intenta de nuevo en unos minutos.'));
    alert.append(paragraph);
    out.replaceChildren(alert);
  }

  function clearError() {
    errorMessage.hidden = true;
    errorMessage.textContent = '';
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', 'curp-help');
  }

  function updateInput() {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
    count.textContent = input.value.length + '/18';
    clearError();
  }

  function restoreButton() {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = 'Buscar constancias';
  }

  input.addEventListener('input', updateInput);
  updateInput();
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (activeRequest) {
      activeRequest.controller.abort();
      activeRequest = null;
      restoreButton();
    }
    updateInput();
    const curp = input.value;
    if (!curpPattern.test(curp)) {
      out.replaceChildren();
      errorMessage.textContent = curp.length < 18
        ? 'La CURP debe tener 18 caracteres. Te faltan ' + (18 - curp.length) + '.'
        : 'Revisa la CURP: el formato no es válido.';
      errorMessage.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'curp-help curp-err');
      input.focus();
      return;
    }
    const request = { controller: new AbortController(), timedOut: false };
    activeRequest = request;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const spinner = element('span', 'spin');
    spinner.setAttribute('aria-hidden', 'true');
    button.replaceChildren(spinner, document.createTextNode('Buscando…'));
    out.replaceChildren(element('p', 'status', 'Buscando constancias…'));
    let heading = null;
    let timer;
    try {
      const timeout = new Promise(function (_, reject) {
        timer = setTimeout(function () {
          request.timedOut = true;
          request.controller.abort();
          reject(new Error('La consulta superó el límite de 15 segundos.'));
        }, 15000);
      });
      const rows = await Promise.race([fetchResults(curp, request.controller.signal), timeout]);
      if (activeRequest !== request) return;
      heading = rows.length ? renderResults(rows) : renderEmpty();
    } catch (error) {
      if (activeRequest !== request) return;
      console.error('Error al consultar constancias:', error);
      renderError();
    } finally {
      clearTimeout(timer);
      if (activeRequest === request) {
        activeRequest = null;
        restoreButton();
        if (heading) heading.focus();
      }
    }
  });
})();
