
function cargarCSS(id, archivo) {
    if (document.getElementById(id)) {
        return;
    }

    const link = document.createElement('link');

    link.id = id;
    link.rel = 'stylesheet';
    link.href = archivo;

    document.head.appendChild(link);
}

export function addExtraStyles() {
    cargarCSS(
        'fm-extra-styles',
        './css/admin-extras.css'
    );
}

export function addBrandsStyles() {
    cargarCSS(
        'fm-brands-styles',
        './css/marcas-extra.css'
    );
}
