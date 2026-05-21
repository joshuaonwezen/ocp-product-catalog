import {
  Function,
  Response,
  functions,
  getAppContext,
  storage,
} from '@zaiusinc/app-sdk';
import { Headers } from '@zaiusinc/app-sdk/dist/app/lib/Headers';

export class ProductUI extends Function {
  public async perform(): Promise<Response> {
    const trackerId = getAppContext().trackerId;
    const endpoints = await functions.getEndpoints();
    const apiBase = endpoints['product_api'];

    const secrets = await storage.secrets.get('api');
    const apiToken = (secrets?.apiToken as string) || '';

    const html = this.renderPage(apiBase, trackerId, apiToken);
    const response = new Response(200);
    response.headers = new Headers([
      ['Content-Type', 'text/html; charset=utf-8'],
    ]);
    response.body = html;
    return response;
  }

  private renderPage(
    apiBase: string, trackerId: string, apiToken: string
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Product Catalog</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
      Roboto, sans-serif;
    background: #f5f7fa; color: #333; padding: 24px;
  }
  h1 { font-size: 24px; margin-bottom: 20px; }
  .toolbar { display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 16px; }
  .btn {
    padding: 8px 16px; border: none; border-radius: 6px;
    cursor: pointer; font-size: 14px; font-weight: 500;
  }
  .btn-primary { background: #0037ff; color: #fff; }
  .btn-primary:hover { background: #0029cc; }
  .btn-danger { background: #e74c3c; color: #fff; }
  .btn-danger:hover { background: #c0392b; }
  .btn-secondary { background: #95a5a6; color: #fff; }
  .btn-secondary:hover { background: #7f8c8d; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  table {
    width: 100%; border-collapse: collapse;
    background: #fff; border-radius: 8px;
    overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1);
  }
  th, td { padding: 12px 16px; text-align: left; }
  th { background: #f0f2f5; font-weight: 600;
    font-size: 13px; color: #555; }
  tr:not(:last-child) td { border-bottom: 1px solid #eee; }
  tr:hover td { background: #fafbfc; }
  .badge {
    display: inline-block; padding: 2px 8px;
    border-radius: 12px; font-size: 12px; font-weight: 500;
  }
  .badge-yes { background: #d4edda; color: #155724; }
  .badge-no { background: #f8d7da; color: #721c24; }
  .actions { display: flex; gap: 6px; }
  .overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,.4); z-index: 100;
    justify-content: center; align-items: center;
  }
  .overlay.active { display: flex; }
  .modal {
    background: #fff; border-radius: 10px; padding: 24px;
    width: 500px; max-width: 95vw; max-height: 90vh;
    overflow-y: auto; box-shadow: 0 8px 30px rgba(0,0,0,.2);
  }
  .modal h2 { margin-bottom: 16px; font-size: 20px; }
  .form-group { margin-bottom: 14px; }
  .form-group label {
    display: block; margin-bottom: 4px;
    font-size: 13px; font-weight: 600; color: #555;
  }
  .form-group input, .form-group textarea, .form-group select {
    width: 100%; padding: 8px 10px; border: 1px solid #ccc;
    border-radius: 6px; font-size: 14px;
  }
  .form-group textarea { resize: vertical; min-height: 60px; }
  .form-actions {
    display: flex; gap: 8px; justify-content: flex-end;
    margin-top: 16px;
  }
  .toast {
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    border-radius: 8px; color: #fff; font-size: 14px;
    z-index: 200; opacity: 0; transition: opacity .3s;
  }
  .toast.show { opacity: 1; }
  .toast-success { background: #27ae60; }
  .toast-error { background: #e74c3c; }
  .empty {
    text-align: center; padding: 40px;
    color: #999; font-size: 16px;
  }
  .loading { text-align: center; padding: 40px; color: #999; }
</style>
</head>
<body>
<div class="toolbar">
  <h1>Product Catalog</h1>
  <button class="btn btn-primary" onclick="openCreate()">
    + New Product
  </button>
</div>
<div id="tableWrap"><div class="loading">Loading...</div></div>
<div id="overlay" class="overlay" onclick="closeOnOverlay(event)">
  <div class="modal">
    <h2 id="modalTitle">New Product</h2>
    <form id="productForm" onsubmit="saveProduct(event)">
      <input type="hidden" id="f_id">
      <div class="form-group">
        <label>Name *</label>
        <input id="f_name" required>
      </div>
      <div class="form-group">
        <label>SKU</label>
        <input id="f_sku">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="f_description"></textarea>
      </div>
      <div class="form-group">
        <label>Price</label>
        <input id="f_price" type="number" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>Currency</label>
        <input id="f_currency" value="USD">
      </div>
      <div class="form-group">
        <label>Category</label>
        <input id="f_category">
      </div>
      <div class="form-group">
        <label>Image URL</label>
        <input id="f_imageUrl" type="url">
      </div>
      <div class="form-group">
        <label>In Stock</label>
        <select id="f_inStock">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary"
          onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary"
          id="saveBtn">Save</button>
      </div>
    </form>
  </div>
</div>
<div id="toastEl" class="toast"></div>
<script>
const API_BASE = ${JSON.stringify(apiBase)};
const TRACKER = ${JSON.stringify(trackerId)};
const TOKEN = ${JSON.stringify(apiToken)};

async function api(method, path, body, extra) {
  let url = API_BASE + (path || '') + '?trackerId=' + TRACKER;
  if (extra) url += '&' + extra;
  const opts = {
    method,
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

let products = [];

async function loadProducts() {
  const wrap = document.getElementById('tableWrap');
  wrap.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const data = await api(
      'GET', '/products', null, 'page=1&pageSize=200'
    );
    products = data.products || [];
    renderTable();
  } catch (e) {
    wrap.innerHTML = '<div class="empty">Failed to load products</div>';
  }
}

function renderTable() {
  const wrap = document.getElementById('tableWrap');
  if (!products.length) {
    wrap.innerHTML = '<div class="empty">No products yet</div>';
    return;
  }
  let html = '<table><thead><tr>' +
    '<th>Name</th><th>SKU</th><th>Price</th>' +
    '<th>Category</th><th>In Stock</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  for (const p of products) {
    const stock = p.inStock
      ? '<span class="badge badge-yes">Yes</span>'
      : '<span class="badge badge-no">No</span>';
    html += '<tr>' +
      '<td>' + esc(p.name) + '</td>' +
      '<td>' + esc(p.sku || '') + '</td>' +
      '<td>' + esc(p.currency || '') + ' ' +
        esc(String(p.price ?? '')) + '</td>' +
      '<td>' + esc(p.category || '') + '</td>' +
      '<td>' + stock + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-primary btn-sm" ' +
          'onclick="openEdit(\\'' + p.id + '\\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" ' +
          'onclick="del(\\'' + p.id + '\\')">Delete</button>' +
      '</td></tr>';
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function openCreate() {
  document.getElementById('modalTitle').textContent = 'New Product';
  document.getElementById('f_id').value = '';
  document.getElementById('f_name').value = '';
  document.getElementById('f_sku').value = '';
  document.getElementById('f_description').value = '';
  document.getElementById('f_price').value = '';
  document.getElementById('f_currency').value = 'USD';
  document.getElementById('f_category').value = '';
  document.getElementById('f_imageUrl').value = '';
  document.getElementById('f_inStock').value = 'true';
  document.getElementById('overlay').classList.add('active');
}

function openEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('f_id').value = p.id;
  document.getElementById('f_name').value = p.name || '';
  document.getElementById('f_sku').value = p.sku || '';
  document.getElementById('f_description').value = p.description || '';
  document.getElementById('f_price').value = p.price ?? '';
  document.getElementById('f_currency').value = p.currency || 'USD';
  document.getElementById('f_category').value = p.category || '';
  document.getElementById('f_imageUrl').value = p.imageUrl || '';
  document.getElementById('f_inStock').value = String(!!p.inStock);
  document.getElementById('overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('active');
}

function closeOnOverlay(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('f_id').value;
  const body = {
    name: document.getElementById('f_name').value,
    sku: document.getElementById('f_sku').value,
    description: document.getElementById('f_description').value,
    price: parseFloat(document.getElementById('f_price').value) || 0,
    currency: document.getElementById('f_currency').value,
    category: document.getElementById('f_category').value,
    imageUrl: document.getElementById('f_imageUrl').value,
    inStock: document.getElementById('f_inStock').value === 'true'
  };
  try {
    document.getElementById('saveBtn').disabled = true;
    if (id) {
      await api('PUT', '/products/' + id, body);
      toast('Product updated', 'success');
    } else {
      await api('POST', '/products', body);
      toast('Product created', 'success');
    }
    closeModal();
    await loadProducts();
  } catch (err) {
    toast('Error saving product', 'error');
  } finally {
    document.getElementById('saveBtn').disabled = false;
  }
}

async function del(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api('DELETE', '/products/' + id);
    toast('Product deleted', 'success');
    await loadProducts();
  } catch (err) {
    toast('Error deleting product', 'error');
  }
}

function toast(msg, type) {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.className = 'toast toast-' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 3000);
}

loadProducts();
</script>
</body>
</html>`;
  }
}
