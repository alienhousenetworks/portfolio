export class TransitPicker {
    constructor(destinations, onSelect, onCancel) {
        this.destinations = destinations;
        this.onSelect = onSelect;
        this.onCancel = onCancel;
        this.panel = document.getElementById('transit-picker');
        this.listEl = document.getElementById('transit-dest-list');
        this.searchEl = document.getElementById('transit-search');
        this.titleEl = document.getElementById('transit-picker-title');
        this.subEl = document.getElementById('transit-picker-sub');
        this._stop = null;
        this._mode = 'bus';

        document.getElementById('transit-picker-close')?.addEventListener('click', () => this.close());
        document.getElementById('transit-picker-cancel')?.addEventListener('click', () => this.close());
        this.searchEl?.addEventListener('input', () => this._renderList());
    }

    open(stop, mode = 'bus') {
        this._stop = stop;
        this._mode = mode;
        this.titleEl.textContent = mode === 'metro' ? 'Metro — Choose Destination City' : 'City Bus — Choose Destination';
        this.subEl.textContent = stop.title || 'Transit stop';
        this.searchEl.value = '';
        this.panel?.classList.add('active');
        this._renderList();
    }

    close() {
        this.panel?.classList.remove('active');
        this.onCancel?.();
    }

    _renderList() {
        if (!this.listEl) return;
        const q = (this.searchEl?.value || '').trim().toLowerCase();
        const groups = [
            { key: 'about', label: 'About Us & Company' },
            { key: 'service', label: 'Service Cities' },
            { key: 'project', label: 'Project Cities' },
            { key: 'district', label: 'District Hubs' },
        ];

        let html = '';
        groups.forEach(g => {
            const items = this.destinations.filter(d =>
                d.category === g.key &&
                (!q || d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
            );
            if (!items.length) return;
            html += `<div class="transit-group"><div class="transit-group-label">${g.label}</div>`;
            items.forEach(d => {
                html += `<button type="button" class="transit-dest-btn" data-id="${d.id}">
                    <span class="transit-dest-name">${d.name}</span>
                    <span class="transit-dest-desc">${d.description || d.district || ''}</span>
                </button>`;
            });
            html += '</div>';
        });

        if (!html) {
            html = '<p class="transit-empty">No matching cities. Try another search.</p>';
        }
        this.listEl.innerHTML = html;

        this.listEl.querySelectorAll('.transit-dest-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dest = this.destinations.find(d => d.id === btn.dataset.id);
                if (dest) {
                    this.panel?.classList.remove('active');
                    this.onSelect?.(dest, this._stop, this._mode);
                }
            });
        });
    }
}